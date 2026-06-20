'use client';

import { useEffect, useRef, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { ageLabel, fmt, sampleFeed, type Txn } from '@/lib/specter';

const COPY = {
  es: {
    paymentsChecked: 'Pagos revisados',
    allowed: 'Permitidos',
    blockedHeld: 'Bloqueados / en espera',
    livePayments: 'pagos en vivo',
    resume: '▶ reanudar',
    pause: '⏸ pausar',
  },
  en: {
    paymentsChecked: 'Payments checked',
    allowed: 'Allowed',
    blockedHeld: 'Blocked / held',
    livePayments: 'live payments',
    resume: '▶ resume',
    pause: '⏸ pause',
  },
} as const;

const dotClass = (d: Txn['decision']) =>
  d === 'allow' ? 'dot-allow' : d === 'deny' ? 'dot-deny' : 'dot-review';
const decisionText = (d: Txn['decision']) =>
  d === 'allow' ? 'text-safe' : d === 'deny' ? 'text-block' : 'text-review';

const NEW_MERCHANTS: Array<[string, string, number]> = [
  ['Acme Store', 'acct_acme_store', 64],
  ['CloudHost Inc', 'acct_cloudhost', 120],
  ['Figma', 'acct_figma_saas', 18],
  ['Uber Freight', 'acct_uber_freight', 240],
];

export function Feed() {
  const [rows, setRows] = useState<Txn[]>(() => sampleFeed());
  const [paused, setPaused] = useState(false);
  const n = useRef(0);
  const { lang } = useLang();
  const t = COPY[lang];

  useEffect(() => {
    if (paused) return;
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
            <span className="h-2 w-2 animate-pulse-ring rounded-full bg-safe" />
            <span className="mono text-[11px] text-ink-dim">{t.livePayments}</span>
          </div>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="mono text-[11px] text-ink-faint hover:text-ink"
          >
            {paused ? t.resume : t.pause}
          </button>
        </div>
        <div className="scroll-thin max-h-[520px] overflow-y-auto divide-y divide-line/60">
          {rows.map((r) => (
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
          ))}
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
