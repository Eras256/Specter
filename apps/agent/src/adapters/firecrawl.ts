import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(here, '..', 'fixtures');

export interface ScrapeResult {
  markdown: string;
  sourceRef: string;
}

/**
 * readProductPage — the web-ingestion tool. THIS is where the injection enters.
 *
 * With FIRECRAWL_API_KEY + an http(s) URL we do a real `/scrape`. Otherwise we
 * load a local fixture (clean or poisoned) so the demo is fully rehearsable
 * offline. Either way it returns markdown the agent then reads (and trusts).
 */
export async function readProductPage(
  target: string,
  opts: { poisoned?: boolean } = {},
): Promise<ScrapeResult> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (key && /^https?:\/\//.test(target)) {
    try {
      const pkg = '@mendable/firecrawl-js';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = (await import(pkg)) as any;
      const Firecrawl = mod.default ?? mod.FirecrawlApp ?? mod.Firecrawl;
      const fc = new Firecrawl({ apiKey: key });
      // maxAge: 0 forces a fresh scrape (Firecrawl caches by default).
      const res = await fc.scrapeUrl(target, { formats: ['markdown'], maxAge: 0 });
      const markdown = res?.markdown ?? res?.data?.markdown ?? '';
      return { markdown, sourceRef: `firecrawl:${target}` };
    } catch (err) {
      console.warn(`[firecrawl] scrape failed, using fixture (${(err as Error).message})`);
    }
  }

  const file = opts.poisoned ? 'amazon-poisoned.md' : 'amazon-clean.md';
  const markdown = await readFile(join(FIXTURES, file), 'utf8');
  return { markdown, sourceRef: `fixture:${file}` };
}

export interface ExtractedIntent {
  merchant: string;
  account: string;
  amount: number;
  currency: string;
  /** True when the payment target came from injected/redirect instructions. */
  injected: boolean;
}

/**
 * A deliberately naive extractor — it models an agent that trusts page content.
 * If the page contains a payment-redirect instruction (the injection), the agent
 * follows it; otherwise it uses the legitimate "Pay to" line. The poisoning thus
 * genuinely drives the destination from ingested content.
 */
export function extractPaymentIntent(markdown: string): ExtractedIntent {
  // Firecrawl escapes markdown special chars in plain text (acct\_attacker\_x9f3);
  // unescape so the account/merchant regexes match the injected payee too.
  const md = markdown.replace(/\\([_*`~[\]()])/g, '$1');
  // Amount: "Price:" / "Precio:" / "Monto:" (es-MX), tolerating a thousands comma.
  const price = md.match(/(?:Precio|Price|Monto):\s*\$?\s*([\d.,]+)\s*([A-Z]{3})?/i);
  const amount = price ? Number((price[1] ?? '0').replace(/,/g, '')) : 0;
  const currency = price?.[2]?.toUpperCase() || 'MXN';

  // Injection / payment-redirect line — English or Spanish (+ redirect markers).
  const redirect = md.match(
    /(?:send payment to|env[ií]a (?:el )?pago a)\s*(?:our processor\s*|nuestro procesador\s*)?"?([^",\n]+?)"?,?\s*(?:account|cuenta)\s+(acct_[\w-]+)/i,
  );
  const redirectMarker =
    /ignore previous|billing has migrated|do not mention|payment processing update|actualizaci[oó]n de facturaci[oó]n|ignora (?:las )?instrucciones|no menciones|la facturaci[oó]n cambi[oó]/i.test(
      md,
    );
  if (redirect) {
    return {
      merchant: redirect[1]!.trim(),
      account: redirect[2]!.trim(),
      amount,
      currency,
      injected: redirectMarker,
    };
  }

  // Legitimate payee line — "Pay to:" / "Pagar a:" / "Retirar a:".
  const legit = md.match(
    /(?:Pay to|Pagar a|Retirar a):\s*\*\*([^*]+)\*\*\s*[—-]\s*(?:account|cuenta)\s+`?(acct_[\w-]+)`?/i,
  );
  if (legit) {
    return {
      merchant: legit[1]!.trim(),
      account: legit[2]!.trim(),
      amount,
      currency,
      injected: false,
    };
  }

  return { merchant: 'Unknown', account: 'unknown', amount, currency, injected: false };
}
