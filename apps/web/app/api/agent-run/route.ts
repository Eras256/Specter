import { extractPaymentIntent, fetchFintualNav, scrapeMarkdown } from '@/lib/agent-run';

// Runs a REAL reference agent: Firecrawl scrapes one of our hosted demo pages,
// the naive extractor reads the payee, and (when protected) the decision is made
// by the real Specter API on Fly. MOCK money only.
//
// SECURITY:
//  - No user-supplied URL. `scenario` is an enum mapping to our own fixed pages,
//    and the base host is a fixed constant (NEVER the request Host header), so
//    there is no SSRF surface.
//  - Firecrawl + Specter keys are read server-side and never returned.
//  - Unprotected mode pays nothing real — it only reports what *would* happen.
//  - Best-effort in-memory rate limit guards the Firecrawl quota.

const DEMO_PAGES: Record<string, string> = {
  clean: '/demo-pages/amazon-clean.html',
  poisoned: '/demo-pages/amazon-poisoned.html',
  fintual: '/demo-pages/fintual-poisoned.html',
};

const HITS: number[] = [];
const LIMIT = 40;
const WINDOW_MS = 60_000;
function rateLimited(): boolean {
  const now = Date.now();
  while (HITS.length && now - (HITS[0] ?? 0) > WINDOW_MS) HITS.shift();
  if (HITS.length >= LIMIT) return true;
  HITS.push(now);
  return false;
}

export async function POST(req: Request): Promise<Response> {
  if (rateLimited()) return Response.json({ error: 'rate limited' }, { status: 429 });

  let scenario = 'poisoned';
  let protection = true;
  try {
    const body = (await req.json()) as { scenario?: string; protection?: boolean };
    if (body.scenario === 'clean' || body.scenario === 'poisoned' || body.scenario === 'fintual') {
      scenario = body.scenario;
    }
    protection = body.protection !== false;
  } catch {
    return Response.json({ error: 'invalid body' }, { status: 400 });
  }

  const path = DEMO_PAGES[scenario] ?? DEMO_PAGES.poisoned;
  // Fixed base — never trust the Host header (avoids host-spoofing SSRF). Only our
  // own hosted demo pages are ever scraped; there is no user-supplied URL.
  const base = process.env.SITE_URL || 'https://specter-ia.vercel.app';
  const url = `${base}${path}`;

  let markdown: string;
  try {
    markdown = await scrapeMarkdown(url);
  } catch {
    return Response.json({ error: 'scrape failed' }, { status: 502 });
  }
  const extracted = extractPaymentIntent(markdown);
  const sourceRef = `firecrawl:${path}`;
  // For the Fintual scenario, also pull the fund's REAL live NAV (public API).
  const fintual = scenario === 'fintual' ? await fetchFintualNav() : undefined;

  if (!protection) {
    // No firewall: the agent pays whatever the page said. MOCK — no real money.
    return Response.json({
      scenario,
      protection: false,
      scraped: { chars: markdown.length, sourceRef },
      extracted,
      fintual,
      via: 'none',
      decision: 'unprotected-paid',
      reason: extracted.injected
        ? 'Sin protección — el agente siguió la instrucción inyectada y le pagó al atacante.'
        : 'Sin protección — el agente pagó lo que decía la página.',
      riskScore: extracted.injected ? 0.83 : 0.08,
    });
  }

  // What the user actually asked for — the legitimate task the agent started with.
  // (This is the "provenance" baseline Specter checks the payee against.)
  const task =
    scenario === 'fintual'
      ? {
          userPrompt:
            'Retira $450 MXN de mi Plan de Retiro en Fintual a mi cuenta bancaria de siempre.',
          establishedMerchant: 'Fintual',
        }
      : {
          userPrompt: 'Compra el Mouse Inalámbrico en Amazon México, menos de $500 MXN.',
          establishedMerchant: 'Amazon México',
        };

  // Protected: route the decision through the real Specter API on Fly.
  const apiUrl = process.env.SPECTER_API_URL || 'https://specter-decision-api.fly.dev';
  const apiKey = process.env.SPECTER_API_KEY || 'dev_tenant_key';
  try {
    const res = await fetch(`${apiUrl}/v1/evaluate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        agentId: 'live-agent',
        sessionId: `live_${scenario}`,
        action: {
          type: 'payment',
          amount: extracted.amount,
          currency: extracted.currency,
          destination: extracted.account,
          merchantClaimed: extracted.merchant,
          rawInput: { source: sourceRef },
        },
        context: {
          userPrompt: task.userPrompt,
          destinationOrigin: 'ingested_content',
          sourceRefs: [sourceRef],
          establishedMerchant: task.establishedMerchant,
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`specter ${res.status}`);
    const d = (await res.json()) as {
      decision: string;
      reason: string;
      riskScore: number;
      audit?: { seq: number; hash: string };
      signalDetail?: Array<{ id: string; score: number; verdict: string }>;
    };
    return Response.json({
      scenario,
      protection: true,
      scraped: { chars: markdown.length, sourceRef },
      extracted,
      fintual,
      via: 'api',
      decision: d.decision,
      reason: d.reason,
      riskScore: d.riskScore,
      audit: d.audit,
      signalDetail: d.signalDetail,
    });
  } catch {
    return Response.json({ error: 'decision failed' }, { status: 502 });
  }
}
