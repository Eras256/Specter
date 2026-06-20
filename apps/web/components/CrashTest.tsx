'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { type DemoRun, type DemoStep, simulate } from '@/lib/specter';

type Scenario = 'legit' | 'injected';

const KIND_STYLE: Record<DemoStep['kind'], string> = {
  user: 'text-ink-dim',
  agent: 'text-ink',
  web: 'text-review',
  specter: 'text-specter-soft',
  pay: 'text-safe',
  block: 'text-block',
};
const KIND_GLYPH: Record<DemoStep['kind'], string> = {
  user: '🧑',
  agent: '🤖',
  web: '🌐',
  specter: '🛡️',
  pay: '💸',
  block: '🚫',
};

const COPY = {
  es: {
    legit: 'Compra legítima',
    injected: 'Ataque inyectado',
    protection: 'Protección',
    evaluating: 'evaluando…',
    running: 'corriendo el crash test…',
    replay: '↻ Repetir',
    footer: 'el ataque se cuela antes — en lo que el agente lee',
    risk: 'riesgo',
    protectionOff: 'protección APAGADA — no se tomó decisión',
    verdict: {
      allow: { label: 'PERMITIDO', sub: 'pago aprobado · $0 en riesgo' },
      deny: { label: 'BLOQUEADO', sub: 'frenado antes de mover dinero · $0 perdido' },
      review: { label: 'EN ESPERA', sub: 'enviado a un humano para aprobar' },
      unprotected: { label: 'DINERO PERDIDO', sub: 'enviado al atacante' },
    },
  },
  en: {
    legit: 'Legit purchase',
    injected: 'Injected attack',
    protection: 'Protection',
    evaluating: 'evaluating…',
    running: 'running crash test…',
    replay: '↻ Replay',
    footer: 'the attack sneaks in earlier — in what the agent reads',
    risk: 'risk',
    protectionOff: 'protection OFF — no decision made',
    verdict: {
      allow: { label: 'ALLOWED', sub: 'payment approved · $0 at risk' },
      deny: { label: 'BLOCKED', sub: 'stopped before any money moved · $0 lost' },
      review: { label: 'HELD', sub: 'sent to a human to approve' },
      unprotected: { label: 'MONEY LOST', sub: 'sent to attacker' },
    },
  },
} as const;

type Copy = (typeof COPY)[keyof typeof COPY];

export function CrashTest({ compact = false }: { compact?: boolean }) {
  const { lang } = useLang();
  const t = COPY[lang];
  const [protection, setProtection] = useState(true);
  const [scenario, setScenario] = useState<Scenario>('injected');
  const [visible, setVisible] = useState(0);
  const [run, setRun] = useState<DemoRun | null>(null);
  const [running, setRunning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  };

  const play = useCallback(() => {
    clearTimers();
    const r = simulate(scenario, protection, lang);
    setRun(r);
    setVisible(0);
    setRunning(true);
    r.steps.forEach((s, i) => {
      timers.current.push(
        setTimeout(() => {
          setVisible(i + 1);
          if (i === r.steps.length - 1) setRunning(false);
        }, s.at + 250),
      );
    });
  }, [scenario, protection, lang]);

  useEffect(() => {
    play();
    return clearTimers;
    // re-run whenever the toggles or language change
  }, [play]);

  const finished = run && visible >= run.steps.length;

  return (
    <div className="panel overflow-hidden">
      {/* controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <Toggle active={scenario === 'legit'} onClick={() => setScenario('legit')} tone="safe">
            {t.legit}
          </Toggle>
          <Toggle
            active={scenario === 'injected'}
            onClick={() => setScenario('injected')}
            tone="block"
          >
            {t.injected}
          </Toggle>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-faint">{t.protection}</span>
          <button
            type="button"
            onClick={() => setProtection((v) => !v)}
            className={`relative h-6 w-11 rounded-full border transition ${
              protection ? 'border-specter/60 bg-specter/30' : 'border-line bg-panel'
            }`}
            aria-pressed={protection}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
                protection ? 'left-[22px] bg-specter' : 'left-0.5 bg-ink-faint'
              }`}
            />
          </button>
          <span
            className={`w-7 text-xs font-semibold ${protection ? 'text-specter-soft' : 'text-ink-faint'}`}
          >
            {protection ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      {/* trace */}
      <div
        className={`scroll-thin space-y-1.5 overflow-y-auto px-4 py-4 ${compact ? 'h-[230px]' : 'h-[300px]'}`}
      >
        {run?.steps.slice(0, visible).map((s, i) => (
          <div key={i} className="mono flex items-start gap-2 animate-flow-down">
            <span aria-hidden>{KIND_GLYPH[s.kind]}</span>
            <span className={KIND_STYLE[s.kind]}>{s.label}</span>
          </div>
        ))}
        {running && (
          <div className="mono flex items-center gap-2 text-ink-faint">
            <span className="inline-block h-3 w-3 animate-pulse-ring rounded-full bg-specter/50" />
            {t.evaluating}
          </div>
        )}
      </div>

      {/* verdict bar */}
      <div className="border-t border-line px-4 py-3">
        {finished ? (
          <VerdictBar run={run!} protection={protection} t={t} />
        ) : (
          <div className="mono text-xs text-ink-faint">{t.running}</div>
        )}
        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={play} className="btn-ghost px-3 py-1.5 text-xs">
            {t.replay}
          </button>
          <span className="mono text-[11px] text-ink-faint">{t.footer}</span>
        </div>
      </div>
    </div>
  );
}

function VerdictBar({ run, protection, t }: { run: DemoRun; protection: boolean; t: Copy }) {
  const d = run.decision;
  const meta = {
    allow: { c: 'safe', label: t.verdict.allow.label, sub: t.verdict.allow.sub },
    deny: { c: 'block', label: t.verdict.deny.label, sub: t.verdict.deny.sub },
    review: { c: 'review', label: t.verdict.review.label, sub: t.verdict.review.sub },
    'unprotected-paid': {
      c: 'block',
      label: t.verdict.unprotected.label,
      sub: `$${run.lost.toFixed(2)} ${t.verdict.unprotected.sub}`,
    },
  }[d];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span
          className={`rounded-md px-2.5 py-1 text-xs font-bold tracking-wide text-${meta.c} bg-${meta.c}/10 border border-${meta.c}/30`}
        >
          {meta.label}
        </span>
        <div>
          <div className="text-sm text-ink">{meta.sub}</div>
          <div className="mono text-[11px] text-ink-faint">
            {protection ? `${t.risk} ${run.riskScore.toFixed(2)} · ${run.reason}` : t.protectionOff}
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  tone,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone: 'safe' | 'block';
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1.5 text-xs transition ${
        active
          ? `border-${tone}/40 bg-${tone}/10 text-${tone}`
          : 'border-line bg-panel text-ink-dim hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
