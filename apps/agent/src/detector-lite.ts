import type { EvaluateInput, LlmSignal } from '@specter/core';
import { tracesTo } from '@specter/core';

/**
 * A dependency-free heuristic LLM signal for the in-process fallback path, so
 * the standalone agent demo gets a provenance-aware signal without the API or a
 * network call. (The real API uses the Haiku-backed classifier in apps/api.)
 */
export async function classifyHeuristic(input: EvaluateInput): Promise<LlmSignal> {
  const { action, context } = input;
  if (action.type !== 'payment' && action.type !== 'refund') {
    return { injectionLikelihood: 0, reason: 'heuristic: non-financial action' };
  }
  const intent = `${context.userPrompt} ${context.establishedMerchant ?? ''}`;
  const traces = tracesTo(action.destination, intent) || tracesTo(action.merchantClaimed, intent);
  const ingested =
    context.destinationOrigin === 'ingested_content' || context.destinationOrigin === 'tool_output';
  let score = 0;
  if (ingested && !traces) score = 0.85;
  else if (ingested) score = 0.4;
  else if (!traces) score = 0.25;
  return {
    injectionLikelihood: score,
    reason: `heuristic: ingested=${ingested}, traces=${traces}`,
  };
}
