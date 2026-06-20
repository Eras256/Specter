-- Supabase Auth wiring: when a user signs up, auto-provision their tenant so the
-- existing RLS (is_tenant_member(auth.uid()) via tenant_members) immediately
-- scopes their data. Runs as the function owner so it can write across tables.
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

  -- Default policy (caps/allowlist/etc. come from column defaults in 0001).
  insert into policies (tenant_id) values (new_tenant)
    on conflict (tenant_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.specter_provision_tenant();
-- (tenant_members self-select + per-table RLS already created in 0002.)
