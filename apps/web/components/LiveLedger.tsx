'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';

interface LedgerRow {
  seq: number;
  hash: string;
  decision: string;
  amount: number | null;
  currency: string | null;
  destination: string | null;
  merchant: string | null;
  at: string | null;
}

interface LedgerData {
  records: LedgerRow[];
  verify: { valid: boolean; brokenAt?: number };
  live: boolean;
}

const REFRESH_MS = 15_000;

const COPY = {
  es: {
    sub: 'agentes 24/7 — uno ataca, otro protege',
    live: 'EN VIVO',
    valid: 'cadena íntegra',
    invalid: 'alteración detectada',
    blocked: 'bloqueado',
    held: 'en espera',
    allowed: 'permitido',
    verifyLink: 'Ver y verificar el registro →',
  },
  en: {
    sub: 'agents 24/7 — one attacks, one protects',
    live: 'LIVE',
    valid: 'chain intact',
    invalid: 'tampering found',
    blocked: 'blocked',
    held: 'held',
    allowed: 'allowed',
    verifyLink: 'See and verify the record →',
  },
} as const;

const decisionTone: Record<string, string> = {
  allow: 'safe',
  deny: 'block',
  review: 'review',
};

export function LiveLedger() {
  const { lang } = useLang();
  const t = COPY[lang];
  const [data, setData] = useState<LedgerData | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/ledger', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as LedgerData;
        if (alive) setData(json);
      } catch {
        // transient — keep the last good data on screen
      }
    };
    void load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  // Degrade gracefully: render nothing until there is real activity to show.
  if (!data?.live || data.records.length === 0) return null;

  const verbFor = (d: string) => (d === 'deny' ? t.blocked : d === 'review' ? t.held : t.allowed);

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-panel-2 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-safe/70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-safe" />
          </span>
          <span className="mono text-[11px] font-semibold uppercase tracking-wider text-safe">
            {t.live}
          </span>
          <span className="text-xs text-ink-dim">· {t.sub}</span>
        </div>
        <span
          className={`mono text-[10px] uppercase tracking-wider ${
            data.verify.valid ? 'text-safe' : 'text-block'
          }`}
        >
          {data.verify.valid ? `✓ ${t.valid}` : `✕ ${t.invalid}`}
        </span>
      </div>

      <div className="divide-y divide-line/60">
        {data.records.map((r) => {
          const tone = decisionTone[r.decision] ?? 'ink-faint';
          return (
            <div
              key={r.seq}
              className="grid grid-cols-[34px_88px_1fr_auto] items-center gap-2 px-4 py-2"
            >
              <span className="mono text-[11px] text-ink-faint">{r.seq}</span>
              <span
                className={`mono text-[11px] font-bold uppercase text-${tone}`}
                title={r.merchant ?? r.destination ?? ''}
              >
                {verbFor(r.decision)}
              </span>
              <span className="mono truncate text-[11px] text-ink-dim">{r.hash.slice(0, 22)}…</span>
              <span className="mono text-right text-[11px] text-ink">
                {r.amount == null ? '—' : `${r.currency ?? '$'} ${r.amount}`}
              </span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-line bg-panel-2 px-4 py-2.5 text-right">
        <Link href="/dashboard" className="text-xs text-specter-soft hover:underline">
          {t.verifyLink}
        </Link>
      </div>
    </div>
  );
}
