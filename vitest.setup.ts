/**
 * Hermetic tests. Regardless of the developer's shell environment, the unit and
 * security suites must NOT reach a live LLM or a live Postgres — otherwise they
 * become slow and non-deterministic (e.g. a rate-limited classifier call during
 * the audit-chain concurrency burst would drop a record and fail the suite).
 *
 * With no ANTHROPIC_API_KEY the detector falls back to its deterministic
 * heuristic path; with no SUPABASE_URL the API uses the in-memory store. That is
 * exactly the reproducible "mock mode" the tests are written against. Production
 * is unaffected — Fly injects the real secrets at runtime.
 */
delete process.env.ANTHROPIC_API_KEY;
delete process.env.SUPABASE_URL;
