import { useCallback, useEffect, useState } from "react";
import { Backdrop } from "./components/Backdrop";
import { FaucetButton } from "./components/FaucetButton";
import { useMarkets } from "./hooks/useMarkets";
import { useWallet } from "./hooks/useWallet";
import { setLang, useLang, useT } from "./lib/i18n";
import { withViewTransition } from "./lib/motion";
import { Browse } from "./screens/Browse";
import { Market } from "./screens/Market";
import { MyBets } from "./screens/MyBets";
import { Today } from "./screens/Today";

function useHash() {
  const [hash, setHash] = useState(location.hash || "#/");
  useEffect(() => {
    const on = () => {
      setHash(location.hash || "#/");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHash();
  const wallet = useWallet();
  const lang = useLang();
  const t = useT();
  const { markets, error } = useMarkets();
  const [toast, setToast] = useState<string | null>(null);
  const [art, setArt] = useState<string | undefined>();
  const onArt = useCallback((a?: string) => a && setArt(a), []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const route = hash.match(/^#\/m\/(\d+)(?:\?pick=(\d+))?/);
  const page = route ? "market" : hash.startsWith("#/browse") ? "browse" : hash.startsWith("#/me") ? "me" : "today";
  const nav = (to: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    withViewTransition(() => (location.hash = to));
  };

  return (
    <>
      <Backdrop art={art} />
      <header className="top">
        <a className="logo" href="#/" onClick={nav("#/")}>Sortium</a>
        <nav className="nav">
          <a href="#/" onClick={nav("#/")} aria-current={page === "today" ? "page" : undefined}>{t.nav.today}</a>
          <a href="#/browse" onClick={nav("#/browse")} aria-current={page === "browse" ? "page" : undefined}>{t.nav.browse}</a>
          <a href="#/me" onClick={nav("#/me")} aria-current={page === "me" ? "page" : undefined}>{t.nav.me}</a>
        </nav>
        <div className="lang" role="group" aria-label={t.lang.label}>
          {(["tr", "en"] as const).map((l) => (
            <button key={l} aria-pressed={lang === l} onClick={() => withViewTransition(() => setLang(l))}>{l.toUpperCase()}</button>
          ))}
        </div>
        <FaucetButton wallet={wallet} onToast={setToast} />
      </header>
      <main>
        {wallet.error && <p className="err">{wallet.error}</p>}
        {error && !markets && <p className="err">{t.engineDown}</p>}
        {page === "market" && (
          <Market key={route![1]} id={Number(route![1])} initialPick={route![2] ? Number(route![2]) : null} wallet={wallet} onToast={setToast} onArt={onArt} />
        )}
        {page !== "market" && !markets && !error && <p className="loading">{t.loadingMarkets}</p>}
        {page === "today" && markets && <Today markets={markets} wallet={wallet} onArt={onArt} />}
        {page === "browse" && markets && <Browse markets={markets} />}
        {page === "me" && markets && <MyBets markets={markets} wallet={wallet} />}
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
