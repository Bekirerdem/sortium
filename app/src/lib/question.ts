import { chartQuestion, countryName } from "@cwf/templates";

type Q = { templateKey: string; question: string; resolveTime: number; demo: boolean; meta: Record<string, unknown> };

/**
 * The question as people should read it. Chart markets are rebuilt from their data, so markets opened before the
 * copy fix read the same as new ones; the demo flag is shown as a badge, not as a "[demo]" prefix.
 * `short` drops the date for headlines whose date already sits right above them.
 */
export function displayQuestion(m: Q, opts: { short?: boolean } = {}): string {
  const chart = m.templateKey.startsWith("AM_TOP") ? { item: "song", name: "Apple Music", cc: m.meta.cc }
    : m.templateKey === "YT_TOP_COUNTRY" ? { item: "video", name: "YouTube", cc: m.meta.region } : null;
  if (chart && typeof chart.cc === "string") {
    if (opts.short) return `Which ${chart.item} will top ${chart.name} in ${countryName(chart.cc)}?`;
    return chartQuestion(chart.item, chart.name, chart.cc, m.resolveTime, m.demo).replace(/^\[demo\] /, "");
  }
  return m.question.replace(/^\[demo\] /, "");
}
