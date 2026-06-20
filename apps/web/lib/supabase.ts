'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Public config (inlined at build time). When the Supabase + API vars are set,
// the dashboard runs in LIVE mode (real incidents over Realtime + approve/reject
// through the decision API). When they're absent, the dashboard falls back to a
// self-contained simulation so the demo always works.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  '';

export const SPECTER_API_URL = (process.env.NEXT_PUBLIC_SPECTER_API_URL ?? '').replace(/\/$/, '');
export const SPECTER_API_KEY = process.env.NEXT_PUBLIC_SPECTER_API_KEY ?? '';

/** True when the dashboard can talk to a real backend (Realtime + API). */
export const LIVE_BACKEND = Boolean(
  SUPABASE_URL && SUPABASE_ANON && SPECTER_API_URL && SPECTER_API_KEY,
);

let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
  }
  return client;
}
