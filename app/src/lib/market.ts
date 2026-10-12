type Cand = { id: string; label: string; art?: string };
type MetaLike = { meta: Record<string, unknown>; templateKey: string };

export function artFor(meta: Record<string, unknown>, i: number): string | undefined {
  return ((meta.candidates as Cand[] | undefined) ?? [])[i]?.art;
}

export function leaderIndex(pools: bigint[]): number {
  let best = 0;
  for (let i = 1; i < pools.length; i++) if (pools[i] > pools[best]) best = i;
  return best;
}

/** The image that represents a market: its first candidate's artwork, or the video thumbnail for view markets. */
export function coverOf(m: MetaLike): string | undefined {
  return (m.meta.art as string | undefined) ?? artFor(m.meta, 0);
}

/** "Artist – Title" → { title, by }; labels without an en dash (Other, brackets) stay whole. */
export function splitLabel(label: string): { title: string; by: string } {
  const at = label.indexOf(" – ");
  if (at === -1) return { title: label, by: "" };
  return { title: label.slice(at + 3), by: label.slice(0, at) };
}

export const family = (key: string) => (key.startsWith("YT") ? "YouTube" : "Music");

export type Category = "music" | "youtube" | "views" | "fast";

/** Home filter a market belongs to: chart markets by source, view counts, and the minutes-long demo markets. */
export function category(m: { templateKey: string; demo: boolean }): Category {
  if (m.demo) return "fast";
  if (m.templateKey === "YT_VIEWS_24H") return "views";
  return m.templateKey.startsWith("YT") ? "youtube" : "music";
}

type PoolLike = { outcomes: string[]; pool?: { byOutcome: Record<string, string>; total: string; bettors: number } };

/** Stake per outcome from the engine's index, so lists can show odds without one RPC call per market. */
export function poolsOf(m: PoolLike): bigint[] {
  return m.outcomes.map((_, i) => BigInt(m.pool?.byOutcome[i] ?? "0"));
}

/** Each outcome's share of the pool (percent) after every bet, oldest first. */
export function shareSeries(bets: { time: number; outcome: number | null; amount: string }[], n: number) {
  const pools = new Array<number>(n).fill(0);
  const out: { t: number; shares: number[] }[] = [];
  for (const b of [...bets].sort((a, z) => a.time - z.time)) {
    if (b.outcome === null || b.outcome >= n) continue;
    pools[b.outcome] += Number(b.amount);
    const total = pools.reduce((a, x) => a + x, 0);
    out.push({ t: b.time, shares: pools.map((p) => Math.round((p / total) * 10000) / 100) });
  }
  return out;
}
