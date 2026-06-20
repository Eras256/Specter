import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { decisionToHookResponse } from '../hook-adapter.js';

// Mock mode (no SUPABASE_URL) → in-memory store seeded with the dev tenant key.
const KEY = process.env.SPECTER_API_KEY || 'dev_tenant_key';
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  app = createApp();
});

const authed = (path: string, body: unknown) =>
  app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': KEY },
    body: JSON.stringify(body),
  });

describe('health', () => {
  it('responds ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).status).toBe('ok');
  });
});

describe('auth', () => {
  it('rejects unauthenticated /v1/evaluate', async () => {
    const res = await app.request('/v1/evaluate', { method: 'POST', body: '{}' });
    expect(res.status).toBe(401);
  });
});

describe('POST /v1/evaluate', () => {
  it('allows a clean, in-policy, user-originated payment', async () => {
    const res = await authed('/v1/evaluate', {
      agentId: 'shop-agent',
      sessionId: 's1',
      action: {
        type: 'payment',
        amount: 49.99,
        currency: 'USD',
        destination: 'acct_acme_store',
        merchantClaimed: 'Acme Store',
        rawInput: {},
      },
      context: {
        userPrompt: 'Buy the Acme mouse from Acme Store.',
        destinationOrigin: 'user_prompt',
        establishedMerchant: 'Acme Store',
        sourceRefs: [],
      },
    });
    expect(res.status).toBe(200);
    const d = (await res.json()) as any;
    expect(d.decision).toBe('allow');
  });

  it('denies an injected destination-swap payment', async () => {
    const res = await authed('/v1/evaluate', {
      agentId: 'shop-agent',
      sessionId: 's2',
      action: {
        type: 'payment',
        amount: 79.99,
        currency: 'USD',
        destination: 'acct_attacker_x9f3',
        merchantClaimed: 'Billing Update',
        rawInput: {},
      },
      context: {
        userPrompt: 'Buy the Acme mouse from Acme Store.',
        destinationOrigin: 'ingested_content',
        establishedMerchant: 'Acme Store',
        sourceRefs: ['firecrawl:https://shop.example/acme'],
      },
    });
    const d = (await res.json()) as any;
    expect(d.decision).toBe('deny');
  });
});

