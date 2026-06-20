-- Specter core schema.
-- Postgres / Supabase. Run in order (0001 → 0002 → 0003).

create extension if not exists "pgcrypto";

-- ── Tenants & access ────────────────────────────────────────────────────────
create table if not exists tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Maps Supabase Auth users to a tenant (drives dashboard RLS).
create table if not exists tenant_members (
  tenant_id   uuid not null references tenants(id) on delete cascade,
  user_id     uuid not null,
  role        text not null default 'member',
  created_at  timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

-- API keys for the decision API. Store a hash, never the raw key.
create table if not exists api_keys (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  label       text not null default 'default',
  key_hash    text not null unique,            -- sha256 of the raw key
  key_prefix  text not null,                   -- first 8 chars, for display
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);

-- ── Control plane ───────────────────────────────────────────────────────────
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

-- ── Data plane ──────────────────────────────────────────────────────────────
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

-- Append-only tamper-evident hash chain. One ordered chain per tenant.
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
