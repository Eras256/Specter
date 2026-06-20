import { createHash } from 'node:crypto';
import {
  type AuditRecord,
  appendAuditRecord,
  type Decision,
  type DecisionResult,
  GENESIS_HASH,
  type Policy,
  type RuntimeState,
  type VerifyResult,
  verifyChain,
} from '@specter/core';
import { buildDemoBacklog } from './demo-data.js';
import type { AuditRow, IncidentRow, PolicyRow, TransactionRow } from './types.js';

export interface RecordDecisionInput {
  tenantId: string;
  agentName: string;
  sessionId: string;
  type: string;
  amount?: number;
  currency?: string;
  destination?: string;
  merchantClaimed?: string;
  result: DecisionResult;
  raw: unknown;
}

export interface RecordedDecision {
  transaction: TransactionRow;
  audit: AuditRow;
  incident?: IncidentRow;
}

/** A dashboard-ready incident joined with its transaction's key fields. */
export interface IncidentView {
  id: string;
  status: 'open' | 'approved' | 'rejected';
  severity: string;
  createdAt: string;
  agent: string | null;
  amount: number | null;
  currency: string | null;
  destination: string | null;
  merchantClaimed: string | null;
  decision: string;
  reason: string | null;
}

/** Storage seam the decision API depends on. Has a Supabase and a memory impl. */
export interface SpecterStore {
  getTenantByApiKey(rawKey: string): Promise<{ tenantId: string; tenantName: string } | null>;
  getPolicy(tenantId: string): Promise<Policy>;
  getRuntimeState(tenantId: string, agentName: string): Promise<RuntimeState>;
  recordDecision(input: RecordDecisionInput): Promise<RecordedDecision>;
  listTransactions(tenantId: string, limit?: number, offset?: number): Promise<TransactionRow[]>;
  listAudit(tenantId: string, limit?: number, offset?: number): Promise<AuditRow[]>;
  verifyAudit(tenantId: string): Promise<VerifyResult>;
  /** DEMO-ONLY: mutate a past record so verification turns red live. */
  tamperAudit(tenantId: string, seq: number): Promise<void>;
  /** Open/recent incidents for the in-app approval queue, joined with the txn. */
  listIncidents(tenantId: string, limit?: number): Promise<IncidentView[]>;
  /** Approve/reject an incident (human-in-the-loop); releases or blocks the action. */
  resolveIncident(
    tenantId: string,
    incidentId: string,
    status: 'approved' | 'rejected',
  ): Promise<void>;
}

export function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

export function policyRowToPolicy(row: PolicyRow): Policy {
  return {
    perTxCap: Number(row.per_tx_cap),
    monthlyCap: Number(row.monthly_cap),
    allowlist: row.allowlist ?? [],
    allowedCategories: row.allowed_categories ?? [],
    requireApprovalOnNewDestination: row.require_approval_on_new_destination,
    notificationEmail: row.notification_email ?? undefined,
    maxPaymentsInWindow: row.max_payments_in_window,
    velocityWindowMs: Number(row.velocity_window_ms),
  };
}

export const DEFAULT_POLICY: Policy = {
  perTxCap: 500,
  monthlyCap: 5000,
  allowlist: [],
  allowedCategories: [],
  requireApprovalOnNewDestination: true,
  notificationEmail: undefined,
  maxPaymentsInWindow: 5,
  velocityWindowMs: 3_600_000,
};

function isPayment(type: string): boolean {
  return type === 'payment' || type === 'refund';
}

/**
 * In-memory store for local demos / tests (MOCK mode). Keeps a per-tenant hash
 * chain so the tamper-evidence endpoint works without a database.
 */
export class MemoryStore implements SpecterStore {
  private tenants = new Map<string, { tenantId: string; tenantName: string }>(); // apiKey -> tenant
  private policies = new Map<string, Policy>();
  private txns: TransactionRow[] = [];
  private audit: AuditRow[] = [];
  private incidents: IncidentRow[] = [];
  private seq = new Map<string, number>();

