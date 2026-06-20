# @specter/sdk

The thin "plug" that connects an agent's actions to the Specter decision API. The
API is the product; this is ~150 lines of glue.

## Programmatic gate

```ts
import { Guard } from '@specter/sdk';

const guard = new Guard({
  apiUrl: process.env.SPECTER_API_URL!, // e.g. https://specter-decision-api.fly.dev
  apiKey: process.env.SPECTER_API_KEY!,
});

const decision = await guard.check({
  agentId: 'shop-agent',
  sessionId: 'sess_42',
  action: {
    type: 'payment',
    amount: 79.99,
    currency: 'USD',
    destination: 'acct_acme_store',
    merchantClaimed: 'Acme Store',
    rawInput: {},
  },
  context: {
    userPrompt: 'Buy the Acme mouse from Acme Store under $100.',
    destinationOrigin: 'user_prompt', // or 'ingested_content' if it came from a scraped page
    establishedMerchant: 'Acme Store',
  },
});

if (decision.decision !== 'allow') throw new Error(decision.reason);
// ...only now move money.
```

## Claude Code hook (drop-in)

### Option A — HTTP hook straight to the deployed API (no code)

Point Claude Code's PreToolUse hook at the API's `/hooks/claude-code` route.
`.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "http",
            "url": "https://specter-decision-api.fly.dev/hooks/claude-code",
            "headers": { "x-api-key": "$SPECTER_API_KEY" },
            "allowedEnvVars": ["SPECTER_API_KEY"],
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

> **The gotcha (do not "fix" this):** an HTTP hook does **not** block via status
> code. A 4xx/5xx only logs an error and the tool runs anyway. To actually block,
> the endpoint returns **HTTP 200** with `permissionDecision: "deny"` in the body.
> The `/hooks/claude-code` route already does this; `createClaudeCodeHook` builds
> the same body if you host it yourself. (Command-type hooks block with exit code
> 2; exit 1 only warns.)

### Option B — host the handler yourself

```ts
import { Guard, createClaudeCodeHook } from '@specter/sdk';

const guard = new Guard({ apiUrl, apiKey });
const handle = createClaudeCodeHook(guard);

// in your tiny HTTP server, always answer 200:
const body = await handle(await req.json());
res.writeHead(200, { 'content-type': 'application/json' });
res.end(JSON.stringify(body));
```

## Decision contract

`guard.check` → `POST /v1/evaluate` →

```ts
{ decision: 'allow' | 'deny' | 'review',
  riskScore: number,            // 0..1
  reason: string,
  signals: Record<string,string>,
  signalDetail: { id, score, verdict }[] }
```
