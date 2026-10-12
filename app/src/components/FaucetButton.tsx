import { useState } from "react";
import { faucet } from "../lib/api";
import { usd } from "../lib/format";
import type { Wallet } from "../hooks/useWallet";

const MESSAGES: Record<string, string> = {
  "address cooldown": "You already got test dollars today. Come back tomorrow.",
  "ip cooldown": "This network already used the faucet today.",
};

export function FaucetButton({ wallet, onToast }: { wallet: Wallet; onToast: (m: string) => void }) {
  const [busy, setBusy] = useState(false);

  if (!wallet.address) {
    return (
      <button className="btn primary" onClick={wallet.login}>
        Connect wallet
      </button>
    );
  }

  const get = async () => {
    setBusy(true);
    try {
      const r = await faucet(wallet.address!);
      if (r.ok) {
        onToast("1,000 test dollars and gas are on the way.");
        setTimeout(wallet.refresh, 4000);
      } else onToast(MESSAGES[r.error ?? ""] ?? r.error ?? "Faucet failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wallet">
      <span className="num">{usd(wallet.balance)} tUSD</span>
      {wallet.balance < 5_000000n && (
        <button className="btn primary" onClick={get} disabled={busy}>
          {busy ? "Sending…" : "Get 1,000 test dollars"}
        </button>
      )}
    </div>
  );
}
