-- Enable Supabase Realtime on the data-plane tables so the dashboard streams
-- the transaction feed and incidents live.

-- Idempotent: tolerate re-runs where the table is already a publication member.
do $$ begin
  alter publication supabase_realtime add table transactions;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table incidents;
exception when duplicate_object then null; end $$;

-- Ensure full row payloads are delivered on updates (needed for incident status
-- changes to stream cleanly).
alter table transactions replica identity full;
alter table incidents replica identity full;
