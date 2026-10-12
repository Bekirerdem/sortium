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
export async function lookupApple(byCountry: Record<string, string[]>, db?: D1Database): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const keys = Object.entries(byCountry).flatMap(([cc, ids]) => ids.map((id) => `${cc}:${id}`));
  // Apple's feed edge fails often; artwork found once is kept in D1 so a flaky minute doesn't blank the covers
  if (db && keys.length) {
    await db.prepare("CREATE TABLE IF NOT EXISTS art_cache (key TEXT PRIMARY KEY, url TEXT NOT NULL)").run();
    for (let i = 0; i < keys.length; i += 90) {
      const part = keys.slice(i, i + 90);
      const { results } = await db.prepare(`SELECT key, url FROM art_cache WHERE key IN (${part.map(() => "?").join(",")})`).bind(...part).all<{ key: string; url: string }>();
      for (const r of results) out.set(r.key, r.url);
    }
  }
  const missing = Object.keys(byCountry).filter((cc) => byCountry[cc].some((id) => !out.has(`${cc}:${id}`)));
  const fresh: [string, string][] = [];
  await Promise.all(
    missing.map(async (cc) => {
      try {
        // big feeds fail more often at Apple's edge; fall back to smaller ones (candidates sit near the top anyway)
        let data: { feed?: { results?: { id: string; artworkUrl100?: string }[] } } | null = null;
        for (const n of [100, 25, 10]) {
          const res = await fetch(`https://rss.marketingtools.apple.com/api/v2/${cc}/music/most-played/${n}/songs.json`, {
            // never cache Apple's intermittent 5xx answers, only good ones
            cf: { cacheTtlByStatus: { "200-299": 3600, "300-599": 0 }, cacheEverything: true },
          } as RequestInit);
          if (res.ok) {
            data = await res.json();
            break;
          }
        }
        if (!data) return;
        const wanted = new Set(byCountry[cc]);
        for (const r of data.feed?.results ?? []) {
          if (!r.artworkUrl100) continue;
          out.set(`${cc}:${r.id}`, r.artworkUrl100);
          if (wanted.has(r.id)) fresh.push([`${cc}:${r.id}`, r.artworkUrl100]);
        }
      } catch {
        // artwork is decoration; the market still works without it
      }
    }),
  );
  if (db && fresh.length) {
    await db.batch(fresh.map(([k, u]) => db.prepare("INSERT OR REPLACE INTO art_cache(key, url) VALUES (?, ?)").bind(k, u)));
  }
  return out;
}
