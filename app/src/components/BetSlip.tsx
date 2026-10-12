import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { parseUnits } from "viem";
import { EXPLORER, placeBet } from "../lib/chain";
import { burst } from "../lib/confetti";
import { multiplier } from "../lib/format";
import { errorText, useLang, useT } from "../lib/i18n";
import { splitLabel } from "../lib/market";
import { EASE, reduced, tweenNumber } from "../lib/motion";
import type { Wallet } from "../hooks/useWallet";

type Props = {
  marketId: number;
  label?: string;
  art?: string;
  pools: bigint[];
  selected: number | null;
  open: boolean;
  wallet: Wallet;
  onDone: () => void;
  onToast: (m: string) => void;
};

const AMOUNTS = [5, 10, 25, 50];

export function BetSlip({ marketId, label, art, pools, selected, open, wallet, onDone, onToast }: Props) {
  const t = useT();
  const lang = useLang();
  const [amount, setAmount] = useState(25);
  const [busy, setBusy] = useState(false);
  const slip = useRef<HTMLDivElement>(null);
  const payout = useRef<HTMLElement>(null);
  const go = useRef<HTMLButtonElement>(null);
  const raw = (() => {
    try {
      return parseUnits(String(amount || 0), 6);
    } catch {
      return 0n;
    }
  })();
  const value = selected === null ? 0 : (Number(raw) / 1e6) * multiplier(pools, selected, raw);

  useEffect(() => tweenNumber(payout.current, value, (n) => n.toFixed(2)), [value]);

  useEffect(() => {
    if (!slip.current || reduced()) return;
    gsap.fromTo(slip.current, { yPercent: 140 }, { yPercent: 0, duration: 0.9, ease: EASE.pop, delay: 0.5 });
  }, []);

  // the steps panel already says betting has closed; a dead slip would only cover the result
  if (!open) return null;

  const { title } = splitLabel(label ?? "");
  const tooSmall = raw < 1_000000n;
  const tooBig = raw > 500_000000n;

  const submit = async () => {
    if (selected === null || !wallet.address) return;
    setBusy(true);
    try {
      const hash = await placeBet(wallet.address, BigInt(marketId), selected, raw);
      if (slip.current) {
        const r = slip.current.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + 10);
      }
      if (slip.current && !reduced()) {
        const ring = slip.current.querySelector(".ring");
        gsap.timeline()
          .to(slip.current, { scale: 1.03, duration: 0.18, ease: "power2.out" })
          .to(slip.current, { scale: 1, duration: 0.6, ease: EASE.pop })
          .fromTo(ring, { opacity: 1, scale: 1 }, { opacity: 0, scale: 1.12, duration: 0.8, ease: EASE.land }, 0);
      }
      onToast(t.slip.placed(title === "Other" ? t.option.other : title));
      window.open(`${EXPLORER}/tx/${hash}`, "_blank", "noopener");
      onDone();
      wallet.refresh();
    } catch (e) {
      onToast(errorText(e, lang));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="slip" ref={slip}>
      <span className="ring" />
      {art ? <img src={art} alt="" /> : <span className="ph" />}
      <div className="who">
        <b>{selected === null ? t.slip.pick : title === "Other" ? t.option.other : title}</b>
        <span>
          {selected === null ? t.slip.then : <>{t.slip.win[0]}<em ref={payout}>{value.toFixed(2)}</em>{t.slip.win[1]}</>}
          {tooSmall && t.slip.min}
          {tooBig && t.slip.max}
        </span>
      </div>
      <div className="amts" role="group" aria-label={t.slip.amount}>
        {AMOUNTS.map((a) => (
          <button key={a} aria-pressed={a === amount} onClick={() => setAmount(a)}>{a}</button>
        ))}
        <input inputMode="decimal" aria-label={t.slip.custom} value={AMOUNTS.includes(amount) ? "" : amount || ""} placeholder={t.slip.other}
          onChange={(e) => setAmount(Number(e.target.value.replace(/,/g, ".").replace(/[^0-9.]/g, "")) || 0)} />
      </div>
      {wallet.address ? (
        <button ref={go} className="btn dark" disabled={busy || selected === null || tooSmall || tooBig} onClick={submit}>
          {busy ? t.slip.confirm : t.slip.bet(amount || 0)}
        </button>
      ) : (
        <button ref={go} className="btn dark" onClick={wallet.login}>{t.wallet.connect}</button>
      )}
    </div>
  );
}
