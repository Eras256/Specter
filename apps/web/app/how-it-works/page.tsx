'use client';

import Link from 'next/link';
import { Pill, Section, SectionHead } from '@/components/ui';
import { useLang } from '@/lib/i18n';

const COPY = {
  es: {
    eyebrow: 'Cómo funciona',
    title: 'La trampa se arma mucho antes del pago.',
    sub: 'El atacante no toca el pago en sí. Esconde una instrucción en una página que el agente lee, antes. Así que la pregunta de verdad es simple: ¿este pago vino de ti, o de una página que el agente leyó?',
    ctaPrimary: 'Míralo frenar un secuestro →',
    ctaGhost: 'Agrégalo a tu agente',
    steps: [
      {
        n: '01',
        t: 'El agente lee una página',
        d: 'Tu agente de IA lee una página de producto, una factura o un correo para hacer su trabajo. Ahí se esconde el peligro: una página puede llevar una instrucción oculta que el agente no puede ver.',
        tone: 'review' as const,
      },
      {
        n: '02',
        t: 'La instrucción oculta lo secuestra',
        d: 'Un texto invisible o una falsa “actualización de facturación” le dice al agente que le pague a otra persona. El agente confía en lo que leyó y se prepara para pagarle a un estafador.',
        tone: 'block' as const,
      },
      {
        n: '03',
        t: 'El agente intenta pagar',
        d: 'Antes de que se mueva dinero, el pago pasa por Specter para una revisión rápida.',
        tone: 'specter' as const,
      },
      {
        n: '04',
        t: 'Specter hace la pregunta clave',
        d: '¿Esta orden vino de ti, o de una página que el agente leyó? ¿Está dentro de tus reglas? ¿Coincide quién recibe el pago con quién el agente dice pagar?',
        tone: 'specter' as const,
      },
      {
        n: '05',
        t: 'Dejarlo pasar, preguntar o frenarlo',
        d: 'Un pago limpio que tú pediste pasa. Uno nuevo o poco claro espera a una persona (una aprobación rápida). Uno secuestrado se frena, antes de que salga dinero.',
        tone: 'specter' as const,
      },
      {
        n: '06',
        t: 'El dinero se mueve solo cuando está permitido',
        d: 'Solo pasa un pago aprobado, y solo como un pago limitado y de una sola vez. Nada más puede mover dinero.',
        tone: 'safe' as const,
      },
      {
        n: '07',
        t: 'Cada decisión deja prueba',
        d: 'Sí, preguntar o no: cada una se escribe en un registro que no se puede cambiar en secreto. Toca una entrada pasada y la prueba se rompe justo ahí. Comprobantes que puedes verificar.',
        tone: 'safe' as const,
      },
    ],
  },
  en: {
    eyebrow: 'How it works',
    title: 'The trap is set long before the payment.',
    sub: "The attacker doesn't touch the payment itself. They hide an instruction on a page the agent reads, earlier. So the real question is simple: did this payment come from you, or from a page the agent read?",
    ctaPrimary: 'Watch it catch a hijack →',
    ctaGhost: 'Add it to your agent',
    steps: [
      {
        n: '01',
        t: 'The agent reads a page',
        d: 'Your AI agent reads a product page, an invoice, or an email to do its job. That is where the danger hides — a page can carry a hidden instruction the agent can’t see.',
        tone: 'review' as const,
      },
      {
        n: '02',
        t: 'The hidden instruction hijacks it',
        d: 'Invisible text or a fake “billing update” tells the agent to pay someone else. The agent trusts what it read and gets ready to pay a scammer.',
        tone: 'block' as const,
      },
      {
        n: '03',
        t: 'The agent tries to pay',
        d: 'Before any money moves, the payment passes through Specter for one quick check.',
        tone: 'specter' as const,
      },
      {
        n: '04',
        t: 'Specter asks the key question',
        d: 'Did this request come from you, or from a page the agent read? Is it within your rules? Does who’s getting paid match who the agent claims to pay?',
        tone: 'specter' as const,
      },
      {
        n: '05',
        t: 'Let it through, ask, or stop it',
        d: 'A clean payment you asked for goes through. A new or unclear one waits for a human (a quick approval). A hijacked one gets stopped — before any money leaves.',
        tone: 'specter' as const,
      },
      {
        n: '06',
        t: 'Money moves only when it’s allowed',
        d: 'Only an approved payment goes through, and only as a limited, one-time payment. Nothing else can move money.',
        tone: 'safe' as const,
      },
      {
        n: '07',
        t: 'Every decision leaves proof',
        d: 'Yes, ask, or no — each one is written to a record that can’t be secretly changed. Touch a past entry and the proof breaks right there. Receipts you can check.',
        tone: 'safe' as const,
      },
    ],
  },
} as const;

export default function HowItWorks() {
  const { lang } = useLang();
  const t = COPY[lang];
  return (
    <>
      <Section className="!pb-6">
        <SectionHead eyebrow={t.eyebrow} title={t.title} sub={t.sub} />
      </Section>

      <Section className="!pt-2">
        <ol className="relative space-y-3 border-l border-line pl-6">
          {t.steps.map((s) => (
            <li key={s.n} className="relative">
              <span
                className={`absolute -left-[31px] mt-1 grid h-5 w-5 place-items-center rounded-full border bg-panel text-[10px] mono ${
                  s.tone === 'block'
                    ? 'border-block/50 text-block'
                    : s.tone === 'safe'
                      ? 'border-safe/50 text-safe'
                      : s.tone === 'review'
                        ? 'border-review/50 text-review'
                        : 'border-specter/50 text-specter-soft'
                }`}
              >
                {s.n}
              </span>
              <div className="panel p-4">
                <div className="flex items-center gap-2">
                  <Pill tone={s.tone}>{s.t}</Pill>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-dim">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex gap-3">
          <Link href="/demo" className="btn-primary">
            {t.ctaPrimary}
          </Link>
          <Link href="/docs" className="btn-ghost">
            {t.ctaGhost}
          </Link>
        </div>
      </Section>
    </>
  );
}
