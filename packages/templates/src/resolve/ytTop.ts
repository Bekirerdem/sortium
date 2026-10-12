import type { Snapshot } from "../types";
import { VOID } from "../types";

/** #1 video of YouTube's mostPopular chart → candidate index, "Other" = candidates.length, VOID when empty. */
export function resolveYtTop(meta: Record<string, unknown>, snap: Snapshot): number {
  const candidates = meta.candidates as { id: string }[];
  const items = ((snap.body as { items?: { id: string }[] })?.items ?? []);
  if (items.length === 0) return VOID;
  const idx = candidates.findIndex((c) => c.id === items[0].id);
  return idx >= 0 ? idx : candidates.length;
}
