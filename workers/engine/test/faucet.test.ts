import { expect, test } from "bun:test";
import { faucetDecision } from "../src/faucet";

const DAY = 86_400;

test("faucet refuses same address within 24h", () => {
  expect(faucetDecision({ last: 1000 }, null, 1000 + DAY - 1)).toEqual({ ok: false, reason: "address cooldown" });
  expect(faucetDecision({ last: 1000 }, null, 1000 + DAY)).toEqual({ ok: true });
});
test("faucet refuses same IP within 24h", () => {
  expect(faucetDecision(null, { last: 5000 }, 5000 + 10)).toEqual({ ok: false, reason: "ip cooldown" });
  expect(faucetDecision(null, null, 0)).toEqual({ ok: true });
});