describe('Claude Code hook adapter — the gotcha', () => {
  it('ALWAYS returns HTTP 200 (status code never blocks)', async () => {
    const res = await authed('/hooks/claude-code', {
      session_id: 'cc1',
      tool_name: 'Bash',
      tool_input: { command: 'DROP TABLE users;' },
    });
    expect(res.status).toBe(200); // not 4xx/5xx — those would NOT block
  });

  it('blocks a destructive command via permissionDecision: deny in the body', async () => {
    const res = await authed('/hooks/claude-code', {
      session_id: 'cc2',
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /' },
    });
    const body = (await res.json()) as any;
    expect(body.hookSpecificOutput.hookEventName).toBe('PreToolUse');
    expect(body.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('allows a benign command', async () => {
    const res = await authed('/hooks/claude-code', {
      session_id: 'cc3',
      tool_name: 'Bash',
      tool_input: { command: 'ls -la' },
    });
    const body = (await res.json()) as any;
    expect(body.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('blocks a .env read', async () => {
    const res = await authed('/hooks/claude-code', {
      session_id: 'cc4',
      tool_name: 'Read',
      tool_input: { file_path: '/app/.env' },
    });
    const body = (await res.json()) as any;
    expect(body.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('maps review → ask (human approval), still 200', async () => {
    const res = await authed('/hooks/claude-code', {
      session_id: 'cc5',
      tool_name: 'pay',
      tool_input: {
        amount: 42,
        destination: 'acct_unknown_vendor',
        merchantClaimed: 'New Vendor',
        currency: 'USD',
      },
      specter: {
        userPrompt: 'pay the invoice',
        destinationOrigin: 'user_prompt',
        agentId: 'cc-agent',
      },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(['ask', 'deny']).toContain(body.hookSpecificOutput.permissionDecision);
  });
});

describe('decisionToHookResponse mapping', () => {
  it('maps allow/deny/review correctly', () => {
    expect(decisionToHookResponse('allow', 'x').hookSpecificOutput.permissionDecision).toBe(
      'allow',
    );
    expect(decisionToHookResponse('deny', 'x').hookSpecificOutput.permissionDecision).toBe('deny');
    expect(decisionToHookResponse('review', 'x').hookSpecificOutput.permissionDecision).toBe('ask');
  });
});

describe('audit chain via API', () => {
  it('verifies intact after writes and lists records', async () => {
    await authed('/v1/evaluate', {
      agentId: 'a',
      sessionId: 's',
      action: {
        type: 'payment',
        amount: 10,
        currency: 'USD',
        destination: 'acct_acme_store',
        merchantClaimed: 'Acme Store',
        rawInput: {},
      },
      context: {
        userPrompt: 'pay acme',
        destinationOrigin: 'user_prompt',
        establishedMerchant: 'Acme Store',
        sourceRefs: [],
      },
    });
    const verify = await app.request('/v1/audit/verify', { headers: { 'x-api-key': KEY } });
    const v = (await verify.json()) as any;
    expect(v.valid).toBe(true);

    const audit = await app.request('/v1/audit', { headers: { 'x-api-key': KEY } });
    const a = (await audit.json()) as any;
    expect(Array.isArray(a.records)).toBe(true);
    expect(a.records.length).toBeGreaterThan(0);
  });
});

describe('in-app approval flow (human-in-the-loop)', () => {
  it('deny → incident raised → approve updates its status', async () => {
    const ev = await authed('/v1/evaluate', {
      agentId: 'hitl',
      sessionId: 's-hitl',
      action: {
        type: 'payment',
        amount: 200,
        currency: 'USD',
        destination: 'acct_attacker_hitl',
        merchantClaimed: 'Billing',
        rawInput: {},
      },
      context: {
        userPrompt: 'buy the mouse from Acme Store',
        destinationOrigin: 'ingested_content',
        establishedMerchant: 'Acme Store',
        sourceRefs: ['x'],
      },
    });
    expect(((await ev.json()) as any).decision).not.toBe('allow');

    const list = await app.request('/v1/incidents', { headers: { 'x-api-key': KEY } });
    const open = ((await list.json()) as any).incidents.find((i: any) => i.status === 'open');
    expect(open).toBeTruthy();

    const res = await authed(`/v1/incidents/${open.id}`, { status: 'approved' });
    expect(res.status).toBe(200);

    const after = await app.request('/v1/incidents', { headers: { 'x-api-key': KEY } });
    const updated = ((await after.json()) as any).incidents.find((i: any) => i.id === open.id);
    expect(updated.status).toBe('approved');
  });

  it('rejects an invalid status', async () => {
    const list = await app.request('/v1/incidents', { headers: { 'x-api-key': KEY } });
    const any = ((await list.json()) as any).incidents[0];
    const res = await authed(`/v1/incidents/${any.id}`, { status: 'bogus' });
    expect(res.status).toBe(400);
  });
});

describe('audit chain concurrency', () => {
  it('N concurrent evaluations yield one gap-free, valid chain', async () => {
    const countBefore = (
      (await (
        await app.request('/v1/audit?limit=100000', { headers: { 'x-api-key': KEY } })
      ).json()) as any
    ).records.length;
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        authed('/v1/evaluate', {
          agentId: 'conc',
          sessionId: `c${i}`,
          action: {
            type: 'payment',
            amount: 10 + i,
            currency: 'USD',
            destination: 'acct_acme_store',
            merchantClaimed: 'Acme Store',
            rawInput: {},
          },
          context: {
            userPrompt: 'buy from Acme Store',
            destinationOrigin: 'user_prompt',
            establishedMerchant: 'Acme Store',
            sourceRefs: [],
          },
        }),
      ),
    );
    const verify = await app.request('/v1/audit/verify', { headers: { 'x-api-key': KEY } });
    expect(((await verify.json()) as any).valid).toBe(true);

    const records = (
      (await (
        await app.request('/v1/audit?limit=100000', { headers: { 'x-api-key': KEY } })
      ).json()) as any
    ).records;
    expect(records.length).toBe(countBefore + 20);
    const seqs = records.map((r: any) => Number(r.seq)).sort((x: number, y: number) => x - y);
    seqs.forEach((s: number, i: number) => {
      expect(s).toBe(i); // contiguous 0..N-1, no forks/gaps
    });
  });
});
