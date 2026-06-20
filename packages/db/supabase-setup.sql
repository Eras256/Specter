-- ════════════════════════════════════════════════════════════════════════════
-- Specter — setup completo de Supabase en UN solo script.
-- Equivale a las migraciones 0001–0006 + una semilla mínima de demo.
--
-- Cómo usarlo:  Supabase → SQL Editor → New query → pega TODO esto → Run.
-- Es idempotente: lo puedes correr varias veces sin error.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Tenants & acceso ─────────────────────────────────────────────────────────
create table if not exists tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Mapea usuarios de Supabase Auth a un tenant (maneja el RLS del dashboard).
create table if not exists tenant_members (
  tenant_id   uuid not null references tenants(id) on delete cascade,
  user_id     uuid not null,
  role        text not null default 'member',
  created_at  timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

-- API keys del decision API. Se guarda un hash, nunca la clave en crudo.
create table if not exists api_keys (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  label       text not null default 'default',
  key_hash    text not null unique,            -- sha256 de la clave en crudo
  key_prefix  text not null,                   -- primeros 8 chars, para mostrar
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);

-- ── Plano de control ─────────────────────────────────────────────────────────
create table if not exists policies (
  id                                  uuid primary key default gen_random_uuid(),
  tenant_id                           uuid not null references tenants(id) on delete cascade,
  per_tx_cap                          numeric not null default 500,
  monthly_cap                         numeric not null default 5000,
  allowlist                           jsonb not null default '[]'::jsonb,
  allowed_categories                  jsonb not null default '[]'::jsonb,
  require_approval_on_new_destination boolean not null default true,
  notification_email                  text,
  max_payments_in_window              int not null default 5,
  velocity_window_ms                  bigint not null default 3600000,
  updated_at                          timestamptz not null default now(),
  unique (tenant_id)
);

create table if not exists agents (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  last_seen   timestamptz not null default now(),
  unique (tenant_id, name)
);

-- ── Plano de datos ───────────────────────────────────────────────────────────
create table if not exists transactions (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  agent_id         uuid references agents(id) on delete set null,
  session_id       text not null,
  type             text not null,
  amount           numeric,
  currency         text,
  destination      text,
  merchant_claimed text,
  decision         text not null,
  risk_score       numeric not null default 0,
  reason           text,
  signals          jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists transactions_tenant_created_idx
  on transactions (tenant_id, created_at desc);

-- Cadena de auditoría append-only, a prueba de manipulación. Una cadena ordenada
-- por tenant.
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  seq         bigint not null,
  record      jsonb not null,
  prev_hash   text not null,
  hash        text not null,
  created_at  timestamptz not null default now(),
  unique (tenant_id, seq)
);
create index if not exists audit_log_tenant_seq_idx on audit_log (tenant_id, seq);

create table if not exists incidents (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  transaction_id  uuid references transactions(id) on delete set null,
  severity        text not null default 'high',
  status          text not null default 'open',     -- open | approved | rejected
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);
create index if not exists incidents_tenant_status_idx on incidents (tenant_id, status);

-- ════════════════════════════════════════════════════════════════════════════
-- Row Level Security: todo está acotado por tenant.
-- El decision API se conecta con la service-role key (RLS bypass) y acota cada
-- query por tenant_id. El dashboard se conecta con la anon key como usuario
-- autenticado; estas policies lo limitan a su propio tenant vía tenant_members.
-- ════════════════════════════════════════════════════════════════════════════
alter table tenants          enable row level security;
alter table tenant_members   enable row level security;
alter table api_keys         enable row level security;
alter table policies         enable row level security;
alter table agents           enable row level security;
alter table transactions     enable row level security;
alter table audit_log        enable row level security;
alter table incidents        enable row level security;

-- Helper: ¿el usuario auth actual es miembro de :tenant?
create or replace function public.is_tenant_member(t uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from tenant_members m
    where m.tenant_id = t and m.user_id = auth.uid()
  );
$$;

drop policy if exists tenants_select on tenants;
create policy tenants_select on tenants
  for select using (public.is_tenant_member(id));

drop policy if exists tenant_members_select on tenant_members;
create policy tenant_members_select on tenant_members
  for select using (user_id = auth.uid());

drop policy if exists policies_rw on policies;
create policy policies_rw on policies
  for all using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists agents_select on agents;
create policy agents_select on agents
  for select using (public.is_tenant_member(tenant_id));

drop policy if exists transactions_select on transactions;
create policy transactions_select on transactions
  for select using (public.is_tenant_member(tenant_id));

drop policy if exists audit_log_select on audit_log;
create policy audit_log_select on audit_log
  for select using (public.is_tenant_member(tenant_id));

drop policy if exists incidents_select on incidents;
create policy incidents_select on incidents
  for select using (public.is_tenant_member(tenant_id));
drop policy if exists incidents_update on incidents;
create policy incidents_update on incidents
  for update using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));
