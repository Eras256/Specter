'use client';

import Link from 'next/link';
import { LiveAgents } from '@/components/LiveAgents';
import { LiveLedger } from '@/components/LiveLedger';
import { Card, Pill, Section, SectionHead, Stat } from '@/components/ui';
import { useLang } from '@/lib/i18n';

const COPY = {
  es: {
    heroPill: 'Seguridad para agentes de IA que gastan dinero',
    heroTitlePre: 'Mira a Specter atrapar a un agente de IA secuestrado —',
    heroTitleAccent: 'en vivo',
    heroSub: (
      <>
        Los agentes de IA ya empezaron a gastar dinero de verdad. Una sola página web envenenada
        puede engañar a un agente para que le pague a un estafador — sin que nadie esté mirando.
        Specter detecta el secuestro, frena el pago <em>antes</em> de que se concrete y deja una
        prueba que puedes revisar.
      </>
    ),
    heroCtaPrimary: 'Corre el crash test →',
    heroCtaGhost: 'Empieza ahora',
    heroBadge1: 'Responde en menos de medio segundo',
    heroBadge2: '·  Funciona con cualquier agente',
    heroBadge3: '·  Pagas solo por lo que usas',
    heroCaption: 'Agente real: scrapea la página de verdad y Specter decide en Fly. Dale a Correr.',

    stats: [
      {
        value: '$billones',
        label: 'en pagos que se proyecta manejarán los agentes de IA para 2030',
        accent: 'text-specter-soft',
      },
      {
        value: '+340%',
        label: 'más ataques de secuestro de agentes año tras año',
        accent: 'text-block',
      },
      {
        value: '~50%',
        label:
          'de la gente todavía no deja que la IA gaste sin un humano mirando — esa es la confianza que construimos',
        accent: 'text-review',
      },
    ],

    ladderEyebrow: 'Atrápalo · Frénalo · Pruébalo',
    ladderTitle: 'Tres tareas, en orden.',
    ladderSub:
      'El atacante no golpea en el pago — se cuela antes, en algo que el agente lee. Specter cuida el momento exacto en que el dinero está por moverse.',
    ladder: [
      {
        accent: 'specter',
        tone: 'specter',
        pill: '1 · Atrápalo',
        title: 'Detecta el secuestro mientras pasa',
        body: 'La pregunta clave en cada pago: ¿esto vino de lo que pediste, o de una página web que el agente leyó a mitad de la tarea? Si no se puede rastrear el destinatario hasta ti, esa es la señal.',
      },
      {
        accent: 'block',
        tone: 'block',
        pill: '2 · Frénalo',
        title: 'Bloquéalo antes de que el dinero se mueva',
        body: 'Cualquier cosa que vaya contra tus reglas — o que parezca secuestrada — se bloquea antes de que salga un centavo. ¿No estás seguro? Specter le pregunta a una persona en el panel.',
      },
      {
        accent: 'safe',
        tone: 'safe',
        pill: '3 · Pruébalo',
        title: 'Guarda una prueba que nadie puede falsificar',
        body: 'Cada decisión queda en un registro que no se puede cambiar a escondidas. No le creas al agente que todo salió bien — revisa los comprobantes tú mismo.',
      },
    ],

    worksWith: 'Funciona con',
    devEyebrow: 'Para developers',
    devTitle: 'Conéctalo en una línea — pruébalo ya.',
    devSub: 'El SDK es el "plug"; el API es el producto. Ambos públicos y en vivo.',
    sdkTitle: 'SDK · specter-sdk',
    sdkLink: 'Ver en npm',
    sdkDesc: 'Cliente liviano, cero dependencias: Guard.check() + hook para Claude Code.',
    apiTitle: 'API de decisión · en vivo en Fly',
    apiLink: 'Probar el API',
    apiDesc: 'Cada pago pasa por aquí. Caliente en Fly, ~0.4s por verificación.',

    ctaTitle: 'Deja que tus agentes gasten — sin dejar entrar a los atacantes.',
    ctaSub:
      'Empieza gratis. Suelta una línea, pon tus reglas y mira a Specter bloquear un ataque real antes de que pase.',
    ctaPrimary: 'Corre el crash test',
    ctaGhost: 'Lee los docs',
  },
  en: {
    heroPill: 'Security for AI agents that spend money',
    heroTitlePre: 'Watch Specter catch a hijacked AI agent —',
    heroTitleAccent: 'live',
    heroSub: (
      <>
        AI agents are starting to spend real money. One poisoned web page can trick an agent into
        paying a scammer — with nobody watching. Specter spots the hijack, stops the payment{' '}
        <em>before</em> it goes through, and leaves proof you can check.
      </>
    ),
    heroCtaPrimary: 'Run the crash test →',
    heroCtaGhost: 'Get started',
    heroBadge1: 'Answers in under half a second',
    heroBadge2: '·  Works with any agent',
    heroBadge3: '·  Pay only for what you use',
    heroCaption: 'Real agent: it actually scrapes the page and Specter decides on Fly. Hit Run.',

    stats: [
      {
        value: '$trillions',
        label: 'in payments AI agents are projected to handle by 2030',
        accent: 'text-specter-soft',
      },
      {
        value: '+340%',
        label: 'more agent-hijacking attacks year over year',
        accent: 'text-block',
      },
      {
        value: '~50%',
        label:
          "of people still won't let AI spend without a human watching — that's the trust we build",
        accent: 'text-review',
      },
    ],

    ladderEyebrow: 'Catch it · Stop it · Prove it',
    ladderTitle: 'Three jobs, in order.',
    ladderSub:
      "The attacker doesn't strike at the payment — they sneak in earlier, in something the agent reads. Specter guards the exact moment money is about to move.",
    ladder: [
      {
        accent: 'specter',
        tone: 'specter',
        pill: '1 · Catch it',
        title: 'Spot the hijack as it happens',
        body: "The key question on every payment: did this come from what you asked for, or from a web page the agent read mid-task? If the payee can't trace back to you, that's the tell.",
      },
      {
        accent: 'block',
        tone: 'block',
        pill: '2 · Stop it',
        title: 'Block it before the money moves',
        body: 'Anything against your rules — or that looks hijacked — is blocked before a cent leaves. Not sure? Specter asks a human in the dashboard.',
      },
      {
        accent: 'safe',
        tone: 'safe',
        pill: '3 · Prove it',
        title: 'Keep proof nobody can fake',
        body: "Every decision goes into a record that can't be secretly changed. Don't take the agent's word that all went fine — check the receipts yourself.",
      },
    ],

    worksWith: 'Works with',
    devEyebrow: 'For developers',
    devTitle: 'Plug it in in one line — try it now.',
    devSub: 'The SDK is the plug; the API is the product. Both public and live.',
    sdkTitle: 'SDK · specter-sdk',
    sdkLink: 'View on npm',
    sdkDesc: 'Zero-dependency client: Guard.check() + a Claude Code hook.',
    apiTitle: 'Decision API · live on Fly',
    apiLink: 'Try the API',
    apiDesc: 'Every payment runs through here. Warm on Fly, ~0.4s per check.',

    ctaTitle: 'Let your agents spend — without letting attackers in.',
    ctaSub:
      'Start free. Drop in one line, set your rules, and watch Specter block a real attack before it happens.',
    ctaPrimary: 'Run the crash test',
    ctaGhost: 'Read the docs',
  },
} as const;

