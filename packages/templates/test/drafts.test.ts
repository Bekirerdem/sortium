import { expect, test } from "bun:test";
import { nextResolve } from "../src/templates/amTop";
import { TEMPLATES } from "../src/index";

const DAY = 86_400;

test("nextResolve is a 12:00 UTC slot leaving open time before the 12h lock", () => {
  const now = Date.UTC(2026, 9, 12, 4, 0, 0) / 1000; // 04:00 UTC
  const r = nextResolve(now);
  expect(r % DAY).toBe(12 * 3600);
  expect(r - 12 * 3600).toBeGreaterThan(now + 600);
  expect(r).toBe(Date.UTC(2026, 9, 13, 12, 0, 0) / 1000);
});

test("YouTube templates produce nothing without an API key", async () => {
  const env = { now: 1_800_000_000 };
  expect(await TEMPLATES.YT_TOP_COUNTRY.drafts(env)).toEqual([]);
  expect(await TEMPLATES.YT_VIEWS_24H.drafts(env)).toEqual([]);
});
