# @specter/web

Next.js 16 (App Router, React 19) marketing site + dashboard. Deploys to Vercel.

## Run

```bash
pnpm --filter @specter/web dev      # http://localhost:3000
pnpm --filter @specter/web build
```

## Pages

| Route            | What                                                                 |
| ---------------- | ------------------------------------------------------------------- |
| `/`              | Hero + live crash-test teaser + detect/block/prove ladder + diagram |
| `/product`       | Control plane vs data plane, architecture                           |
| `/how-it-works`  | Step-by-step: injection enters → Specter intercepts → allow/review/deny |
| `/use-cases`     | E-commerce hijack (hero), payroll, procurement, DB destruction, .env, refunds |
| `/security`      | Deep technical: provenance, deterministic rules, LLM-as-one-signal, hash chain |
| `/pricing`       | Usage-based: Free / Pro (per evaluated action) / Enterprise          |
| `/docs`          | Quickstart: hook config, SDK snippet, `/v1/evaluate` contract        |
| `/demo`          | Interactive crash test (protection ON/OFF, attack on/off)            |
| `/dashboard`     | Transaction feed · incidents · audit trail (live tamper) · policy    |
| `/get-started`   | 60-second policy wizard + install                                    |

## Design system

Dark, data-dense, institutional. Semantic palette: **purple = Specter/decision,
green = safe/allowed, red = blocked/attack, amber = review/held, grays = agents
& records.** Monospace for logs/traces/hashes. See `tailwind.config.ts`.

## Live data

The dashboard and live demo render fully client-side (`lib/specter.ts` simulator +
`lib/chain.ts` Web-Crypto hash chain) so the site works on Vercel with no backend.
Point `NEXT_PUBLIC_SPECTER_API_URL` at the decision API to wire real `/v1/evaluate`
and Supabase Realtime.
