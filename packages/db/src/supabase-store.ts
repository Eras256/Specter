import {
  type AuditRecord,
  appendAuditRecord,
  GENESIS_HASH,
  type Policy,
  type RuntimeState,
  type VerifyResult,
  verifyChain,
} from '@specter/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  auditBody,
  DEFAULT_POLICY,
  type IncidentView,
  policyRowToPolicy,
  type RecordDecisionInput,
  type RecordedDecision,
  type SpecterStore,
  sha256Hex,
} from './store.js';
import type { AuditRow, IncidentRow, PolicyRow, TransactionRow } from './types.js';

/**
 * Supabase-backed store. Uses the service-role client (RLS bypassed) and scopes
 * every query by tenant_id explicitly.
 *
 * NOTE on the hash chain: appends read the current head (max seq) then insert
 * seq+1. The unique(tenant_id, seq) constraint makes a concurrent double-append
 * fail loudly rather than fork the chain. For the demo's throughput this is
 * sufficient; a production build would serialize appends in a DB function.
 */
export class SupabaseStore implements SpecterStore {
  constructor(private db: SupabaseClient) {}

  async getTenantByApiKey(rawKey: string) {
    const keyHash = sha256Hex(rawKey);
    const { data, error } = await this.db
      .from('api_keys')
      .select('tenant_id, revoked_at, tenants(name)')
      .eq('key_hash', keyHash)
      .is('revoked_at', null)
      .maybeSingle();
    if (error || !data) return null;
    const tenants = data.tenants as unknown as { name: string } | null;
    return { tenantId: data.tenant_id as string, tenantName: tenants?.name ?? 'tenant' };
  }

  async getPolicy(tenantId: string): Promise<Policy> {
    const { data } = await this.db
      .from('policies')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    return data ? policyRowToPolicy(data as PolicyRow) : DEFAULT_POLICY;
  }

