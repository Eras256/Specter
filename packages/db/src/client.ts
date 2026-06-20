import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Two client flavors:
 *  - service client: used by the decision API. Bypasses RLS; the API scopes
 *    every query by tenant_id itself.
 *  - anon client: used by the dashboard as an authenticated user; RLS applies.
 *
 * When SUPABASE_URL is unset we are in MOCK mode (local demo with no real DB);
 * callers should branch on `isSupabaseConfigured()` and use the in-memory store.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let serviceClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Supabase service client requested but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set',
    );
  }
  if (!serviceClient) {
    serviceClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serviceClient;
}

export function getAnonClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, { auth: { persistSession: true } });
}
