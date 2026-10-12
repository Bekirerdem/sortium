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
