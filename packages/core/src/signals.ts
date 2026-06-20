import type { EvaluateInput, Policy, RuntimeState, SignalResult } from './schemas.js';
import { normalize, tracesTo } from './text.js';

/**
 * SIGNAL 1 — Provenance / intent-binding (the moat).
 *
 * The attacker swaps the payee by poisoning what the agent *reads*, not the
 * payment step itself. So we ask: did the destination/merchant derive from what
 * the user actually asked, or from content ingested mid-task?
 *
 * We combine two things:
 *  - the adapter-declared `destinationOrigin`, and
 *  - a real trace check: does the destination/merchant appear in the user's
 *    prompt or the merchant established at task start?
 *
 * A destination that (a) is declared as coming from ingested content AND (b)
 * does not trace back to the user's intent is the worst case → score ~1.
 */
export function provenanceSignal(input: EvaluateInput): SignalResult {
  const { action, context } = input;
  const id = 'provenance';

  // Provenance only matters for things with a destination (payments/refunds).
  if (action.type !== 'payment' && action.type !== 'refund') {
    return { id, score: 0, verdict: 'no payee provenance to evaluate for this action type' };
  }

  const intentText = [context.userPrompt, context.establishedMerchant ?? '']
    .filter(Boolean)
    .join(' \n ');

  const destTraces = tracesTo(action.destination, intentText);
  const merchantTraces = tracesTo(action.merchantClaimed, intentText);
  const tracesToIntent = destTraces || merchantTraces;

  const origin = context.destinationOrigin;
  const fromIngestion = origin === 'ingested_content' || origin === 'tool_output';

  // Worst case: came from ingested content and cannot be tied to user intent.
  if (fromIngestion && !tracesToIntent) {
    return {
      id,
      score: 1,
      verdict: `payee originated from ${origin} and does not trace back to the user's request — classic injection / destination-swap pattern`,
    };
  }

  // Came from ingestion but the named merchant matches user intent: suspicious
  // but mitigated (the user did ask for this merchant by name).
  if (fromIngestion && tracesToIntent) {
    return {
      id,
      score: 0.4,
      verdict: `payee came from ${origin} but the merchant matches the user's request — elevated, verify destination`,
    };
  }

  // Declared as user-originated, but the destination does not actually appear in
  // the prompt — the declaration may be wrong or spoofed. Mild flag.
  if (origin === 'user_prompt' && !tracesToIntent) {
    return {
      id,
      score: 0.35,
      verdict:
        'declared user-originated, but destination not found in the user prompt — provenance unverified',
    };
  }

  if (origin === 'unknown') {
    return {
      id,
      score: tracesToIntent ? 0.2 : 0.5,
      verdict: tracesToIntent
        ? 'origin unknown but payee traces to user intent'
        : 'origin unknown and payee does not trace to user intent',
    };
  }

  return { id, score: 0, verdict: 'payee traces to the user’s original request' };
}

/** Policy signal carries escalation flags the risk average can't capture. */
export interface PolicySignalResult extends SignalResult {
  /** Per-tx cap exceeded → a hard limit; the engine denies outright. */
  hardDeny?: boolean;
  /** Monthly cap / category / new destination → must go to a human. */
  forceReview?: boolean;
}

/**
 * SIGNAL 2 — Policy + approved beneficiaries.
 *
 * Caps, allowlist, categories, and the "new destination → review" rule. A
 * never-before-seen destination is escalated to a human, never silently allowed
 * — even if the *merchant name* is approved, the *account* might be swapped.
 */
