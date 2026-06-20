'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { type Locale, useLang } from '@/lib/i18n';
import { fmt } from '@/lib/specter';
import { getSupabase, LIVE_BACKEND, SPECTER_API_KEY, SPECTER_API_URL } from '@/lib/supabase';
import { speakIncident } from '@/lib/voice';

interface Item {
  id: string;
  agent: string | null;
  amount?: number | null;
  destination: string | null;
  merchant?: string | null;
  decision: 'deny' | 'review' | string;
  reasonEs?: string;
  reasonEn?: string;
  reason?: string; // live incidents carry a single (engine) reason string
  status: 'open' | 'approved' | 'rejected';
  ageMin?: number;
}

const COPY = {
  es: {
    live: 'en vivo',
    sim: 'demo',
    empty: 'Sin incidentes abiertos — todo en orden.',
    blocked: 'bloqueado',
    needsApproval: 'necesita aprobación',
    claims: 'dice ser',
    approve: 'Aprobar',
    reject: 'Rechazar',
    approved: 'aprobado',
    rejected: 'rechazado',
    footer:
      'Cola de aprobación in-app. Rechazar deja el dinero quieto; aprobar deja pasar ese único pago — limitado solo a esa acción.',
  },
  en: {
    live: 'live',
    sim: 'demo',
    empty: 'No open incidents — all clear.',
    blocked: 'blocked',
    needsApproval: 'needs approval',
    claims: 'claims',
    approve: 'Approve',
    reject: 'Reject',
    approved: 'approved',
    rejected: 'rejected',
    footer:
      'In-app approval queue. Reject keeps the money put; approve lets that one payment through — limited to just that action.',
  },
} as const;

const SEED: Item[] = [
  {
    id: 'inc_01',
    agent: 'shop-agent-prod',
    amount: 129.99,
    destination: 'acct_attacker_9f3a',
    merchant: 'Global Pay Solutions',
    decision: 'deny',
    reasonEs: 'Este destinatario vino de una página que el agente leyó, no de tu pedido.',
    reasonEn: 'This payee came from a web page the agent read, not from your request.',
    status: 'open',
    ageMin: 1,
  },
  {
    id: 'inc_02',
    agent: 'ops-runner',
    destination: 'production-postgres',
    decision: 'deny',
    reasonEs: 'Bloqueado — borrar una base de datos no se puede deshacer.',
    reasonEn: 'Blocked — wiping a database can’t be undone.',
    status: 'open',
    ageMin: 6,
  },
  {
    id: 'inc_03',
    agent: 'finance-assistant',
    amount: 420.0,
    destination: 'acct_new_vendor_22',
    merchant: 'Northwind Supplies',
    decision: 'review',
    reasonEs: 'Cuenta nueva a la que nunca le pagamos — necesita el OK de una persona.',
    reasonEn: 'Brand-new account we’ve never paid — needs a human OK.',
    status: 'open',
    ageMin: 14,
  },
];

function voiceLine(lang: Locale, i: Item): string {
  const amt =
    i.amount != null
      ? `$${i.amount}`
      : lang === 'es'
        ? 'una acción irreversible'
        : 'an irreversible action';
  return lang === 'es'
    ? `Pago de ${amt} a una cuenta desconocida fue bloqueado y necesita tu aprobación.`
    : `Payment of ${amt} to an unknown account was blocked and needs your approval.`;
}

