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
