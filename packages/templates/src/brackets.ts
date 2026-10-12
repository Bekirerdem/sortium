/** Round to 1/2/5 × 10^k (nearest, in log space). */
export function nice(n: number): number {
  if (n <= 0) return 1;
  const base = 10 ** Math.floor(Math.log10(n));
  let best = base;
  for (const s of [1, 2, 5, 10]) {
    if (Math.abs(Math.log(n) - Math.log(s * base)) < Math.abs(Math.log(n) - Math.log(best))) best = s * base;
  }
  return best;
}

/** Three ascending bounds for 24h views around a channel median: median/8, /4, /2, rounded and pushed apart when they collide. */
export function viewBounds(median: number): number[] {
  const b = [median / 8, median / 4, median / 2].map(nice);
  for (let i = 1; i < b.length; i++) if (b[i] <= b[i - 1]) b[i] = nice(b[i - 1] * 2.2);
  return b;
}

export function compact(n: number): string {
  return Intl.NumberFormat("en", { notation: "compact" }).format(n);
}
