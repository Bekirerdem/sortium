// Independently re-checks a proposed outcome: fetch the stored evidence, compare its sha256 with the onchain
// proposal, re-run the template's pure resolver, compare the outcome. Usage: bun bin/verify.ts <marketId>
import { createPublicClient, http, parseAbiItem, sha256, toHex } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { ADDRESSES, TEMPLATES } from "../src/index";

const arg = process.argv[2];
if (!arg || !/^\d+$/.test(arg)) {
  console.error("usage: bun bin/verify.ts <marketId>");
  process.exit(2);
}
const id = BigInt(arg);
const api = process.env.ENGINE_URL ?? "https://cwf-engine.bekirerdem.workers.dev";
const pub = createPublicClient({ chain: arbitrumSepolia, transport: http() });

const meta = (await (await fetch(`${api}/api/markets/${id}`)).json()) as { templateKey: string; meta: Record<string, unknown> };
const evidenceRes = await fetch(`${api}/api/evidence/${id}`);
if (!evidenceRes.ok) throw new Error(`no evidence for market ${id} yet`);
const evidence = await evidenceRes.text();

const logs = await pub.getLogs({
  address: ADDRESSES.resolver,
  event: parseAbiItem("event Proposed(uint256 indexed marketId, bytes32 indexed assertionId, uint8 outcome, address proposer, bytes32 evidenceHash, string evidenceURI)"),
  args: { marketId: id },
  fromBlock: ADDRESSES.deployBlock,
});
const last = logs.at(-1);
if (!last) throw new Error(`no proposal onchain for market ${id}`);

const localHash = sha256(toHex(evidence));
const recomputed = TEMPLATES[meta.templateKey].resolve(meta.meta, JSON.parse(evidence));
const ok = localHash === last.args.evidenceHash && recomputed === last.args.outcome;
console.log({ market: arg, template: meta.templateKey, evidenceHashOnchain: last.args.evidenceHash, evidenceHashLocal: localHash, proposed: last.args.outcome, recomputed });
console.log(ok ? "MATCH" : "MISMATCH — dispute this assertion on UMA");
process.exit(ok ? 0 : 1);
