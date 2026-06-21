// Fintual adapter — models an AI agent that manages your investment portfolio.
//
// readPortfolio() pulls REAL data from Fintual's public API (the live NAV of the
// Mexican PPR fund "Risky Hayek") so the demo is grounded in real numbers; on any
// failure it falls back to a static value so it still runs offline.
//
// requestWithdrawal() is a MOCK — it never moves real money. A production build
// would call Fintual's authenticated withdrawal endpoint with the user's token;
// the point here is that the *decision* to move money runs through Specter first.

const FINTUAL_API = process.env.FINTUAL_API_URL || 'https://fintual.cl/api';
const RISKY_HAYEK = 2904; // conceptual_asset_id of Fintual México's PPR fund (MXN)

export interface Portfolio {
  fund: string;
  nav: number;
  units: number;
  value: number;
  currency: string;
  sourceRef: string;
}

export async function readPortfolio(): Promise<Portfolio> {
  const units = 62_000; // the user's PPR holdings (demo)
  try {
    const res = await fetch(`${FINTUAL_API}/real_assets?conceptual_asset_id=${RISKY_HAYEK}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const json = (await res.json()) as {
        data?: Array<{ attributes?: { name?: string; last_day?: { net_asset_value?: number } } }>;
      };
      const attr = json.data?.[0]?.attributes;
      const nav = attr?.last_day?.net_asset_value;
      if (nav) {
        return {
          fund: attr?.name ?? 'Risky Hayek',
          nav,
          units,
          value: Math.round(nav * units),
          currency: 'MXN',
          sourceRef: `fintual:real_assets/${RISKY_HAYEK}`,
        };
      }
    }
  } catch {
    /* fall through to the offline-safe value */
  }
  const nav = 1.680406;
  return {
    fund: 'Risky Hayek',
    nav,
    units,
    value: Math.round(nav * units),
    currency: 'MXN',
    sourceRef: 'fintual:fixture',
  };
}

export interface WithdrawalInput {
  amount: number;
  currency: string;
  destinationAccount: string;
}

export interface Withdrawal {
  confirmation: string;
  mode: 'mock';
}

export async function requestWithdrawal(input: WithdrawalInput): Promise<Withdrawal> {
  // MOCK only — never moves real money. Specter has already approved by this point.
  void input;
  return { confirmation: `ftl_wd_${Math.random().toString(36).slice(2, 10)}`, mode: 'mock' };
}
