'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuditTrail } from '@/components/dashboard/AuditTrail';
import { Feed } from '@/components/dashboard/Feed';
import { Incidents } from '@/components/dashboard/Incidents';
import { PolicyWizard } from '@/components/PolicyWizard';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';

const TABS = [
  { id: 'feed', es: 'Pagos', en: 'Payments' },
  { id: 'incidents', es: 'Incidentes', en: 'Incidents' },
  { id: 'audit', es: 'Prueba', en: 'Proof' },
  { id: 'policy', es: 'Reglas', en: 'Rules' },
] as const;

type Tab = (typeof TABS)[number]['id'];

const COPY = {
  es: {
    eyebrow: 'Panel · Demo Co',
    h1: 'Tus agentes, en vivo',
    paragraph:
      'Cada pago que hacen tus agentes, decidido en tiempo real — la mayoría pasa directo, los malos se atrapan y se frenan, y de cada uno queda prueba.',
    status: 'en vivo · ~0.4s por verificación',
    signedInAs: 'Sesión iniciada como',
    viewingDemo: 'Estás viendo el demo (datos de Demo Co).',
    signIn: 'Entrar →',
  },
  en: {
    eyebrow: 'Dashboard · Demo Co',
    h1: 'Your agents, live',
    paragraph:
      'Every payment your agents make, decided in real time — most go straight through, the bad ones get caught and stopped, and every one leaves proof.',
    status: 'live · ~0.4s per check',
    signedInAs: 'Signed in as',
    viewingDemo: "You're viewing the demo (Demo Co data).",
    signIn: 'Sign in →',
  },
} as const;

export default function Dashboard() {
  const { lang } = useLang();
  const { user, enabled } = useAuth();
  const [tab, setTab] = useState<Tab>('feed');

  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="h-eyebrow">{COPY[lang].eyebrow}</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{COPY[lang].h1}</h1>
          <p className="mt-1 text-sm text-ink-dim">{COPY[lang].paragraph}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-faint">
          <span className="h-2 w-2 animate-pulse-ring rounded-full bg-specter" />
          <span className="mono">{COPY[lang].status}</span>
        </div>
      </div>

      {enabled && (
        <div className="mt-4 rounded-md border border-line bg-panel-2 px-3 py-2 text-xs text-ink-dim">
          {user ? (
            <span>
              {COPY[lang].signedInAs} <span className="text-specter-soft">{user.email}</span>
            </span>
          ) : (
            <span>
              {COPY[lang].viewingDemo}{' '}
              <Link href="/login" className="text-specter-soft underline-offset-4 hover:underline">
                {COPY[lang].signIn}
              </Link>
            </span>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm transition ${
              tab === t.id
                ? 'border-specter text-ink'
                : 'border-transparent text-ink-dim hover:text-ink'
            }`}
          >
            {t[lang]}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'feed' && <Feed />}
        {tab === 'incidents' && <Incidents />}
        {tab === 'audit' && <AuditTrail />}
        {tab === 'policy' && <PolicyWizard />}
      </div>
    </div>
  );
}
