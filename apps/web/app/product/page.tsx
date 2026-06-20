'use client';

import Link from 'next/link';
import { Card, Pill, Section, SectionHead } from '@/components/ui';
import { useLang } from '@/lib/i18n';

const COPY = {
  es: {
    heroEyebrow: 'Producto',
    heroTitle: 'Detéctalo · Frénalo · Demuéstralo — en un solo chequeo rápido.',
    heroSub:
      'Specter es un chequeo rápido que corre antes de que se mueva el dinero. Tú defines unas pocas reglas simples. Nos conectamos a tu agente y revisamos cada pago contra ellas. Detecta el secuestro, frena el pago y deja una prueba que puedes verificar.',

    rulesPill: 'Tus reglas',
    rulesTitle: 'Configúralo en un minuto',
    rulesBody:
      'Una configuración de 60 segundos: un tope por pago, los negocios a los que sí te gusta pagar, y “cualquiera nuevo necesita un sí de mi parte”. Elige dónde llegan las alertas. Esta es la parte pequeña que maneja tu equipo — y es la única parte en la que tienes que pensar.',
    rulesBullets: [
      '• Un límite por pago y por mes',
      '• Una lista de a quién te gusta pagar',
      '• Cualquiera nuevo necesita tu aprobación primero',
      '• Cola de aprobación in-app y alertas a Slack',
    ],

    everyPill: 'Cada pago',
    everyTitle: 'Revisado antes de que se realice',
    everyBody:
      'Nos ponemos delante de cada pago que el agente intenta hacer y corremos el chequeo primero. Pasa en menos de medio segundo, así que el agente nunca se ralentiza y nada en vivo se rompe. El pago solo se realiza una vez que pasa.',
    everyBullets: [
      '• Se conecta con una sola línea de código',
      '• Permitir, preguntar a una persona o bloquear — en un solo chequeo rápido',
      '• Un registro que no se puede cambiar en secreto, cada vez',
      '• Actualizaciones en vivo a tu panel',
    ],

    detectCards: [
      {
        accent: 'specter',
        title: '¿De dónde vino?',
        body: 'La verdadera pregunta no es “¿esto parece fraude?”. Es “¿esto vino de ti — o de una página web que el agente acaba de leer?”',
      },
      {
        accent: 'specter',
        title: 'Las reglas estrictas primero',
        body: 'Tus topes, tu lista aprobada y tus acciones prohibidas son reglas estrictas. Corren primero, así que una instrucción oculta no puede convencerlas de dejarla pasar.',
      },
      {
        accent: 'specter',
        title: 'Una segunda opinión de IA',
        body: 'Un chequeo de IA rápido detecta trucos nuevos que las reglas no han visto. Solo agrega una alerta — nunca decide sola, porque también puede ser engañada.',
      },
    ],
    detectionLink: 'Cómo funciona la detección →',
  },
  en: {
    heroEyebrow: 'Product',
    heroTitle: 'Catch it · Stop it · Prove it — in one quick check.',
    heroSub:
      'Specter is one quick check that runs before any money moves. You set a few simple rules. We plug into your agent and check every payment against them. Catch the hijack, stop the payment, leave proof you can verify.',

    rulesPill: 'Your rules',
    rulesTitle: 'Set up in a minute',
    rulesBody:
      "A 60-second setup: a cap per payment, the businesses you're happy to pay, and “anyone new needs a yes from me.” Pick where alerts land. This is the small part your team owns — and it's the only part you have to think about.",
    rulesBullets: [
      '• A limit per payment and per month',
      "• A list of who you're happy to pay",
      '• Anyone new needs your approval first',
      '• In-app approval queue and Slack alerts',
    ],

    everyPill: 'Every payment',
    everyTitle: 'Checked before it goes through',
    everyBody:
      'We sit in front of every payment the agent tries to make and run the check first. It happens in under half a second, so the agent never slows down and nothing live breaks. The payment only goes through once it passes.',
    everyBullets: [
      '• Plugs in with one line of code',
      '• Allow, ask a human, or block — in one quick check',
      "• A record that can't be secretly changed, every time",
      '• Live updates to your dashboard',
    ],

    detectCards: [
      {
        accent: 'specter',
        title: 'Where did it come from?',
        body: "The real question isn't “does this look like fraud.” It's “did this come from you — or from a web page the agent just read?”",
      },
      {
        accent: 'specter',
        title: 'Hard rules first',
        body: "Your caps, your approved list, and your no-go actions are hard rules. They run first, so a hidden instruction can't talk its way past them.",
      },
      {
        accent: 'specter',
        title: 'An AI second opinion',
        body: "A fast AI check catches new tricks the rules haven't seen. It only adds a flag — it never decides alone, because it can be fooled too.",
      },
    ],
    detectionLink: 'How detection works →',
  },
} as const;

export default function ProductPage() {
  const { lang } = useLang();
  const t = COPY[lang];

  return (
    <>
      <Section className="!pb-8">
        <SectionHead eyebrow={t.heroEyebrow} title={t.heroTitle} sub={t.heroSub} />
      </Section>

      <Section className="!py-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <Pill tone="specter">{t.rulesPill}</Pill>
            <h3 className="mt-3 text-lg font-semibold text-ink">{t.rulesTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">{t.rulesBody}</p>
            <ul className="mt-4 space-y-2 text-sm text-ink-dim">
              {t.rulesBullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <Pill tone="block">{t.everyPill}</Pill>
            <h3 className="mt-3 text-lg font-semibold text-ink">{t.everyTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">{t.everyBody}</p>
            <ul className="mt-4 space-y-2 text-sm text-ink-dim">
              {t.everyBullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      <Section className="!pt-4">
        <div className="grid gap-4 md:grid-cols-3">
          {t.detectCards.map((card) => (
            <Card key={card.title} accent={card.accent}>
              <h3 className="text-base font-semibold text-ink">{card.title}</h3>
              <p className="mt-2 text-sm text-ink-dim">{card.body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/security" className="btn-ghost">
            {t.detectionLink}
          </Link>
        </div>
      </Section>
    </>
  );
}
