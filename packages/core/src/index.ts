// Specter detection engine + tamper-evident audit chain.
// Pure, well-typed, unit-testable. No network I/O lives here — the LLM
// classifier is injected into evaluateAction so this package stays deterministic.

export * from './audit.js';
export * from './destructive.js';
export * from './evaluate.js';
export * from './schemas.js';
export * from './signals.js';
export * from './text.js';
