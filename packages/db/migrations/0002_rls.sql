-- Row Level Security: every table is tenant-scoped.
--
-- The decision API connects with the service-role key (RLS bypassed) and scopes
-- every query by tenant_id itself. The dashboard connects with the anon key as
-- an authenticated user; these policies restrict it to the caller's tenant via
-- the tenant_members mapping.

alter table tenants          enable row level security;
alter table tenant_members   enable row level security;
alter table api_keys         enable row level security;
alter table policies         enable row level security;
alter table agents           enable row level security;
alter table transactions     enable row level security;
alter table audit_log        enable row level security;
alter table incidents        enable row level security;

-- Helper: is the current auth user a member of :tenant?
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

-- Tenants: members can read their own tenant.
create policy tenants_select on tenants
  for select using (public.is_tenant_member(id));

create policy tenant_members_select on tenant_members
  for select using (user_id = auth.uid());

-- Read-only dashboard access to tenant-scoped data.
create policy policies_rw on policies
  for all using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

create policy agents_select on agents
  for select using (public.is_tenant_member(tenant_id));

create policy transactions_select on transactions
  for select using (public.is_tenant_member(tenant_id));

create policy audit_log_select on audit_log
  for select using (public.is_tenant_member(tenant_id));

-- Incidents: members can read and update status (approve/reject from dashboard).
create policy incidents_select on incidents
  for select using (public.is_tenant_member(tenant_id));
create policy incidents_update on incidents
  for update using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

-- api_keys are never exposed to the dashboard role (service-role only); no policy
-- is created, so RLS denies all access by default.
