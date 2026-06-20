import { type DecisionResult, type EvaluateInput, evaluateAction } from '@specter/core';
import { getStore } from '@specter/db';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { ZodError } from 'zod';
import { notifyIncident } from './alerts.js';
import { classifyWithLlm } from './detector.js';
import {
  type ClaudeCodeHookPayload,
  decisionToHookResponse,
  payloadToEvaluateInput,
} from './hook-adapter.js';
import { apiKeyAuth, getTenant, rateLimit } from './middleware.js';

type Vars = { Variables: { tenant: { tenantId: string; tenantName: string } } };

/**
 * Shared evaluation pipeline: load the tenant policy + runtime state, run the
 * detection engine (with the LLM classifier injected — one signal among
 * several), persist the decision to the tamper-evident chain, and fire the
 * human-in-the-loop alert on deny/review.
 */
export interface EvaluateAndRecordResult {
  result: DecisionResult;
  /** The tamper-evident chain row this decision was written to (seq + hash). */
  audit: { seq: number; hash: string };
}

export async function evaluateAndRecord(
  tenant: { tenantId: string; tenantName: string },
  base: Omit<EvaluateInput, 'policy' | 'state'>,
): Promise<EvaluateAndRecordResult> {
  const store = getStore();
  const policy = await store.getPolicy(tenant.tenantId);
  const state = await store.getRuntimeState(tenant.tenantId, base.agentId);
  const input: EvaluateInput = { ...base, policy, state };

  const result = await evaluateAction(input, { llmClassifier: classifyWithLlm });

  const recorded = await store.recordDecision({
    tenantId: tenant.tenantId,
    agentName: base.agentId,
    sessionId: base.sessionId,
    type: base.action.type,
    amount: base.action.amount,
    currency: base.action.currency,
    destination: base.action.destination,
    merchantClaimed: base.action.merchantClaimed,
    result,
    raw: base.action.rawInput,
  });

  if (result.decision !== 'allow') {
    // Fire-and-forget; the in-app incidents queue (Supabase Realtime) + client-side
    // voice alert is the human-in-the-loop. Never blocks the decision path.
    notifyIncident({
      tenantName: tenant.tenantName,
      agentId: base.agentId,
      amount: base.action.amount,
      currency: base.action.currency,
      destination: base.action.destination,
      merchantClaimed: base.action.merchantClaimed,
      result,
      notificationEmail: policy.notificationEmail,
    });
  }
  return { result, audit: { seq: recorded.audit.seq, hash: recorded.audit.hash } };
}

export function createApp() {
  const app = new Hono<Vars>();
  app.use('*', logger());
  app.use('*', cors());

  // A malformed request body fails Zod validation deep in the engine; surface it
  // as 400, not 500. Any other uncaught error is a genuine internal fault → 500.
  // (The Claude Code hook catches its own errors and always returns 200, so this
  // never changes that contract.)
  app.onError((err, c) => {
    if (err instanceof ZodError) {
      return c.json({ error: 'invalid request body', details: err.issues }, 400);
    }
    console.error('[specter] unhandled error:', err);
    return c.json({ error: 'internal error' }, 500);
  });

  app.get('/health', (c) => c.json({ status: 'ok', ts: Date.now() }));

  // ── Decision API (authenticated) ──────────────────────────────────────────
  const v1 = new Hono<Vars>();
  v1.use('*', rateLimit({ capacity: 60, refillPerSec: 30 }));
  v1.use('*', apiKeyAuth);

  v1.post('/evaluate', async (c) => {
    const body = (await c.req.json().catch(() => null)) as Partial<EvaluateInput> | null;
    if (!body?.action || !body?.agentId) {
      return c.json({ error: 'invalid body: require agentId, sessionId, action' }, 400);
    }
    const base: Omit<EvaluateInput, 'policy' | 'state'> = {
      agentId: body.agentId,
      sessionId: body.sessionId ?? 'session',
      action: body.action,
      context: body.context ?? { userPrompt: '', destinationOrigin: 'unknown', sourceRefs: [] },
    };
    const { result, audit } = await evaluateAndRecord(getTenant(c), base);
    return c.json({ ...result, audit });
  });

  v1.get('/audit', async (c) => {
    const limit = Number(c.req.query('limit') ?? 100);
    const offset = Number(c.req.query('offset') ?? 0);
    const order = c.req.query('order') === 'desc' ? 'desc' : 'asc';
    const rows = await getStore().listAudit(getTenant(c).tenantId, limit, offset, order);
    return c.json({ records: rows });
  });

  v1.get('/audit/verify', async (c) => {
    const result = await getStore().verifyAudit(getTenant(c).tenantId);
    return c.json(result);
  });

  v1.get('/transactions', async (c) => {
    const limit = Number(c.req.query('limit') ?? 50);
    const offset = Number(c.req.query('offset') ?? 0);
    const rows = await getStore().listTransactions(getTenant(c).tenantId, limit, offset);
    return c.json({ transactions: rows });
  });

  // ── Human-in-the-loop: the in-app approval queue ──────────────────────────
  v1.get('/incidents', async (c) => {
    const limit = Number(c.req.query('limit') ?? 50);
    const rows = await getStore().listIncidents(getTenant(c).tenantId, limit);
    return c.json({ incidents: rows });
  });

  v1.post('/incidents/:id', async (c) => {
    const id = c.req.param('id');
    const body = (await c.req.json().catch(() => null)) as { status?: string } | null;
    const status = body?.status;
    if (status !== 'approved' && status !== 'rejected') {
      return c.json({ error: 'status must be "approved" or "rejected"' }, 400);
    }
    await getStore().resolveIncident(getTenant(c).tenantId, id, status);
    return c.json({ ok: true, id, status });
  });

  // ── DEMO-ONLY: tamper a past audit record so /audit/verify turns red live ──
  v1.post('/audit/tamper', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { seq?: number };
    const seq = Number(body?.seq ?? 0);
    await getStore().tamperAudit(getTenant(c).tenantId, seq);
    return c.json({ ok: true, tamperedSeq: seq });
  });

  app.route('/v1', v1);

  // ── Claude Code PreToolUse HTTP hook ──────────────────────────────────────
  // Always HTTP 200; the verdict is encoded in the body (see hook-adapter).
  app.post('/hooks/claude-code', apiKeyAuth, async (c) => {
    const payload = (await c.req.json().catch(() => ({}))) as ClaudeCodeHookPayload;
    try {
      const base = payloadToEvaluateInput(payload);
      const { result } = await evaluateAndRecord(getTenant(c), base);
      return c.json(decisionToHookResponse(result.decision, result.reason), 200);
    } catch (err) {
      // Fail safe: on internal error, ASK (do not silently allow), still 200.
      return c.json(
        decisionToHookResponse(
          'review',
          `Specter internal error, escalating to human: ${(err as Error).message}`,
        ),
        200,
      );
    }
  });

  return app;
}
