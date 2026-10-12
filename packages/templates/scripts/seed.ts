// Seeds real onchain activity from TEAM TEST WALLETS (not users): each wallet gets a little gas from the deployer,
// takes 1,000 tUSD from the TestUSD faucet itself, and spreads a few bets over the open non-demo markets.
// Keys live only in ~/.cwf-seed-wallets.json. Usage: bun scripts/seed.ts [wallets=10]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createPublicClient, createWalletClient, formatEther, http, maxUint256, parseEther, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { ADDRESSES, poolMarketsAbi, testUsdAbi } from "../src/index";

const ENGINE = "https://cwf-engine.l3ekirerdem.workers.dev";
const FILE = join(homedir(), ".cwf-seed-wallets.json");
const COUNT = Number(process.argv[2] ?? 10);
const GAS_EACH = parseEther("0.0002");
const KEEP = parseEther("0.01");

const pub = createPublicClient({ chain: arbitrumSepolia, transport: http() });
const funder = createWalletClient({ account: privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as Hex), chain: arbitrumSepolia, transport: http() });

const keys: Hex[] = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : [];
while (keys.length < COUNT) keys.push(generatePrivateKey());
writeFileSync(FILE, JSON.stringify(keys), { mode: 0o600 });

type M = { id: number; outcomes: string[]; demo: boolean; lockTime: number; templateKey: string };
const now = Date.now() / 1000;
const { markets } = (await (await fetch(`${ENGINE}/api/markets?status=open`)).json()) as { markets: M[] };
const open = markets.filter((m) => !m.demo && m.lockTime > now + 600);
if (!open.length) throw new Error("no open non-demo markets");
console.log(`open markets: ${open.map((m) => m.id).join(",")}`);

// favourites (the chart's current order) draw most of the money; "Other" (last) rarely
function pickOutcome(n: number): number {
  const w = Array.from({ length: n }, (_, i) => (i === n - 1 ? 0.15 : 1 / (i + 1) ** 1.1));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < n; i++) if ((r -= w[i]) <= 0) return i;
  return 0;
}
const AMOUNTS = [5, 8, 10, 12, 15, 20, 25, 25, 30, 40, 50, 60, 75, 100, 120];
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

const funderBal = await pub.getBalance({ address: funder.account.address });
const accounts = keys.slice(0, COUNT).map((k) => privateKeyToAccount(k));
const needs = [];
for (const a of accounts) if ((await pub.getBalance({ address: a.address })) < GAS_EACH / 2n) needs.push(a);
if (funderBal - GAS_EACH * BigInt(needs.length) < KEEP) throw new Error(`deployer would drop below ${formatEther(KEEP)} ETH`);
for (const a of needs) {
  const hash = await funder.sendTransaction({ to: a.address, value: GAS_EACH });
  await pub.waitForTransactionReceipt({ hash });
}
console.log(`funded ${needs.length} wallets with ${formatEther(GAS_EACH)} ETH each`);

let placed = 0;
for (const [i, account] of accounts.entries()) {
  const w = createWalletClient({ account, chain: arbitrumSepolia, transport: http() });
  const send = async (hash: Hex) => {
    const r = await pub.waitForTransactionReceipt({ hash });
    if (r.status !== "success") throw new Error(`reverted ${hash}`);
  };
  try {
    const bal = await pub.readContract({ address: ADDRESSES.tusd, abi: testUsdAbi, functionName: "balanceOf", args: [account.address] });
    if (bal < 500_000000n) await send(await w.writeContract({ address: ADDRESSES.tusd, abi: testUsdAbi, functionName: "faucet" }));
    const allowance = await pub.readContract({ address: ADDRESSES.tusd, abi: testUsdAbi, functionName: "allowance", args: [account.address, ADDRESSES.markets] });
    if (allowance < 1_000_000000n) {
      await send(await w.writeContract({ address: ADDRESSES.tusd, abi: testUsdAbi, functionName: "approve", args: [ADDRESSES.markets, maxUint256] }));
    }
    const chosen = [...open].sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 3));
    for (const m of chosen) {
      const outcome = pickOutcome(m.outcomes.length);
      const amount = BigInt(pick(AMOUNTS)) * 1_000000n;
      await send(await w.writeContract({ address: ADDRESSES.markets, abi: poolMarketsAbi, functionName: "bet", args: [BigInt(m.id), outcome, amount] }));
      placed++;
      console.log(`wallet ${i} bet ${amount / 1_000000n} on market ${m.id} outcome ${outcome}`);
    }
  } catch (e) {
    console.log(`wallet ${i} failed: ${(e as Error).message.split("\n")[0]}`);
  }
}
console.log(`placed ${placed} bets; deployer left ${formatEther(await pub.getBalance({ address: funder.account.address }))} ETH`);
