# @specter/db

Supabase schema, typed client, and the storage seam used by the decision API.

## Storage seam

`getStore()` returns a `SupabaseStore` when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
are set, otherwise an in-memory `MemoryStore` (MOCK mode) so the hero demo runs
with zero external dependencies. Both implement the same `SpecterStore` interface:

- `getTenantByApiKey` · `getPolicy` · `getRuntimeState`
- `recordDecision` — writes the transaction, appends the tamper-evident hash
  chain record, and opens an incident on `deny` / `review`
- `listTransactions` · `listAudit` · `verifyAudit`

## Migrations

Run in order against your Supabase project (SQL editor or `psql`):

```
migrations/0001_init.sql      # tables
migrations/0002_rls.sql       # row-level security (tenant-scoped)
migrations/0003_realtime.sql  # realtime on transactions + incidents
```

## Seed

```
pnpm --filter @specter/db seed
```

Creates a `Demo Co` tenant, an API key (hash of `SPECTER_API_KEY`), a policy, and a
backlog of green transactions with two caught attacks so the dashboard feed is
alive on first load. No-op in MOCK mode (the API seeds in-memory at boot).
