'use client';

import Link from 'next/link';
import { useLang } from '@/lib/i18n';
import { Logo } from './Logo';

type L = { es: string; en: string; href: string };

const COLS: { title: { es: string; en: string }; links: L[] }[] = [
  {
    title: { es: 'Producto', en: 'Product' },
    links: [
      { es: 'Producto', en: 'Product', href: '/product' },
      { es: 'Cómo funciona', en: 'How it works', href: '/how-it-works' },
      { es: 'Casos de uso', en: 'Use cases', href: '/use-cases' },
      { es: 'Demo en vivo', en: 'Live demo', href: '/demo' },
    ],
  },
  {
    title: { es: 'Desarrolladores', en: 'Developers' },
    links: [
      { es: 'Docs', en: 'Docs', href: '/docs' },
      { es: 'Seguridad', en: 'Security', href: '/security' },
      { es: 'Panel', en: 'Dashboard', href: '/dashboard' },
      { es: 'Empezar', en: 'Get started', href: '/get-started' },
    ],
  },
  {
    title: { es: 'Empresa', en: 'Company' },
    links: [
      { es: 'Precios', en: 'Pricing', href: '/pricing' },
      { es: 'Agenda una demo', en: 'Book a demo', href: '/get-started' },
      { es: 'Estado', en: 'Status', href: '/dashboard' },
      { es: 'Cambios', en: 'Changelog', href: '/docs' },
    ],
  },
];

const T = {
  es: {
    tagline:
      'Seguridad para agentes de IA que gastan dinero. Atrapa el secuestro, frena el pago, prueba qué pasó.',
    rights: 'Seguridad para la economía de agentes.',
    mono: 'responde en menos de medio segundo · comprobantes a prueba de manipulación · funciona con cualquier agente',
  },
  en: {
    tagline:
      'Security for AI agents that spend money. Catch the hijack, stop the payment, prove what happened.',
    rights: 'Security for the agent economy.',
    mono: 'answers in under half a second · tamper-proof receipts · works with any agent',
  },
} as const;

export function Footer() {
  const { lang } = useLang();
  const t = T[lang];
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-x grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-dim">{t.tagline}</p>
        </div>
        {COLS.map((col) => (
          <div key={col.title.en}>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              {col.title[lang]}
            </h4>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={`${l.href}-${l.en}`}>
                  <Link
                    href={l.href as never}
                    className="text-sm text-ink-dim transition hover:text-ink"
                  >
                    {l[lang]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col items-start justify-between gap-2 py-5 text-xs text-ink-faint sm:flex-row sm:items-center">
          <span>
            © {new Date().getFullYear()} Specter Security, Inc. · {t.rights}
          </span>
          <span className="mono">{t.mono}</span>
        </div>
      </div>
    </footer>
  );
}
