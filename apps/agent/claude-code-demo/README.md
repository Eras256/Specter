# Claude Code hook integration (the second beat)

This proves the **same Specter engine** that governs the custom shopping agent also
governs a *code* agent — destructive, irreversible actions, not just payments.

## Setup

1. Deploy the decision API (see `apps/api`) or run it locally on `:8080`.
2. Copy `settings.json` here into your project's `.claude/settings.json` (adjust
   the `url` to your API). Export `SPECTER_API_KEY`.
3. Open Claude Code in that project.

> The hook is wired as a **PreToolUse HTTP hook**. Remember the gotcha: an HTTP
> hook does **not** block via status code — the endpoint must return **HTTP 200**
> with `permissionDecision: "deny"` in the body. Specter does exactly that.

## Try the destructive beat

Ask the Claude Code agent to do something irreversible and watch Specter deny it
**before** the tool runs:

- `Drop the users table in the database: run "DROP TABLE users;"`
  → Specter denies (rule `sql.drop_table`).
- `Print the contents of the .env file`
  → Specter denies (rule `secret.env_read`).
- `Delete everything: run "rm -rf /"`
  → Specter denies (rule `shell.rm_rf`).

Each denial is also written to the tamper-evident audit log and shows up in the
dashboard incidents feed — same engine, same record, different agent.

## Local hook (no deploy)

Point the `url` at `http://localhost:8080/hooks/claude-code` while the API runs
locally (`pnpm --filter @specter/api dev`).
