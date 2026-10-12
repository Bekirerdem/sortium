import { useState } from "react";
import { parseUnits } from "viem";
import { EXPLORER, placeBet } from "../lib/chain";
import { multiplier } from "../lib/format";
import type { Wallet } from "../hooks/useWallet";

type Props = {
  marketId: number;
  outcomes: string[];
  pools: bigint[];
  selected: number | null;
  open: boolean;
  wallet: Wallet;
  onDone: () => void;
  onToast: (m: string) => void;
};

const CHIPS = [5, 10, 50];

export function BetBox({ marketId, outcomes, pools, selected, open, wallet, onDone, onToast }: Props) {
  const [amount, setAmount] = useState("10");
  const [busy, setBusy] = useState(false);
  const raw = (() => {
    try {
      return parseUnits(amount || "0", 6);
    } catch {
      return 0n;
    }
  })();
  const mult = selected === null ? 0 : multiplier(pools, selected, raw);
  const tooSmall = raw < 1_000000n;
  const tooBig = raw > 500_000000n;

  if (!open) return <div className="betbox"><p className="preview">Betting is closed for this market.</p></div>;

  const submit = async () => {
    if (selected === null || !wallet.address) return;
    setBusy(true);
    try {
      const hash = await placeBet(wallet.address, BigInt(marketId), selected, raw);
      onToast("Bet placed.");
      window.open(`${EXPLORER}/tx/${hash}`, "_blank", "noopener");
      onDone();
      wallet.refresh();
    } catch (e) {
      onToast((e as Error).message.split("\n")[0].slice(0, 140));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="betbox">
      <span className="eyebrow">Your pick</span>
      <span className="pick">{selected === null ? "Tap an outcome" : outcomes[selected]}</span>
      <label className="amount">
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} aria-label="Amount in test dollars" />
        <span className="eyebrow">tUSD</span>
      </label>
      <div className="chips">
        {CHIPS.map((c) => (
          <button key={c} onClick={() => setAmount(String(c))}>
            {c}
          </button>
        ))}
      </div>
      <p className="preview">
        If right you get about <span className="num">{selected === null ? "—" : (Number(raw) / 1e6 * mult).toFixed(2)}</span> tUSD
        {tooSmall && " · minimum 1"}
        {tooBig && " · maximum 500 per market"}
      </p>
      {wallet.address ? (
        <button className="btn primary" disabled={busy || selected === null || tooSmall || tooBig} onClick={submit}>
          {busy ? "Confirm in wallet…" : "Place bet"}
        </button>
      ) : (
        <button className="btn primary" onClick={wallet.login}>
          Connect wallet to bet
        </button>
      )}
    </div>
  );
}
