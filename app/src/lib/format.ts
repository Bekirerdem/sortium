export const usd = (raw: bigint) => (Number(raw) / 1e6).toLocaleString("en", { maximumFractionDigits: 2 });

/** Payout per 1 staked if outcome i wins, after adding `add` to it: (total+add)·(1−fee) / (pool_i+add). */
export function multiplier(pools: bigint[], i: number, add = 0n, feeBps = 200n): number {
  const total = pools.reduce((a, b) => a + b, 0n) + add;
  const mine = (pools[i] ?? 0n) + add;
  if (mine === 0n) return 0;
  return Number((((total * (10_000n - feeBps)) / 10_000n) * 1000n) / mine) / 1000;
}

/** Percentage of the pool sitting on outcome i (0 when the pool is empty). */
export function share(pools: bigint[], i: number): number {
  const total = pools.reduce((a, b) => a + b, 0n);
  if (total === 0n) return 0;
  return Number((pools[i] * 10_000n) / total) / 100;
}

export function countdown(to: number, now = Date.now() / 1000): string {
  let s = Math.max(0, Math.floor(to - now));
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
}

export const compactNum = (n: number) => Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
