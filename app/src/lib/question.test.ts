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
