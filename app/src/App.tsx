import { useEffect, useState } from "react";
import { FaucetButton } from "./components/FaucetButton";
import { useMarkets } from "./hooks/useMarkets";
import { useWallet } from "./hooks/useWallet";
import { Category } from "./screens/Category";
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
  const { markets, error } = useMarkets();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const marketId = hash.match(/^#\/m\/(\d+)/)?.[1];
  const page = marketId ? "market" : hash.startsWith("#/c") ? "categories" : hash.startsWith("#/me") ? "me" : "today";

  return (
    <>
      <header className="bar">
        <a className="brand" href="#/">score<b>/</b>board</a>
        <nav className="nav">
          <a href="#/" aria-current={page === "today" ? "page" : undefined}>Today</a>
          <a href="#/c" aria-current={page === "categories" ? "page" : undefined}>Categories</a>
          <a href="#/me" aria-current={page === "me" ? "page" : undefined}>My bets</a>
        </nav>
        <FaucetButton wallet={wallet} onToast={setToast} />
      </header>
      <main>
        {wallet.error && <p className="err">{wallet.error}</p>}
        {error && !markets && <p className="err" style={{ paddingTop: 24 }}>Engine unreachable: {error}</p>}
        {page === "market" && <Market id={Number(marketId)} wallet={wallet} onToast={setToast} />}
        {page !== "market" && !markets && !error && <p className="preview" style={{ paddingTop: 40 }}>Loading markets…</p>}
        {page === "today" && markets && <Today markets={markets} />}
        {page === "categories" && markets && <Category markets={markets} />}
        {page === "me" && markets && <MyBets markets={markets} wallet={wallet} />}
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
