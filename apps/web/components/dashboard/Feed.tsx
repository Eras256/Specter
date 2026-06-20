'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { ageLabel, fmt, sampleFeed, type Txn } from '@/lib/specter';
import { LIVE_BACKEND, SPECTER_API_KEY, SPECTER_API_URL } from '@/lib/supabase';
import { speak } from '@/lib/voice';

const COPY = {
  es: {
    paymentsChecked: 'Pagos revisados',
    allowed: 'Permitidos',
    blockedHeld: 'Bloqueados / en espera',
    livePayments: 'pagos en vivo',
    resume: '▶ reanudar',
    pause: '⏸ pausar',
    listen: '🔊 Resumen',
    liveTag: 'en vivo',
    demoTag: 'demo',
    empty: 'Aún no hay pagos — corre el demo en vivo o espera la próxima ronda.',
  },
  en: {
    paymentsChecked: 'Payments checked',
    allowed: 'Allowed',
    blockedHeld: 'Blocked / held',
    livePayments: 'live payments',
    resume: '▶ resume',
    pause: '⏸ pause',
    listen: '🔊 Summary',
    liveTag: 'live',
    demoTag: 'demo',
    empty: 'No payments yet — run the live demo or wait for the next round.',
  },
} as const;

const dotClass = (d: Txn['decision']) =>
  d === 'allow' ? 'dot-allow' : d === 'deny' ? 'dot-deny' : 'dot-review';
const decisionText = (d: Txn['decision']) =>
  d === 'allow' ? 'text-safe' : d === 'deny' ? 'text-block' : 'text-review';

/** Shape of a row from the real decision API (`/v1/transactions`). */
interface ApiTxn {
  id: string;
  agent_id: string | null;
  agent_name?: string | null;
  session_id: string | null;
  type: string;
  amount: number | null;
  currency: string | null;
  destination: string | null;
  merchant_claimed: string | null;
  decision: string;
  risk_score: number;
  reason: string | null;
  signals?: Record<string, string> | null;
  created_at: string;
}

function mapTxn(r: ApiTxn): Txn {
  const ageSec = Math.max(0, Math.round((Date.now() - new Date(r.created_at).getTime()) / 1000));
  return {
    id: r.id,
    agent: r.agent_name ?? r.agent_id ?? 'agent',
    sessionId: r.session_id ?? '',
    type: (r.type as Txn['type']) ?? 'payment',
    amount: r.amount ?? undefined,
    currency: r.currency ?? undefined,
    destination: r.destination ?? '',
    merchantClaimed: r.merchant_claimed ?? undefined,
    decision: (r.decision as Txn['decision']) ?? 'allow',
    riskScore: r.risk_score ?? 0,
    reason: r.reason ?? '',
    signals: r.signals ?? {},
    ageSec,
  };
}

// DEMO fallback only: the merchants the simulation cycles through.
const NEW_MERCHANTS: Array<[string, string, number]> = [
  ['Acme Store', 'acct_acme_store', 64],
  ['CloudHost Inc', 'acct_cloudhost', 120],
  ['Figma', 'acct_figma_saas', 18],
  ['Uber Freight', 'acct_uber_freight', 240],
];

