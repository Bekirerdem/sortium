import { expect, test } from "bun:test";
import { encodeAbiParameters, pad, toEventSelector, type Hex } from "viem";
import { decodeActivity, nextRange, planBlocks, type RawLog } from "../src/activity";

const BET = toEventSelector("BetPlaced(uint256,address,uint8,uint256)");
const CLAIM = toEventSelector("Claimed(uint256,address,uint256)");
const user = "0x2e3a147434ae9e89d3baf8ba2d0a97784c08ca08";

const log = (topic: Hex, block: number, idx: number, data: Hex): RawLog => ({
  topics: [topic, pad("0x0b"), pad(user)],
  data,
  blockNumber: `0x${block.toString(16)}`,
  transactionHash: `0x${"ab".repeat(32)}`,
  logIndex: `0x${idx.toString(16)}`,
});

test("decodes bets and claims into rows", () => {
  const bet = log(BET, 100, 5, encodeAbiParameters([{ type: "uint8" }, { type: "uint256" }], [2, 20_000000n]));
  const claim = log(CLAIM, 101, 1, encodeAbiParameters([{ type: "uint256" }], [29_400000n]));
  expect(decodeActivity([bet, claim])).toEqual([
    { tx: `0x${"ab".repeat(32)}`, logIndex: 5, marketId: 11, user, outcome: 2, amount: 20_000000, kind: "bet", block: 100 },
    { tx: `0x${"ab".repeat(32)}`, logIndex: 1, marketId: 11, user, outcome: null, amount: 29_400000, kind: "claim", block: 101 },
  ]);
});

test("ranges are capped and never pass the head", () => {
  expect(nextRange(99, 1000, 50_000)).toEqual({ from: 100, to: 1000 });
  expect(nextRange(99, 200_000, 50_000)).toEqual({ from: 100, to: 50_099 });
  expect(nextRange(1000, 1000, 50_000)).toBeNull();
});

test("only the first N distinct blocks are kept, and the cursor stops at the last whole block", () => {
  const rows = [10, 10, 11, 12, 12, 13].map((block, i) => ({ block, i }));
  expect(planBlocks(rows, 2, 20)).toEqual({ keep: rows.slice(0, 3), blocks: [10, 11], cursor: 11 });
  expect(planBlocks(rows, 10, 20)).toEqual({ keep: rows, blocks: [10, 11, 12, 13], cursor: 20 });
});
