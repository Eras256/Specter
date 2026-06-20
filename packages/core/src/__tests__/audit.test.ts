import { describe, expect, it } from 'vitest';
import {
  type AuditRecord,
  appendAuditRecord,
  canonicalJSON,
  GENESIS_HASH,
  hashRecord,
  verifyChain,
} from '../audit.js';

function buildChain(records: object[]): AuditRecord[] {
  const out: AuditRecord[] = [];
  let prev = GENESIS_HASH;
  records.forEach((r, i) => {
    const rec = appendAuditRecord(prev, r, i);
    out.push(rec);
    prev = rec.hash;
  });
  return out;
}

describe('canonicalJSON', () => {
  it('produces stable output regardless of key order', () => {
    const a = canonicalJSON({ b: 1, a: 2, c: { y: 1, x: 2 } });
    const b = canonicalJSON({ c: { x: 2, y: 1 }, a: 2, b: 1 });
    expect(a).toBe(b);
  });

  it('preserves array order', () => {
    expect(canonicalJSON([3, 1, 2])).toBe('[3,1,2]');
  });
});

describe('hash chain', () => {
  it('links records via prevHash', () => {
    const chain = buildChain([{ decision: 'allow' }, { decision: 'deny' }, { decision: 'review' }]);
    expect(chain[0]!.prevHash).toBe(GENESIS_HASH);
    expect(chain[1]!.prevHash).toBe(chain[0]!.hash);
    expect(chain[2]!.prevHash).toBe(chain[1]!.hash);
  });

  it('verifies an intact chain', () => {
    const chain = buildChain([{ a: 1 }, { b: 2 }, { c: 3 }]);
    expect(verifyChain(chain)).toEqual({ valid: true });
  });

  it('verifies an empty chain', () => {
    expect(verifyChain([])).toEqual({ valid: true });
  });
});

describe('tamper evidence', () => {
  it('detects a mutated record and reports the exact index', () => {
    const chain = buildChain([{ amount: 10 }, { amount: 20 }, { amount: 30 }]);
    // Attacker edits a past record's content but cannot recompute the chain.
    (chain[1]!.record as { amount: number }).amount = 99999;

    const result = verifyChain(chain);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(1);
    expect(result.reason).toMatch(/modified/i);
  });

  it('detects a broken prevHash linkage', () => {
    const chain = buildChain([{ x: 1 }, { x: 2 }, { x: 3 }]);
    chain[2]!.prevHash = '0'.repeat(64);
    const result = verifyChain(chain);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(2);
    expect(result.reason).toMatch(/prevHash/i);
  });

  it('hashRecord is deterministic', () => {
    expect(hashRecord(GENESIS_HASH, { a: 1, b: 2 })).toBe(hashRecord(GENESIS_HASH, { b: 2, a: 1 }));
  });
});
