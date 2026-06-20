import type { Action, ActionType, DestinationOrigin } from '@specter/core';
import type { Guard } from './guard.js';

/** Claude Code PreToolUse hook payload (subset). */
export interface HookPayload {
  session_id?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  specter?: { userPrompt?: string; establishedMerchant?: string; destinationOrigin?: string };
}

/** The body Claude Code requires to actually block. */
export interface HookResponse {
  hookSpecificOutput: {
    hookEventName: 'PreToolUse';
    permissionDecision: 'allow' | 'deny' | 'ask';
    permissionDecisionReason: string;
  };
}

/**
 * Build a ready-made Claude Code PreToolUse hook handler from a Guard.
 *
 * IMPORTANT: when wired as an HTTP hook, Claude Code only blocks on an HTTP 200
 * whose body says permissionDecision: "deny". A non-2xx status merely logs and
 * the tool runs anyway. This handler returns the correct body; the host (the
 * decision API's /hooks/claude-code route, or your own server) must answer 200.
 */
export function createClaudeCodeHook(guard: Guard) {
  return async function handle(payload: HookPayload): Promise<HookResponse> {
    try {
      const action = normalize(payload);
      const result = await guard.check({
        agentId: `claude-code:${payload.tool_name ?? 'tool'}`,
        sessionId: payload.session_id ?? 'cc-session',
        action,
        context: {
          userPrompt: payload.specter?.userPrompt ?? '',
          establishedMerchant: payload.specter?.establishedMerchant,
          destinationOrigin: (payload.specter?.destinationOrigin as DestinationOrigin) ?? 'unknown',
        },
      });
      const permissionDecision =
        result.decision === 'allow' ? 'allow' : result.decision === 'deny' ? 'deny' : 'ask';
      return resp(permissionDecision, result.reason);
    } catch (err) {
      // Fail safe: escalate to a human rather than silently allowing.
      return resp('ask', `Specter unavailable, escalating: ${(err as Error).message}`);
    }
  };
}

function resp(
  permissionDecision: 'allow' | 'deny' | 'ask',
  permissionDecisionReason: string,
): HookResponse {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision,
      permissionDecisionReason,
    },
  };
}

function normalize(p: HookPayload): Action {
  const tool = p.tool_name ?? 'unknown';
  const ti = p.tool_input ?? {};
  const amount = typeof ti.amount === 'number' ? ti.amount : undefined;
  const destination = str(ti.destination) ?? str(ti.to) ?? str(ti.account) ?? undefined;

  let type: ActionType = 'other';
  let command: string | undefined;
  if (amount != null || destination) type = 'payment';
  else if (tool === 'Bash') {
    type = 'shell';
    command = str(ti.command);
  } else if (['Read', 'Write', 'Edit', 'NotebookEdit'].includes(tool)) {
    type = 'file';
    command = str(ti.file_path) ?? str(ti.path);
  } else command = JSON.stringify(ti);

  return {
    type,
    amount,
    currency: str(ti.currency),
    destination,
    merchantClaimed: str(ti.merchantClaimed),
    command,
    rawInput: ti,
  };
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length ? v : undefined;
}
