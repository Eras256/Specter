import type { DecisionResult } from '@specter/core';
import { env } from './env.js';

export interface AlertContext {
  tenantName: string;
  agentId: string;
  amount?: number;
  currency?: string;
  destination?: string;
  merchantClaimed?: string;
  result: DecisionResult;
  notificationEmail?: string;
}

/**
 * Human-in-the-loop notification. The approval itself happens IN-APP: a
 * `deny`/`review` raises an `incidents` row (see the store) that the dashboard
 * surfaces instantly over Supabase Realtime with Approve / Reject, and a short
 * spoken alert plays client-side (ElevenLabs). There is NO external messaging
 * API anywhere in the request path.
 *
 * This is fire-and-forget and must never add latency to `/v1/evaluate`. The
 * notification channel is agnostic — email (roadmap: send via Resend), Slack,
 * etc. all plug in here without touching the decision path.
 */
export function notifyIncident(ctx: AlertContext): void {
  if (ctx.result.decision === 'allow') return;

  const verb = ctx.result.decision === 'deny' ? 'BLOCKED' : 'HELD FOR APPROVAL';
  const amount =
    ctx.amount != null ? `${ctx.currency ?? ''} ${ctx.amount}`.trim() : 'an irreversible action';
  const dest = ctx.destination ? ` to ${ctx.destination}` : '';
  const line =
    `🛡️ Specter ${verb}: ${ctx.agentId} attempted ${amount}${dest}` +
    (ctx.merchantClaimed ? ` (claims "${ctx.merchantClaimed}")` : '') +
    ` — incident raised for in-app approval. Reason: ${ctx.result.reason}`;
  // eslint-disable-next-line no-console
  console.warn(line);

  // Optional email notification via Resend. Fire-and-forget — never awaited, so it
  // cannot add latency to /v1/evaluate. No key or recipient ⇒ the in-app approval
  // queue + voice alert remain the human-in-the-loop (this is purely a heads-up).
  if (env.resend.apiKey && ctx.notificationEmail) {
    void fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.resend.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: env.resend.from,
        to: ctx.notificationEmail,
        subject: `Specter ${verb}: ${ctx.agentId}`,
        text: `${line}\n\nApprove or reject this in your Specter dashboard.`,
      }),
      signal: AbortSignal.timeout(4000),
    }).catch(() => {});
  }
}
