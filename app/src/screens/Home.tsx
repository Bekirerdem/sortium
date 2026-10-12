import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ADDRESSES } from "@cwf/templates";
import { Deck } from "../components/Deck";
import { Headline } from "../components/Headline";
import { CATS, CategoryBar, type Cat } from "../components/CategoryBar";
import { MarketCard } from "../components/MarketCard";
import { useNow } from "../hooks/useNow";
import { usePoll } from "../hooks/usePoll";
import type { Wallet } from "../hooks/useWallet";
import { getActivity, getLeaders, getStats, type Activity, type ApiMarket, type Leader } from "../lib/api";
import { EXPLORER, watchToken } from "../lib/chain";
import { avatar, compactNum, shortAddr, usd } from "../lib/format";
import { ago, useLang, useT } from "../lib/i18n";
import { artFor, category, coverOf, splitLabel } from "../lib/market";
import { EASE, reduced, tweenNumber, useEntrance, useMagnetic, useReveal, withViewTransition } from "../lib/motion";
import { displayOutcome, displayQuestion } from "../lib/question";

const HERO_ORDER = ["us", "tr", "gb", "kr", "br", "jp", "de", "fr", "mx", "in"];
const rank = (m: ApiMarket) => {
  const i = HERO_ORDER.indexOf(m.entity.toLowerCase());
  return i === -1 ? HERO_ORDER.length : i;
};

/** One market per source and country, the most familiar countries first, Apple and YouTube interleaved. */
export function deckMarkets(open: ApiMarket[]): ApiMarket[] {
  const real = open.filter((m) => !m.demo).sort((a, b) => rank(a) - rank(b) || a.lockTime - b.lockTime);
  const music = real.filter((m) => !m.templateKey.startsWith("YT"));
  const yt = real.filter((m) => m.templateKey.startsWith("YT"));
  const out: ApiMarket[] = [];
  for (let i = 0; i < Math.max(music.length, yt.length); i++) {
    if (music[i]) out.push(music[i]);
    if (yt[i]) out.push(yt[i]);
  }
  return out.length ? out : open;
}

function Stat({ value, label, money }: { value: number | undefined; label: string; money?: boolean }) {
  const lang = useLang();
  const el = useRef<HTMLElement>(null);
  useEffect(() => {
    if (value === undefined) return;
    tweenNumber(el.current, value, (n) => (money ? compactNum(n, lang) : Math.round(n).toLocaleString(lang === "tr" ? "tr-TR" : "en-US")));
  }, [value, lang, money]);
  return (
    <div className="stat" data-rise>
      <b className="tab" ref={el} data-value="0">{value === undefined ? "–" : "0"}</b>
      <span>{label}{money ? " (tUSD)" : ""}</span>
    </div>
  );
}

function labelFor(markets: ApiMarket[], a: Activity, lang: "en" | "tr", other: string) {
  const m = markets.find((x) => x.id === a.marketId);
  const raw = a.outcome === null ? undefined : m?.outcomes[a.outcome];
  if (!m || !raw) return { title: `#${a.marketId}`, art: m ? coverOf(m) : undefined, m };
  const title = raw === "Other" ? other : splitLabel(displayOutcome(raw, lang)).title;
  return { title, art: artFor(m.meta, a.outcome ?? -1) ?? coverOf(m), m };
}

function Ticker({ items, markets }: { items: Activity[]; markets: ApiMarket[] }) {
  const t = useT();
  const lang = useLang();
  if (items.length === 0) return null;
  const line = items.slice(0, 16).map((a) => {
    const { title, art } = labelFor(markets, a, lang, t.option.other);
    const amt = usd(BigInt(a.amount), lang);
    return (
      <span className="tick" key={`${a.tx}-${a.kind}-${a.marketId}-${a.outcome}`}>
        {art ? <img src={art} alt="" /> : <span className="av" style={{ background: avatar(a.user) }} />}
        {a.kind === "bet" ? t.home.tickerBet(shortAddr(a.user), amt, title) : t.home.tickerClaim(shortAddr(a.user), amt)}
      </span>
    );
  });
  return (
    <div className="ticker" aria-label={t.home.activityTitle}>
      <div className="ticker-track">{line}<span aria-hidden className="ticker-copy">{line}</span></div>
    </div>
  );
}

