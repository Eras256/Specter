import { describe, expect, it } from 'vitest';
import { evaluateAction } from '../evaluate.js';
import type { EvaluateInput, Policy } from '../schemas.js';

const basePolicy: Partial<Policy> = {
  perTxCap: 500,
  monthlyCap: 5000,
  allowlist: ['Acme Store', 'acct_acme_store'],
  requireApprovalOnNewDestination: true,
};

function legit(overrides: Partial<EvaluateInput> = {}): EvaluateInput {
  return {
    agentId: 'agent_1',
    sessionId: 'sess_1',
    action: {
      type: 'payment',
      amount: 79.99,
      currency: 'USD',
      destination: 'acct_acme_store',
      merchantClaimed: 'Acme Store',
      rawInput: {},
    },
    context: {
      userPrompt: 'Buy the Acme Wireless Mouse from Acme Store, under $100.',
      destinationOrigin: 'user_prompt',
      sourceRefs: [],
      establishedMerchant: 'Acme Store',
    },
    policy: basePolicy as Policy,
    state: {
      spentThisMonth: 200,
      paymentsInWindow: 1,
      knownDestinations: ['acct_acme_store'],
    },
    ...overrides,
  };
}

describe('evaluateAction — legitimate purchase (green path)', () => {
  it('allows a clean, in-policy, user-originated payment', async () => {
    const d = await evaluateAction(legit());
    expect(d.decision).toBe('allow');
    expect(d.riskScore).toBeLessThan(0.4);
  });
});

describe('evaluateAction — injection / destination-swap (red path)', () => {
  it('denies when the payee came from ingested content and does not trace to user intent', async () => {
    const d = await evaluateAction(
      legit({
        action: {
          type: 'payment',
          amount: 79.99,
          currency: 'USD',
          destination: 'acct_attacker_x9f3',
          merchantClaimed: 'Secure Billing Update',
          rawInput: {},
        },
        context: {
          userPrompt: 'Buy the Acme Wireless Mouse from Acme Store, under $100.',
          destinationOrigin: 'ingested_content',
          sourceRefs: ['firecrawl:https://shop.example/acme-mouse'],
          establishedMerchant: 'Acme Store',
        },
        state: {
          spentThisMonth: 200,
          paymentsInWindow: 1,
          knownDestinations: ['acct_acme_store'],
        },
      }),
    );
    expect(d.decision).toBe('deny');
    expect(d.riskScore).toBeGreaterThanOrEqual(0.7);
    expect(d.signals.provenance).toMatch(/ingested/i);
  });

  it('at minimum reviews when merchant label is spoofed to match but account is swapped', async () => {
    const d = await evaluateAction(
      legit({
        action: {
          type: 'payment',
          amount: 79.99,
          currency: 'USD',
          destination: 'acct_attacker_x9f3',
          merchantClaimed: 'Acme Store', // spoofed label
          rawInput: {},
        },
        context: {
          userPrompt: 'Buy the Acme Wireless Mouse from Acme Store, under $100.',
          destinationOrigin: 'ingested_content',
          establishedMerchant: 'Acme Store',
          sourceRefs: [],
        },
      }),
    );
    expect(d.decision === 'deny' || d.decision === 'review').toBe(true);
  });
});

describe('evaluateAction — policy caps', () => {
  it('denies an amount over the per-transaction cap', async () => {
    const d = await evaluateAction(
      legit({ action: { ...legit().action, amount: 5000 } as EvaluateInput['action'] }),
    );
    expect(d.decision).toBe('deny');
    expect(d.signals.policy).toMatch(/cap/i);
  });

  it('flags when the monthly cap would be exceeded', async () => {
    const d = await evaluateAction(
      legit({
        state: {
          spentThisMonth: 4990,
          paymentsInWindow: 1,
          knownDestinations: ['acct_acme_store'],
        },
        action: { ...legit().action, amount: 50 } as EvaluateInput['action'],
      }),
    );
    expect(d.decision === 'deny' || d.decision === 'review').toBe(true);
  });
});

describe('evaluateAction — new destination requires approval', () => {
  it('reviews (never silently allows) a never-before-seen destination', async () => {
    const d = await evaluateAction(
      legit({
        action: {
          type: 'payment',
          amount: 42,
          currency: 'USD',
          destination: 'acct_brand_new_vendor',
          merchantClaimed: 'Acme Store',
          rawInput: {},
        },
        context: {
          userPrompt: 'Pay Acme Store $42.',
          destinationOrigin: 'user_prompt',
          establishedMerchant: 'Acme Store',
          sourceRefs: [],
        },
        state: { spentThisMonth: 0, paymentsInWindow: 0, knownDestinations: ['acct_acme_store'] },
      }),
    );
    expect(d.decision).toBe('review');
  });
});

describe('evaluateAction — velocity', () => {
  it('flags excessive payments within the window', async () => {
    const d = await evaluateAction(
      legit({
        state: {
          spentThisMonth: 100,
          paymentsInWindow: 10,
          knownDestinations: ['acct_acme_store'],
        },
      }),
    );
    expect(d.signals.consistency).toMatch(/velocity/i);
  });
});

describe('evaluateAction — destructive actions run before any LLM', () => {
  it('denies a DROP TABLE without invoking the LLM classifier', async () => {
    let llmCalled = false;
    const d = await evaluateAction(
      {
        agentId: 'a',
        sessionId: 's',
        action: { type: 'db_write', command: 'DROP TABLE users;', rawInput: {} },
        context: { userPrompt: 'clean up', destinationOrigin: 'unknown', sourceRefs: [] },
        policy: basePolicy as Policy,
      },
      {
        llmClassifier: async () => {
          llmCalled = true;
          return { injectionLikelihood: 0, reason: 'n/a' };
        },
      },
    );
    expect(d.decision).toBe('deny');
    expect(llmCalled).toBe(false);
    expect(d.signals.destructive).toMatch(/drop/i);
  });
});

describe('evaluateAction — LLM is one signal, never the only guard', () => {
  it('still denies a clear injection even if the LLM says it is safe', async () => {
    const d = await evaluateAction(
      {
        agentId: 'a',
        sessionId: 's',
        action: {
          type: 'payment',
          amount: 80,
          currency: 'USD',
          destination: 'acct_attacker_x9f3',
          merchantClaimed: 'Totally Legit',
          rawInput: {},
        },
        context: {
          userPrompt: 'Buy the Acme mouse from Acme Store.',
          destinationOrigin: 'ingested_content',
          establishedMerchant: 'Acme Store',
          sourceRefs: [],
        },
        policy: basePolicy as Policy,
      },
      { llmClassifier: async () => ({ injectionLikelihood: 0, reason: 'looks fine to me' }) },
    );
    expect(d.decision).toBe('deny');
  });

  it('degrades gracefully when the LLM classifier throws', async () => {
    const d = await evaluateAction(legit(), {
      llmClassifier: async () => {
        throw new Error('timeout');
      },
    });
    expect(d.decision).toBe('allow');
    expect(d.signals.llm).toMatch(/unavailable/i);
  });
});
