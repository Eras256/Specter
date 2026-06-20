'use client';

import { useLang } from '@/lib/i18n';

const COPY = {
  es: {
    agent: 'Agente de IA',
    agentSub: 'Claude Code · Cursor · a medida',
    action: 'acción',
    plug: 'Conector',
    plugSub: 'hook · SDK · proxy',
    check: 'una verificación rápida',
    specterSub: 'la verificación · siempre activa',
    allow: 'permitir',
    allowTo: 'Pago',
    allowSub: 'se concreta',
    review: 'revisar',
    reviewTo: 'Cola de aprobación',
    reviewSub: 'pide a un humano',
    deny: 'bloquear',
    denyTo: 'Bloqueado',
    denySub: 'el dinero no se mueve',
    every: 'cada decisión',
    everyTo: 'Prueba',
    everySub: 'guardada, no se puede falsificar',
  },
  en: {
    agent: 'AI agent',
    agentSub: 'Claude Code · Cursor · custom',
    action: 'action',
    plug: 'Plug',
    plugSub: 'hook · SDK · proxy',
    check: 'one quick check',
    specterSub: 'the check · always on',
    allow: 'allow',
    allowTo: 'Payment',
    allowSub: 'goes through',
    review: 'review',
    reviewTo: 'Approval queue',
    reviewSub: 'ask a human',
    deny: 'deny',
    denyTo: 'Blocked',
    denySub: 'money never moves',
    every: 'every decision',
    everyTo: 'Proof',
    everySub: 'saved, can’t be faked',
  },
} as const;

/** Architecture diagram: agent → hook/SDK → Specter → payment / proof. */
export function Diagram() {
  const { lang } = useLang();
  const t = COPY[lang];
  return (
    <div className="panel overflow-x-auto p-6">
      <div className="flex min-w-[680px] items-stretch gap-3">
        <Node title={t.agent} sub={t.agentSub} tone="ink" />
        <Arrow label={t.action} />
        <Node title={t.plug} sub={t.plugSub} tone="ink" />
        <Arrow label={t.check} />
        <Node title="Specter" sub={t.specterSub} tone="specter" big />
        <div className="flex flex-col justify-center gap-3">
          <Branch label={t.allow} tone="safe" to={t.allowTo} toSub={t.allowSub} />
          <Branch label={t.review} tone="review" to={t.reviewTo} toSub={t.reviewSub} />
          <Branch label={t.deny} tone="block" to={t.denyTo} toSub={t.denySub} />
          <Branch label={t.every} tone="specter" to={t.everyTo} toSub={t.everySub} />
        </div>
      </div>
    </div>
  );
}

function Node({
  title,
  sub,
  tone,
  big,
}: {
  title: string;
  sub: string;
  tone: 'ink' | 'specter';
  big?: boolean;
}) {
  return (
    <div
      className={`flex flex-col justify-center rounded-lg border px-4 py-3 ${
        tone === 'specter'
          ? 'border-specter/40 bg-specter/10 shadow-glow'
          : 'border-line bg-panel-2'
      } ${big ? 'min-w-[180px]' : 'min-w-[140px]'}`}
    >
      <div
        className={`text-sm font-semibold ${tone === 'specter' ? 'text-specter-soft' : 'text-ink'}`}
      >
        {title}
      </div>
      <div className="mono text-[11px] text-ink-faint">{sub}</div>
    </div>
  );
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-1">
      <span className="mono text-[10px] text-ink-faint">{label}</span>
      <svg
        width="34"
        height="12"
        viewBox="0 0 34 12"
        fill="none"
        className="text-ink-faint"
        aria-hidden="true"
      >
        <path d="M0 6h28m0 0-5-4m5 4-5 4" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

function Branch({
  label,
  tone,
  to,
  toSub,
}: {
  label: string;
  tone: 'safe' | 'block' | 'review' | 'specter';
  to: string;
  toSub: string;
}) {
  const c = {
    safe: 'text-safe',
    block: 'text-block',
    review: 'text-review',
    specter: 'text-specter-soft',
  }[tone];
  return (
    <div className="flex items-center gap-2">
      <span className={`mono w-[88px] text-right text-[10px] ${c}`}>{label} →</span>
      <div className="rounded-md border border-line bg-panel-2 px-3 py-1.5">
        <div className="text-xs text-ink">{to}</div>
        <div className="mono text-[10px] text-ink-faint">{toSub}</div>
      </div>
    </div>
  );
}