-- api_keys: nunca se expone al rol del dashboard (solo service-role). Sin policy,
-- RLS lo niega por defecto.

-- ════════════════════════════════════════════════════════════════════════════
-- Cadena de auditoría: append-only a nivel de DB (rechaza UPDATE/DELETE para
-- todos) — EXCEPTO un único camino aislado solo-para-demo (el botón "tamper"),
-- protegido por un flag local de transacción (GUC).
-- ════════════════════════════════════════════════════════════════════════════
create or replace function specter_audit_append_only()
returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('specter.allow_tamper', true), 'off') = 'on' then
    return case when tg_op = 'DELETE' then old else new end;  -- escape de demo
  end if;
  raise exception 'audit_log is append-only — % is not permitted', tg_op;
end;
$$;

drop trigger if exists audit_log_append_only on audit_log;
create trigger audit_log_append_only
  before update or delete on audit_log
  for each row execute function specter_audit_append_only();

-- Solo-demo: muta el cuerpo de un registro pasado para que "Verify" se ponga
-- rojo en vivo. Corre como dueño de la función y prende el flag local. NUNCA lo
-- usa el camino de decisión real.
create or replace function specter_demo_tamper(p_tenant uuid, p_seq bigint)
returns void language plpgsql security definer
set search_path = public as $$
begin
  perform set_config('specter.allow_tamper', 'on', true);
  update audit_log
    set record = jsonb_set(coalesce(record, '{}'::jsonb), '{amount}', '999999'::jsonb)
    where tenant_id = p_tenant and seq = p_seq;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Supabase Realtime en las tablas del plano de datos, para que el dashboard
-- transmita el feed de transacciones y los incidentes en vivo.
-- ════════════════════════════════════════════════════════════════════════════
do $$ begin
  alter publication supabase_realtime add table transactions;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table incidents;
exception when duplicate_object then null; end $$;
alter table transactions replica identity full;
alter table incidents replica identity full;

-- DEMO: deja que el rol anon (dashboard) LEA las tablas del plano de datos para
-- que la cola de aprobación + el feed transmitan en vivo sin requerir auth.
-- Solo-lectura — toda ESCRITURA (approve/reject) sigue pasando por el decision
-- API con service-role. Seguro para un solo tenant de demo; en producción
-- multi-tenant se autenticaría el dashboard y se quitarían estas dos policies.
drop policy if exists transactions_anon_read on transactions;
create policy transactions_anon_read on transactions for select to anon using (true);
drop policy if exists incidents_anon_read on incidents;
create policy incidents_anon_read on incidents for select to anon using (true);

-- ════════════════════════════════════════════════════════════════════════════
-- Supabase Auth: al registrarse un usuario, se auto-provisiona su tenant para
-- que el RLS (is_tenant_member(auth.uid())) acote sus datos de inmediato.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.specter_provision_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tenant uuid;
begin
  insert into tenants (name)
    values (coalesce(split_part(new.email, '@', 1), 'New tenant'))
    returning id into new_tenant;

  insert into tenant_members (tenant_id, user_id, role)
    values (new_tenant, new.id, 'owner');

  insert into policies (tenant_id) values (new_tenant)
    on conflict (tenant_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.specter_provision_tenant();

-- ════════════════════════════════════════════════════════════════════════════
-- SEMILLA (recomendada para que el decision API en modo :live autentique ya).
-- Crea un tenant de demo + su policy por defecto + una API key.
--   key_hash = sha256('dev_tenant_key')  → usa SPECTER_API_KEY=dev_tenant_key
-- La clave en crudo NO se guarda; solo su hash. Rótala antes de producción.
-- ════════════════════════════════════════════════════════════════════════════
insert into tenants (id, name)
  values ('00000000-0000-0000-0000-000000000001', 'Specter Demo')
  on conflict (id) do nothing;

insert into policies (tenant_id)
  values ('00000000-0000-0000-0000-000000000001')
  on conflict (tenant_id) do nothing;

insert into api_keys (tenant_id, label, key_hash, key_prefix)
  values (
    '00000000-0000-0000-0000-000000000001',
    'default',
    'f0e1aae018cb6d09f5b22a4d4969d0dfd0e3964566d37dad8901fcbcbaa40ba8', -- sha256('dev_tenant_key')
    'dev_tena'
  )
  on conflict (key_hash) do nothing;