function Feed({ items, markets }: { items: Activity[] | null; markets: ApiMarket[] }) {
  const t = useT();
  const lang = useLang();
  const now = useNow(10_000);
  const list = useRef<HTMLOListElement>(null);
  const seen = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!items || !list.current || reduced()) return;
    const fresh = [...list.current.querySelectorAll<HTMLElement>("li[data-k]")].filter((li) => !seen.current.has(li.dataset.k!));
    if (seen.current.size) gsap.from(fresh, { x: -24, opacity: 0, duration: 0.6, stagger: 0.06, ease: EASE.pop });
    items.forEach((a) => seen.current.add(`${a.tx}-${a.kind}`));
  }, [items]);
  return (
    <section className="board-card">
      <h2>{t.home.activityTitle}<span className="pulse" aria-hidden /></h2>
      {items && items.length === 0 && <p className="empty">{t.home.activityEmpty}</p>}
      <ol className="feed" ref={list}>
        {(items ?? []).slice(0, 10).map((a) => {
          const { title, art, m } = labelFor(markets, a, lang, t.option.other);
          return (
            <li key={`${a.tx}-${a.kind}`} data-k={`${a.tx}-${a.kind}`}>
              <a href={`#/m/${a.marketId}`} onClick={(e) => { e.preventDefault(); withViewTransition(() => (location.hash = `#/m/${a.marketId}`)); }}>
                <span className="av" style={{ background: avatar(a.user) }} aria-hidden />
                <span className="fx">
                  <b>{a.kind === "bet" ? t.home.tickerBet(shortAddr(a.user), usd(BigInt(a.amount), lang), title) : t.home.tickerClaim(shortAddr(a.user), usd(BigInt(a.amount), lang))}</b>
                  <span>{m ? m.entity.toUpperCase() : ""} {ago(a.time, lang, now)}</span>
                </span>
                {art && <img src={art} alt="" />}
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function Leaders({ items, full }: { items: Leader[] | null; full?: boolean }) {
  const t = useT();
  const lang = useLang();
  return (
    <section className="board-card">
      <h2>{t.home.leadersTitle}</h2>
      {items && items.length === 0 && <p className="empty">{t.home.leadersEmpty}</p>}
      <ol className="leaders">
        {(items ?? []).slice(0, full ? 50 : 8).map((l, i) => {
          const won = BigInt(l.won);
          return (
            <li key={l.user}>
              <span className="rk tab">{i + 1}</span>
              <span className="av" style={{ background: avatar(l.user) }} aria-hidden />
              <span className="who"><b>{shortAddr(l.user)}</b><span>{t.home.picks(l.bets)}</span></span>
              <span className="amt tab">
                <b>{usd(won > 0n ? won : BigInt(l.volume), lang)}</b>
                <span>{won > 0n ? t.home.won : t.home.staked}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

type Sort = "closing" | "pool" | "fresh";

export function Home({ markets, wallet, onArt }: { markets: ApiMarket[]; wallet: Wallet; onArt: (a?: string) => void }) {
  const t = useT();
  const lang = useLang();
  const now = useNow(15_000);
  const scope = useRef<HTMLDivElement>(null);
  const start = useMagnetic<HTMLButtonElement>(0.25);
  const stats = usePoll(getStats, 20_000);
  const activity = usePoll(() => getActivity(30), 12_000);
  const leaders = usePoll(getLeaders, 30_000);
  const [cat, setCat] = useState<Cat>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("closing");
  useEntrance(scope, [lang]);
  useReveal(scope, [lang, activity === null, leaders === null]);

  const open = markets.filter((m) => m.status === "open" && m.lockTime > now);
  const inCat = (c: Cat) => (c === "all" ? open : c === "soon" ? [] : open.filter((m) => category(m) === c));
  const counts = Object.fromEntries(CATS.filter((c) => c !== "soon").map((c) => [c, inCat(c).length])) as Partial<Record<Cat, number>>;
  // the deck follows the category; empty categories fall back to everything so the hero never goes blank
  const deckSource = inCat(cat).length ? inCat(cat) : open;
  const deck = cat === "all" ? deckMarkets(open) : deckSource;

  const needle = q.trim().toLocaleLowerCase(lang === "tr" ? "tr-TR" : "en-US");
  const matches = (m: ApiMarket) => !needle || [displayQuestion(m, { lang }), m.entity, ...m.outcomes].join(" ").toLocaleLowerCase(lang === "tr" ? "tr-TR" : "en-US").includes(needle);
  const grid = inCat(cat).filter(matches).sort((a, b) =>
    sort === "pool" ? Number(BigInt(b.pool?.total ?? "0") - BigInt(a.pool?.total ?? "0")) || a.lockTime - b.lockTime
      : sort === "fresh" ? b.id - a.id
        : a.lockTime - b.lockTime);

  const begin = () => {
    if (!wallet.address) return wallet.login();
    document.getElementById("deck")?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "center" });
  };

  const pickCat = (c: Cat) => {
    setCat(c);
    const g = document.getElementById("grid");
    if (g && !reduced()) gsap.fromTo(g.children, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.03, ease: EASE.land });
  };

  return (
    <div ref={scope}>
      <div className="cats-wrap"><CategoryBar value={cat} counts={counts} onChange={pickCat} /></div>

      <section className="hero">
        <div className="hero-copy">
          <Headline text={t.home.title} />
          <p className="lede" data-rise>{t.home.sub}</p>
          <div className="hero-cta" data-rise>
            <button ref={start} className="btn light big" onClick={begin}>{wallet.address ? t.today.cta : t.home.start}</button>
            <a className="btn ghost big" href="#grid" onClick={(e) => { e.preventDefault(); document.getElementById("markets")?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" }); }}>{t.home.browse}</a>
          </div>
          <div className="stats">
            <Stat value={stats ? Number(stats.volume) / 1e6 : undefined} label={t.home.stats.volume} money />
            <Stat value={stats?.bets} label={t.home.stats.bets} />
            <Stat value={stats?.players} label={t.home.stats.players} />
            <Stat value={stats?.openMarkets ?? open.length} label={t.home.stats.open} />
          </div>
        </div>
        <div id="deck" className="hero-deck" data-cover>
          <p className="deck-note">{t.home.catNote[cat === "soon" || !inCat(cat).length ? "all" : cat]}</p>
          {deck.length > 0 ? <Deck key={cat} markets={deck} wallet={wallet} onArt={onArt} /> : <p className="loading">{t.today.empty}</p>}
        </div>
      </section>

      <Ticker items={activity ?? []} markets={markets} />

      <section className="markets" id="markets">
        <div className="markets-head">
          <h2>{t.home.gridTitle}<span className="muted"> {t.home.cats[cat]}</span></h2>
          <div className="tools">
            <label className="search">
              <span aria-hidden>⌕</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.home.search} aria-label={t.home.search} />
            </label>
            <div className="sorts" role="group">
              {(["closing", "pool", "fresh"] as Sort[]).map((s) => (
                <button key={s} aria-pressed={sort === s} onClick={() => setSort(s)}>{t.home.sort[s]}</button>
              ))}
            </div>
          </div>
        </div>
        {cat === "soon" ? (
          <div className="mgrid" id="grid">
            {t.browse.soon.map(([name, question]) => (
              <article className="mcard soon" key={name}>
                <header><div className="mpic glyph-pic" aria-hidden>{name.slice(0, 1)}</div><div className="mq"><span className="mfam">{name}</span><span className="soon-q">{question}</span></div></header>
                <footer><span>{t.browse.soonNote}</span></footer>
              </article>
            ))}
          </div>
        ) : grid.length ? (
          <div className="mgrid" id="grid">{grid.map((m) => <MarketCard key={m.id} m={m} now={now} />)}</div>
        ) : (
          <p className="empty" id="grid">{cat === "views" && !needle ? t.home.viewsSoon : t.home.noMatch}</p>
        )}
      </section>

      <section className="how-band">
        <h2>{t.home.howTitle}</h2>
        <ol className="how-steps" data-reveal>
          {t.home.how.map(([h, p], i) => (
            <li key={h}><span className="n tab">{i + 1}</span><b>{h}</b><p>{p}</p></li>
          ))}
        </ol>
      </section>

      <div className="boards" data-reveal>
        <Feed items={activity} markets={markets} />
        <Leaders items={leaders} />
      </div>

      <section className="token" data-reveal>
        <div className="coin" aria-hidden><span>t</span></div>
        <div className="token-copy">
          <h2>{t.home.tokenTitle}</h2>
          <p>{t.home.tokenBody}</p>
          <div className="links">
            {wallet.kind === "injected" && <button className="btn light" onClick={() => watchToken().catch(() => {})}>{t.home.tokenAdd}</button>}
            {!wallet.address && <button className="btn light" onClick={wallet.login}>{t.home.start}</button>}
            <a className="btn ghost" href={`${EXPLORER}/token/${ADDRESSES.tusd}`} target="_blank" rel="noopener">{t.home.tokenContract}</a>
          </div>
          <code className="addr-line">{ADDRESSES.tusd}</code>
        </div>
      </section>
    </div>
  );
}
