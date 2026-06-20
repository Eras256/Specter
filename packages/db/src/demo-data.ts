import type { Decision } from '@specter/core';

export interface DemoTxn {
  agent: string;
  session: string;
  type: string;
  amount: number;
  currency: string;
  destination: string;
  merchantClaimed: string;
  decision: Decision;
  riskScore: number;
  reason: string;
  signals: Record<string, string>;
  ageMinutes: number;
}

const AGENTS = ['shop-agent-prod', 'procurement-bot', 'ops-runner', 'finance-assistant'];
const MERCHANTS: Array<[string, string, string]> = [
  ['Acme Store', 'acct_acme_store', 'retail'],
  ['CloudHost Inc', 'acct_cloudhost', 'infrastructure'],
  ['Figma', 'acct_figma_saas', 'software'],
  ['Notion Labs', 'acct_notion_saas', 'software'],
  ['Uber Freight', 'acct_uber_freight', 'logistics'],
  ['OpenWeather API', 'acct_openweather', 'software'],
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length] as T;
}

/**
 * A realistic backlog so the dashboard "feed" looks alive on first load:
 * mostly green allows across several agents, with two incidents already caught.
 */
export function buildDemoBacklog(count = 36): DemoTxn[] {
  const out: DemoTxn[] = [];
  for (let i = 0; i < count; i++) {
    const [merchant, acct] = pick(MERCHANTS, i + 1);
    const amount = Math.round((15 + ((i * 37) % 240)) * 100) / 100;
    out.push({
      agent: pick(AGENTS, i),
      session: `sess_${(1000 + i).toString(36)}`,
      type: 'payment',
      amount,
      currency: 'USD',
      destination: acct,
      merchantClaimed: merchant,
      decision: 'allow',
      riskScore: Math.round(Math.random() * 12) / 100,
      reason: 'Allowed: payee traces to the user’s original request.',
      signals: {
        provenance: 'payee traces to the user’s original request',
        policy: 'destination is an approved beneficiary',
        consistency: 'amount, destination, and velocity are consistent',
      },
      ageMinutes: (count - i) * 7 + Math.floor(Math.random() * 5),
    });
  }

  // Two caught attacks interleaved into the feed.
  out.splice(8, 0, {
    agent: 'shop-agent-prod',
    session: 'sess_x8821',
    type: 'payment',
    amount: 129.99,
    currency: 'USD',
    destination: 'acct_attacker_9f3a',
    merchantClaimed: 'Acme Store',
    decision: 'deny',
    riskScore: 0.86,
    reason:
      'Blocked: payee originated from ingested_content and does not trace back to the user’s request — classic injection / destination-swap pattern.',
    signals: {
      provenance:
        'payee originated from ingested_content and does not trace back to the user’s request',
      policy: 'approved merchant but a never-before-seen account — requires human approval',
      consistency: 'destination does not correspond to claimed merchant',
    },
    ageMinutes: 23,
  });
  out.splice(3, 0, {
    agent: 'ops-runner',
    session: 'sess_db044',
    type: 'db_write',
    amount: 0,
    currency: 'USD',
    destination: 'production-postgres',
    merchantClaimed: '',
    decision: 'deny',
    riskScore: 1,
    reason:
      'Blocked irreversible action — DROP of a table/database/schema is irreversible (rule sql.drop_table).',
    signals: {
      destructive:
        'deterministic rule "sql.drop_table": DROP of a table/database/schema is irreversible',
    },
    ageMinutes: 11,
  });

  return out;
}
