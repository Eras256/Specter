// SERVER-ONLY helpers for the live two-agent demo. Imported only by
// /api/agent-run (a route handler), never by a client component — the Firecrawl
// key is read here and must never reach the browser.

const FIRECRAWL_SCRAPE = 'https://api.firecrawl.dev/v1/scrape';
const FINTUAL_API = 'https://fintual.cl/api';

export interface FintualNav {
  fund: string;
  nav: number;
  units: number;
  value: number; // MXN
  date: string;
}

/**
 * Real, live NAV of Fintual México's "Risky Hayek" fund (the PPR fund) via their
 * public API (no auth). conceptual_asset_id=2904 is the MXN-denominated fund.
 */
export async function fetchFintualNav(): Promise<FintualNav> {
  const units = 62_000; // demo PPR holding (we don't have the user's real account)
  try {
    const res = await fetch(`${FINTUAL_API}/real_assets?conceptual_asset_id=2904`, {
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
          fund: a?.name ?? 'Risky Hayek',
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
  const nav = 1.680406;
  return { fund: 'Risky Hayek', nav, units, value: Math.round(nav * units), date: '' };
}

/** Real Firecrawl scrape → markdown. Throws if the key is missing or it fails. */
export async function scrapeMarkdown(url: string): Promise<string> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error('firecrawl disabled');
  const res = await fetch(FIRECRAWL_SCRAPE, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    // maxAge: 0 forces a fresh scrape — Firecrawl caches by default, which would
    // otherwise serve a stale version of our demo page after we update it.
    body: JSON.stringify({ url, formats: ['markdown'], maxAge: 0 }),
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
  // Amount: matches "Price:" / "Precio:" / "Monto:" (es-MX), tolerating a thousands comma.
  const price = md.match(/(?:Precio|Price|Monto):\s*\$?\s*([\d.,]+)\s*([A-Z]{3})?/i);
  const amount = price ? Number((price[1] ?? '0').replace(/,/g, '')) : 0;
  const currency = price?.[2]?.toUpperCase() || 'MXN';

  // The injection / payment-redirect line — English or Spanish.
  const redirect = md.match(
    /(?:send payment to|env[ií]a (?:el )?pago a)\s*(?:our processor\s*|nuestro procesador\s*)?"?([^",\n]+?)"?,?\s*(?:account|cuenta)\s+(acct_[\w-]+)/i,
  );
  const redirectMarker =
    /ignore previous|billing has migrated|do not mention|payment processing update|actualizaci[oó]n de facturaci[oó]n|ignora (?:las )?instrucciones|no menciones|la facturaci[oó]n cambi[oó]/i.test(
      md,
    );
  if (redirect) {
    return {
      merchant: redirect[1]?.trim() ?? 'Unknown',
      account: redirect[2]?.trim() ?? 'unknown',
      amount,
      currency,
      injected: redirectMarker,
    };
  }

  // The legitimate payee line — "Pay to:" / "Pagar a:" / "Retirar a:".
  const legit = md.match(
    /(?:Pay to|Pagar a|Retirar a):\s*\*\*([^*]+)\*\*\s*[—-]\s*(?:account|cuenta)\s+`?(acct_[\w-]+)`?/i,
  );
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
