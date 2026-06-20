'use client';

import { useEffect, useState } from 'react';
import { buildChain, type ChainRecord, verifyChain } from '@/lib/chain';
import { useLang } from '@/lib/i18n';
import { sampleFeed } from '@/lib/specter';
import { LIVE_BACKEND, SPECTER_API_KEY, SPECTER_API_URL } from '@/lib/supabase';

const apiHeaders = { 'x-api-key': SPECTER_API_KEY };

const COPY = {
  es: {
    checking: 'verificando…',
    verified: 'PRUEBA VERIFICADA',
    tamperPrefix: 'ALTERACIÓN DETECTADA en la fila',
    subtitleValid: 'cada registro está encadenado al anterior',
    subtitleInvalid: 'un registro guardado se cambió después',
    verifyChain: '↻ Verificar cadena',
    verifying: 'verificando…',
    restore: 'Restaurar',
    editRecord: 'editar registro',
    colSeq: '#',
    colFingerprint: 'huella',
    colDecision: 'decisión',
    colAmount: 'monto',
    colAction: 'acción',
    footerBefore: 'Haz clic en ',
    footerEmphasis: 'editar registro',
    footerAfter:
      ' en cualquier fila anterior para cambiarla (como lo haría un atacante). La verificación se pone roja al instante en esa fila exacta — así que reescribir la historia en secreto es imposible.',
    liveTag: 'en vivo',
    demoTag: 'demo',
  },
  en: {
    checking: 'checking…',
    verified: 'PROOF VERIFIED',
    tamperPrefix: 'TAMPERING FOUND at row',
    subtitleValid: 'every record is locked to the one before it',
    subtitleInvalid: 'a saved record was changed after the fact',
    verifyChain: '↻ Verify chain',
    verifying: 'verifying…',
    restore: 'Restore',
    editRecord: 'edit record',
    colSeq: '#',
    colFingerprint: 'fingerprint',
    colDecision: 'decision',
    colAmount: 'amount',
    colAction: 'action',
    footerBefore: 'Click ',
    footerEmphasis: 'edit record',
    footerAfter:
      ' on any past row to change it (like an attacker would). The check instantly turns red at that exact row — so quietly rewriting history is impossible.',
    liveTag: 'live',
    demoTag: 'demo',
  },
} as const;