export function Incidents() {
  const { lang } = useLang();
  const t = COPY[lang];
  const [items, setItems] = useState<Item[]>(LIVE_BACKEND ? [] : SEED);
  const seen = useRef<Set<string>>(new Set());

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`${SPECTER_API_URL}/v1/incidents?limit=50`, {
        headers: { 'x-api-key': SPECTER_API_KEY },
      });
      if (!res.ok) return;
      const body = (await res.json()) as { incidents?: Array<Record<string, unknown>> };
      const mapped: Item[] = (body.incidents ?? []).map((i) => ({
        id: i.id as string,
        agent: (i.agent as string) ?? null,
        amount: (i.amount as number) ?? null,
        destination: (i.destination as string) ?? null,
        merchant: (i.merchantClaimed as string) ?? null,
        decision: (i.decision as string) ?? 'deny',
        reason: (i.reason as string) ?? undefined,
        status: (i.status as Item['status']) ?? 'open',
      }));
      // Speak a one-time alert for each newly-seen OPEN incident.
      for (const m of mapped) {
        if (m.status === 'open' && !seen.current.has(m.id)) {
          seen.current.add(m.id);
          speakIncident(voiceLine(lang, m), lang);
        }
      }
      setItems(mapped);
    } catch {
      /* keep last state on transient errors */
    }
  }, [lang]);

  useEffect(() => {
    if (!LIVE_BACKEND) return;
    void refetch();
    const sb = getSupabase();
    if (sb) {
      const ch = sb
        .channel('specter-incidents')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'incidents' },
          () => void refetch(),
        )
        .subscribe();
      return () => {
        void sb.removeChannel(ch);
      };
    }
    // No Realtime client → poll as a fallback.
    const id = setInterval(() => void refetch(), 5000);
    return () => clearInterval(id);
  }, [refetch]);

  async function resolve(id: string, status: 'approved' | 'rejected') {
    if (LIVE_BACKEND) {
      // Optimistic update; the Realtime event / refetch reconciles.
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
      await fetch(`${SPECTER_API_URL}/v1/incidents/${id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': SPECTER_API_KEY },
        body: JSON.stringify({ status }),
      }).catch(() => {});
      await refetch();
    } else {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    }
  }

  const reasonOf = (i: Item) => i.reason ?? (lang === 'es' ? i.reasonEs : i.reasonEn) ?? '';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-ink-faint">
        <span
          className={`h-2 w-2 rounded-full ${LIVE_BACKEND ? 'animate-pulse-ring bg-safe' : 'bg-ink-faint'}`}
        />
        <span className="mono">{LIVE_BACKEND ? t.live : t.sim}</span>
      </div>

      {items.length === 0 ? (
        <div className="panel px-4 py-6 text-center text-sm text-ink-dim">{t.empty}</div>
      ) : (
        items.map((i) => (
          <div
            key={i.id}
            className={`panel p-4 ${i.decision === 'deny' ? 'border-block/30' : 'border-review/30'}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`dot ${i.decision === 'deny' ? 'dot-deny' : 'dot-review'}`} />
                  <span
                    className={`mono text-[11px] font-semibold uppercase ${i.decision === 'deny' ? 'text-block' : 'text-review'}`}
                  >
                    {i.decision === 'deny' ? t.blocked : t.needsApproval}
                  </span>
                  <span className="mono text-[11px] text-ink-faint">
                    · {i.agent ?? 'agent'}
                    {i.ageMin != null ? ` · ${i.ageMin}m ago` : ''}
                  </span>
                </div>
                <div className="mt-1.5 text-sm text-ink">
                  {i.amount != null ? `$${fmt(i.amount)} → ` : ''}
                  <span className="mono text-ink-dim">{i.destination}</span>
                  {i.merchant ? (
                    <span className="text-ink-faint">
                      {' '}
                      ({t.claims} {i.merchant})
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-xs text-ink-dim">{reasonOf(i)}</div>
              </div>
              <div className="flex items-center gap-2">
                {i.status === 'open' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => resolve(i.id, 'approved')}
                      className="btn-ghost px-3 py-1.5 text-xs"
                    >
                      {t.approve}
                    </button>
                    <button
                      type="button"
                      onClick={() => resolve(i.id, 'rejected')}
                      className="btn px-3 py-1.5 text-xs border border-block/40 bg-block/10 text-block"
                    >
                      {t.reject}
                    </button>
                  </>
                ) : (
                  <span
                    className={`mono rounded px-2 py-1 text-[11px] ${
                      i.status === 'approved' ? 'bg-safe/10 text-safe' : 'bg-block/10 text-block'
                    }`}
                  >
                    {i.status === 'approved' ? t.approved : t.rejected}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))
      )}
      <p className="text-xs text-ink-faint">{t.footer}</p>
    </div>
  );
}
