import { createPublicClient, createWalletClient, custom, http, parseSignature, type Address, type PrivateKeyAccount } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { ADDRESSES, poolMarketsAbi, testUsdAbi } from "@cwf/templates";

export const EXPLORER = "https://sepolia.arbiscan.io";
const RPC = "https://sepolia-rollup.arbitrum.io/rpc";
const CHAIN_HEX = "0x66eee";
export const pub = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC) });

export type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };

/** Errors the interface explains in the reader's language; `code` picks the sentence. */
export class WalletError extends Error {
  code: "unsupported" | "rejected" | "none";
  wallet: string;
  constructor(code: "unsupported" | "rejected" | "none", wallet = "") {
    super(code);
    this.code = code;
    this.wallet = wallet;
  }
}

type Active = { kind: "injected"; provider: Eip1193; name: string } | { kind: "instant"; account: PrivateKeyAccount };
let active: Active | null = null;

const rejected = (e: unknown) => (e as { code?: number }).code === 4001;

/** Puts the wallet on Arbitrum Sepolia, adding the network if needed; wallets that cannot (Phantom) get a clear error. */
async function ensureChain(p: Eip1193, name: string) {
  const onChain = async () => String(await p.request({ method: "eth_chainId" })).toLowerCase() === CHAIN_HEX;
  if (await onChain().catch(() => false)) return;
  try {
    await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] });
  } catch (e) {
    if (rejected(e)) throw new WalletError("rejected", name);
    try {
      await p.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CHAIN_HEX,
          chainName: "Arbitrum Sepolia",
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: [RPC],
          blockExplorerUrls: [EXPLORER],
        }],
      });
    } catch (e2) {
      throw new WalletError(rejected(e2) ? "rejected" : "unsupported", name);
    }
  }
  if (!(await onChain().catch(() => false))) throw new WalletError("unsupported", name);
}

export async function connectInjected(p: Eip1193, name: string): Promise<Address> {
  let addr: Address;
  try {
    [addr] = (await p.request({ method: "eth_requestAccounts" })) as Address[];
  } catch (e) {
    throw new WalletError(rejected(e) ? "rejected" : "unsupported", name);
  }
  await ensureChain(p, name);
  active = { kind: "injected", provider: p, name };
  return addr;
}

/** Reconnects a wallet that already granted access, without a prompt. */
export async function resumeInjected(p: Eip1193, name: string): Promise<Address | null> {
  const [addr] = ((await p.request({ method: "eth_accounts" }).catch(() => [])) as Address[]) ?? [];
  if (!addr) return null;
  active = { kind: "injected", provider: p, name };
  return addr;
}

const INSTANT_KEY = "sortium.instant";

/**
 * A test-only wallet that lives in this browser, so anyone can play without installing anything.
 * The key never leaves the device; it only ever holds faucet test dollars and a little test ETH.
 */
export function connectInstant(): Address {
  let key: `0x${string}` | null = null;
  try {
    key = localStorage.getItem(INSTANT_KEY) as `0x${string}` | null;
  } catch {
    // storage blocked: the wallet lasts for this visit only
  }
  if (!key) {
    key = generatePrivateKey();
    try {
      localStorage.setItem(INSTANT_KEY, key);
    } catch {
      // same as above
    }
  }
  const account = privateKeyToAccount(key);
  active = { kind: "instant", account };
  return account.address;
}

export const hasInstant = () => {
  try {
    return !!localStorage.getItem(INSTANT_KEY);
  } catch {
    return false;
  }
};

export function disconnect() {
  active = null;
}

export const activeKind = () => active?.kind ?? null;

/** Offers tUSD to the connected browser wallet's token list. */
export async function watchToken() {
  if (active?.kind !== "injected") return;
  await active.provider.request({
    method: "wallet_watchAsset",
    params: { type: "ERC20", options: { address: ADDRESSES.tusd, symbol: "tUSD", decimals: 6 } } as unknown as unknown[],
  });
}

async function wallet(account: Address) {
  if (!active) throw new WalletError("none");
  if (active.kind === "instant") return createWalletClient({ account: active.account, chain: arbitrumSepolia, transport: http(RPC) });
  await ensureChain(active.provider, active.name);
  return createWalletClient({ account, chain: arbitrumSepolia, transport: custom(active.provider) });
}

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

/**
 * Fee caps from the latest block. Wallets sometimes quote a max fee under Arbitrum's moving base fee and the node
 * rejects the transaction; a cap of three times the base fee holds, and Arbitrum only charges the actual base fee.
 */
async function fees() {
  const block = await pub.getBlock();
  const base = block.baseFeePerGas ?? (await pub.getGasPrice());
  return { maxFeePerGas: base * 3n + 1n, maxPriorityFeePerGas: 0n };
}

/** Signs an EIP-2612 permit and bets in a single transaction, or approves and bets when the permit would not verify. */
export async function placeBet(user: Address, id: bigint, outcome: number, amount: bigint) {
  const w = await wallet(user);
  // an earlier approval already covers it: one plain transaction, no signature
  const allowed = await pub.readContract({ address: ADDRESSES.tusd, abi: testUsdAbi, functionName: "allowance", args: [user, ADDRESSES.markets] });
  if (allowed >= amount) return approveAndBet(user, id, outcome, amount);
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
  // smart-account wallets (MetaMask with EIP-7702) return wrapped signatures the token's permit cannot verify;
  // check the permit bet against the chain first and fall back to approve + bet when it would revert
  if (sig.length === 132) {
    const { v, r, s, yParity } = parseSignature(sig);
    const args = [id, outcome, amount, deadline, Number(v ?? BigInt(yParity + 27)), r, s] as const;
    const ok = await pub
      .simulateContract({ account: user, address: ADDRESSES.markets, abi: poolMarketsAbi, functionName: "betWithPermit", args })
      .then(() => true, () => false);
    if (ok) {
      const hash = await w.writeContract({ address: ADDRESSES.markets, abi: poolMarketsAbi, functionName: "betWithPermit", args, ...(await fees()) });
      await pub.waitForTransactionReceipt({ hash });
      return hash;
    }
  }
  return approveAndBet(user, id, outcome, amount);
}

/** Two transactions, for wallets whose permit signatures the token cannot verify. */
async function approveAndBet(user: Address, id: bigint, outcome: number, amount: bigint) {
  const w = await wallet(user);
  const allowance = await pub.readContract({ address: ADDRESSES.tusd, abi: testUsdAbi, functionName: "allowance", args: [user, ADDRESSES.markets] });
  if (allowance < amount) {
    // the whole balance, so a few more picks need no second approval
    const balance = await balanceOf(user);
    const a = await w.writeContract({ address: ADDRESSES.tusd, abi: testUsdAbi, functionName: "approve", args: [ADDRESSES.markets, balance > amount ? balance : amount], ...(await fees()) });
    await pub.waitForTransactionReceipt({ hash: a });
  }
  const hash = await w.writeContract({ address: ADDRESSES.markets, abi: poolMarketsAbi, functionName: "bet", args: [id, outcome, amount], ...(await fees()) });
  await pub.waitForTransactionReceipt({ hash });
  return hash;
}

export async function claim(user: Address, id: bigint) {
  const hash = await (await wallet(user)).writeContract({ address: ADDRESSES.markets, abi: poolMarketsAbi, functionName: "claim", args: [id], ...(await fees()) });
  await pub.waitForTransactionReceipt({ hash });
  return hash;
}
