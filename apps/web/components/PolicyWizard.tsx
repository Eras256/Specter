'use client';

import { useState } from 'react';
import { useLang } from '@/lib/i18n';

const COPY = {
  es: {
    perTxCapLabel: 'Límite por transacción',
    perTxCapHint: 'Tope máximo para un solo pago.',
    merchantsLabel: 'Negocios aprobados',
    merchantsHint: 'Separados por comas. Beneficiarios de confianza.',
    approveNewLabel: 'Destino nuevo → requiere aprobación',
    approveNewHint: 'Nunca le pagues a una cuenta desconocida en silencio.',
    notificationEmailLabel: 'Email de notificaciones (opcional)',
    notificationEmailHint:
      'A dónde llegan los avisos de incidentes. La aprobación pasa en el panel.',
    monthlyCapNote: 'límite mensual fijado automáticamente en',
    saveButton: 'Guardar política',
    savedButton: '✓ Política guardada',
    resultingPolicy: 'política resultante',
    notificationEmailPlaceholder: 'you@company.com',
  },
  en: {
    perTxCapLabel: 'Per-transaction cap',
    perTxCapHint: 'Hard ceiling for a single payment.',
    merchantsLabel: 'Approved merchants',
    merchantsHint: 'Comma-separated. Trusted beneficiaries.',
    approveNewLabel: 'New destination → require approval',
    approveNewHint: 'Never silently pay an unknown account.',
    notificationEmailLabel: 'Notification email (optional)',
    notificationEmailHint:
      'Where incident notifications go. The approval itself happens in the dashboard.',
    monthlyCapNote: 'monthly cap auto-set to',
    saveButton: 'Save policy',
    savedButton: '✓ Policy saved',
    resultingPolicy: 'resulting policy',
    notificationEmailPlaceholder: 'you@company.com',
  },
} as const;

/**
 * The control plane — deliberately low-friction (3–4 fields). 60-second setup is
 * a feature. Writes to Supabase in production; here it shows the resulting policy
 * JSON and confirms.
 */
export function PolicyWizard({ embedded = false }: { embedded?: boolean }) {
  const { lang } = useLang();
  const t = COPY[lang];
  const [perTxCap, setPerTxCap] = useState(500);
  const [merchants, setMerchants] = useState('Acme Store, CloudHost Inc, Figma');
  const [approveNew, setApproveNew] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [saved, setSaved] = useState(false);

  const policy = {
    perTxCap,
    monthlyCap: perTxCap * 10,
    allowlist: merchants
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    requireApprovalOnNewDestination: approveNew,
    notificationEmail: notificationEmail || undefined,
  };

  return (
    <div className={embedded ? '' : 'mx-auto max-w-xl'}>
      <div className="panel p-6">
        <div className="space-y-5">
          <Field label={t.perTxCapLabel} hint={t.perTxCapHint}>
            <div className="flex items-center gap-2">
              <span className="text-ink-faint">$</span>
              <input
                type="number"
                value={perTxCap}
                onChange={(e) => setPerTxCap(Number(e.target.value))}
                className="w-32 rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-ink outline-none focus:border-specter/60"
              />
              <span className="mono text-xs text-ink-faint">{`${t.monthlyCapNote} $${perTxCap * 10}`}</span>
            </div>
          </Field>

          <Field label={t.merchantsLabel} hint={t.merchantsHint}>
            <input
              value={merchants}
              onChange={(e) => setMerchants(e.target.value)}
              className="w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-ink outline-none focus:border-specter/60"
            />
          </Field>

          <Field label={t.approveNewLabel} hint={t.approveNewHint}>
            <button
              type="button"
              onClick={() => setApproveNew((v) => !v)}
              className={`relative h-6 w-11 rounded-full border transition ${
                approveNew ? 'border-specter/60 bg-specter/30' : 'border-line bg-panel'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
                  approveNew ? 'left-[22px] bg-specter' : 'left-0.5 bg-ink-faint'
                }`}
              />
            </button>
          </Field>

          <Field label={t.notificationEmailLabel} hint={t.notificationEmailHint}>
            <input
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder={t.notificationEmailPlaceholder}
              className="w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-specter/60"
            />
          </Field>

          <button
            type="button"
            onClick={() => {
              setSaved(true);
              setTimeout(() => setSaved(false), 2600);
            }}
            className="btn-primary w-full"
          >
            {saved ? t.savedButton : t.saveButton}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="mono mb-2 text-[11px] text-ink-faint">{t.resultingPolicy}</div>
        <pre className="panel scroll-thin overflow-x-auto p-4">
          <code className="mono text-[12px] text-ink-dim">{JSON.stringify(policy, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="block text-sm font-medium text-ink">{label}</span>
      <p className="mb-2 text-xs text-ink-faint">{hint}</p>
      {children}
    </div>
  );
}