export function Feed() {
  const { lang } = useLang();
  const t = COPY[lang];
  // LIVE: start empty and fill from the real feed. DEMO: start with the sample.
  const [rows, setRows] = useState<Txn[]>(() => (LIVE_BACKEND ? [] : sampleFeed()));
  const [paused, setPaused] = useState(false);
  const n = useRef(0);

  // LIVE mode — poll the real decision feed from the API on Fly.
  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`${SPECTER_API_URL}/v1/transactions?limit=60`, {
        headers: { 'x-api-key': SPECTER_API_KEY },
      });
      if (!res.ok) return;
      const body = (await res.json()) as { transactions?: ApiTxn[] };
      setRows((body.transactions ?? []).map(mapTxn));
    } catch {
      /* keep last good state on transient errors */
    }
  }, []);

  useEffect(() => {
    if (!LIVE_BACKEND || paused) return;
    void refetch();
    const id = setInterval(() => void refetch(), 6000);
    return () => clearInterval(id);
  }, [refetch, paused]);

  // DEMO mode — fabricate a lively feed when there is no backend configured.
  useEffect(() => {
    if (LIVE_BACKEND || paused) return;
    const id = setInterval(() => {
      n.current++;
      const [m, acct, amt] = NEW_MERCHANTS[n.current % NEW_MERCHANTS.length]!;
      const attack = n.current % 7 === 0;
      const row: Txn = attack
        ? {
            id: `tx_live_${n.current}`,
            agent: 'shop-agent-prod',
            sessionId: `sess_live${n.current}`,
            type: 'payment',
            amount: 149.0,
            currency: 'USD',
            destination: `acct_attacker_${Math.random().toString(36).slice(2, 6)}`,
            merchantClaimed: 'Secure Billing',
            decision: 'deny',
            riskScore: 0.84,
            reason:
              'Blocked — this payee came from a web page the agent read, not from your request.',
            signals: { provenance: 'came from a web page, not from you' },
            ageSec: 0,
          }
        : {
            id: `tx_live_${n.current}`,
            agent: ['shop-agent-prod', 'procurement-bot', 'finance-assistant'][n.current % 3]!,
            sessionId: `sess_live${n.current}`,
            type: 'payment',
            amount: amt + Math.round(Math.random() * 40),
            currency: 'USD',
            destination: acct,
            merchantClaimed: m,
            decision: 'allow',
            riskScore: Math.round(Math.random() * 9) / 100,
            reason: 'Allowed — matches your request.',
            signals: {},
            ageSec: 0,
          };
      setRows((prev) => [row, ...prev.map((r) => ({ ...r, ageSec: r.ageSec + 3 }))].slice(0, 60));
    }, 3000);
    return () => clearInterval(id);
  }, [paused]);

  const allowed = rows.filter((r) => r.decision === 'allow').length;
  const blocked = rows.filter((r) => r.decision !== 'allow').length;
  const summary =
    lang === 'es'
      ? `Specter revisó ${rows.length} pagos. Permitió ${allowed}. Bloqueó o retuvo ${blocked}.`
      : `Specter checked ${rows.length} payments. Allowed ${allowed}. Blocked or held ${blocked}.`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Kpi label={t.paymentsChecked} value={String(rows.length)} />
        <Kpi label={t.allowed} value={String(allowed)} tone="text-safe" />
        <Kpi label={t.blockedHeld} value={String(blocked)} tone="text-block" />
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-line bg-panel-2 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${LIVE_BACKEND ? 'animate-pulse-ring bg-safe' : 'bg-ink-faint'}`}
            />
            <span className="mono text-[11px] text-ink-dim">{t.livePayments}</span>
            <span className="mono text-[10px] uppercase tracking-wider text-ink-faint">
              {LIVE_BACKEND ? t.liveTag : t.demoTag}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => speak(summary, lang)}
              className="mono text-[11px] text-ink-faint hover:text-ink"
            >
              {t.listen}
            </button>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="mono text-[11px] text-ink-faint hover:text-ink"
            >
              {paused ? t.resume : t.pause}
            </button>
          </div>
        </div>
        <div className="scroll-thin max-h-[520px] overflow-y-auto divide-y divide-line/60">
          {rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-dim">{t.empty}</div>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-4 py-2.5 animate-flow-down hover:bg-panel-2/50"
              >
                <span className={`dot ${dotClass(r.decision)}`} />
                <span className="mono w-[120px] shrink-0 truncate text-[11px] text-ink-dim">
                  {r.agent}
                </span>
                <span className="mono w-[64px] shrink-0 text-[11px] text-ink-faint">{r.type}</span>
                <span className="mono w-[88px] shrink-0 text-right text-[12px] text-ink">
                  {r.amount != null ? `$${fmt(r.amount)}` : '—'}
                </span>
                <span className="mono flex-1 truncate text-[11px] text-ink-dim">
                  → {r.destination}
                  {r.merchantClaimed ? `  (${r.merchantClaimed})` : ''}
                </span>
                <span
                  className={`mono w-[58px] shrink-0 text-right text-[11px] font-semibold uppercase ${decisionText(r.decision)}`}
                >
                  {r.decision}
                </span>
                <span className="mono w-[58px] shrink-0 text-right text-[10px] text-ink-faint">
                  {ageLabel(r.ageSec)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="panel px-4 py-3">
      <div className={`text-2xl font-semibold ${tone ?? 'text-ink'}`}>{value}</div>
      <div className="text-xs text-ink-dim">{label}</div>
    </div>
  );
}
