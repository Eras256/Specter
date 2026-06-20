import { serve } from '@hono/node-server';
import { getStore, isSupabaseConfigured, MemoryStore } from '@specter/db';
import { createApp } from './app.js';
import { env } from './env.js';

async function bootstrap() {
  // In MOCK mode, seed an in-memory backlog so the dashboard looks alive.
  if (!isSupabaseConfigured()) {
    const store = getStore();
    if (store instanceof MemoryStore) {
      await store.seedBacklog('demo-tenant');
    }
  }

  const app = createApp();
  serve({ fetch: app.fetch, port: env.port }, (info) => {
    const mode = isSupabaseConfigured() ? 'supabase' : 'MOCK';
    const llm = env.anthropicApiKey ? `llm:${env.detectorModel}` : 'llm:heuristic';
    // eslint-disable-next-line no-console
    console.log(`🛡️  Specter decision API on :${info.port}  [store:${mode}] [${llm}]`);
  });
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('failed to start Specter API', e);
  process.exit(1);
});
