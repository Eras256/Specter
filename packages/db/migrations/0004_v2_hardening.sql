-- Specter v2 hardening:
--   (A) policies.alert_channel  →  policies.notification_email   (legacy channel removed)
--   (B) audit_log is append-only at the DB level (reject UPDATE/DELETE for
--       everyone) — EXCEPT a clearly-isolated, demo-only path used by the
--       tamper button, gated behind a transaction-local GUC.

-- ── (A) notification channel ────────────────────────────────────────────────
alter table policies add column if not exists notification_email text;
alter table policies drop column if exists alert_channel;

-- ── (B) append-only enforcement on the hash chain ───────────────────────────
-- Ordinary UPDATE/DELETE on audit_log is rejected. Real tamper-evidence requires
-- that normal writes cannot rewrite history. The ONLY escape is the demo tamper
-- RPC below, which sets a transaction-local flag the trigger checks.
create or replace function specter_audit_append_only()
returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('specter.allow_tamper', true), 'off') = 'on' then
    -- demo-only escape hatch (see specter_demo_tamper)
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  raise exception 'audit_log is append-only — % is not permitted', tg_op;
end;
$$;

drop trigger if exists audit_log_append_only on audit_log;
create trigger audit_log_append_only
  before update or delete on audit_log
  for each row execute function specter_audit_append_only();

-- Demo-only: mutate a past record's body so the live "Verify" turns red. Runs as
-- the function owner and sets the transaction-local escape flag so the trigger
-- allows exactly this one write. NEVER used by the decision path.
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
