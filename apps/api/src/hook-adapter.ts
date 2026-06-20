import type { ActionType, Decision, EvaluateInput } from '@specter/core';

/** The Claude Code PreToolUse HTTP hook request payload (subset we use). */
export interface ClaudeCodeHookPayload {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  /** Optional Specter context the agent may attach to tool_input or top-level. */
  specter?: Partial<EvaluateInput['context']> & { agentId?: string; userPrompt?: string };
}

/** The body Claude Code requires to actually block (see the gotcha below). */
export interface ClaudeCodeHookResponse {
  hookSpecificOutput: {
    hookEventName: 'PreToolUse';
    permissionDecision: 'allow' | 'deny' | 'ask';
    permissionDecisionReason: string;
  };
}

/**
 * GOTCHA (regression-tested): an HTTP hook does NOT block via status code. A
 * 4xx/5xx only logs an error and the tool runs anyway. To actually block you
 * MUST return HTTP 200 with permissionDecision: "deny" in the body. We therefore
 * always answer 200 and encode the verdict in the body.
 */
export function decisionToHookResponse(decision: Decision, reason: string): ClaudeCodeHookResponse {
  const permissionDecision = decision === 'allow' ? 'allow' : decision === 'deny' ? 'deny' : 'ask';
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision,
      permissionDecisionReason: reason,
    },
  };
}

/**
 * Normalize a Claude Code PreToolUse payload into an Specter EvaluateInput.
 * - tools carrying amount+destination → payment
 * - Bash → shell command
 * - Read/Write/Edit → file path (drives .env/secret + destructive checks)
 * - anything else → other
 */
export function payloadToEvaluateInput(
  p: ClaudeCodeHookPayload,
): Omit<EvaluateInput, 'policy' | 'state'> {
  const tool = p.tool_name ?? 'unknown';
  const ti = p.tool_input ?? {};
  const ctx = p.specter ?? {};
  const agentId = ctx.agentId ?? `claude-code:${tool}`;
  const sessionId = p.session_id ?? 'cc-session';

  const amount = numberOr(ti.amount);
  const destination = stringOr(ti.destination) ?? stringOr(ti.to) ?? stringOr(ti.account);

  let type: ActionType = 'other';
  let command: string | undefined;

  if (amount != null || destination) {
    type = 'payment';
  } else if (tool === 'Bash') {
    type = 'shell';
    command = stringOr(ti.command);
  } else if (tool === 'Read' || tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit') {
    type = 'file';
    command = stringOr(ti.file_path) ?? stringOr(ti.path);
  } else {
    command = safeStringify(ti);
  }

  return {
    agentId,
    sessionId,
    action: {
      type,
      amount: amount ?? undefined,
      currency: stringOr(ti.currency) ?? undefined,
      destination: destination ?? undefined,
      merchantClaimed: stringOr(ti.merchantClaimed) ?? undefined,
      command,
      rawInput: ti,
    },
    context: {
      userPrompt: ctx.userPrompt ?? '',
      destinationOrigin: ctx.destinationOrigin ?? 'unknown',
      sourceRefs: ctx.sourceRefs ?? [],
      establishedMerchant: ctx.establishedMerchant,
    },
    // policy + state are filled in by the route from the tenant's stored policy.
  };
}

function numberOr(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
function stringOr(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}
function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
