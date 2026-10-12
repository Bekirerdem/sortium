import type { Snapshot } from "../types";
import { VOID } from "../types";

/** #1 song of the Apple Music feed → index of matching candidate, candidates.length for "Other", VOID when the feed is empty. */
export function resolveAmTop(meta: Record<string, unknown>, snap: Snapshot): number {
  const candidates = meta.candidates as { id: string }[];
  const results = ((snap.body as { feed?: { results?: { id: string }[] } })?.feed?.results ?? []);
  if (results.length === 0) return VOID;
  const idx = candidates.findIndex((c) => c.id === results[0].id);
  return idx >= 0 ? idx : candidates.length;
}
