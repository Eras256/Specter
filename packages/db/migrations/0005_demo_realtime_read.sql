-- DEMO: let the anon (dashboard) role READ the data-plane tables so the in-app
-- approval queue + transaction feed stream live over Supabase Realtime without
-- requiring auth. Read-only — every WRITE (approve/reject) still goes through the
-- service-role decision API. Safe for the single demo tenant; a multi-tenant
-- production build would authenticate the dashboard and drop these.
drop policy if exists transactions_anon_read on transactions;
create policy transactions_anon_read on transactions for select to anon using (true);

drop policy if exists incidents_anon_read on incidents;
create policy incidents_anon_read on incidents for select to anon using (true);
