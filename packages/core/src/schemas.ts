import { z } from 'zod';

/**
 * The kinds of irreversible / money-moving actions Specter governs.
 * `payment` and `refund` move money; `db_write`, `shell`, `file` are the
 * destructive-action beat (DROP TABLE, rm -rf, .env reads, ...).
 */
export const ActionType = z.enum(['payment', 'db_write', 'shell', 'file', 'refund', 'other']);
export type ActionType = z.infer<typeof ActionType>;

/**
 * Where the *destination* of an action came from. This is the crux of the
 * threat model: point of injection != point of damage. A destination derived
 * from `ingested_content` (a scraped page, an invoice the agent read) is the
 * red flag — the attacker swapped the payee by poisoning what the agent read.
 */
export const DestinationOrigin = z.enum([
  'user_prompt', // the human typed/approved this destination
  'ingested_content', // came from content the agent fetched mid-task (the attack vector)
  'tool_output', // came from another tool's result
  'unknown', // adapter could not establish provenance
]);
export type DestinationOrigin = z.infer<typeof DestinationOrigin>;

export const Decision = z.enum(['allow', 'deny', 'review']);
export type Decision = z.infer<typeof Decision>;

/**
 * Tenant policy — the control plane. Configured once via the wizard.
 */
export const PolicySchema = z.object({
  /** Hard ceiling for a single transaction (in `currency` minor-unit-agnostic major units, e.g. dollars). */
  perTxCap: z.number().nonnegative().default(500),
  /** Rolling monthly ceiling across all of a tenant's agents. */
  monthlyCap: z.number().nonnegative().default(5000),
  /** Approved beneficiaries / merchants. A destination here is trusted. */
  allowlist: z.array(z.string()).default([]),
  /** Allowed merchant categories (empty = all allowed). */
  allowedCategories: z.array(z.string()).default([]),
  /** A never-before-seen destination escalates to human approval instead of silent allow. */
  requireApprovalOnNewDestination: z.boolean().default(true),
  /**
   * Optional email for incident notifications. The human-in-the-loop itself is
   * the in-app approval queue (Supabase Realtime) + a spoken alert; the
   * notification channel is agnostic — email (roadmap, via Resend), Slack, etc.
   * plug in behind it. (No external messaging API sits in the request path.)
   */
  notificationEmail: z.string().optional(),
  /** Velocity guard: max payments allowed within `velocityWindowMs`. */
  maxPaymentsInWindow: z.number().int().positive().default(5),
  velocityWindowMs: z
    .number()
    .int()
    .positive()
    .default(60 * 60 * 1000),
});
export type Policy = z.infer<typeof PolicySchema>;

/**
 * Runtime state passed in by the caller (the API), keeping `core` pure: caps
 * and velocity need to know spend-so-far and recently-seen destinations, but
 * `core` never fetches them itself.
 */
export const RuntimeStateSchema = z
  .object({
    spentThisMonth: z.number().nonnegative().default(0),
    paymentsInWindow: z.number().int().nonnegative().default(0),
    /** Destinations this tenant has paid before (establishes "new destination"). */
    knownDestinations: z.array(z.string()).default([]),
    /** Expected amount from the cart/invoice the task started with, if known. */
    expectedAmount: z.number().nonnegative().optional(),
  })
  .default({});
export type RuntimeState = z.infer<typeof RuntimeStateSchema>;

export const ActionSchema = z.object({
  type: ActionType,
  amount: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  /** Payee / account / target identifier. */
  destination: z.string().optional(),
  /** The merchant the action claims it is paying. */
  merchantClaimed: z.string().optional(),
  /** Merchant category, when known (for category policy). */
  category: z.string().optional(),
  /** For shell / db_write / file actions. */
  command: z.string().optional(),
  /** Whatever the agent actually passed — kept for the audit record. */
  rawInput: z.unknown(),
});
export type Action = z.infer<typeof ActionSchema>;

export const ContextSchema = z.object({
  /** The original human instruction that started the task. */
  userPrompt: z.string().default(''),
  /** Adapter-declared origin of the destination. */
  destinationOrigin: DestinationOrigin.default('unknown'),
  /** Provenance breadcrumbs, e.g. ["firecrawl:https://shop.example/item"]. */
  sourceRefs: z.array(z.string()).default([]),
  /** The merchant established at task start (before any ingestion), if any. */
  establishedMerchant: z.string().optional(),
});
export type Context = z.infer<typeof ContextSchema>;

export const EvaluateInputSchema = z.object({
  agentId: z.string().min(1),
  sessionId: z.string().min(1),
  action: ActionSchema,
  context: ContextSchema.default({}),
  policy: PolicySchema.default({}),
  state: RuntimeStateSchema.optional(),
});
export type EvaluateInput = z.infer<typeof EvaluateInputSchema>;

/** A single detection signal's contribution. */
export const SignalResultSchema = z.object({
  /** Stable id, e.g. "provenance". */
  id: z.string(),
  /** 0..1 — how strongly this signal indicates risk. */
  score: z.number().min(0).max(1),
  /** Human-readable explanation. */
  verdict: z.string(),
});
export type SignalResult = z.infer<typeof SignalResultSchema>;

export const DecisionResultSchema = z.object({
  decision: Decision,
  riskScore: z.number().min(0).max(1),
  reason: z.string(),
  signals: z.record(z.string(), z.string()),
  /** Structured per-signal detail (for the dashboard trace panels). */
  signalDetail: z.array(SignalResultSchema),
});
export type DecisionResult = z.infer<typeof DecisionResultSchema>;

/** Output shape of the optional LLM classifier, injected into evaluateAction. */
export const LlmSignalSchema = z.object({
  /** 0..1 likelihood this action is the product of an injection / out-of-policy hijack. */
  injectionLikelihood: z.number().min(0).max(1),
  reason: z.string(),
});
export type LlmSignal = z.infer<typeof LlmSignalSchema>;
