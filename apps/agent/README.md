# @specter/agent

The reference shopping agent + the hero crash-test scenarios.

## Tools

- `readProductPage(url)` → Firecrawl `/scrape` (or a local fixture in MOCK mode).
  **This is where the injection enters.**
- `requestPayment(...)` → tags provenance (`destinationOrigin: ingested_content`),
  routes through Specter, and **only on `allow`** issues a seller-scoped Stripe SPT
  + completes a test-mode PaymentIntent.

## Run the crash test

```bash
# both scenarios, protection ON (deterministic, no API or keys needed)
pnpm --filter @specter/agent demo

# individual beats
pnpm --filter @specter/agent scenario:legit        # green: allowed, SPT issued
pnpm --filter @specter/agent scenario:injected     # red: blocked before execution
pnpm --filter @specter/agent scenario:unprotected  # protection OFF: money leaves

# drive it with a REAL autonomous agent (AI SDK 6 tool loop)
pnpm --filter @specter/agent demo --scenario=injected --llm
```

- With the decision API running (`SPECTER_API_URL` reachable), the agent calls the
  real API end-to-end. Otherwise it evaluates in-process via `@specter/core` so the
  demo always runs.
- With `ANTHROPIC_API_KEY` set and `--llm`, a real model decides to read the page
  and attempt payment; Specter governs the payment tool regardless.

## The two scenarios

| Scenario   | Page          | Extracted payee                         | Specter        |
| ---------- | ------------- | --------------------------------------- | ------------ |
| `legit`    | clean         | Acme Store / `acct_acme_store` (allowed) | **allow**    |
| `injected` | poisoned      | redirected to `acct_attacker_x9f3`       | **deny**     |

The poisoned page hides a payment-redirect instruction (white-on-white text). The
agent trusts what it reads; Specter catches that the payee originated from ingested
content and does not trace back to the user's request.

## Code-agent beat

See [`claude-code-demo/`](./claude-code-demo) for governing a Claude Code agent's
destructive actions (DROP TABLE, `.env` reads) via the same engine.
