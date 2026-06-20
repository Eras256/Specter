// Browser-side mirror of @specter/core's tamper-evident chain (Web Crypto), so the
// dashboard can demonstrate "edit a record → verification turns red" live, with
// the same canonical-JSON + sha256 semantics as the server.

export const GENESIS = '0'.repeat(64);

export interface ChainRecord {
  seq: number;
  record: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

function canonical(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonical);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) out[k] = canonical(obj[k]);
  return out;
}

export function canonicalJSON(v: unknown): string {
  return JSON.stringify(canonical(v));
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildChain(records: Record<string, unknown>[]): Promise<ChainRecord[]> {
  const out: ChainRecord[] = [];
  let prev = GENESIS;
  for (let i = 0; i < records.length; i++) {
    const hash = await sha256Hex(prev + canonicalJSON(records[i]));
    out.push({ seq: i, record: records[i]!, prevHash: prev, hash });
    prev = hash;
  }
  return out;
}

export async function verifyChain(
  chain: ChainRecord[],
): Promise<{ valid: boolean; brokenAt?: number }> {
  let expected = GENESIS;
  for (let i = 0; i < chain.length; i++) {
    const r = chain[i]!;
    if (r.prevHash !== expected) return { valid: false, brokenAt: i };
    const recomputed = await sha256Hex(r.prevHash + canonicalJSON(r.record));
    if (recomputed !== r.hash) return { valid: false, brokenAt: i };
    expected = r.hash;
  }
  return { valid: true };
}