export default function Home() {
  const { lang } = useLang();
  const t = COPY[lang];

  return (
    <>
      {/* HERO */}
      <div className="bg-radial-specter">
        <div className="bg-grid">
          <Section className="!py-20 sm:!py-28">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <Pill>{t.heroPill}</Pill>
                <h1 className="mt-5 text-4xl font-semibold leading-[1.07] tracking-tight text-ink sm:text-5xl">
                  {t.heroTitlePre}{' '}
                  <span className="bg-gradient-to-r from-specter-soft to-specter bg-clip-text text-transparent">
                    {t.heroTitleAccent}
                  </span>
                  .
                </h1>
                <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-ink-dim">
                  {t.heroSub}
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link href="/demo" className="btn-primary">
                    {t.heroCtaPrimary}
                  </Link>
                  <Link href="/get-started" className="btn-ghost">
                    {t.heroCtaGhost}
                  </Link>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-faint">
                  <span className="mono">{t.heroBadge1}</span>
                  <span className="mono">{t.heroBadge2}</span>
                  <span className="mono">{t.heroBadge3}</span>
                </div>
              </div>
              <div className="space-y-3">
                <LiveAgents compact />
                <LiveLedger />
                <p className="mt-2 text-center text-xs text-ink-faint">{t.heroCaption}</p>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* IMPACT STATS */}
      <Section className="!pt-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {t.stats.map((s) => (
            <Stat key={s.value} value={s.value} label={s.label} accent={s.accent} />
          ))}
        </div>
      </Section>

      {/* THE LADDER */}
      <Section>
        <SectionHead eyebrow={t.ladderEyebrow} title={t.ladderTitle} sub={t.ladderSub} />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {t.ladder.map((c) => (
            <Card key={c.pill} accent={c.accent}>
              <Pill tone={c.tone}>{c.pill}</Pill>
              <h3 className="mt-3 text-lg font-semibold text-ink">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-dim">{c.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* FOR DEVELOPERS — SDK + live API, both clickable */}
      <Section>
        <SectionHead eyebrow={t.devEyebrow} title={t.devTitle} sub={t.devSub} />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <a
            href="https://www.npmjs.com/package/specter-sdk"
            target="_blank"
            rel="noreferrer"
            className="panel group block p-6 transition hover:border-specter/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">{t.sdkTitle}</span>
              <span className="text-xs text-specter-soft group-hover:underline">{t.sdkLink} →</span>
            </div>
            <pre className="mono mt-3 overflow-x-auto rounded-md bg-bg p-3 text-[12px] text-ink-dim">
              npm i specter-sdk
            </pre>
            <p className="mt-3 text-sm leading-relaxed text-ink-dim">{t.sdkDesc}</p>
          </a>

          <a
            href="https://specter-decision-api.fly.dev/health"
            target="_blank"
            rel="noreferrer"
            className="panel group block p-6 transition hover:border-specter/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">{t.apiTitle}</span>
              <span className="text-xs text-specter-soft group-hover:underline">{t.apiLink} →</span>
            </div>
            <pre className="mono mt-3 overflow-x-auto rounded-md bg-bg p-3 text-[12px] text-ink-dim">
              POST specter-decision-api.fly.dev/v1/evaluate
            </pre>
            <p className="mt-3 text-sm leading-relaxed text-ink-dim">{t.apiDesc}</p>
          </a>
        </div>

        <div className="panel mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-6 py-4 text-sm text-ink-faint">
          <span className="text-ink-dim">{t.worksWith}</span>
          {['Claude Code', 'Cursor', 'Vercel AI SDK', 'Stripe', 'Firecrawl', 'Supabase'].map(
            (x) => (
              <span key={x} className="mono">
                {x}
              </span>
            ),
          )}
        </div>
      </Section>

      {/* CTA */}
      <Section>
        <div className="panel relative overflow-hidden bg-radial-specter px-6 py-12 text-center sm:px-12">
          <h2 className="mx-auto max-w-2xl text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {t.ctaTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-ink-dim">{t.ctaSub}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/demo" className="btn-primary">
              {t.ctaPrimary}
            </Link>
            <Link href="/docs" className="btn-ghost">
              {t.ctaGhost}
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
