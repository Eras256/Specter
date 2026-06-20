// Client-safe types + a small in-browser decision simulator so the Live Demo
// and dashboard render with zero backend (and upgrade to the real API when
// NEXT_PUBLIC_SPECTER_API_URL is set).

export type Decision = 'allow' | 'deny' | 'review';

export interface Txn {
  id: string;
  agent: string;
  sessionId: string;
  type: 'payment' | 'db_write' | 'shell' | 'refund';
  amount?: number;
  currency?: string;
  destination: string;
  merchantClaimed?: string;
  decision: Decision;
  riskScore: number;
  reason: string;
  signals: Record<string, string>;
  ageSec: number;
}

const AGENTS = [
  'shop-agent-prod',
  'procurement-bot',
  'ops-runner',
  'finance-assistant',
  'travel-agent',
];
const MERCHANTS: Array<[string, string]> = [
  ['Acme Store', 'acct_acme_store'],
  ['CloudHost Inc', 'acct_cloudhost'],
  ['Figma', 'acct_figma_saas'],
  ['Notion Labs', 'acct_notion_saas'],
  ['Uber Freight', 'acct_uber_freight'],
  ['OpenWeather API', 'acct_openweather'],
];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** A deterministic-ish backlog so the feed looks alive (mostly green + 2 caught). */
export function sampleFeed(count = 26): Txn[] {
  const r = rng(7);
  const out: Txn[] = [];
  for (let i = 0; i < count; i++) {
    const [merchant, acct] = MERCHANTS[i % MERCHANTS.length]!;
    out.push({
      id: `tx_${(100000 + i).toString(36)}`,
      agent: AGENTS[i % AGENTS.length]!,
      sessionId: `sess_${(900 + i).toString(36)}`,
      type: 'payment',
      amount: Math.round((12 + r() * 240) * 100) / 100,
      currency: 'USD',
      destination: acct,
      merchantClaimed: merchant,
      decision: 'allow',
      riskScore: Math.round(r() * 14) / 100,
      reason: 'Allowed — this matches what you asked for.',
      signals: {
        provenance: 'matches your request',
        policy: 'on your approved list',
        consistency: 'amount, payee, and timing all check out',
      },
      ageSec: (count - i) * 19 + Math.floor(r() * 7),
    });
  }
  out.splice(4, 0, {
    id: 'tx_attack01',
    agent: 'shop-agent-prod',
    sessionId: 'sess_x8821',
    type: 'payment',
    amount: 129.99,
    currency: 'USD',
    destination: 'acct_attacker_9f3a',
    merchantClaimed: 'Global Pay Solutions',
    decision: 'deny',
    riskScore: 0.86,
    reason: 'Blocked — this payee came from a web page the agent read, not from your request.',
    signals: {
      provenance: 'came from a web page the agent read, not from you',
      policy: 'brand-new account — needs a human OK',
      consistency: 'who’s getting paid doesn’t match the store',
      llm: 'AI check: payee doesn’t match the store you named — looks hijacked',
    },
    ageSec: 64,
  });
  out.splice(2, 0, {
    id: 'tx_attack02',
    agent: 'ops-runner',
    sessionId: 'sess_db044',
    type: 'db_write',
    destination: 'production-postgres',
    decision: 'deny',
    riskScore: 1,
    reason: 'Blocked — wiping a database can’t be undone, so it’s never allowed.',
    signals: { destructive: 'hard rule: wiping a database is irreversible' },
    ageSec: 28,
  });
  return out;
}

export const fmt = (n?: number) =>
  n == null
    ? '—'
    : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const ageLabel = (sec: number) =>
  sec < 60
    ? `${sec}s ago`
    : sec < 3600
      ? `${Math.floor(sec / 60)}m ago`
      : `${Math.floor(sec / 3600)}h ago`;
