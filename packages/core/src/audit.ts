import { createHash } from 'node:crypto';

/**
 * Tamper-evident audit log primitive.
 *
 * Each record is hashed together with the previous record's hash, forming a
 * chain: hash_n = sha256(prev_hash + canonicalJSON(record)). Mutating any past
 * record changes its hash, which breaks every subsequent link — so the chain
 * "turns red" at the exact index that was edited. This powers the live
 * tamper-evidence moment in the demo.
 *
 * Roadmap (comment only): periodically anchor the chain's Merkle root to an
 * external append-only log (e.g. a public transparency log) so even the chain
 * operator cannot rewrite history undetected.
 */

/** The genesis hash that precedes the first record. */
export const GENESIS_HASH = '0'.repeat(64);

export interface AuditRecord<T = unknown> {
  seq: number;
  record: T;
  prevHash: string;
  hash: string;
}

/**
 * Deterministic JSON serialization with stable key ordering at every depth.
 * Two structurally-equal objects always serialize identically, so the hash is
 * reproducible across machines and languages.
 */
export function canonicalJSON(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    out[key] = canonicalize(obj[key]);
  }
  return out;
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/** Compute the hash for a record given the previous hash. */
export function hashRecord(prevHash: string, record: unknown): string {
  return sha256Hex(prevHash + canonicalJSON(record));
}

/**
 * Append a record to the chain, returning the new record plus its hash.
 * `prevHash` is the hash of the last record (or GENESIS_HASH for the first).
 */
export function appendAuditRecord<T>(prevHash: string, record: T, seq: number): AuditRecord<T> {
  const hash = hashRecord(prevHash, record);
  return { seq, record, prevHash, hash };
}

export interface VerifyResult {
  valid: boolean;
  /** First index (0-based) where the chain diverges, if any. */
  brokenAt?: number;
  reason?: string;
}

/**
 * Recompute every hash and verify the chain is intact and correctly linked.
 * Reports the first index where the stored hash diverges from the recomputed
 * one, or where the prev-hash linkage is broken.
 */
export function verifyChain(records: AuditRecord[]): VerifyResult {
  let expectedPrev = GENESIS_HASH;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r) return { valid: false, brokenAt: i, reason: 'missing record' };

    if (r.prevHash !== expectedPrev) {
      return {
        valid: false,
        brokenAt: i,
        reason: `prevHash mismatch at seq ${r.seq}: expected ${expectedPrev.slice(0, 12)}…, got ${r.prevHash.slice(0, 12)}…`,
      };
    }

    const recomputed = hashRecord(r.prevHash, r.record);
    if (recomputed !== r.hash) {
      return {
        valid: false,
        brokenAt: i,
        reason: `record at seq ${r.seq} was modified after it was written (hash mismatch)`,
      };
    }

    expectedPrev = r.hash;
  }
  return { valid: true };
}
