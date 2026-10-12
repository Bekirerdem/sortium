import { chartQuestion, countryName } from "@cwf/templates";
import { TR_COUNTRY, decidedAt, trClock, type Lang } from "./i18n";

type Q = { templateKey: string; question: string; resolveTime: number; demo: boolean; meta: Record<string, unknown> };

/**
 * The question as people should read it. Chart markets are rebuilt from their data, so markets opened before the
 * copy fix read the same as new ones; the demo flag is shown as a badge, not as a "[demo]" prefix.
 * `short` drops the date for headlines whose date already sits right above them.
 */
export function displayQuestion(m: Q, opts: { short?: boolean; lang?: Lang } = {}): string {
  const chart = m.templateKey.startsWith("AM_TOP") ? { item: "song", name: "Apple Music", cc: m.meta.cc }
    : m.templateKey === "YT_TOP_COUNTRY" ? { item: "video", name: "YouTube", cc: m.meta.region } : null;
  if (chart && typeof chart.cc === "string") {
    if (opts.lang === "tr") {
      const cc = chart.cc.toLowerCase();
      const where = TR_COUNTRY[cc]?.[1] ?? `${cc.toUpperCase()} bölgesinde`;
      const top = chart.name === "YouTube" ? "YouTube'un" : "Apple Music'in";
      const core = `${where} ${top} zirvesinde hangi ${chart.item === "song" ? "şarkı" : "video"} olacak?`;
      if (opts.short) return core;
      const when = m.demo ? `Saat ${trClock(new Date(m.resolveTime * 1000).toISOString().slice(11, 16))} (UTC)` : decidedAt(m.resolveTime, "tr");
      return `${when} ${core}`;
    }
    if (opts.short) return `Which ${chart.item} will top ${chart.name} in ${countryName(chart.cc)}?`;
    return chartQuestion(chart.item, chart.name, chart.cc, m.resolveTime, m.demo).replace(/^\[demo\] /, "");
  }
  const views = opts.lang === "tr" && m.question.match(/^How many views will "(.*)" by (.*) have 24h after publishing\?$/);
  if (views) return `"${views[1]}" (${views[2]}) yayından 24 saat sonra kaç izlenmede olacak?`;
  return m.question.replace(/^\[demo\] /, "");
}

/** Outcome labels the templates write in English ("Under 1.2M", "Other") in the reader's language. */
export function displayOutcome(label: string, lang: Lang = "en"): string {
  if (lang !== "tr") return label;
  const under = label.match(/^Under (.+)$/);
  return under ? `${under[1]} altı` : label;
}
