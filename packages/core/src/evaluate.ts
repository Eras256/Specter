import { checkDestructive } from './destructive.js';
import {
  type DecisionResult,
  type EvaluateInput,
  EvaluateInputSchema,
  type LlmSignal,
  type SignalResult,
} from './schemas.js';
import {
  consistencySignal,
  DEFAULT_WEIGHTS,
  policySignal,
  provenanceSignal,
  type SignalWeights,
} from './signals.js';

export interface EvaluateOptions {
  /**
   * Optional LLM classifier (AI SDK 6 lives in the API, not in core, to keep
   * core pure). It is *one* signal among several and never the only guard.
   */
  llmClassifier?: (input: EvaluateInput) => Promise<LlmSignal>;
  weights?: Partial<SignalWeights>;
  thresholds?: { review: number; deny: number };
}

/** Risk at/above `deny` → deny; at/above `review` → review; else allow. */
export const DEFAULT_THRESHOLDS = { review: 0.4, deny: 0.7 } as const;

/**
 * The decision function. Runs deterministic destructive rules first (un-foolable
 * by an injected LLM), then the three financial signals, then optionally folds
 * in an injected LLM classifier, then maps the weighted risk to a decision.
 *
 * Pure except for the optionally-injected async classifier.
 */
export async function evaluateAction(
  rawInput: EvaluateInput,
  opts: EvaluateOptions = {},
): Promise<DecisionResult> {
  const input = EvaluateInputSchema.parse(rawInput);
  const weights = { ...DEFAULT_WEIGHTS, ...opts.weights };
  const thresholds = { ...DEFAULT_THRESHOLDS, ...opts.thresholds };

  const detail: SignalResult[] = [];
  const signals: Record<string, string> = {};

  // ── Step 0: deterministic destructive-action rules (BEFORE any LLM) ────────
  const destructive = checkDestructive(input.action);
  if (destructive.matched) {
    const verdict = `deterministic rule "${destructive.rule}": ${destructive.detail}`;
    signals.destructive = verdict;
    return {
      decision: 'deny',
      riskScore: 1,
      reason: `Blocked irreversible action — ${destructive.detail} (rule ${destructive.rule}).`,
      signals,
      signalDetail: [{ id: 'destructive', score: 1, verdict }],
    };
  }

  // ── Step 1: financial signals ─────────────────────────────────────────────
  const provenance = provenanceSignal(input);
  const policy = policySignal(input);
  const consistency = consistencySignal(input);
  detail.push(provenance, policy, consistency);
  signals[provenance.id] = provenance.verdict;
  signals[policy.id] = policy.verdict;
  signals[consistency.id] = consistency.verdict;

  // ── Step 2: optional LLM classifier (one signal among several) ─────────────
  let llm: SignalResult | undefined;
  if (opts.llmClassifier) {
    try {
      const out = await opts.llmClassifier(input);
      llm = { id: 'llm', score: clamp01(out.injectionLikelihood), verdict: out.reason };
    } catch (err) {
      // The LLM is never the only guard — if it fails, we degrade gracefully and
      // lean on the deterministic + provenance signals (which already ran).
      llm = {
        id: 'llm',
        score: 0,
        verdict: `llm classifier unavailable (${(err as Error).message}); relying on deterministic signals`,
      };
    }
    detail.push(llm);
    signals.llm = llm.verdict;
  }

  // ── Step 3: weighted risk score ───────────────────────────────────────────
  const contributions: Array<[number, number]> = [
    [provenance.score, weights.provenance],
    [policy.score, weights.policy],
    [consistency.score, weights.consistency],
  ];
  if (llm) contributions.push([llm.score, weights.llm]);

  const totalWeight = contributions.reduce((s, [, w]) => s + w, 0);
  const weighted = contributions.reduce((s, [score, w]) => s + score * w, 0);
  let riskScore = clamp01(totalWeight > 0 ? weighted / totalWeight : 0);

  // ── Step 4: decision mapping (with hard escalations) ──────────────────────
  // The weighted average alone under-weights a few decisive conditions, so they
  // escalate explicitly: a hard cap is a deny; a maxed provenance signal (an
  // ingested, untraceable payee) plus an unhappy policy is the unambiguous
  // injection and is a deny; a policy "needs approval" never silently allows.
  const hardDeny = policy.hardDeny === true;
  const forceReview = policy.forceReview === true;
  const provenanceMaxed = provenance.score >= 0.99;

  let decision: DecisionResult['decision'];
  if (riskScore >= thresholds.deny) decision = 'deny';
  else if (riskScore >= thresholds.review || forceReview) decision = 'review';
  else decision = 'allow';

  if (hardDeny) {
    decision = 'deny';
    riskScore = Math.max(riskScore, thresholds.deny);
  } else if (provenanceMaxed && (forceReview || policy.score >= 0.5)) {
    // Ingested + untraceable payee AND an unapproved/new account = the attack.
    decision = 'deny';
    riskScore = Math.max(riskScore, thresholds.deny);
  } else if (provenanceMaxed && decision === 'allow') {
    decision = 'review';
    riskScore = Math.max(riskScore, thresholds.review);
  } else if (forceReview && decision === 'allow') {
    decision = 'review';
    riskScore = Math.max(riskScore, thresholds.review);
  }

  const reason = buildReason(decision, detail);
  return { decision, riskScore: round3(riskScore), reason, signals, signalDetail: detail };
}

function buildReason(decision: DecisionResult['decision'], detail: SignalResult[]): string {
  const top = [...detail].sort((a, b) => b.score - a.score)[0];
  const lead =
    decision === 'allow'
      ? 'Allowed'
      : decision === 'review'
        ? 'Held for human approval'
        : 'Blocked';
  if (!top || top.score === 0) return `${lead}: no risk signals fired.`;
  return `${lead}: ${top.verdict}.`;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
