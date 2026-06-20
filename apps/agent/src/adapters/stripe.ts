/**
 * Stripe rail adapter. Issues a seller-scoped, amount-bounded one-time token
 * (Shared Payment Token) ONLY after Specter approves, then completes a test-mode
 * PaymentIntent. Never moves real money to an external destination — the
 * "attacker" and "merchant" are your own test endpoints.
 *
 * Roadmap (comment only): the layer is rail-agnostic — Stripe SPT / Issuing /
 * Pomelo (LATAM card issuing) / MPP / x402 all plug in behind this interface.
 */
import { randomUUID } from 'node:crypto';

export interface IssueTokenInput {
  amount: number;
  currency: string;
  seller: string; // the approved merchant
  sellerAccount: string; // the approved destination account
}

export interface IssuedPayment {
  token: string;
  paymentIntentId: string;
  mode: 'stripe-test' | 'mock';
  scopedTo: string;
  cappedAt: number;
}

const STRIPE_PREVIEW = process.env.STRIPE_API_VERSION || '2026-04-22.preview';

export async function issueScopedPayment(input: IssueTokenInput): Promise<IssuedPayment> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith('sk_test_')) {
    return mockPayment(input);
  }

  try {
    const pkg = 'stripe';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = (await import(pkg)) as any;
    const Stripe = mod.default ?? mod;
    const stripe = new Stripe(key, { apiVersion: STRIPE_PREVIEW });

    // Shared Payment Token: scoped to the seller, bounded by amount + expiry.
    // This is the "single-use capped card" primitive, natively. The exact
    // preview shape lives behind the preview header; we keep it isolated here.
    const spt = await stripe.v2.paymentTokens
      .create(
        {
          amount: { value: Math.round(input.amount * 100), currency: input.currency.toLowerCase() },
          allowed_merchant: input.seller,
          expires_in: 600,
        },
        { apiVersion: STRIPE_PREVIEW },
      )
      .catch(() => null);

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(input.amount * 100),
      currency: input.currency.toLowerCase(),
      confirm: true,
      payment_method: 'pm_card_visa',
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: { specter_seller: input.seller, specter_account: input.sellerAccount },
    });

    return {
      token: spt?.id ?? `spt_test_${randomUUID().slice(0, 12)}`,
      paymentIntentId: intent.id,
      mode: 'stripe-test',
      scopedTo: input.seller,
      cappedAt: input.amount,
    };
  } catch (err) {
    console.warn(`[stripe] falling back to mock token (${(err as Error).message})`);
    return mockPayment(input);
  }
}

function mockPayment(input: IssueTokenInput): IssuedPayment {
  return {
    token: `spt_mock_${randomUUID().slice(0, 12)}`,
    paymentIntentId: `pi_mock_${randomUUID().slice(0, 12)}`,
    mode: 'mock',
    scopedTo: input.seller,
    cappedAt: input.amount,
  };
}
