import { expect, test } from "bun:test";
import { nice, viewBounds } from "../src/brackets";

test("nice numbers", () => {
  expect(nice(1300)).toBe(1000);
  expect(nice(1800)).toBe(2000);
  expect(nice(4100)).toBe(5000);
});
test("bounds ascending", () => {
  for (const m of [10, 999, 12345, 98_000_000]) {
    const b = viewBounds(m);
    expect(b[0] < b[1] && b[1] < b[2]).toBe(true);
  }
});
