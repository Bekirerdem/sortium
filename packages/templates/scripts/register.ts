// Registers every template in TEMPLATES on PoolMarkets. Re-running registers new versions (latest registration wins in the engine).
import { createPublicClient, createWalletClient, http, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { ADDRESSES, TEMPLATES, poolMarketsAbi } from "../src/index";
import { codeHash, rulesHash } from "../src/hash";

const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`);
const wallet = createWalletClient({ account, chain: arbitrumSepolia, transport: http() });
const pub = createPublicClient({ chain: arbitrumSepolia, transport: http() });
const only = process.argv.slice(2);
const rulesURI = "https://github.com/Bekirerdem/cwf-markets/tree/main/packages/templates/src/templates";

for (const t of Object.values(TEMPLATES)) {
  if (only.length && !only.includes(t.key)) continue;
  const hash = await wallet.writeContract({
    address: ADDRESSES.markets,
    abi: poolMarketsAbi,
    functionName: "registerTemplate",
    args: [stringToHex(t.key, { size: 32 }), t.version, codeHash(t), rulesHash(t), rulesURI, t.demo],
  });
  const r = await pub.waitForTransactionReceipt({ hash });
  console.log(t.key, r.status, hash);
}
