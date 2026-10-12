import { locale, type Lang } from "./i18n";

export const usd = (raw: bigint, lang: Lang = "en") => (Number(raw) / 1e6).toLocaleString(locale(lang), { maximumFractionDigits: 2 });

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

const UNITS: Record<Lang, [string, string, string]> = { en: ["h", "m", "s"], tr: [" sa", " dk", " sn"] };

export function countdown(to: number, now = Date.now() / 1000, lang: Lang = "en"): string {
  const [hu, mu, su] = UNITS[lang];
  let s = Math.max(0, Math.floor(to - now));
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  return h > 0 ? `${h}${hu} ${m}${mu}` : `${m}${mu} ${s % 60}${su}`;
}

export const compactNum = (n: number, lang: Lang = "en") =>
  Intl.NumberFormat(locale(lang), { notation: "compact", maximumFractionDigits: 1 }).format(n);
