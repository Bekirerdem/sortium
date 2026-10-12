import { useState } from "react";
import { faucet } from "../lib/api";
import { usd } from "../lib/format";
import { useLang, useT } from "../lib/i18n";
import { useMagnetic } from "../lib/motion";
import type { Wallet } from "../hooks/useWallet";

export function FaucetButton({ wallet, onToast }: { wallet: Wallet; onToast: (m: string) => void }) {
  const t = useT();
  const lang = useLang();
  const [busy, setBusy] = useState(false);
  const ref = useMagnetic<HTMLButtonElement>(0.2);

  if (!wallet.address) {
    return <button ref={ref} className="btn light" onClick={wallet.login}>{t.wallet.connect}</button>;
  }

  const messages: Record<string, string> = { "address cooldown": t.wallet.addressCooldown, "ip cooldown": t.wallet.ipCooldown };
  const get = async () => {
    setBusy(true);
    try {
      const r = await faucet(wallet.address!);
      if (r.ok) {
        onToast(t.wallet.sent);
        setTimeout(wallet.refresh, 4000);
      } else onToast(messages[r.error ?? ""] ?? r.error ?? t.wallet.faucetDown);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wallet">
      <span className="tab">{usd(wallet.balance, lang)} tUSD</span>
      {wallet.balance < 5_000000n && (
        <button ref={ref} className="btn light" onClick={get} disabled={busy}>
          {busy ? t.wallet.sending : t.wallet.get}
        </button>
      )}
    </div>
  );
}
