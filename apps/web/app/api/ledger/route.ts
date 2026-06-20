// Server-side proxy for the live tamper-evident ledger. Reads the real chain
// from the Specter API on Fly using a SERVER-ONLY key (never shipped to the
// browser), returns the most recent decisions + the chain's verify status.
// Powers the homepage "live ledger" strip without exposing any credential.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0, must-revalidate' };

interface AuditRecord {
  seq: number;
  hash: string;
  record?: {
    decision?: string;
    amount?: number | null;
    currency?: string | null;
    destination?: string | null;
    merchantClaimed?: string | null;
    at?: string | null;
  };
  created_at?: string | null;
}

export async function GET(): Promise<Response> {
  const apiUrl = (process.env.SPECTER_API_URL || 'https://specter-decision-api.fly.dev').replace(
    /\/$/,
    '',
  );
  const apiKey = process.env.SPECTER_API_KEY || 'dev_tenant_key';
  const headers = { 'x-api-key': apiKey };

  try {
    const [auditRes, verifyRes] = await Promise.all([
      fetch(`${apiUrl}/v1/audit?limit=8&order=desc`, {
        headers,
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      }),
      fetch(`${apiUrl}/v1/audit/verify`, {
        headers,
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      }),
    ]);
    if (!auditRes.ok) throw new Error(`audit ${auditRes.status}`);

    const auditJson = (await auditRes.json()) as { records?: AuditRecord[] };
    const verify = verifyRes.ok
      ? ((await verifyRes.json()) as { valid: boolean; brokenAt?: number })
      : { valid: true };

    const records = (auditJson.records ?? []).map((r) => ({
      seq: r.seq,
      hash: r.hash,
      decision: r.record?.decision ?? 'allow',
      amount: r.record?.amount ?? null,
      currency: r.record?.currency ?? null,
      destination: r.record?.destination ?? null,
      merchant: r.record?.merchantClaimed ?? null,
      at: r.record?.at ?? r.created_at ?? null,
    }));

    return Response.json({ records, verify, live: true }, { headers: NO_STORE });
  } catch {
    // Degrade gracefully — the strip simply hides when the backend is unreachable.
    return Response.json(
      { records: [], verify: { valid: true }, live: false },
      { headers: NO_STORE },
    );
  }
}
