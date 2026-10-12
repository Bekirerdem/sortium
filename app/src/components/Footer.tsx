import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ADDRESSES } from "@cwf/templates";
import { ENGINE } from "../lib/api";
import { EXPLORER, pub } from "../lib/chain";
import { locale, setLang, useLang, useT } from "../lib/i18n";
import { reduced, withViewTransition } from "../lib/motion";

const go = (hash: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  withViewTransition(() => (location.hash = hash));
};

/** Site footer: what Sortium is, where everything lives, how to verify it, and an honest testnet line with the live block. */
export function Footer() {
  const t = useT();
  const lang = useLang();
  const [block, setBlock] = useState<bigint | null>(null);
  const mark = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const load = () => pub.getBlockNumber().then((b) => alive && setBlock(b)).catch(() => {});
    load();
    const id = setInterval(load, 4000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // the oversized wordmark rises letter by letter the first time it scrolls into view
  useEffect(() => {
    const el = mark.current;
    if (!el || reduced() || typeof IntersectionObserver === "undefined") return;
    const letters = el.querySelectorAll("span");
    gsap.set(letters, { yPercent: 100 });
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      gsap.to(letters, { yPercent: 0, duration: 1.1, stagger: 0.06, ease: "expo.out" });
    }, { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const ext = (href: string, label: string) => <a href={href} target="_blank" rel="noopener">{label}</a>;

  return (
    <footer className="site-foot">
      <div className="foot-grid">
        <div className="foot-brand">
          <a className="logo" href="#/" onClick={go("#/")}><span className="mark" aria-hidden />Sortium</a>
          <p>{t.foot.tagline}</p>
          <div className="lang" role="group" aria-label={t.lang.label}>
            {(["tr", "en"] as const).map((l) => (
              <button key={l} aria-pressed={lang === l} onClick={() => withViewTransition(() => setLang(l))}>{l.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <nav>
          <h4>{t.foot.markets}</h4>
          <a href="#/browse" onClick={go("#/browse")}>{t.home.cats.music}</a>
          <a href="#/browse" onClick={go("#/browse")}>{t.home.cats.youtube}</a>
          <a href="#/browse" onClick={go("#/browse")}>{t.home.cats.views}</a>
          <a href="#/browse" onClick={go("#/browse")}>{t.home.cats.soon}</a>
        </nav>
        <nav>
          <h4>{t.foot.product}</h4>
          <a href="#/" onClick={go("#/")}>{t.foot.how}</a>
          <a href="#/leaders" onClick={go("#/leaders")}>{t.nav.leaders}</a>
          <a href="#/me" onClick={go("#/me")}>{t.nav.me}</a>
          {ext(`${EXPLORER}/token/${ADDRESSES.tusd}`, t.foot.token)}
        </nav>
        <nav>
          <h4>{t.foot.verify}</h4>
          {ext(`${EXPLORER}/address/${ADDRESSES.markets}`, "PoolMarkets")}
          {ext(`${EXPLORER}/address/${ADDRESSES.resolver}`, "UmaResolver")}
          {ext(`${EXPLORER}/address/${ADDRESSES.oo}`, "UMA Optimistic Oracle V3")}
          {ext(`${ENGINE}/api/markets`, t.foot.engine)}
        </nav>
        <nav>
          <h4>{t.foot.build}</h4>
          {ext("https://arbitrum.io", "Arbitrum")}
          {ext("https://uma.xyz", "UMA")}
          {ext("https://www.colosseum.org", "Colosseum")}
          <span className="muted small">{t.foot.hackathon}</span>
        </nav>
      </div>
      <div className="wordmark" ref={mark} aria-hidden>
        {"Sortium".split("").map((c, i) => <span key={i}>{c}</span>)}
      </div>
      <div className="foot-bar">
        <span>© 2026 Sortium</span>
        <span className="legal">{t.foot.legal}</span>
        <span className="live-block tab"><i />{t.foot.block} {block === null ? "…" : block.toLocaleString(locale(lang))}</span>
      </div>
    </footer>
  );
}

