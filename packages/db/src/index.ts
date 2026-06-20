import { getServiceClient, isSupabaseConfigured } from './client.js';
import { MemoryStore, type SpecterStore } from './store.js';
import { SupabaseStore } from './supabase-store.js';

export * from './client.js';
export * from './demo-data.js';
export * from './store.js';
export * from './supabase-store.js';
export * from './types.js';

let singleton: SpecterStore | null = null;

/**
 * Returns the active store: Supabase if configured, otherwise an in-memory
 * MemoryStore (MOCK mode) so the demo runs with zero external dependencies.
 */
export function getStore(): SpecterStore {
  if (!singleton) {
    singleton = isSupabaseConfigured() ? new SupabaseStore(getServiceClient()) : new MemoryStore();
    if (!isSupabaseConfigured()) {
      // eslint-disable-next-line no-console
      console.warn('[specter/db] SUPABASE_URL not set — using in-memory MOCK store.');
    }
  }
  return singleton;
}

export { MemoryStore };
