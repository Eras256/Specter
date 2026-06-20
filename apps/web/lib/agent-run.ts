// SERVER-ONLY helpers for the live two-agent demo. Imported only by
// /api/agent-run (a route handler), never by a client component — the Firecrawl
// key is read here and must never reach the browser.

const FIRECRAWL_SCRAPE = 'https://api.firecrawl.dev/v1/scrape';
const FINTUAL_API = 'https://fintual.cl/api';

export interface FintualNav {
  fund: string;
  nav: number;
  units: number;
  value: number; // CLP
  date: string;
}

/** Real, live NAV of Fintual's "Risky Norris" fund via their public API (no auth). */
export async function fetchFintualNav(): Promise<FintualNav> {
  const units = 124.86; // demo holdings (we don't have the user's real account)
  try {
    const res = await fetch(`${FINTUAL_API}/real_assets?conceptual_asset_id=36`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const json = (await res.json()) as {
        data?: Array<{
          attributes?: { name?: string; last_day?: { net_asset_value?: number; date?: string } };
        }>;
      };
      const a = json.data?.[0]?.attributes;
      const nav = a?.last_day?.net_asset_value;
      if (nav) {
        return {
          fund: a?.name ?? 'Risky Norris',
          nav,
          units,
          value: Math.round(nav * units),
          date: a?.last_day?.date ?? '',
        };
      }
    }
  } catch {
    /* fall through to offline-safe value */
  }
  const nav = 4037.04;
  return { fund: 'Risky Norris', nav, units, value: Math.round(nav * units), date: '' };
}

/** Real Firecrawl scrape → markdown. Throws if the key is missing or it fails. */
export async function scrapeMarkdown(url: string): Promise<string> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error('firecrawl disabled');
  const res = await fetch(FIRECRAWL_SCRAPE, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ url, formats: ['markdown'] }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`firecrawl ${res.status}`);
  const json = (await res.json()) as { data?: { markdown?: string } };
  return json.data?.markdown ?? '';
}

export interface PaymentIntent {
  merchant: string;
  account: string;
  amount: number;
  currency: string;
  /** True when the payee came from injected/redirect instructions in the page. */
  injected: boolean;
}

/**
 * A deliberately naive extractor — it models an agent that trusts page content.
 * If the page carries a payment-redirect instruction (the injection), the agent
 * follows it; otherwise it uses the legitimate "Pay to" line. Mirrors
 * apps/agent/src/adapters/firecrawl.ts.
 */
export function extractPaymentIntent(markdown: string): PaymentIntent {
  // Firecrawl escapes markdown special chars in plain text (e.g. acct\_attacker\_x9f3);
  // unescape so the account/merchant regexes match the injected payee too.
  const md = markdown.replace(/\\([_*`~[\]()])/g, '$1');
  const price = md.match(/Price:\s*\$?([\d.]+)\s*([A-Z]{3})?/i);
  const amount = price ? Number(price[1]) : 0;
  const currency = price?.[2]?.toUpperCase() || 'USD';

  const redirect = md.match(
    /send payment to\s*(?:our processor\s*)?"?([^",\n]+?)"?,?\s*account\s+(acct_[\w-]+)/i,
  );
  const redirectMarker =
    /ignore previous|billing has migrated|do not mention|payment processing update/i.test(md);
  if (redirect) {
    return {
      merchant: redirect[1]?.trim() ?? 'Unknown',
      account: redirect[2]?.trim() ?? 'unknown',
      amount,
      currency,
      injected: redirectMarker,
    };
  }

  const legit = md.match(/Pay to:\s*\*\*([^*]+)\*\*\s*[—-]\s*account\s+`?(acct_[\w-]+)`?/i);
  if (legit) {
    return {
      merchant: legit[1]?.trim() ?? 'Unknown',
      account: legit[2]?.trim() ?? 'unknown',
      amount,
      currency,
      injected: false,
    };
  }

  return { merchant: 'Unknown', account: 'unknown', amount, currency, injected: false };
}
