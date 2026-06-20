import { getStore } from '@specter/db';
import type { Context, Next } from 'hono';

/** Tenant context attached to each authenticated request. */
export interface TenantCtx {
  tenantId: string;
  tenantName: string;
}

/**
 * API-key auth. Accepts `Authorization: Bearer <key>` or `x-api-key: <key>`.
 * Resolves the tenant via the store (hashed lookup in Supabase, map in mock).
 */
export async function apiKeyAuth(c: Context, next: Next) {
  const header = c.req.header('authorization');
  const bearer = header?.toLowerCase().startsWith('bearer ') ? header.slice(7) : undefined;
  const key = bearer ?? c.req.header('x-api-key');
  if (!key) {
    return c.json({ error: 'missing API key (Authorization: Bearer <key> or x-api-key)' }, 401);
  }
  const tenant = await getStore().getTenantByApiKey(key);
  if (!tenant) return c.json({ error: 'invalid API key' }, 401);
  c.set('tenant', { tenantId: tenant.tenantId, tenantName: tenant.tenantName } satisfies TenantCtx);
  await next();
}

export function getTenant(c: Context): TenantCtx {
  return c.get('tenant') as TenantCtx;
}

/**
 * Simple in-memory token-bucket rate limiter, keyed by API key. Adequate for a
 * single warm Fly machine; a multi-machine deploy would back this with Redis.
 */
interface Bucket {
  tokens: number;
  updated: number;
}
const buckets = new Map<string, Bucket>();

export function rateLimit(opts: { capacity: number; refillPerSec: number }) {
  return async (c: Context, next: Next) => {
    const key =
      c.req.header('authorization') ??
      c.req.header('x-api-key') ??
      c.req.header('x-forwarded-for') ??
      'anon';
    const now = Date.now();
    const b = buckets.get(key) ?? { tokens: opts.capacity, updated: now };
    const elapsed = (now - b.updated) / 1000;
    b.tokens = Math.min(opts.capacity, b.tokens + elapsed * opts.refillPerSec);
    b.updated = now;
    if (b.tokens < 1) {
      buckets.set(key, b);
      return c.json({ error: 'rate limit exceeded' }, 429);
    }
    b.tokens -= 1;
    buckets.set(key, b);
    await next();
  };
}
