'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Pill, Section } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';

type Mode = 'signin' | 'signup';

const COPY = {
  es: {
    eyebrow: 'Cuenta',
    title: 'Entra a Specter',
    subtitle: 'Controla los pagos de tus agentes.',
    modeSignin: 'Iniciar sesión',
    modeSignup: 'Crear cuenta',
    emailLabel: 'Correo',
    emailPlaceholder: 'tu@empresa.com',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: '••••••••',
    submitSignin: 'Iniciar sesión',
    submitSignup: 'Crear cuenta',
    magicButton: 'Envíame un enlace mágico',
    orDivider: 'o',
    busy: 'Procesando…',
    needsConfirm: 'Revisa tu correo para confirmar tu cuenta.',
    magicSent: 'Te enviamos un enlace mágico — revisa tu correo.',
    disabledNote: 'El inicio de sesión necesita Supabase configurado (NEXT_PUBLIC_SUPABASE_URL).',
    signedInAs: (email: string) => `Has iniciado sesión como ${email}`,
    goDashboard: 'Ir al panel',
    signOut: 'Cerrar sesión',
    emailRequired: 'Ingresa tu correo.',
  },
  en: {
    eyebrow: 'Account',
    title: 'Sign in to Specter',
    subtitle: "Govern your agents' payments.",
    modeSignin: 'Sign in',
    modeSignup: 'Create account',
    emailLabel: 'Email',
    emailPlaceholder: 'you@company.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    submitSignin: 'Sign in',
    submitSignup: 'Create account',
    magicButton: 'Email me a magic link',
    orDivider: 'or',
    busy: 'Working…',
    needsConfirm: 'Check your email to confirm your account.',
    magicSent: 'Magic link sent — check your email.',
    disabledNote: 'Sign-in needs Supabase configured (NEXT_PUBLIC_SUPABASE_URL).',
    signedInAs: (email: string) => `You're signed in as ${email}`,
    goDashboard: 'Go to dashboard',
    signOut: 'Sign out',
    emailRequired: 'Enter your email.',
  },
} as const;

export default function LoginPage() {
  const { lang } = useLang();
  const t = COPY[lang];
  const router = useRouter();
  const { user, enabled, signInPassword, signUpPassword, signInMagic, signOut } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const inputClass =
    'w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-specter/60';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!enabled || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signin') {
        const res = await signInPassword(email, password);
        if (res.error) {
          setError(res.error);
        } else {
          router.push('/dashboard');
        }
      } else {
        const res = await signUpPassword(email, password);
        if (res.error) {
          setError(res.error);
        } else if (res.needsConfirm) {
          setNotice(t.needsConfirm);
        } else {
          router.push('/dashboard');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleMagic = async () => {
    if (!enabled || busy) return;
    if (!email) {
      setError(t.emailRequired);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await signInMagic(email);
      if (res.error) {
        setError(res.error);
      } else if (res.sent) {
        setNotice(t.magicSent);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section className="flex min-h-[70vh] items-center justify-center">
      <div className="panel w-full max-w-md p-6 sm:p-8">
        <div className="text-center">
          <Pill>{t.eyebrow}</Pill>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">{t.title}</h1>
          <p className="mt-2 text-sm text-ink-dim">{t.subtitle}</p>
        </div>

        {user ? (
          <div className="mt-6 space-y-4">
            <p className="text-center text-sm text-ink-dim">{t.signedInAs(user.email ?? '')}</p>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="btn-primary w-full"
            >
              {t.goDashboard}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={busy}
              className="btn-ghost w-full"
            >
              {t.signOut}
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-md border border-line bg-panel-2 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setNotice(null);
                }}
                className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                  mode === 'signin'
                    ? 'bg-specter/20 text-specter-soft'
                    : 'text-ink-dim hover:text-ink'
                }`}
              >
                {t.modeSignin}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setNotice(null);
                }}
                className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                  mode === 'signup'
                    ? 'bg-specter/20 text-specter-soft'
                    : 'text-ink-dim hover:text-ink'
                }`}
              >
                {t.modeSignup}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="email" className="text-sm font-medium text-ink">
                  {t.emailLabel}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  disabled={!enabled || busy}
                  className={`mt-1.5 ${inputClass}`}
                />
              </div>

              <div>
                <label htmlFor="password" className="text-sm font-medium text-ink">
                  {t.passwordLabel}
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  disabled={!enabled || busy}
                  className={`mt-1.5 ${inputClass}`}
                />
              </div>

              {error && <p className="text-block text-sm">{error}</p>}
              {notice && <p className="text-safe text-sm">{notice}</p>}

              <button type="submit" disabled={!enabled || busy} className="btn-primary w-full">
                {busy ? t.busy : mode === 'signin' ? t.submitSignin : t.submitSignup}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-ink-faint">
              <span className="h-px flex-1 bg-line" />
              <span className="mono uppercase">{t.orDivider}</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <button
              type="button"
              onClick={handleMagic}
              disabled={!enabled || busy}
              className="btn-ghost w-full"
            >
              {t.magicButton}
            </button>

            {!enabled && (
              <p className="mt-5 text-center text-xs text-ink-faint">{t.disabledNote}</p>
            )}
          </>
        )}
      </div>
    </Section>
  );
}
