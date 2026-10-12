import { createPublicClient, decodeEventLog, encodeFunctionData, hexToString, http, parseAbiItem, parseEther, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { ADDRESSES, poolMarketsAbi, testUsdAbi, umaResolverAbi, type MarketDraft } from "@cwf/templates";

const RPC = "https://sepolia-rollup.arbitrum.io/rpc";
const templateRegistered = parseAbiItem(
  "event TemplateRegistered(uint64 indexed templateId, bytes32 key, uint32 version, bytes32 codeHash, bytes32 rulesHash, string rulesURI, bool demo)",
);

export type Chain = ReturnType<typeof makeChain>;

/**
 * Two-phase chain access built for the free Workers plan (50 subrequests per invocation):
 * sends are signed locally with a tracked nonce (estimateGas + sendRawTransaction = 2 subrequests),
 * and receipts are read on a later tick instead of polling inside this one.
 */
export function makeChain(operatorKey: string) {
  const account = privateKeyToAccount(operatorKey as Hex);
  const pub = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC) });
  let nonce: number | null = null;
  let maxFeePerGas = 0n;
  let templateIds: Record<string, bigint> | null = null;

  async function send(to: Hex, data: Hex, value = 0n): Promise<Hex> {
    if (nonce === null) {
      const [n, gasPrice] = await Promise.all([pub.getTransactionCount({ address: account.address, blockTag: "pending" }), pub.getGasPrice()]);
      nonce = n;
      maxFeePerGas = gasPrice * 2n;
    }
    const gas = await pub.estimateGas({ account: account.address, to, data, value });
    const raw = await account.signTransaction({
      chainId: arbitrumSepolia.id,
      type: "eip1559",
      to,
      data,
      value,
      nonce,
      gas: (gas * 13n) / 10n,
      maxFeePerGas,
      maxPriorityFeePerGas: 0n,
    });
    const hash = await pub.sendRawTransaction({ serializedTransaction: raw });
    nonce += 1;
    return hash;
  }

  async function templateId(key: string): Promise<bigint> {
    if (!templateIds) {
      const logs = await pub.getLogs({ address: ADDRESSES.markets, event: templateRegistered, fromBlock: ADDRESSES.deployBlock });
      templateIds = {};
      for (const l of logs) templateIds[hexToString(l.args.key!, { size: 32 })] = l.args.templateId!; // latest registration wins
    }
    const id = templateIds[key];
    if (id === undefined) throw new Error(`template ${key} not registered`);
    return id;
  }

  /** null = not mined yet; otherwise success flag and the decoded events of interest. */
  async function receipt(hash: Hex) {
    try {
      const r = await pub.getTransactionReceipt({ hash });
      return r;
    } catch {
      return null;
    }
  }

  return {
    address: account.address,

    async sendCreateMarket(d: MarketDraft, metaHash: Hex): Promise<Hex> {
      const data = encodeFunctionData({
        abi: poolMarketsAbi,
        functionName: "createMarket",
        args: [await templateId(d.templateKey), d.question, d.outcomes, BigInt(d.lockTime), BigInt(d.resolveTime), metaHash],
      });
      return send(ADDRESSES.markets, data);
    },

    async confirmCreateMarket(hash: Hex): Promise<{ ok: boolean; id?: number } | null> {
      const r = await receipt(hash);
      if (!r) return null;
      if (r.status !== "success") return { ok: false };
      for (const log of r.logs) {
        try {
          const ev = decodeEventLog({ abi: poolMarketsAbi, data: log.data, topics: log.topics });
          if (ev.eventName === "MarketCreated") return { ok: true, id: Number(ev.args.id) };
        } catch {
          // not a PoolMarkets event
        }
      }
      return { ok: false };
    },

    async sendPropose(id: number, outcome: number, evidenceHash: Hex, evidenceURI: string): Promise<Hex> {
      const data = encodeFunctionData({ abi: umaResolverAbi, functionName: "propose", args: [BigInt(id), outcome, evidenceHash, evidenceURI] });
      return send(ADDRESSES.resolver, data);
    },

    async confirmPropose(hash: Hex): Promise<{ ok: boolean; assertionId?: Hex } | null> {
      const r = await receipt(hash);
      if (!r) return null;
      if (r.status !== "success") return { ok: false };
      for (const log of r.logs) {
        try {
          const ev = decodeEventLog({ abi: umaResolverAbi, data: log.data, topics: log.topics });
          if (ev.eventName === "Proposed") return { ok: true, assertionId: ev.args.assertionId };
        } catch {
          // OOv3 / token logs
        }
      }
      return { ok: false };
    },

    async sendSettle(assertionId: Hex): Promise<Hex> {
      return send(ADDRESSES.resolver, encodeFunctionData({ abi: umaResolverAbi, functionName: "settle", args: [assertionId] }));
    },

    async mined(hash: Hex): Promise<boolean | null> {
      const r = await receipt(hash);
      return r ? r.status === "success" : null;
    },

    async marketState(id: number): Promise<number> {
      return Number(await pub.readContract({ address: ADDRESSES.markets, abi: poolMarketsAbi, functionName: "state", args: [BigInt(id)] }));
    },

    async drip(to: Hex): Promise<string[]> {
      const a = await send(ADDRESSES.tusd, encodeFunctionData({ abi: testUsdAbi, functionName: "drip", args: [to] }));
      const b = await send(to, "0x", parseEther("0.002"));
      return [a, b];
    },
  };
}
