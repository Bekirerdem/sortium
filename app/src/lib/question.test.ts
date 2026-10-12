import { expect, test } from "bun:test";
import { displayQuestion } from "./question";

const noon = Date.UTC(2026, 9, 13, 12, 0, 0) / 1000;

test("chart markets get the readable question regardless of the text stored onchain", () => {
  const m = { templateKey: "AM_TOP_COUNTRY", question: "Which song will be #1 on Apple Music US at 2026-10-13 12:00 UTC?", resolveTime: noon, demo: false, meta: { cc: "us" } };
  expect(displayQuestion(m)).toBe("Which song will top Apple Music in the United States on Oct 13 (12:00 UTC)?");
});
test("demo markets drop the [demo] prefix and name the minute", () => {
  const m = { templateKey: "AM_TOP_DEMO", question: "[demo] x", resolveTime: noon + 300, demo: true, meta: { cc: "us" } };
  expect(displayQuestion(m)).toBe("Which song will top Apple Music in the United States at 12:05 UTC?");
});
test("short form drops the date for headlines that show it elsewhere", () => {
  const m = { templateKey: "AM_TOP_COUNTRY", question: "x", resolveTime: noon, demo: false, meta: { cc: "tr" } };
  expect(displayQuestion(m, { short: true })).toBe("Which song will top Apple Music in Türkiye?");
});

test("YouTube chart and other templates", () => {
  expect(displayQuestion({ templateKey: "YT_TOP_COUNTRY", question: "q", resolveTime: noon, demo: false, meta: { region: "TR" } }))
    .toBe("Which video will top YouTube in Türkiye on Oct 13 (12:00 UTC)?");
  expect(displayQuestion({ templateKey: "YT_VIEWS_24H", question: "How many views?", resolveTime: noon, demo: false, meta: {} })).toBe("How many views?");
});

test("Turkish questions use the country in the locative case", () => {
  const m = (cc: string) => ({ templateKey: "AM_TOP_COUNTRY", question: "x", resolveTime: noon, demo: false, meta: { cc } });
  expect(displayQuestion(m("tr"), { short: true, lang: "tr" })).toBe("Türkiye'de Apple Music'in zirvesinde hangi şarkı olacak?");
  expect(displayQuestion(m("us"), { short: true, lang: "tr" })).toBe("ABD'de Apple Music'in zirvesinde hangi şarkı olacak?");
  expect(displayQuestion(m("gb"), { short: true, lang: "tr" })).toBe("Birleşik Krallık'ta Apple Music'in zirvesinde hangi şarkı olacak?");
  expect(displayQuestion(m("de"), { lang: "tr" })).toBe("13 Ekim 12:00'de (UTC) Almanya'da Apple Music'in zirvesinde hangi şarkı olacak?");
  expect(displayQuestion({ templateKey: "YT_TOP_COUNTRY", question: "q", resolveTime: noon, demo: false, meta: { region: "KR" } }, { short: true, lang: "tr" }))
    .toBe("Güney Kore'de YouTube'un zirvesinde hangi video olacak?");
  expect(displayQuestion({ templateKey: "AM_TOP_DEMO", question: "x", resolveTime: noon + 300, demo: true, meta: { cc: "us" } }, { lang: "tr" }))
    .toBe("Saat 12:05'te (UTC) ABD'de Apple Music'in zirvesinde hangi şarkı olacak?");
});

test("Turkish view-count questions are rebuilt from the stored English text", () => {
  const q = 'How many views will "Big Video" by MrBeast have 24h after publishing?';
  expect(displayQuestion({ templateKey: "YT_VIEWS_24H", question: q, resolveTime: noon, demo: false, meta: {} }, { lang: "tr" }))
    .toBe('"Big Video" (MrBeast) yayından 24 saat sonra kaç izlenmede olacak?');
});
