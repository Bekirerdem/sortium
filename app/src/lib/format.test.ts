import { expect, test } from "bun:test";
import { countdown, multiplier, share, usd } from "./format";

test("multiplier uses the pool after adding your stake, net of the 2% fee", () => {
  expect(multiplier([40_000000n, 60_000000n], 0)).toBe(2.45);
  expect(multiplier([0n, 10_000000n], 0)).toBe(0);
  expect(multiplier([0n, 10_000000n], 0, 10_000000n)).toBe(1.96);
});
test("countdown formats hours and minutes", () => {
  expect(countdown(3700, 0)).toBe("1h 1m");
  expect(countdown(65, 0)).toBe("1m 5s");
  expect(countdown(10, 50)).toBe("0m 0s");
});
test("usd shows two decimals at most", () => {
  expect(usd(1_234_567_000n)).toBe("1,234.57");
});
test("share of pool in percent", () => {
  expect(share([1n, 3n], 1)).toBe(75);
  expect(share([0n, 0n], 1)).toBe(0);
});
