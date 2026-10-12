import { TEMPLATES } from "@cwf/templates";
import type { Row } from "./logic";
import { appleIdsByCountry, lookupApple, withArt } from "./art";

const toApi = (r: Row) => ({
  id: r.market_id,
  templateKey: r.template_key,
  entity: r.entity,
  question: r.question,
  outcomes: JSON.parse(r.outcomes) as string[],
  lockTime: r.lock_time,
  resolveTime: r.resolve_time,
  status: r.status,
  demo: !!r.demo,
  meta: JSON.parse(r.meta) as Record<string, unknown>,
  assertionId: r.assertion_id ?? undefined,
  rules: TEMPLATES[r.template_key]?.rules,
});

export async function listMarkets(db: D1Database, url: URL) {
  const status = url.searchParams.get("status") ?? "all";
  const now = Math.floor(Date.now() / 1000);
  const q =
    status === "open"
      ? db.prepare("SELECT * FROM markets WHERE status = 'open' AND lock_time > ? ORDER BY lock_time ASC LIMIT 200").bind(now)
      : status === "all"
        ? db.prepare("SELECT * FROM markets WHERE market_id IS NOT NULL ORDER BY market_id DESC LIMIT 200")
        : db.prepare("SELECT * FROM markets WHERE status = ? ORDER BY market_id DESC LIMIT 200").bind(status);
  const { results } = await q.all<Row>();
  const markets = results.map(toApi);
  return Response.json({ markets: withArt(markets, await lookupApple(appleIdsByCountry(markets), db)) });
}

async function cachedJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cf: { cacheTtlByStatus: { "200-299": 60, "300-599": 0 }, cacheEverything: true } } as RequestInit);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export async function getMarket(db: D1Database, id: number, youtubeKey?: string) {
  const r = await db.prepare("SELECT * FROM markets WHERE market_id = ?").bind(id).first<Row>();
  if (!r) return Response.json({ error: "not found" }, { status: 404 });
  const m = toApi(r);
  let live: { label: string; value: string } | undefined;
  try {
    if (r.template_key === "YT_VIEWS_24H" && youtubeKey) {
      const v = (await cachedJson(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${m.meta.videoId}&key=${youtubeKey}`)) as {
        items?: { statistics?: { viewCount?: string } }[];
      };
      live = { label: "Views now", value: v.items?.[0]?.statistics?.viewCount ?? "—" };
    } else if (r.template_key.startsWith("AM_TOP")) {
      const f = (await cachedJson(`https://rss.marketingtools.apple.com/api/v2/${m.meta.cc}/music/most-played/1/songs.json`)) as {
        feed?: { results?: { name: string; artistName: string }[] };
      };
      const top = f.feed?.results?.[0];
      live = { label: "#1 right now", value: top ? `${top.artistName} – ${top.name}` : "—" };
    } else if (r.template_key === "YT_TOP_COUNTRY" && youtubeKey) {
      const c = (await cachedJson(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&regionCode=${m.meta.region}&maxResults=1&key=${youtubeKey}`,
      )) as { items?: { snippet: { title: string; channelTitle: string } }[] };
      const top = c.items?.[0];
      live = { label: "#1 right now", value: top ? `${top.snippet.channelTitle} – ${top.snippet.title}` : "—" };
    }
  } catch {
    // live data is best-effort; the market page still works without it
  }
  const [illustrated] = withArt([m], await lookupApple(appleIdsByCountry([m]), db));
  return Response.json({ ...illustrated, live });
}

export async function getEvidence(db: D1Database, id: number) {
  const s = await db.prepare("SELECT body FROM snapshots WHERE market_id = ?").bind(id).first<{ body: string }>();
  if (!s) return new Response("no evidence yet", { status: 404 });
  return new Response(s.body, { headers: { "content-type": "application/json" } });
}
