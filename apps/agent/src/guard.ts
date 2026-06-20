import {
  type DecisionResult,
  type EvaluateInput,
  evaluateAction,
  type Policy,
} from '@specter/core';
import { Guard } from '@specter/sdk';

/**
 * The agent's gate. Prefers the real decision API (true end-to-end); if it is
 * unreachable, evaluates in-process with @specter/core so the demo still runs
 * standalone (`pnpm --filter @specter/agent demo`).
 */
const DEMO_POLICY: Policy = {
  perTxCap: 500,
  monthlyCap: 5000,
  allowlist: ['Acme Store', 'acct_acme_store', 'CloudHost Inc', 'acct_cloudhost'],
  allowedCategories: [],
  requireApprovalOnNewDestination: true,
  notificationEmail: undefined,
  maxPaymentsInWindow: 5,
  velocityWindowMs: 3_600_000,
};

export interface GuardCheck {
  via: 'api' | 'in-process';
  result: DecisionResult;
}

export async function guardCheck(
  base: Omit<EvaluateInput, 'policy' | 'state'>,
): Promise<GuardCheck> {
  const apiUrl = process.env.SPECTER_API_URL;
  const apiKey = process.env.SPECTER_API_KEY || 'dev_tenant_key';

  if (apiUrl && (await reachable(apiUrl))) {
    const guard = new Guard({ apiUrl, apiKey, agentId: base.agentId });
    const result = await guard.check({
      agentId: base.agentId,
      sessionId: base.sessionId,
      action: base.action,
      context: base.context,
    });
    return { via: 'api', result };
  }

  // In-process fallback: use the heuristic LLM signal (no API needed).
  const { classifyHeuristic } = await import('./detector-lite.js');
  const input: EvaluateInput = {
    ...base,
    policy: DEMO_POLICY,
    state: { spentThisMonth: 100, paymentsInWindow: 1, knownDestinations: ['acct_acme_store'] },
  };
  const result = await evaluateAction(input, { llmClassifier: classifyHeuristic });
  return { via: 'in-process', result };
}

async function reachable(apiUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiUrl.replace(/\/$/, '')}/health`, {
      signal: AbortSignal.timeout(800),
    });
    return res.ok;
  } catch {
    return false;
  }
}
