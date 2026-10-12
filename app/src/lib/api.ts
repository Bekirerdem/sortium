export const ENGINE = (import.meta.env.VITE_ENGINE_URL as string | undefined) ?? "https://cwf-engine.l3ekirerdem.workers.dev";

export type ApiMarket = {
  id: number;
  templateKey: string;
  entity: string;
  question: string;
  outcomes: string[];
  lockTime: number;
  resolveTime: number;
  status: string;
  demo: boolean;
  meta: Record<string, unknown>;
  assertionId?: string;
  rules?: string;
  live?: { label: string; value: string };
  pool?: { byOutcome: Record<string, string>; total: string; bettors: number };
};

export async function listMarkets(status = "all"): Promise<ApiMarket[]> {
  const r = await fetch(`${ENGINE}/api/markets?status=${status}`);
  if (!r.ok) throw new Error(`engine ${r.status}`);
  return ((await r.json()) as { markets: ApiMarket[] }).markets;
}

export async function getMarket(id: number): Promise<ApiMarket> {
  const r = await fetch(`${ENGINE}/api/markets/${id}`);
  if (!r.ok) throw new Error(`engine ${r.status}`);
  return (await r.json()) as ApiMarket;
}

export async function faucet(address: string) {
  const r = await fetch(`${ENGINE}/api/faucet`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address }) });
  return (await r.json()) as { ok: boolean; error?: string; txs?: string[] };
}

export const evidenceUrl = (id: number) => `${ENGINE}/api/evidence/${id}`;

export type Activity = { marketId: number; user: string; outcome: number | null; amount: string; kind: "bet" | "claim"; block: number; tx: string; time: number };
export type Stats = { volume: string; bets: number; players: number; openMarkets: number; settledMarkets: number; paidOut: string };
export type Leader = { user: string; volume: string; won: string; bets: number; wins: number };

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${ENGINE}${path}`);
  if (!r.ok) throw new Error(`engine ${r.status}`);
  return (await r.json()) as T;
}

export const getActivity = (limit = 30, market?: number) =>
  getJson<{ items: Activity[] }>(`/api/activity?limit=${limit}${market !== undefined ? `&market=${market}` : ""}`).then((r) => r.items);
export const getStats = () => getJson<Stats>("/api/stats");
export const getLeaders = () => getJson<{ items: Leader[] }>("/api/leaderboard").then((r) => r.items);
