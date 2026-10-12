import { useState } from "react";
import { faucet } from "../lib/api";
import { usd } from "../lib/format";
import { useMagnetic } from "../lib/motion";
import type { Wallet } from "../hooks/useWallet";

const MESSAGES: Record<string, string> = {
  "address cooldown": "You already got test dollars today. Come back tomorrow.",
  "ip cooldown": "This network already used the faucet today. Come back tomorrow.",
};

export function FaucetButton({ wallet, onToast }: { wallet: Wallet; onToast: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  const ref = useMagnetic<HTMLButtonElement>(0.2);

  if (!wallet.address) {
    return <button ref={ref} className="btn light" onClick={wallet.login}>Connect wallet</button>;
  }

  const get = async () => {
    setBusy(true);
    try {
      const r = await faucet(wallet.address!);
      if (r.ok) {
        onToast("1,000 test dollars and a little gas are on the way.");
        setTimeout(wallet.refresh, 4000);
      } else onToast(MESSAGES[r.error ?? ""] ?? r.error ?? "The faucet didn't answer. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wallet">
      <span className="tab">{usd(wallet.balance)} tUSD</span>
      {wallet.balance < 5_000000n && (
        <button ref={ref} className="btn light" onClick={get} disabled={busy}>
          {busy ? "Sending" : "Get 1,000 test dollars"}
        </button>
      )}
    </div>
  );
}
