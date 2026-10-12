import { resolveYtTop } from "../resolve/ytTop";
import { chartQuestion, nextResolve } from "./amTop";
import type { Env, MarketDraft, Template } from "../types";

const REGIONS = ["TR", "US", "KR", "BR", "IN", "JP", "DE", "GB"] as const;
const chartUrl = (region: string, key: string, n: number) =>
  `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&regionCode=${region}&maxResults=${n}&key=${key}`;

type Chart = { items: { id: string; snippet: { title: string; channelTitle: string } }[] };

async function fetchChart(region: string, key: string, n: number): Promise<Chart> {
  const res = await fetch(chartUrl(region, key, n));
  if (!res.ok) throw new Error(`yt chart ${region} ${res.status}`);
  return (await res.json()) as Chart;
}


export const ytTop: Template = {
  key: "YT_TOP_COUNTRY",
  version: 1,
  demo: false,
  resolveFile: "resolve/ytTop.ts",
  plannedKeys: (env: Env) =>
    env.YOUTUBE_API_KEY ? REGIONS.map((r) => `YT_TOP_COUNTRY:${r}:${new Date(nextResolve(env.now) * 1000).toISOString().slice(0, 10)}`) : [],
  rules:
    "Outcome = the first item of YouTube Data API v3 videos.list chart=mostPopular for the region at the first resolver fetch " +
    "at or after resolve time. A video not in the list wins as 'Other'. Empty or failing chart for 6 hours → void, stakes refunded.",
  async drafts(env: Env): Promise<MarketDraft[]> {
    if (!env.YOUTUBE_API_KEY) return [];
    const out: MarketDraft[] = [];
    for (const region of REGIONS) {
      const resolveTime = nextResolve(env.now);
      let chart: Chart;
      try {
        chart = await fetchChart(region, env.YOUTUBE_API_KEY, 7);
      } catch (e) {
        console.error(String(e)); // one region failing must not block the others
        continue;
      }
      if (chart.items.length < 2) continue;
      const candidates = chart.items.map((v) => ({ id: v.id, label: `${v.snippet.channelTitle} – ${v.snippet.title}`.slice(0, 120) }));
      out.push({
        templateKey: "YT_TOP_COUNTRY",
        entity: region,
        windowKey: new Date(resolveTime * 1000).toISOString().slice(0, 10),
        question: chartQuestion("video", "YouTube", region, resolveTime, false),
        outcomes: [...candidates.map((c) => c.label), "Other"],
        lockTime: resolveTime - 12 * 3600,
        resolveTime,
        meta: { region, candidates },
      });
    }
    return out;
  },
  async snapshot(meta, env) {
    const body = await fetchChart(meta.region as string, env.YOUTUBE_API_KEY!, 10);
    // the API key must never end up inside public evidence
    return { source: chartUrl(meta.region as string, "REDACTED", 10), fetchedAt: Math.floor(Date.now() / 1000), body };
  },
  resolve: resolveYtTop,
};
