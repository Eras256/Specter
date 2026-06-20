/**
 * Apply the SQL migrations in packages/db/migrations to a Postgres database, in
 * order (0001 → 0002 → 0003). Reads SUPABASE_DB_URL (a direct Postgres
 * connection string).
 *
 * Supabase's direct host is IPv6-only, so run this from a network that can reach
 * it. Locally if your ISP has IPv6, otherwise from a Fly machine:
 *
 *   fly ssh console -a specter-decision-api \
 *     -C "node --import tsx node_modules/@specter/db/src/migrate.ts"
 *
 * Idempotent: re-running tolerates already-applied objects.
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = [
  '0001_init.sql',
  '0002_rls.sql',
  '0003_realtime.sql',
  '0004_v2_hardening.sql',
  '0005_demo_realtime_read.sql',
  '0006_auth_provisioning.sql',
];

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error('SUPABASE_DB_URL is not set');

  const sql = postgres(url, { max: 1, prepare: false, ssl: 'require' });
  try {
    for (const file of MIGRATIONS) {
      const ddl = await readFile(join(here, '..', 'migrations', file), 'utf8');
      process.stdout.write(`[migrate] ${file} … `);
      try {
        await sql.unsafe(ddl);
        console.log('ok');
      } catch (e) {
        const msg = (e as Error).message.split('\n')[0] ?? '';
        // Tolerate re-runs: duplicate policies / publication membership / objects.
        if (/already exists|already .*member|duplicate|already enabled/i.test(msg)) {
          console.log(`skipped (${msg})`);
        } else {
          throw e;
        }
      }
    }
    console.log('[migrate] done.');
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error('[migrate] failed:', e);
  process.exit(1);
});
