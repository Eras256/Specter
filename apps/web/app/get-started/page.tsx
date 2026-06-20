'use client';

import { Code } from '@/components/Code';
import { PolicyWizard } from '@/components/PolicyWizard';
import { Pill, Section, SectionHead } from '@/components/ui';
import { useLang } from '@/lib/i18n';

const INSTALL = `// .claude/settings.json
{ "hooks": { "PreToolUse": [{ "matcher": "*", "hooks": [{
  "type": "http",
  "url": "https://specter-decision-api.fly.dev/hooks/claude-code",
  "headers": { "x-api-key": "$SPECTER_API_KEY" },
  "allowedEnvVars": ["SPECTER_API_KEY"]
}]}]}}`;

const COPY = {
  es: {
    eyebrow: 'Empezar',
    title: '60 segundos para un agente más seguro.',
    sub: 'Define tus reglas, pega una línea. Eso es todo: la verificación queda activa y cada pago recibe un comprobante a prueba de manipulación.',
    step1: 'Paso 1',
    step1Desc:
      'Define tus reglas: límites, a quién se le puede pagar, cuándo pedir aprobación a una persona',
    step2: 'Paso 2',
    step2Desc: 'Pega la instalación de una sola línea',
    sdkTitle: 'O usa el SDK',
    sdkBefore: ' y llama a ',
    sdkAfter: ' antes de que salga cualquier pago. Consulta la ',
    sdkDocs: 'documentación',
    sdkEnd: '.',
    step3Title: 'Paso 3 — Míralo en acción',
    step3Before: 'Corre la ',
    step3Link: 'prueba de choque',
    step3After:
      ': intenta un pago secuestrado y mira cómo Specter lo detiene antes de que se mueva el dinero, le pregunta a una persona en el panel y guarda un comprobante a prueba de manipulación.',
  },
  en: {
    eyebrow: 'Get started',
    title: '60 seconds to a safer agent.',
    sub: "Set your rules, paste one line. That's it — the check is live and every payment gets a tamper-proof receipt.",
    step1: 'Step 1',
    step1Desc: "Set your rules: limits, who's allowed to get paid, when to ask a human",
    step2: 'Step 2',
    step2Desc: 'Paste in the one-line install',
    sdkTitle: 'Or use the SDK',
    sdkBefore: ' and call ',
    sdkAfter: ' before any payment goes out. See the ',
    sdkDocs: 'docs',
    sdkEnd: '.',
    step3Title: 'Step 3 — See it work',
    step3Before: 'Run the ',
    step3Link: 'crash test',
    step3After:
      ': try a hijacked payment and watch Specter stop it before money moves, ask a human in the dashboard, and save a tamper-proof receipt.',
  },
} as const;

export default function GetStarted() {
  const { lang } = useLang();
  const t = COPY[lang];

  return (
    <>
      <Section className="!pb-6">
        <SectionHead eyebrow={t.eyebrow} title={t.title} sub={t.sub} />
      </Section>

      <Section className="!pt-2">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Pill tone="specter">{t.step1}</Pill>
              <span className="text-sm text-ink-dim">{t.step1Desc}</span>
            </div>
            <PolicyWizard embedded />
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Pill tone="specter">{t.step2}</Pill>
              <span className="text-sm text-ink-dim">{t.step2Desc}</span>
            </div>
            <Code title=".claude/settings.json">{INSTALL}</Code>
            <div className="mt-4 panel p-5">
              <h3 className="text-sm font-semibold text-ink">{t.sdkTitle}</h3>
              <p className="mt-2 text-sm text-ink-dim">
                <span className="mono text-specter-soft">npm i @specter/sdk</span>
                {t.sdkBefore}
                <span className="mono">guard.check(action, context)</span>
                {t.sdkAfter}
                <a href="/docs" className="text-specter-soft hover:underline">
                  {t.sdkDocs}
                </a>
                {t.sdkEnd}
              </p>
            </div>
            <div className="mt-4 panel p-5">
              <h3 className="text-sm font-semibold text-ink">{t.step3Title}</h3>
              <p className="mt-2 text-sm text-ink-dim">
                {t.step3Before}
                <a href="/demo" className="text-specter-soft hover:underline">
                  {t.step3Link}
                </a>
                {t.step3After}
              </p>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
