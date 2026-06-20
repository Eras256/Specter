import type { Decision } from '@specter/core';

export interface TenantRow {
  id: string;
  name: string;
  created_at: string;
}

export interface PolicyRow {
  id: string;
  tenant_id: string;
  per_tx_cap: number;
  monthly_cap: number;
  allowlist: string[];
  allowed_categories: string[];
  require_approval_on_new_destination: boolean;
  notification_email: string | null;
  max_payments_in_window: number;
  velocity_window_ms: number;
  updated_at: string;
}

export interface AgentRow {
  id: string;
  tenant_id: string;
  name: string;
  last_seen: string;
}

export interface TransactionRow {
  id: string;
  tenant_id: string;
  agent_id: string | null;
  session_id: string;
  type: string;
  amount: number | null;
  currency: string | null;
  destination: string | null;
  merchant_claimed: string | null;
  decision: Decision;
  risk_score: number;
  reason: string | null;
  signals: Record<string, string>;
  created_at: string;
}

export interface AuditRow {
  id: string;
  tenant_id: string;
  seq: number;
  record: unknown;
  prev_hash: string;
  hash: string;
  created_at: string;
}

export interface IncidentRow {
  id: string;
  tenant_id: string;
  transaction_id: string | null;
  severity: string;
  status: 'open' | 'approved' | 'rejected';
  created_at: string;
  resolved_at: string | null;
}
