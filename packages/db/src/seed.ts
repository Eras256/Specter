/**
 * Seed a demo tenant, API key, policy, agents, and a realistic backlog of
 * transactions + audit chain + incidents into Supabase.
 *
 *   pnpm --filter @specter/db seed
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. In MOCK mode (no Supabase)
 * the backlog is created in-memory at API boot instead, so this is a no-op.
 */

import { createHash } from 'node:crypto';
import { appendAuditRecord, GENESIS_HASH } from '@specter/core';
import { getServiceClient, isSupabaseConfigured } from './client.js';
import { buildDemoBacklog } from './demo-data.js';
import { auditBody } from './store.js';

async function main() {
  if (!isSupabaseConfigured()) {
    console.log(
      '[seed] SUPABASE_URL not configured — skipping. The API seeds an in-memory backlog automatically in MOCK mode.',
    );
    return;
  }

  const db = getServiceClient();
  const apiKey = process.env.SPECTER_API_KEY || 'dev_tenant_key';
  const keyHash = createHash('sha256').update(apiKey, 'utf8').digest('hex');

  console.log('[seed] creating demo tenant…');
  const { data: tenant, error: tErr } = await db
    .from('tenants')
    .insert({ name: 'Demo Co' })
    .select('id')
    .single();
  if (tErr || !tenant) throw new Error(`tenant insert failed: ${tErr?.message}`);
  const tenantId = tenant.id as string;

  await db.from('api_keys').insert({
    tenant_id: tenantId,
    label: 'default',
    key_hash: keyHash,
    key_prefix: apiKey.slice(0, 8),
  });

  await db.from('policies').insert({
    tenant_id: tenantId,
    per_tx_cap: 500,
    monthly_cap: 5000,
    allowlist: [
      'Acme Store',
      'acct_acme_store',
      'CloudHost Inc',
      'acct_cloudhost',
      'Figma',
      'acct_figma_saas',
    ],
    allowed_categories: [],
    require_approval_on_new_destination: true,
    notification_email: process.env.NOTIFICATION_EMAIL ?? null,
  });

  console.log('[seed] inserting backlog…');
  const backlog = [...buildDemoBacklog()].sort((a, b) => b.ageMinutes - a.ageMinutes);
  let prevHash = GENESIS_HASH;
  let seq = 0;
  for (const d of backlog) {
    const at = new Date(Date.now() - d.ageMinutes * 60_000).toISOString();
    const { data: agent } = await db
      .from('agents')
      .upsert(
        { tenant_id: tenantId, name: d.agent, last_seen: at },
        { onConflict: 'tenant_id,name' },
      )
      .select('id')
      .single();

    const { data: txn } = await db
      .from('transactions')
      .insert({
        tenant_id: tenantId,
        agent_id: agent?.id ?? null,
        session_id: d.session,
        type: d.type,
        amount: d.amount || null,
        currency: d.currency,
        destination: d.destination,
        merchant_claimed: d.merchantClaimed || null,
        decision: d.decision,
        risk_score: d.riskScore,
        reason: d.reason,
        signals: d.signals,
        created_at: at,
      })
      .select('*')
      .single();
    if (!txn) continue;

    const appended = appendAuditRecord(prevHash, auditBody(txn as never), seq);
    await db.from('audit_log').insert({
      tenant_id: tenantId,
      seq,
      record: appended.record,
      prev_hash: appended.prevHash,
      hash: appended.hash,
      created_at: at,
    });
    prevHash = appended.hash;
    seq++;

    if (d.decision !== 'allow') {
      await db.from('incidents').insert({
        tenant_id: tenantId,
        transaction_id: (txn as { id: string }).id,
        severity: d.decision === 'deny' ? 'critical' : 'high',
        status: 'open',
        created_at: at,
      });
    }
  }

  console.log(`[seed] done. tenant=${tenantId} records=${seq} apiKey=${apiKey}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
