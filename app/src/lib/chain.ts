import { createPublicClient, createWalletClient, custom, http, parseSignature, type Address } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { ADDRESSES, poolMarketsAbi, testUsdAbi } from "@cwf/templates";

export const EXPLORER = "https://sepolia.arbiscan.io";
export const pub = createPublicClient({ chain: arbitrumSepolia, transport: http("https://sepolia-rollup.arbitrum.io/rpc") });

type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
const eth = () => (window as unknown as { ethereum?: Eip1193 }).ethereum;

export async function connect(): Promise<Address> {
  const p = eth();
  if (!p) throw new Error("No wallet found. Install MetaMask or Rabby to play.");
  const [addr] = (await p.request({ method: "eth_requestAccounts" })) as Address[];
  try {
    await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x66eee" }] });
  } catch {
    await p.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: "0x66eee",
        chainName: "Arbitrum Sepolia",
        nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
        blockExplorerUrls: [EXPLORER],
      }],
    });
  }
  return addr;
}

const wallet = (account: Address) => createWalletClient({ account, chain: arbitrumSepolia, transport: custom(eth()!) });

export type ChainMarket = Awaited<ReturnType<typeof readMarket>>;

export async function readMarket(id: bigint, user?: Address) {
  const [m, pools, st, stakes, claimable] = await Promise.all([
    pub.readContract({ address: ADDRESSES.markets, abi: poolMarketsAbi, functionName: "getMarket", args: [id] }),
    pub.readContract({ address: ADDRESSES.markets, abi: poolMarketsAbi, functionName: "outcomePoolsOf", args: [id] }),
    pub.readContract({ address: ADDRESSES.markets, abi: poolMarketsAbi, functionName: "state", args: [id] }),
    user
      ? pub.readContract({ address: ADDRESSES.markets, abi: poolMarketsAbi, functionName: "stakesOf", args: [id, user] })
      : Promise.resolve([] as readonly bigint[]),
    user ? pub.readContract({ address: ADDRESSES.markets, abi: poolMarketsAbi, functionName: "previewClaim", args: [id, user] }) : Promise.resolve(0n),
  ]);
  return { market: m, pools: [...pools], state: Number(st), stakes: [...stakes], claimable };
}

export async function readCodeHash(templateId: bigint) {
  const t = await pub.readContract({ address: ADDRESSES.markets, abi: poolMarketsAbi, functionName: "getTemplate", args: [templateId] });
  return t.codeHash;
}

export const balanceOf = (user: Address) =>
  pub.readContract({ address: ADDRESSES.tusd, abi: testUsdAbi, functionName: "balanceOf", args: [user] });

/** Signs an EIP-2612 permit and bets in a single transaction. */
export async function placeBet(user: Address, id: bigint, outcome: number, amount: bigint) {
  const w = wallet(user);
  const nonce = await pub.readContract({ address: ADDRESSES.tusd, abi: testUsdAbi, functionName: "nonces", args: [user] });
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
  const sig = await w.signTypedData({
    domain: { name: "Test USD", version: "1", chainId: arbitrumSepolia.id, verifyingContract: ADDRESSES.tusd },
    types: {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Permit",
    message: { owner: user, spender: ADDRESSES.markets, value: amount, nonce, deadline },
  });
  const { v, r, s } = parseSignature(sig);
  const hash = await w.writeContract({
    address: ADDRESSES.markets,
    abi: poolMarketsAbi,
    functionName: "betWithPermit",
    args: [id, outcome, amount, deadline, Number(v), r, s],
  });
  await pub.waitForTransactionReceipt({ hash });
  return hash;
}

export async function claim(user: Address, id: bigint) {
  const hash = await wallet(user).writeContract({ address: ADDRESSES.markets, abi: poolMarketsAbi, functionName: "claim", args: [id] });
  await pub.waitForTransactionReceipt({ hash });
  return hash;
}