  constructor(seedApiKey = process.env.SPECTER_API_KEY || 'dev_tenant_key') {
    const tenantId = 'demo-tenant';
    this.tenants.set(seedApiKey, { tenantId, tenantName: 'Demo Co' });
    this.policies.set(tenantId, {
      ...DEFAULT_POLICY,
      allowlist: ['Acme Store', 'acct_acme_store', 'CloudHost Inc', 'acct_cloudhost'],
    });
  }

  async getTenantByApiKey(rawKey: string) {
    return this.tenants.get(rawKey) ?? null;
  }

  async getPolicy(tenantId: string): Promise<Policy> {
    return this.policies.get(tenantId) ?? DEFAULT_POLICY;
  }

  setPolicy(tenantId: string, policy: Policy) {
    this.policies.set(tenantId, policy);
  }

  async getRuntimeState(tenantId: string, _agentName: string): Promise<RuntimeState> {
    const now = Date.now();
    const policy = await this.getPolicy(tenantId);
    const mine = this.txns.filter((t) => t.tenant_id === tenantId);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const spentThisMonth = mine
      .filter(
        (t) => t.decision === 'allow' && isPayment(t.type) && new Date(t.created_at) >= monthStart,
      )
      .reduce((s, t) => s + (t.amount ?? 0), 0);
    const paymentsInWindow = mine.filter(
      (t) => isPayment(t.type) && now - new Date(t.created_at).getTime() <= policy.velocityWindowMs,
    ).length;
    const knownDestinations = Array.from(
      new Set(
        mine
          .filter((t) => t.decision === 'allow' && t.destination)
          .map((t) => t.destination as string),
      ),
    );
    return { spentThisMonth, paymentsInWindow, knownDestinations };
  }

  async recordDecision(input: RecordDecisionInput): Promise<RecordedDecision> {
    const now = new Date().toISOString();
    const txn: TransactionRow = {
      id: crypto.randomUUID(),
      tenant_id: input.tenantId,
      agent_id: input.agentName,
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
      created_at: now,
    };
    this.txns.unshift(txn);

    const prevSeq = this.seq.get(input.tenantId) ?? -1;
    const prevHash =
      this.audit.find((a) => a.tenant_id === input.tenantId && a.seq === prevSeq)?.hash ??
      GENESIS_HASH;
    const nextSeq = prevSeq + 1;
    const recordBody = auditBody(txn);
    const appended = appendAuditRecord(prevHash, recordBody, nextSeq);
    const auditRow: AuditRow = {
      id: crypto.randomUUID(),
      tenant_id: input.tenantId,
      seq: nextSeq,
      record: appended.record,
      prev_hash: appended.prevHash,
      hash: appended.hash,
      created_at: now,
    };
    this.audit.unshift(auditRow);
    this.seq.set(input.tenantId, nextSeq);

    let incident: IncidentRow | undefined;
    if (input.result.decision !== 'allow') {
      incident = {
        id: crypto.randomUUID(),
        tenant_id: input.tenantId,
        transaction_id: txn.id,
        severity: input.result.decision === 'deny' ? 'critical' : 'high',
        status: 'open',
        created_at: now,
        resolved_at: null,
      };
      this.incidents.unshift(incident);
    }
    return { transaction: txn, audit: auditRow, incident };
  }

  async listTransactions(tenantId: string, limit = 50, offset = 0): Promise<TransactionRow[]> {
    return this.txns.filter((t) => t.tenant_id === tenantId).slice(offset, offset + limit);
  }

  async listAudit(tenantId: string, limit = 100, offset = 0): Promise<AuditRow[]> {
    return this.audit
      .filter((a) => a.tenant_id === tenantId)
      .sort((a, b) => a.seq - b.seq)
      .slice(offset, offset + limit);
  }

