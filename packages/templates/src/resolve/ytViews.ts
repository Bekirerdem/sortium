import type { Snapshot } from "../types";
import { VOID } from "../types";

/** viewCount vs ascending bounds [b0,b1,b2] → 0: <b0, 1: [b0,b1), 2: [b1,b2), 3: >=b2. Missing/private video → VOID. */
export function resolveYtViews(meta: Record<string, unknown>, snap: Snapshot): number {
  const bounds = meta.bounds as number[];
  const raw = (snap.body as { items?: { statistics?: { viewCount?: string } }[] })?.items?.[0]?.statistics?.viewCount;
  if (raw === undefined) return VOID;
  const views = Number(raw);
  let i = 0;
  while (i < bounds.length && views >= bounds[i]) i++;
  return i;
}
