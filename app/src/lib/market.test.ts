import { expect, test } from "bun:test";
import { artFor, leaderIndex, coverOf, splitLabel } from "./market";

const meta = { candidates: [{ id: "1", label: "Drake – Quebec", art: "a.jpg" }, { id: "2", label: "ADÉLA – Nicole Kidman" }] };

test("artwork per outcome, none for 'Other'", () => {
  expect(artFor(meta, 0)).toBe("a.jpg");
  expect(artFor(meta, 1)).toBeUndefined();
  expect(artFor(meta, 2)).toBeUndefined();
});
test("leader is the outcome with most money, first one on an empty pool", () => {
  expect(leaderIndex([1n, 5n, 3n])).toBe(1);
  expect(leaderIndex([0n, 0n])).toBe(0);
});
test("cover of a market falls back to the video thumbnail for view markets", () => {
  expect(coverOf({ meta, templateKey: "AM_TOP_COUNTRY" })).toBe("a.jpg");
  expect(coverOf({ meta: { art: "yt.jpg" }, templateKey: "YT_VIEWS_24H" })).toBe("yt.jpg");
});
test("outcome labels split into title and artist", () => {
  expect(splitLabel("Drake & Don Toliver – Solar Eclipse")).toEqual({ title: "Solar Eclipse", by: "Drake & Don Toliver" });
  expect(splitLabel("Other")).toEqual({ title: "Other", by: "" });
  expect(splitLabel("Under 1M")).toEqual({ title: "Under 1M", by: "" });
});

test("categories split chart, views and fast markets", async () => {
  const { category } = await import("./market");
  expect(category({ templateKey: "AM_TOP_COUNTRY", demo: false })).toBe("music");
  expect(category({ templateKey: "AM_TOP_DEMO", demo: true })).toBe("fast");
  expect(category({ templateKey: "YT_TOP_COUNTRY", demo: false })).toBe("youtube");
  expect(category({ templateKey: "YT_VIEWS_24H", demo: false })).toBe("views");
});

test("pools from the engine summary, zero for outcomes nobody picked", async () => {
  const { poolsOf } = await import("./market");
  expect(poolsOf({ outcomes: ["a", "b", "c"], pool: { byOutcome: { "0": "5", "2": "7" }, total: "12", bettors: 2 } })).toEqual([5n, 0n, 7n]);
  expect(poolsOf({ outcomes: ["a"] })).toEqual([0n]);
});

test("share series replays bets in time order", async () => {
  const { shareSeries } = await import("./market");
  const s = shareSeries([{ time: 10, outcome: 0, amount: "30" }, { time: 20, outcome: 1, amount: "10" }, { time: 30, outcome: 1, amount: "60" }], 2);
  expect(s.map((p) => p.t)).toEqual([10, 20, 30]);
  expect(s[0].shares).toEqual([100, 0]);
  expect(s[1].shares).toEqual([75, 25]);
  expect(s[2].shares).toEqual([30, 70]);
});
