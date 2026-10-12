import { useEffect, useRef, useState } from "react";
import { faucet } from "../lib/api";
import { balanceOf, watchToken } from "../lib/chain";
import { avatar, shortAddr, usd } from "../lib/format";
import { useLang, useT } from "../lib/i18n";
import { tweenNumber, useMagnetic } from "../lib/motion";
import type { Wallet } from "../hooks/useWallet";

/** Header wallet: connect, balance that counts up, one-tap test dollars, and a small menu. */
export function FaucetButton({ wallet, onToast }: { wallet: Wallet; onToast: (m: string) => void }) {
  const t = useT();
  const lang = useLang();
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const ref = useMagnetic<HTMLButtonElement>(0.2);
  const bal = useRef<HTMLSpanElement>(null);
  const autoFunded = useRef<string | null>(null);

  const get = async (quiet = false) => {
    if (!wallet.address) return;
    setBusy(true);
    try {
      const r = await faucet(wallet.address);
      const messages: Record<string, string> = { "address cooldown": t.wallet.addressCooldown, "ip cooldown": t.wallet.ipCooldown };
      if (r.ok) {
        onToast(t.wallet.sent);
        setTimeout(wallet.refresh, 4000);
        setTimeout(wallet.refresh, 9000);
      } else if (!quiet) onToast(messages[r.error ?? ""] ?? r.error ?? t.wallet.faucetDown);
    } catch {
      if (!quiet) onToast(t.wallet.faucetDown);
    } finally {
      setBusy(false);
    }
  };

  // a fresh instant wallet gets its test dollars without asking
  useEffect(() => {
    const a = wallet.address;
    if (!a || wallet.kind !== "instant" || autoFunded.current === a) return;
    autoFunded.current = a;
    balanceOf(a).then((b) => { if (b === 0n) void get(true); }).catch(() => {});
  }, [wallet.address, wallet.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => tweenNumber(bal.current, Number(wallet.balance) / 1e6, (n) => n.toLocaleString(lang === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: 2 })), [wallet.balance, lang]);

  if (!wallet.address) {
    return <button ref={ref} className="btn light" onClick={wallet.login}>{t.wallet.connect}</button>;
  }

  return (
    <div className="wallet">
      {wallet.balance < 5_000000n && (
        <button ref={ref} className="btn light" onClick={() => get()} disabled={busy}>
          {busy ? t.wallet.sending : t.wallet.get}
        </button>
      )}
      <button className="chip" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
        <span className="av" style={{ background: avatar(wallet.address) }} aria-hidden />
        <span className="tab"><span ref={bal}>{usd(wallet.balance, lang)}</span> tUSD</span>
      </button>
      {menu && (
        <div className="menu" role="menu">
          <div className="addr">{shortAddr(wallet.address)}{wallet.kind === "instant" && <span>{t.picker.menuInstant}</span>}</div>
          {wallet.kind === "injected" && <button role="menuitem" onClick={() => { setMenu(false); watchToken().catch(() => {}); }}>{t.home.tokenAdd}</button>}
          <button role="menuitem" onClick={() => { setMenu(false); wallet.logout(); }}>{t.picker.logout}</button>
        </div>
      )}
    </div>
  );
}