  async verifyAudit(tenantId: string): Promise<VerifyResult> {
    const rows = await this.listAudit(tenantId, Number.MAX_SAFE_INTEGER, 0);
    const chain: AuditRecord[] = rows.map((r) => ({
      seq: r.seq,
      record: r.record,
      prevHash: r.prev_hash,
      hash: r.hash,
    }));
    return verifyChain(chain);
  }

  /**
   * Populate a realistic backlog (mock mode) so the dashboard looks alive on
   * first load. Builds proper hash-chain links and back-dated timestamps.
   */
  async seedBacklog(tenantId: string): Promise<void> {
    if (this.txns.some((t) => t.tenant_id === tenantId)) return; // already seeded
    const backlog = buildDemoBacklog();
    // oldest first so the chain & timestamps are monotonic
    const ordered = [...backlog].sort((a, b) => b.ageMinutes - a.ageMinutes);
    for (const d of ordered) {
      const at = new Date(Date.now() - d.ageMinutes * 60_000).toISOString();
      const txn: TransactionRow = {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        agent_id: d.agent,
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
      };
      this.txns.unshift(txn);

      const prevSeq = this.seq.get(tenantId) ?? -1;
      const prevHash =
        this.audit.find((a) => a.tenant_id === tenantId && a.seq === prevSeq)?.hash ?? GENESIS_HASH;
      const nextSeq = prevSeq + 1;
      const appended = appendAuditRecord(prevHash, auditBody(txn), nextSeq);
      this.audit.unshift({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        seq: nextSeq,
        record: appended.record,
        prev_hash: appended.prevHash,
        hash: appended.hash,
        created_at: at,
      });
      this.seq.set(tenantId, nextSeq);

      if (d.decision !== 'allow') {
        this.incidents.unshift({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          transaction_id: txn.id,
          severity: d.decision === 'deny' ? 'critical' : 'high',
          status: 'open',
          created_at: at,
          resolved_at: null,
        });
      }
    }
  }

  /** DEMO-ONLY: mutate a past record so verification turns red live. */
  async tamperAudit(tenantId: string, seq: number): Promise<void> {
    const row = this.audit.find((a) => a.tenant_id === tenantId && a.seq === seq);
    if (row && row.record && typeof row.record === 'object') {
      (row.record as Record<string, unknown>).amount = 999999;
    }
  }

  async listIncidents(tenantId: string, limit = 50): Promise<IncidentView[]> {
    return this.incidents
      .filter((i) => i.tenant_id === tenantId)
      .slice(0, limit)
      .map((i) => {
        const txn = this.txns.find((t) => t.id === i.transaction_id);
        return {
          id: i.id,
          status: i.status,
          severity: i.severity,
          createdAt: i.created_at,
          agent: txn?.agent_id ?? null,
          amount: txn?.amount ?? null,
          currency: txn?.currency ?? null,
          destination: txn?.destination ?? null,
          merchantClaimed: txn?.merchant_claimed ?? null,
          decision: txn?.decision ?? 'deny',
          reason: txn?.reason ?? null,
        };
      });
  }

  async resolveIncident(
    tenantId: string,
    incidentId: string,
    status: 'approved' | 'rejected',
  ): Promise<void> {
    const inc = this.incidents.find((i) => i.tenant_id === tenantId && i.id === incidentId);
    if (inc) {
      inc.status = status;
      inc.resolved_at = new Date().toISOString();
    }
  }

  // test/demo helpers
  _incidents() {
    return this.incidents;
  }
}

/** The canonical audit body for a transaction decision. */
export function auditBody(txn: TransactionRow): Record<string, unknown> {
  return {
    kind: 'decision',
    txnId: txn.id,
    agent: txn.agent_id,
    session: txn.session_id,
    type: txn.type,
    amount: txn.amount,
    currency: txn.currency,
    destination: txn.destination,
    merchantClaimed: txn.merchant_claimed,
    decision: txn.decision as Decision,
    riskScore: txn.risk_score,
    reason: txn.reason,
    at: txn.created_at,
  };
}
