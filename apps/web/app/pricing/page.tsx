'use client';

import Link from 'next/link';
import { Pill, Section, SectionHead } from '@/components/ui';
import { useLang } from '@/lib/i18n';

const COPY = {
  es: {
    eyebrow: 'Precios',
    title: 'Paga solo por lo que proteges.',
    sub: 'Pagas por pago que revisamos — eso es todo. Sin cuotas por usuario, sin mínimos sorpresa. Empieza gratis y crece al ritmo de tus agentes.',
    mostPopular: 'Más popular',
    example:
      'Ejemplo: 500k revisiones/mes en Pro ≈ $1,000 — y bloquear una sola nómina secuestrada se paga solo muchas veces.',
    tiers: [
      {
        name: 'Gratis',
        price: '$0',
        unit: '/ mes',
        blurb: 'Para creadores y proyectos personales.',
        cta: 'Empezar gratis',
        href: '/get-started',
        featured: false,
        features: [
          '10,000 revisiones / mes',
          'Rastrea de dónde vienen las solicitudes, más tus propias reglas',
          'Comprobantes a prueba de manipulación',
          'Soporte de la comunidad',
          '1 conjunto de reglas, 1 espacio de trabajo',
        ],
      },
      {
        name: 'Pro',
        price: '$0.002',
        unit: '/ pago que revisamos',
        blurb: 'Paga solo por lo que usas. Pagas por cada pago que Specter revisa.',
        cta: 'Empezar',
        href: '/get-started',
        featured: true,
        features: [
          'Agentes y reglas ilimitados',
          'Panel + feed en vivo',
          'Cola de aprobación in-app + alertas a Slack',
          'IA que detecta solicitudes sospechosas',
          'Soporte por correo, 99.9% de disponibilidad',
        ],
      },
      {
        name: 'Empresa',
        price: 'Hablemos',
        unit: '',
        blurb: 'Para equipos regulados y uso de alto volumen.',
        cta: 'Agenda una demo',
        href: '/get-started',
        featured: false,
        features: [
          'Conserva los comprobantes por más tiempo, exporta pruebas cuando quieras',
          'SSO / SAML, RBAC',
          'Ejecútalo en tus propios servidores (on-prem / VPC)',
          'Rieles de pago personalizados (Issuing, Pomelo, x402)',
          'SLA + soporte dedicado',
        ],
      },
    ],
  },
  en: {
    eyebrow: 'Pricing',
    title: 'Pay only for what you protect.',
    sub: "You pay per payment we check — that's it. No per-seat fees, no surprise minimums. Start free and grow as your agents do.",
    mostPopular: 'Most popular',
    example:
      'Example: 500k checks/mo on Pro ≈ $1,000 — and blocking just one hijacked payroll run pays for itself many times over.',
    tiers: [
      {
        name: 'Free',
        price: '$0',
        unit: '/ month',
        blurb: 'For builders and side projects.',
        cta: 'Start free',
        href: '/get-started',
        featured: false,
        features: [
          '10,000 checks / mo',
          'Tracks where requests come from, plus your own rules',
          'Tamper-proof receipts',
          'Community support',
          '1 rule set, 1 workspace',
        ],
      },
      {
        name: 'Pro',
        price: '$0.002',
        unit: '/ payment we check',
        blurb: 'Pay only for what you use. You pay per payment Specter checks.',
        cta: 'Get started',
        href: '/get-started',
        featured: true,
        features: [
          'Unlimited agents & rules',
          'Dashboard + live feed',
          'In-app approval queue + Slack alerts',
          'AI that spots suspicious requests',
          'Email support, 99.9% uptime',
        ],
      },
      {
        name: 'Enterprise',
        price: "Let's talk",
        unit: '',
        blurb: 'For regulated teams and high-volume use.',
        cta: 'Book a demo',
        href: '/get-started',
        featured: false,
        features: [
          'Keep receipts longer, export proof anytime',
          'SSO / SAML, RBAC',
          'Run it on your own servers (on-prem / VPC)',
          'Custom payment rails (Issuing, Pomelo, x402)',
          'SLA + dedicated support',
        ],
      },
    ],
  },
} as const;

export default function Pricing() {
  const { lang } = useLang();
  const t = COPY[lang];
  return (
    <>
      <Section className="!pb-6">
        <SectionHead eyebrow={t.eyebrow} title={t.title} sub={t.sub} center />
      </Section>
      <Section className="!pt-2">
        <div className="grid gap-4 lg:grid-cols-3">
          {t.tiers.map((tier) => (
            <div
              key={tier.name}
              className={`panel relative flex flex-col p-6 ${
                tier.featured ? 'border-specter/50 shadow-glow' : ''
              }`}
            >
              {tier.featured && (
                <span className="absolute right-5 top-5">
                  <Pill tone="specter">{t.mostPopular}</Pill>
                </span>
              )}
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-dim">
                {tier.name}
              </h3>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-3xl font-semibold text-ink">{tier.price}</span>
                <span className="mb-1 text-sm text-ink-faint">{tier.unit}</span>
              </div>
              <p className="mt-2 text-sm text-ink-dim">{tier.blurb}</p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-ink-dim">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="mt-0.5 text-safe">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={tier.href}
                className={`mt-6 ${tier.featured ? 'btn-primary' : 'btn-ghost'} w-full`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-ink-faint">{t.example}</p>
      </Section>
    </>
  );
}