export function AuditTrail() {
  const { lang } = useLang();
  const t = COPY[lang];
  const [chain, setChain] = useState<ChainRecord[]>([]);
  const [status, setStatus] = useState<{ valid: boolean; brokenAt?: number } | null>(null);
  const [tampered, setTampered] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // LIVE mode: pull the real append-only chain from the backend and map each
  // server row to the component's existing ChainRecord shape.
  async function loadLiveChain(): Promise<ChainRecord[]> {
    const res = await fetch(`${SPECTER_API_URL}/v1/audit?limit=200`, { headers: apiHeaders });
    const data = (await res.json()) as {
      records: Array<{
        seq: number;
        record: Record<string, unknown>;
        prev_hash: string;
        hash: string;
      }>;
    };
    const c: ChainRecord[] = (data.records ?? []).map((r) => ({
      seq: r.seq,
      record: r.record,
      prevHash: r.prev_hash,
      hash: r.hash,
    }));
    setChain(c);
    return c;
  }

  // LIVE mode: ask the backend whether the chain still verifies.
  async function verifyLive() {
    setBusy(true);
    try {
      const res = await fetch(`${SPECTER_API_URL}/v1/audit/verify`, { headers: apiHeaders });
      const data = (await res.json()) as { valid: boolean; brokenAt?: number };
      setStatus({ valid: data.valid, brokenAt: data.brokenAt });
    } catch {
      // transient error — leave the last known status in place
    }
    setBusy(false);
  }

  useEffect(() => {
    (async () => {
      if (LIVE_BACKEND) {
        try {
          await loadLiveChain();
          await verifyLive();
        } catch {
          // transient error — component stays in its initial "checking…" state
        }
        return;
      }
      const records = sampleFeed(14)
        .reverse()
        .map((t, i) => ({
          seq: i,
          kind: 'decision',
          agent: t.agent,
          amount: t.amount ?? null,
          destination: t.destination,
          decision: t.decision,
          riskScore: t.riskScore,
        }));
      const c = await buildChain(records);
      setChain(c);
      setStatus(await verifyChain(c));
    })();
  }, []);

  async function reverify(next = chain) {
    if (LIVE_BACKEND) {
      await verifyLive();
      return;
    }
    setBusy(true);
    setStatus(await verifyChain(next));
    setBusy(false);
  }

  async function tamper(i: number) {
    if (LIVE_BACKEND) {
      // Ask the backend to mutate a stored record in place (no hash recompute),
      // then re-read the real chain and re-verify — it will turn red.
      try {
        await fetch(`${SPECTER_API_URL}/v1/audit/tamper`, {
          method: 'POST',
          headers: { ...apiHeaders, 'content-type': 'application/json' },
          body: JSON.stringify({ seq: chain[i]!.seq }),
        });
        await loadLiveChain();
        setTampered(i);
        await verifyLive();
      } catch {
        // transient error — ignore so the component doesn't crash
      }
      return;
    }
    // Mutate a stored record's decision (deny -> allow) WITHOUT recomputing the
    // hash — exactly what an attacker rewriting history would do.
    const next = chain.map((r) => ({ ...r, record: { ...r.record } }));
    next[i]!.record.decision = next[i]!.record.decision === 'allow' ? 'deny' : 'allow';
    next[i]!.record.amount = 9999;
    setChain(next);
    setTampered(i);
    await reverify(next);
  }

  async function restore() {
    if (LIVE_BACKEND) {
      // NOTE: the DB chain is append-only, so a real tamper is permanent by
      // design — there is nothing to "undo". Restore simply re-reads the chain
      // and re-verifies (it will still report the tamper).
      try {
        await loadLiveChain();
        setTampered(null);
        await verifyLive();
      } catch {
        // transient error — ignore so the component doesn't crash
      }
      return;
    }
    const records = chain.map((r) => ({ ...r.record }));
    if (tampered != null) {
      records[tampered]!.amount = 0;
      records[tampered]!.decision = 'allow';
    }
    // simplest reliable restore: rebuild a fresh valid chain
    const fresh = sampleFeed(14)
      .reverse()
      .map((t, i) => ({
        seq: i,
        kind: 'decision',
        agent: t.agent,
        amount: t.amount ?? null,
        destination: t.destination,
        decision: t.decision,
        riskScore: t.riskScore,
      }));
    const c = await buildChain(fresh);
    setChain(c);
    setTampered(null);
    await reverify(c);
  }

  return (
    <div className="space-y-4">
      <div
        className={`panel flex items-center justify-between px-4 py-3 ${
          status?.valid ? 'border-safe/40' : 'border-block/50'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${status?.valid ? 'bg-safe' : 'bg-block'}`} />
          <div>
            <div
              className={`flex items-center gap-2 text-sm font-semibold ${status?.valid ? 'text-safe' : 'text-block'}`}
            >
              {status == null
                ? t.checking
                : status.valid
                  ? t.verified
                  : `${t.tamperPrefix} ${status.brokenAt}`}
              <span className="mono text-[10px] uppercase tracking-wider text-ink-faint">
                {LIVE_BACKEND ? t.liveTag : t.demoTag}
              </span>
            </div>
            <div className="mono text-[11px] text-ink-faint">
              {status?.valid ? t.subtitleValid : t.subtitleInvalid}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => reverify()}
            disabled={busy}
            className="btn-ghost px-3 py-1.5 text-xs"
          >
            {busy ? t.verifying : t.verifyChain}
          </button>
          {!status?.valid && (
            <button type="button" onClick={restore} className="btn-primary px-3 py-1.5 text-xs">
              {t.restore}
            </button>
          )}
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_70px_70px_90px] gap-2 border-b border-line bg-panel-2 px-4 py-2 mono text-[10px] uppercase tracking-wider text-ink-faint">
          <span>{t.colSeq}</span>
          <span>{t.colFingerprint}</span>
          <span>{t.colDecision}</span>
          <span className="text-right">{t.colAmount}</span>
          <span className="text-right">{t.colAction}</span>
        </div>
        <div className="scroll-thin max-h-[440px] overflow-y-auto divide-y divide-line/60">
          {chain.map((r, i) => {
            const broken = !status?.valid && status?.brokenAt != null && i >= status.brokenAt;
            return (
              <div
                key={r.seq}
                className={`grid grid-cols-[40px_1fr_70px_70px_90px] items-center gap-2 px-4 py-2 ${
                  broken ? 'bg-block/5' : ''
                }`}
              >
                <span className="mono text-[11px] text-ink-faint">{r.seq}</span>
                <span
                  className={`mono truncate text-[11px] ${broken ? 'text-block' : 'text-ink-dim'}`}
                >
                  {r.hash.slice(0, 28)}…
                </span>
                <span
                  className={`mono text-[11px] font-semibold uppercase ${
                    (r.record.decision as string) === 'allow'
                      ? 'text-safe'
                      : (r.record.decision as string) === 'deny'
                        ? 'text-block'
                        : 'text-review'
                  }`}
                >
                  {String(r.record.decision)}
                </span>
                <span className="mono text-right text-[11px] text-ink">
                  {r.record.amount == null ? '—' : `$${r.record.amount}`}
                </span>
                <span className="text-right">
                  <button
                    type="button"
                    onClick={() => tamper(i)}
                    className="mono text-[10px] text-ink-faint underline-offset-2 hover:text-block hover:underline"
                  >
                    {t.editRecord}
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-ink-faint">
        {t.footerBefore}
        <span className="text-block">{t.footerEmphasis}</span>
        {t.footerAfter}
      </p>
    </div>
  );
}
