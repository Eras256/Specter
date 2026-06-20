'use client';

import type { User } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { getSupabase } from './supabase';

interface AuthState {
  user: User | null;
  loading: boolean;
  /** True when Supabase is configured (auth is available). */
  enabled: boolean;
  signInPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signUpPassword: (
    email: string,
    password: string,
  ) => Promise<{ error?: string; needsConfirm?: boolean }>;
  signInMagic: (email: string) => Promise<{ error?: string; sent?: boolean }>;
  signOut: () => Promise<void>;
}

const noop = async () => ({});
const Ctx = createContext<AuthState>({
  user: null,
  loading: true,
  enabled: false,
  signInPassword: noop,
  signUpPassword: noop,
  signInMagic: noop,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const sb = getSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sb) {
      setLoading(false);
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  const signInPassword = async (email: string, password: string) => {
    if (!sb) return { error: 'Auth not configured' };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  };

  // Send confirmation / magic-link emails back to whatever origin the user is on
  // (the live domain in prod, localhost in dev) — no hardcoded URL. The origin
  // must be allow-listed in Supabase → Authentication → URL Configuration.
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined;

  const signUpPassword = async (email: string, password: string) => {
    if (!sb) return { error: 'Auth not configured' };
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) return { error: error.message };
    // No session returned ⇒ the project requires email confirmation.
    return { needsConfirm: !data.session };
  };

  const signInMagic = async (email: string) => {
    if (!sb) return { error: 'Auth not configured' };
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    return { error: error?.message, sent: !error };
  };

  const signOut = async () => {
    await sb?.auth.signOut();
  };

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        enabled: Boolean(sb),
        signInPassword,
        signUpPassword,
        signInMagic,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