  async getRuntimeState(tenantId: string, _agentName: string): Promise<RuntimeState> {
    const policy = await this.getPolicy(tenantId);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const windowStart = new Date(Date.now() - policy.velocityWindowMs).toISOString();

    const { data: txns } = await this.db
      .from('transactions')
      .select('amount, destination, decision, type, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(500);

    const rows = (txns ?? []) as Array<Partial<TransactionRow>>;
    const isPayment = (t?: string) => t === 'payment' || t === 'refund';
    const spentThisMonth = rows
      .filter(
        (t) =>
          t.decision === 'allow' &&
          isPayment(t.type) &&
          t.created_at &&
          new Date(t.created_at) >= monthStart,
      )
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const paymentsInWindow = rows.filter(
      (t) => isPayment(t.type) && t.created_at && t.created_at >= windowStart,
    ).length;
    const knownDestinations = Array.from(
      new Set(
        rows
          .filter((t) => t.decision === 'allow' && t.destination)
          .map((t) => t.destination as string),
      ),
    );
    return { spentThisMonth, paymentsInWindow, knownDestinations };
  }

  async recordDecision(input: RecordDecisionInput): Promise<RecordedDecision> {
    // Resolve or create the agent.
    let agentId: string | null = null;
    {
      const { data: agent } = await this.db
        .from('agents')
        .upsert(
          { tenant_id: input.tenantId, name: input.agentName, last_seen: new Date().toISOString() },
          { onConflict: 'tenant_id,name' },
        )
        .select('id')
        .single();
      agentId = (agent?.id as string) ?? null;
    }

    const { data: txnData, error: txnErr } = await this.db
      .from('transactions')
      .insert({
        tenant_id: input.tenantId,
        agent_id: agentId,
        session_id: input.sessionId,
        type: input.type,
        amount: input.amount ?? null,
        currency: input.currency ?? null,
        destination: input.destination ?? null,
        merchant_claimed: input.merchantClaimed ?? null,
        decision: input.result.decision,
        risk_score: input.result.riskScore,
        reason: input.result.reason,
        signals: input.result.signals,
      })
      .select('*')
      .single();
    if (txnErr || !txnData) throw new Error(`failed to write transaction: ${txnErr?.message}`);
    const txn = txnData as TransactionRow;

    // Append to the hash chain. Serialized via optimistic retry: unique(tenant_id,
    // seq) makes a concurrent double-append fail with 23505 (unique_violation); we
    // re-read the head and retry, so N concurrent evaluations still produce ONE
    // gap-free, valid chain — never a fork or a reused seq.
    let auditData: AuditRow | null = null;
    for (let attempt = 0; attempt < 8 && !auditData; attempt++) {
      const { data: head } = await this.db
        .from('audit_log')
        .select('seq, hash')
        .eq('tenant_id', input.tenantId)
        .order('seq', { ascending: false })
        .limit(1)
        .maybeSingle();
      const prevSeq = head ? Number(head.seq) : -1;
      const prevHash = head ? (head.hash as string) : GENESIS_HASH;
      const nextSeq = prevSeq + 1;
      const appended = appendAuditRecord(prevHash, auditBody(txn), nextSeq);

      const { data, error } = await this.db
        .from('audit_log')
        .insert({
          tenant_id: input.tenantId,
          seq: nextSeq,
          record: appended.record,
          prev_hash: appended.prevHash,
          hash: appended.hash,
        })
        .select('*')
        .single();
      if (!error && data) {
        auditData = data as AuditRow;
        break;
      }
      if (error && (error as { code?: string }).code !== '23505') {
        throw new Error(`failed to write audit record: ${error.message}`);
      }
      // else: another append took this seq — loop and retry against the new head.
    }
    if (!auditData) {
      throw new Error('failed to append audit record after retries (chain contention)');
    }

    let incident: IncidentRow | undefined;
    if (input.result.decision !== 'allow') {
      const { data: inc } = await this.db
        .from('incidents')
        .insert({
          tenant_id: input.tenantId,
          transaction_id: txn.id,
          severity: input.result.decision === 'deny' ? 'critical' : 'high',
          status: 'open',
        })
        .select('*')
        .single();
      incident = (inc as IncidentRow) ?? undefined;
    }

    return { transaction: txn, audit: auditData as AuditRow, incident };
  }

  async listTransactions(tenantId: string, limit = 50, offset = 0): Promise<TransactionRow[]> {
    const { data } = await this.db
      .from('transactions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return (data ?? []) as TransactionRow[];
  }

  async listAudit(tenantId: string, limit = 100, offset = 0): Promise<AuditRow[]> {
    const { data } = await this.db
      .from('audit_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('seq', { ascending: true })
      .range(offset, offset + limit - 1);
    return (data ?? []) as AuditRow[];
  }

  async verifyAudit(tenantId: string): Promise<VerifyResult> {
    const rows = await this.listAudit(tenantId, 100_000, 0);
    const chain: AuditRecord[] = rows.map((r) => ({
      seq: Number(r.seq),
      record: r.record,
      prevHash: r.prev_hash,
      hash: r.hash,
    }));
    return verifyChain(chain);
  }

  /**
   * DEMO-ONLY. Mutates a past record through the isolated, GUC-gated service path
   * (`specter_demo_tamper`), the only write the append-only trigger permits.
   * Used by the dashboard "tamper" button to make `verifyAudit` turn red live.
   */
  async tamperAudit(tenantId: string, seq: number): Promise<void> {
    const { error } = await this.db.rpc('specter_demo_tamper', {
      p_tenant: tenantId,
      p_seq: seq,
    });
    if (error) throw new Error(`tamper failed: ${error.message}`);
  }

  async listIncidents(tenantId: string, limit = 50): Promise<IncidentView[]> {
    const { data } = await this.db
      .from('incidents')
      .select(
        'id, status, severity, created_at, transactions(agent_id, amount, currency, destination, merchant_claimed, decision, reason)',
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const t = (row.transactions ?? {}) as Record<string, unknown>;
      return {
        id: row.id as string,
        status: row.status as IncidentView['status'],
        severity: row.severity as string,
        createdAt: row.created_at as string,
        agent: (t.agent_id as string) ?? null,
        amount: (t.amount as number) ?? null,
        currency: (t.currency as string) ?? null,
        destination: (t.destination as string) ?? null,
        merchantClaimed: (t.merchant_claimed as string) ?? null,
        decision: (t.decision as string) ?? 'deny',
        reason: (t.reason as string) ?? null,
      };
    });
  }

  async resolveIncident(
    tenantId: string,
    incidentId: string,
    status: 'approved' | 'rejected',
  ): Promise<void> {
    const { error } = await this.db
      .from('incidents')
      .update({ status, resolved_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', incidentId);
    if (error) throw new Error(`resolve incident failed: ${error.message}`);
  }
}
