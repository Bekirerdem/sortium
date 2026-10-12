type WithMeta = { templateKey: string; meta: Record<string, unknown> };
type Cand = { id: string; label: string; art?: string };

const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** Apple track ids grouped by storefront: a Turkish chart song is often missing from the US store lookup. */
export function appleIdsByCountry(markets: WithMeta[]): Record<string, string[]> {
  const out: Record<string, Set<string>> = {};
  for (const m of markets) {
    if (!m.templateKey.startsWith("AM_")) continue;
    const cc = String(m.meta.cc ?? "us");
    out[cc] ??= new Set();
    for (const c of (m.meta.candidates as Cand[] | undefined) ?? []) out[cc].add(c.id);
  }
  return Object.fromEntries(Object.entries(out).map(([cc, ids]) => [cc, [...ids]]));
}

/** Pure: copies of the markets with `art` on every candidate we can illustrate. Apple keys are "cc:id". */
export function withArt<T extends WithMeta>(markets: T[], apple: Map<string, string>): T[] {
  return markets.map((m) => {
    const meta = { ...m.meta };
    const cc = String(meta.cc ?? "us");
    if (Array.isArray(meta.candidates)) {
      meta.candidates = (meta.candidates as Cand[]).map((c) => {
        const art = m.templateKey.startsWith("AM_")
          ? apple.get(`${cc}:${c.id}`)?.replace("100x100bb", "600x600bb")
          : m.templateKey.startsWith("YT_")
            ? ytThumb(c.id)
            : undefined;
        return art ? { ...c, art } : { ...c };
      });
    }
    if (typeof meta.videoId === "string") meta.art = ytThumb(meta.videoId);
    return { ...m, meta };
  });
}

/**
 * Artwork from each storefront's top-100 feed (edge-cached for an hour). The iTunes lookup API answers 403 to
 * Workers, but the chart feed does not, and every candidate came from that chart. Failures just mean no artwork.
 */
export async function lookupApple(byCountry: Record<string, string[]>): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  await Promise.all(
    Object.keys(byCountry).map(async (cc) => {
      try {
        const res = await fetch(`https://rss.marketingtools.apple.com/api/v2/${cc}/music/most-played/100/songs.json`, {
          cf: { cacheTtl: 3600, cacheEverything: true },
        } as RequestInit);
        if (!res.ok) return;
        const data = (await res.json()) as { feed?: { results?: { id: string; artworkUrl100?: string }[] } };
        for (const r of data.feed?.results ?? []) if (r.artworkUrl100) out.set(`${cc}:${r.id}`, r.artworkUrl100);
      } catch {
        // artwork is decoration; the market still works without it
      }
    }),
  );
  return out;
}
