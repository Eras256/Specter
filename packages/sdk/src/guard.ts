import type { Action, Context, DecisionResult } from '@specter/core';

export interface GuardOptions {
  apiUrl: string;
  apiKey: string;
  /** Per-request timeout in ms (default 4000). The gate targets <500ms p99. */
  timeoutMs?: number;
  /** Retry attempts on network/5xx (default 1). */
  retries?: number;
  agentId?: string;
}

export interface CheckInput {
  agentId?: string;
  sessionId?: string;
  action: Action;
  context?: Partial<Context>;
}

/**
 * Thin, typed client for the Specter decision API. The whole SDK is the "plug";
 * the API is the product. Use `guard.check(action, context)` programmatically,
 * or `createClaudeCodeHook(guard)` for the drop-in Claude Code hook.
 */
export class Guard {
  constructor(private opts: GuardOptions) {}

  async check(input: CheckInput): Promise<DecisionResult> {
    const body = {
      agentId: input.agentId ?? this.opts.agentId ?? 'sdk-agent',
      sessionId: input.sessionId ?? 'sdk-session',
      action: input.action,
      context: {
        userPrompt: input.context?.userPrompt ?? '',
        destinationOrigin: input.context?.destinationOrigin ?? 'unknown',
        sourceRefs: input.context?.sourceRefs ?? [],
        establishedMerchant: input.context?.establishedMerchant,
      },
    };

    const retries = this.opts.retries ?? 1;
    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(`${this.opts.apiUrl.replace(/\/$/, '')}/v1/evaluate`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${this.opts.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.opts.timeoutMs ?? 4000),
        });
        if (!res.ok) throw new Error(`Specter API ${res.status}: ${await res.text()}`);
        return (await res.json()) as DecisionResult;
      } catch (err) {
        lastErr = err;
      }
    }
    throw new Error(
      `Specter check failed after ${retries + 1} attempts: ${(lastErr as Error).message}`,
    );
  }

  /** Convenience: true only when the action is explicitly allowed. */
  async isAllowed(input: CheckInput): Promise<boolean> {
    return (await this.check(input)).decision === 'allow';
  }
}
