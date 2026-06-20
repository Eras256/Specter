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
        d: 'Tu agente lee una página, factura o correo para hacer su tarea. Ahí entra la trampa: la página puede llevar una instrucción oculta (texto invisible) que el agente no ve.',
        tone: 'review' as const,
      },
      {
        n: '02',
        t: 'La instrucción lo secuestra',
        d: 'El texto oculto le dice al agente que le pague a otra cuenta. El agente confía en lo que leyó y se prepara para pagarle al atacante.',
        tone: 'block' as const,
      },
      {
        n: '03',
        t: 'Specter revisa antes de mover dinero',
        d: 'La pregunta clave: ¿el destinatario vino de ti, o de la página que el agente leyó? Pago limpio → pasa. Cuenta nueva o dudosa → espera tu aprobación. Secuestrado → bloqueado, $0.',
        tone: 'specter' as const,
      },
      {
        n: '04',
        t: 'Cada decisión deja prueba',
        d: 'Permitir, preguntar o bloquear: todo se escribe en un registro que no se puede alterar en secreto. Toca una entrada pasada y la verificación se rompe ahí mismo.',
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
        d: "Your agent reads a page, invoice, or email to do its task. That's where the trap enters: the page can carry a hidden instruction (invisible text) the agent can't see.",
        tone: 'review' as const,
      },
      {
        n: '02',
        t: 'The instruction hijacks it',
        d: 'The hidden text tells the agent to pay a different account. The agent trusts what it read and gets ready to pay the attacker.',
        tone: 'block' as const,
      },
      {
        n: '03',
        t: 'Specter checks before any money moves',
        d: 'The key question: did the payee come from you, or from the page the agent read? Clean payment → through. New or unclear account → waits for your approval. Hijacked → blocked, $0.',
        tone: 'specter' as const,
      },
      {
        n: '04',
        t: 'Every decision leaves proof',
        d: "Allow, ask, or block: each is written to a record that can't be secretly changed. Touch a past entry and the check breaks right there.",
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
