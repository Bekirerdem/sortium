import { expect, test } from "bun:test";
import { IP_DAILY_CAP, faucetDecision } from "../src/faucet";

const DAY = 86_400;

test("faucet refuses same address within 24h", () => {
  expect(faucetDecision({ last: 1000 }, 0, 1000 + DAY - 1)).toEqual({ ok: false, reason: "address cooldown" });
  expect(faucetDecision({ last: 1000 }, 0, 1000 + DAY)).toEqual({ ok: true });
});
test("one network can fund several wallets a day, up to the cap", () => {
  expect(faucetDecision(null, IP_DAILY_CAP - 1, 0)).toEqual({ ok: true });
  expect(faucetDecision(null, IP_DAILY_CAP, 0)).toEqual({ ok: false, reason: "ip cooldown" });
  expect(IP_DAILY_CAP).toBeGreaterThanOrEqual(5);
});