export function policySignal(input: EvaluateInput): PolicySignalResult {
  const { action, policy } = input;
  const state = stateOf(input);
  const id = 'policy';

  if (action.type !== 'payment' && action.type !== 'refund') {
    return { id, score: 0, verdict: 'no financial policy applies to this action type' };
  }

  const dest = action.destination ? normalize(action.destination) : '';
  const allowlist = policy.allowlist.map(normalize);
  const known = state.knownDestinations.map(normalize);
  const onAllowlist =
    !!dest && allowlist.some((a) => a === dest || dest.includes(a) || a.includes(dest));
  const merchantAllowed =
    !!action.merchantClaimed &&
    policy.allowlist.some(
      (a) => tracesTo(action.merchantClaimed, a) || tracesTo(a, action.merchantClaimed ?? ''),
    );

  const amount = action.amount ?? 0;

  // Hard cap — exceeding the per-tx cap is a hard limit, not a soft signal.
  if (amount > policy.perTxCap) {
    return {
      id,
      score: 1,
      verdict: `amount ${amount} exceeds per-transaction cap ${policy.perTxCap}`,
      hardDeny: true,
    };
  }
  if (state.spentThisMonth + amount > policy.monthlyCap) {
    return {
      id,
      score: 0.9,
      verdict: `would exceed monthly cap (${state.spentThisMonth} + ${amount} > ${policy.monthlyCap})`,
      forceReview: true,
    };
  }

  // Category gate.
  if (policy.allowedCategories.length > 0 && action.category) {
    const catOk = policy.allowedCategories.map(normalize).includes(normalize(action.category));
    if (!catOk) {
      return {
        id,
        score: 0.7,
        verdict: `category "${action.category}" is not in the allowed categories`,
        forceReview: true,
      };
    }
  }

  // An explicitly allow-listed *destination* (the account itself) clears policy.
  if (onAllowlist) {
    return { id, score: 0, verdict: 'destination is an approved beneficiary' };
  }

  // The destination is NOT explicitly approved. A never-seen account always
  // requires approval — regardless of whether the merchant *name* is approved,
  // since the account is what receives the money and is what gets swapped.
  const isKnown = !!dest && known.some((k) => k === dest || dest.includes(k) || k.includes(dest));
  if (!isKnown && policy.requireApprovalOnNewDestination) {
    return {
      id,
      score: 0.6,
      verdict: merchantAllowed
        ? 'approved merchant but a never-before-seen account — requires human approval'
        : 'never-before-seen destination — requires human approval',
      forceReview: true,
    };
  }

  if (merchantAllowed) {
    return { id, score: 0.1, verdict: 'approved merchant, destination seen before' };
  }

  return {
    id,
    score: 0.15,
    verdict: 'within caps; destination seen before but not explicitly allow-listed',
  };
}

/**
 * SIGNAL 3 — Consistency + velocity.
 *
 * Does the destination match the claimed merchant? Does the amount match the
 * cart/invoice the task started with? Too many payments in a short window?
 */
export function consistencySignal(input: EvaluateInput): SignalResult {
  const { action, policy } = input;
  const state = stateOf(input);
  const id = 'consistency';

  if (action.type !== 'payment' && action.type !== 'refund') {
    return { id, score: 0, verdict: 'consistency checks apply to financial actions only' };
  }

  const flags: string[] = [];
  let score = 0;

  // Velocity.
  if (state.paymentsInWindow + 1 > policy.maxPaymentsInWindow) {
    score = Math.max(score, 0.7);
    flags.push(
      `velocity: ${state.paymentsInWindow + 1} payments within ${Math.round(policy.velocityWindowMs / 60000)}m exceeds max ${policy.maxPaymentsInWindow}`,
    );
  }

  // Amount vs. expected cart/invoice.
  if (typeof state.expectedAmount === 'number' && typeof action.amount === 'number') {
    const drift = Math.abs(action.amount - state.expectedAmount);
    const rel = state.expectedAmount > 0 ? drift / state.expectedAmount : drift;
    if (rel > 0.01) {
      score = Math.max(score, Math.min(0.8, 0.3 + rel));
      flags.push(
        `amount ${action.amount} differs from expected ${state.expectedAmount} (${Math.round(rel * 100)}%)`,
      );
    }
  }

  // Destination vs. claimed merchant: if a merchant is claimed and the
  // destination string contradicts it (and isn't an opaque id), flag it.
  if (action.merchantClaimed && action.destination) {
    const looksOpaque = /^[a-z]{2,8}[_-]?[a-z0-9]{6,}$/i.test(action.destination.trim());
    if (
      !looksOpaque &&
      !tracesTo(action.destination, action.merchantClaimed) &&
      !tracesTo(action.merchantClaimed, action.destination)
    ) {
      score = Math.max(score, 0.45);
      flags.push(
        `destination "${action.destination}" does not correspond to claimed merchant "${action.merchantClaimed}"`,
      );
    }
  }

  return {
    id,
    score,
    verdict: flags.length ? flags.join('; ') : 'amount, destination, and velocity are consistent',
  };
}

function stateOf(input: EvaluateInput): RuntimeState {
  return (
    input.state ?? {
      spentThisMonth: 0,
      paymentsInWindow: 0,
      knownDestinations: [],
    }
  );
}

/** Default signal weights — provenance is heaviest (it is the moat). */
export const DEFAULT_WEIGHTS = {
  provenance: 0.45,
  policy: 0.3,
  consistency: 0.15,
  llm: 0.1,
} as const;

export type SignalWeights = typeof DEFAULT_WEIGHTS;

/** Re-export Policy type alias for convenience. */
export type { Policy };
