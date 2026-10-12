import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { Wallet } from "../hooks/useWallet";
import { WalletError } from "../lib/chain";
import { useT } from "../lib/i18n";
import { EASE, reduced } from "../lib/motion";

// wallets known to refuse custom EVM testnets; shown, but with the reason up front
const NO_TESTNET = new Set(["app.phantom"]);

export function WalletPicker({ wallet }: { wallet: Wallet }) {
  const t = useT();
  const sheet = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!wallet.picking) return;
    first.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && wallet.close();
    window.addEventListener("keydown", esc);
    if (sheet.current && !reduced()) {
      gsap.fromTo(sheet.current, { y: 40, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: EASE.pop });
      gsap.fromTo(sheet.current.querySelectorAll(".pick"), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: EASE.land, delay: 0.1 });
    }
    return () => window.removeEventListener("keydown", esc);
  }, [wallet.picking]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!wallet.picking) return null;
  const err = wallet.error;
  const message = err instanceof WalletError ? t.picker.errors[err.code](err.wallet) : err?.message;

  return (
    <div className="scrim" onClick={wallet.close}>
      <div className="sheet" ref={sheet} role="dialog" aria-modal="true" aria-labelledby="picker-title" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2 id="picker-title">{t.picker.title}</h2>
          <button className="x" onClick={wallet.close} aria-label={t.picker.close}>×</button>
        </div>
        <button ref={first} className="pick instant" onClick={wallet.pickInstant}>
          <span className="glyph" aria-hidden />
          <span className="txt">
            <b>{t.picker.instant} <em>{t.picker.fastest}</em></b>
            <span>{t.picker.instantDesc}</span>
          </span>
        </button>
        <p className="or">{t.picker.or}</p>
        {wallet.wallets.length === 0 && <p className="none">{t.picker.none}</p>}
        <div className="list">
          {wallet.wallets.map((w) => (
            <button key={w.id} className="pick" onClick={() => wallet.pickInjected(w)}>
              {w.icon ? <img src={w.icon} alt="" /> : <span className="glyph small" aria-hidden />}
              <span className="txt">
                <b>{w.name}</b>
                {NO_TESTNET.has(w.id) && <span className="warn">{t.picker.noTestnet}</span>}
              </span>
            </button>
          ))}
        </div>
        {message && <p className="sheet-err" role="alert">{message}</p>}
      </div>
    </div>
  );
}
