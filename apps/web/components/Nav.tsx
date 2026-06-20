'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';
import { LangToggle } from './LangToggle';
import { Logo } from './Logo';

const LINKS = [
  { href: '/product', es: 'Producto', en: 'Product' },
  { href: '/how-it-works', es: 'Cómo funciona', en: 'How it works' },
  { href: '/use-cases', es: 'Casos de uso', en: 'Use cases' },
  { href: '/security', es: 'Seguridad', en: 'Security' },
  { href: '/pricing', es: 'Precios', en: 'Pricing' },
  { href: '/docs', es: 'Docs', en: 'Docs' },
  { href: '/demo', es: 'Demo en vivo', en: 'Live demo' },
] as const;

const T = {
  es: { dashboard: 'Panel', signIn: 'Entrar', signOut: 'Salir', menu: 'Menú' },
  en: { dashboard: 'Dashboard', signIn: 'Sign in', signOut: 'Sign out', menu: 'Menu' },
} as const;

export function Nav() {
  const pathname = usePathname();
  const { lang } = useLang();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const t = T[lang];

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-bg/80 backdrop-blur">
      <div className="container-x flex h-14 items-center justify-between">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                pathname === l.href ? 'text-ink' : 'text-ink-dim hover:text-ink'
              }`}
            >
              {l[lang]}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <LangToggle />
          <Link href="/dashboard" className="btn-ghost px-3 py-2 text-sm">
            {t.dashboard}
          </Link>
          {user ? (
            <>
              <span
                className="mono max-w-[150px] truncate text-xs text-ink-dim"
                title={user.email ?? ''}
              >
                {user.email}
              </span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="btn-ghost px-3 py-2 text-sm"
              >
                {t.signOut}
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-primary px-3.5 py-2 text-sm">
              {t.signIn}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <LangToggle />
          <button
            type="button"
            className="rounded-md border border-line p-2 text-ink-dim"
            onClick={() => setOpen((v) => !v)}
            aria-label={t.menu}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-line bg-panel lg:hidden">
          <div className="container-x flex flex-col gap-1 py-3">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-2 py-2 text-sm text-ink-dim"
                onClick={() => setOpen(false)}
              >
                {l[lang]}
              </Link>
            ))}
            {user ? <div className="mt-1 px-2 text-xs text-ink-faint">{user.email}</div> : null}
            <div className="mt-2 flex gap-2">
              <Link href="/dashboard" className="btn-ghost flex-1" onClick={() => setOpen(false)}>
                {t.dashboard}
              </Link>
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    void signOut();
                  }}
                  className="btn-ghost flex-1"
                >
                  {t.signOut}
                </button>
              ) : (
                <Link href="/login" className="btn-primary flex-1" onClick={() => setOpen(false)}>
                  {t.signIn}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
