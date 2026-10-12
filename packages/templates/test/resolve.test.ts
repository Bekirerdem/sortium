import { expect, test } from "bun:test";
import { resolveAmTop } from "../src/resolve/amTop";
import { resolveYtTop } from "../src/resolve/ytTop";
import { resolveYtViews } from "../src/resolve/ytViews";
import { VOID } from "../src/types";
import amFeed from "./fixtures/am-us.json";

const candidates = [{ id: "111", label: "A – x" }, { id: "222", label: "B – y" }];
const snap = (body: unknown) => ({ source: "s", fetchedAt: 0, body });

test("apple: #1 among candidates", () => {
  expect(resolveAmTop({ candidates }, snap({ feed: { results: [{ id: "222" }, { id: "111" }] } }))).toBe(1);
});
test("apple: #1 not listed -> Other", () => {
  expect(resolveAmTop({ candidates }, snap({ feed: { results: [{ id: "999" }] } }))).toBe(2);
});
test("apple: empty feed -> VOID", () => {
  expect(resolveAmTop({ candidates }, snap({ feed: { results: [] } }))).toBe(VOID);
});
test("apple: real fixture resolves to a valid index", () => {
  const top = (amFeed as { feed: { results: { id: string }[] } }).feed.results[0].id;
  expect(resolveAmTop({ candidates: [{ id: top, label: "t" }] }, snap(amFeed))).toBe(0);
});
test("youtube top: #1 id match / Other / VOID", () => {
  const meta = { candidates: [{ id: "v1", label: "a" }, { id: "v2", label: "b" }] };
  expect(resolveYtTop(meta, snap({ items: [{ id: "v2" }] }))).toBe(1);
  expect(resolveYtTop(meta, snap({ items: [{ id: "zz" }] }))).toBe(2);
  expect(resolveYtTop(meta, snap({ items: [] }))).toBe(VOID);
});
test("youtube views: bracket edges", () => {
  const meta = { bounds: [1000, 5000, 20000] }; // outcomes: <1k, 1k-5k, 5k-20k, >=20k
  const views = (v: string) => snap({ items: [{ statistics: { viewCount: v } }] });
  expect(resolveYtViews(meta, views("999"))).toBe(0);
  expect(resolveYtViews(meta, views("1000"))).toBe(1);
  expect(resolveYtViews(meta, views("19999"))).toBe(2);
  expect(resolveYtViews(meta, views("20000"))).toBe(3);
  expect(resolveYtViews(meta, snap({ items: [] }))).toBe(VOID);
});
