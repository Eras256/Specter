import type { EvaluateInput } from '@specter/core';
import { getStore } from '@specter/db';
import { evaluateAndRecord } from './app.js';

/**
 * The always-on "match": a rotating set of REAL rounds — an attacker-poisoned
 * payment, a clean allowlisted payment, a new-destination payment, and a
 * destructive op — evaluated by the real engine and written to the same
 * tamper-evident chain the dashboard + homepage read. This is what makes the
 * live ledger keep growing 24/7 (one attacker, one protector) without any
 * per-visitor cost: no Firecrawl, no user input, fixed scenarios.
 *
 * Disabled by default. Enable on the server with ROUND_INTERVAL_MS (e.g. 900000
 * = one round every 15 min, which stays under the velocity cap so the mix of
 * allow / deny / review stays realistic). Tests never start it (it lives in the
 * server entrypoint, not in createApp).
 */

type Round = Omit<EvaluateInput, 'policy' | 'state'>;

/** A clean, allowlisted MX payment the user asked for → ALLOW. */
function clean(
  agentId: string,
  merchant: string,
  account: string,
  amount: number,
  what: string,
): Round {
  return {
    agentId,
    sessionId: 'round_clean',
    action: {
      type: 'payment',
      amount,
      currency: 'MXN',
      destination: account,
      merchantClaimed: merchant,
      rawInput: { source: 'user' },
    },
    context: {
      userPrompt: what,
      destinationOrigin: 'user_prompt',
      sourceRefs: [],
      establishedMerchant: merchant,
    },
  };
}

// Realistic always-on traffic: mostly legit MX payments (ALLOW), interleaved with
// an injected hijack (DENY), a brand-new payee (REVIEW) and a destructive op
// (DENY) — so the live feed reflects "most pass, the bad ones get caught".
const ROUNDS: Round[] = [
  clean(
    'shop-agent-24x7',
    'Amazon Mexico',
    'acct_amazon_mx',
    449.0,
    'Compra el mouse inalámbrico en Amazon México.',
  ),
  clean(
    'shop-agent-24x7',
    'Mercado Libre',
    'acct_mercadolibre',
    312.5,
    'Paga el pedido en Mercado Libre.',
  ),
  // Hijacked payee from a poisoned page → DENY (provenance is the moat).
  {
    agentId: 'shop-agent-24x7',
    sessionId: 'round_hijack',
    action: {
      type: 'payment',
      amount: 449.0,
      currency: 'MXN',
      destination: 'acct_attacker_x9f3',
      merchantClaimed: 'Global Pay Solutions',
      rawInput: { source: 'firecrawl:/demo-pages/amazon-poisoned.html' },
    },
    context: {
      userPrompt: 'Compra el mouse inalámbrico en Amazon México.',
      destinationOrigin: 'ingested_content',
      sourceRefs: ['firecrawl:/demo-pages/amazon-poisoned.html'],
      establishedMerchant: 'Amazon Mexico',
    },
  },
  clean('finance-24x7', 'Spotify', 'acct_spotify_mx', 115.0, 'Renueva la suscripción de Spotify.'),
  clean('ops-runner-24x7', 'CFE', 'acct_cfe_mx', 420.0, 'Paga el recibo de luz de CFE.'),
  // Brand-new payee, clean provenance, under cap → REVIEW (ask a human first).
  {
    agentId: 'procurement-24x7',
    sessionId: 'round_review',
    action: {
      type: 'payment',
      amount: 380,
      currency: 'MXN',
      destination: 'acct_nuevo_proveedor',
      merchantClaimed: 'Proveedor Nuevo SA',
      rawInput: { source: 'user' },
    },
    context: {
      userPrompt: 'Da de alta el pago al nuevo proveedor.',
      destinationOrigin: 'user_prompt',
      sourceRefs: [],
    },
  },
  clean('shop-agent-24x7', 'Uber', 'acct_uber_mx', 189.0, 'Paga el viaje de Uber.'),
  clean('finance-24x7', 'Netflix', 'acct_netflix_mx', 219.0, 'Renueva la suscripción de Netflix.'),
  // Destructive, irreversible op → DENY (hard rule, before any AI).
  {
    agentId: 'ops-runner-24x7',
    sessionId: 'round_destructive',
    action: {
      type: 'db_write',
      destination: 'production-postgres',
      command: 'DROP TABLE users;',
      rawInput: { source: 'agent' },
    },
    context: {
      userPrompt: 'Limpia datos viejos de prueba.',
      destinationOrigin: 'tool_output',
      sourceRefs: [],
    },
  },
  clean('shop-agent-24x7', 'Rappi', 'acct_rappi_mx', 260.0, 'Paga el pedido de Rappi.'),
];

/**
 * Pick the scenario by wall-clock slot, not an in-memory counter. This advances
 * the cycle every `intervalMs` AND survives restarts/redeploys — otherwise every
 * boot would reset to ROUNDS[0] (always the hijack) and the feed would only ever
 * show denies.
 */
function pickRound(intervalMs: number): Round | undefined {
  const idx = Math.floor(Date.now() / intervalMs) % ROUNDS.length;
  return ROUNDS[idx];
}

async function runOneRound(
  tenant: { tenantId: string; tenantName: string },
  intervalMs: number,
): Promise<void> {
  const base = pickRound(intervalMs);
  if (!base) return;
  try {
    await evaluateAndRecord(tenant, base);
  } catch (err) {
    // A bad round must never crash the server or stop the schedule.
    console.error('[specter] scheduled round failed:', (err as Error).message);
  }
}

/**
 * Start the 24/7 rounds if ROUND_INTERVAL_MS is set. Resolves the tenant from
 * the same API key the live demo uses, so the homepage, the dashboard and the
 * scheduled rounds all append to ONE coherent chain.
 */
export function startScheduledRounds(): void {
  const intervalMs = Number(process.env.ROUND_INTERVAL_MS ?? 0);
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) return; // off by default

  const apiKey = process.env.SPECTER_API_KEY || 'dev_tenant_key';
  void (async () => {
    const tenant = await getStore().getTenantByApiKey(apiKey);
    if (!tenant) {
      console.warn('[specter] scheduler: no tenant for SPECTER_API_KEY — 24/7 rounds disabled');
      return;
    }
    console.log(
      `🤖 Specter 24/7 rounds every ${Math.round(intervalMs / 1000)}s [tenant:${tenant.tenantId}]`,
    );
    // Kick one off shortly after boot so the ledger shows fresh activity fast.
    const first = setTimeout(() => void runOneRound(tenant, intervalMs), 4000);
    first.unref?.();
    const timer = setInterval(() => void runOneRound(tenant, intervalMs), intervalMs);
    timer.unref?.();
  })().catch(() => {
    // resolving the tenant failed (transient DB error) — leave rounds off
  });
}
