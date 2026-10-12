import { resolveAmTop } from "../resolve/amTop";
import type { Env, MarketDraft, Template } from "../types";

const COUNTRIES = ["tr", "us", "kr", "br", "jp", "de", "gb", "fr", "mx", "in"] as const;
const DAY = 86_400;
export const feedUrl = (cc: string, n: number) => `https://rss.marketingtools.apple.com/api/v2/${cc}/music/most-played/${n}/songs.json`;

type Feed = { feed: { results: { id: string; name: string; artistName: string }[] } };

/** Apple's feed edge intermittently answers 5xx; retry a few times before giving up. */
export async function fetchFeed(cc: string, n = 10): Promise<Feed> {
  let last = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(feedUrl(cc, n), { headers: { "user-agent": "cwf-markets" }, signal: AbortSignal.timeout(6000) });
      if (res.ok) return (await res.json()) as Feed;
      last = `apple feed ${cc} ${res.status}`;
    } catch (e) {
      last = `apple feed ${cc} ${String(e)}`;
    }
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  throw new Error(last);
}

/** Next 12:00 UTC whose 12h lock is still at least 10 minutes away. */
export function nextResolve(now: number): number {
  let t = Math.floor(now / DAY) * DAY + 12 * 3600;
  while (t - 12 * 3600 <= now + 600) t += DAY;
  return t;
}

const utc = (t: number) => new Date(t * 1000).toISOString().slice(0, 16).replace("T", " ");

function make(key: string, demo: boolean, countries: readonly string[]): Template {
  const windowKey = (now: number) =>
    demo ? String(Math.floor(now / 900)) : new Date(nextResolve(now) * 1000).toISOString().slice(0, 10);
  return {
    plannedKeys: (env: Env) => countries.map((cc) => `${key}:${cc}:${windowKey(env.now)}`),
    key,
    version: 1,
    demo,
    resolveFile: "resolve/amTop.ts",
    rules:
      "Outcome = the first item of Apple's official Most Played songs feed for the storefront " +
      "(rss.marketingtools.apple.com/api/v2/{cc}/music/most-played/10/songs.json) at the first resolver fetch at or after resolve time. " +
      "If that song is not one of the listed songs, 'Other' wins. If the feed is unavailable or empty for 6 hours after resolve time, " +
      "the market is void and all stakes are refunded.",
    async drafts(env: Env): Promise<MarketDraft[]> {
      const out: MarketDraft[] = [];
      for (const cc of countries) {
        const resolveTime = demo ? env.now + 600 : nextResolve(env.now);
        const lockTime = demo ? env.now + 300 : resolveTime - 12 * 3600;
        let feed: Feed;
        try {
          feed = await fetchFeed(cc, 7);
        } catch (e) {
          console.error(String(e)); // one storefront failing must not block the others
          continue;
        }
        const candidates = feed.feed.results.slice(0, 7).map((r) => ({ id: r.id, label: `${r.artistName} – ${r.name}` }));
        out.push({
          templateKey: key,
          entity: cc,
          windowKey: windowKey(env.now),
          question: `${demo ? "[demo] " : ""}Which song will be #1 on Apple Music ${cc.toUpperCase()} at ${utc(resolveTime)} UTC?`,
          outcomes: [...candidates.map((c) => c.label), "Other"],
          lockTime,
          resolveTime,
          meta: { cc, candidates },
        });
      }
      return out;
    },
    async snapshot(meta) {
      const body = await fetchFeed(meta.cc as string, 10);
      return { source: feedUrl(meta.cc as string, 10), fetchedAt: Math.floor(Date.now() / 1000), body };
    },
    resolve: resolveAmTop,
  };
}

export const amTop = make("AM_TOP_COUNTRY", false, COUNTRIES);
export const amTopDemo = make("AM_TOP_DEMO", true, ["us"]);
