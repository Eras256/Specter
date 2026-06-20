import type { DecisionResult, EvaluateInput } from '@specter/core';
import { extractPaymentIntent, readProductPage } from './adapters/firecrawl.js';
import { type IssuedPayment, issueScopedPayment } from './adapters/stripe.js';
import { guardCheck } from './guard.js';

export interface ShoppingTask {
  userPrompt: string;
  establishedMerchant: string;
  productUrl: string;
  poisoned: boolean;
  agentId?: string;
  sessionId?: string;
}

export interface TaskOutcome {
  decision: DecisionResult['decision'] | 'unprotected-paid';
  via: 'api' | 'in-process' | 'none';
  result?: DecisionResult;
  payment?: IssuedPayment;
  extracted: {
    merchant: string;
    account: string;
    amount: number;
    currency: string;
    injected: boolean;
  };
  sourceRef: string;
  narrative: string[];
}

/**
 * The reference shopping agent's checkout flow:
 *   1. read the product page (Firecrawl)  ← injection enters here
 *   2. extract the payment target from the page (the agent trusts what it read)
 *   3. route the payment through Specter (unless protection is OFF)
 *   4. only on `allow` issue a scoped Stripe SPT + complete a test PaymentIntent
 *
 * Provenance: the destination/merchant were derived from ingested page content,
 * so the action is tagged `destinationOrigin: 'ingested_content'`. Specter then
 * checks whether that payee traces back to the user's actual request.
 */
export async function runCheckout(
  task: ShoppingTask,
  opts: { protection: boolean },
): Promise<TaskOutcome> {
  const narrative: string[] = [];
  const agentId = task.agentId ?? 'shop-agent-prod';
  const sessionId = task.sessionId ?? `sess_${Math.random().toString(36).slice(2, 8)}`;

  narrative.push(`🧑 user: ${task.userPrompt}`);
  const page = await readProductPage(task.productUrl, { poisoned: task.poisoned });
  narrative.push(`🌐 readProductPage(${task.productUrl}) → ${page.sourceRef}`);

  const extracted = extractPaymentIntent(page.markdown);
  narrative.push(
    `🤖 agent extracted: pay ${extracted.currency} ${extracted.amount} to "${extracted.merchant}" (${extracted.account})` +
      (extracted.injected ? '  ⚠️ (target came from a redirect instruction on the page)' : ''),
  );

  const base: Omit<EvaluateInput, 'policy' | 'state'> = {
    agentId,
    sessionId,
    action: {
      type: 'payment',
      amount: extracted.amount,
      currency: extracted.currency,
      destination: extracted.account,
      merchantClaimed: extracted.merchant,
      rawInput: { source: page.sourceRef },
    },
    context: {
      userPrompt: task.userPrompt,
      // Tainted: the payee was derived from ingested page content.
      destinationOrigin: 'ingested_content',
      sourceRefs: [page.sourceRef],
      establishedMerchant: task.establishedMerchant,
    },
  };

  // Protection OFF: the unprotected disaster — pay whatever the page said.
  if (!opts.protection) {
    const payment = await issueScopedPayment({
      amount: extracted.amount,
      currency: extracted.currency,
      seller: extracted.merchant,
      sellerAccount: extracted.account,
    });
    narrative.push(
      `💸 PROTECTION OFF → paid ${extracted.currency} ${extracted.amount} to ${extracted.account} (${payment.mode}). Money is gone.`,
    );
    return {
      decision: 'unprotected-paid',
      via: 'none',
      payment,
      extracted,
      sourceRef: page.sourceRef,
      narrative,
    };
  }

  // Protection ON: route through Specter.
  const { via, result } = await guardCheck(base);
  narrative.push(
    `🛡️ Specter [${via}] → ${result.decision.toUpperCase()} (risk ${result.riskScore})`,
  );
  narrative.push(`   reason: ${result.reason}`);

  if (result.decision !== 'allow') {
    narrative.push('🚫 payment aborted before execution. $0 left the account.');
    return {
      decision: result.decision,
      via,
      result,
      extracted,
      sourceRef: page.sourceRef,
      narrative,
    };
  }

  const payment = await issueScopedPayment({
    amount: extracted.amount,
    currency: extracted.currency,
    seller: extracted.merchant,
    sellerAccount: extracted.account,
  });
  narrative.push(
    `✅ allowed → issued scoped SPT ${payment.token} (capped ${extracted.currency} ${payment.cappedAt}, seller "${payment.scopedTo}", ${payment.mode}); PaymentIntent ${payment.paymentIntentId}.`,
  );
  return {
    decision: 'allow',
    via,
    result,
    payment,
    extracted,
    sourceRef: page.sourceRef,
    narrative,
  };
}
