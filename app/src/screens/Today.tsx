import { useEffect, useRef, useState } from "react";
import { Headline } from "../components/Headline";
import { MarketTile } from "../components/MarketTile";
import { OptionRow } from "../components/OptionRow";
import { Rail } from "../components/Rail";
import { useMarket } from "../hooks/useMarket";
import type { Wallet } from "../hooks/useWallet";
import type { ApiMarket } from "../lib/api";
import { countdown, usd } from "../lib/format";
import { decidedAt, useLang, useT } from "../lib/i18n";
import { artFor, coverOf, leaderIndex } from "../lib/market";
import { useEntrance, useMagnetic, useTilt, withViewTransition } from "../lib/motion";
import { displayQuestion } from "../lib/question";

export const family = (key: string) => (key.startsWith("YT") ? "YouTube" : "Music");

const HERO_ORDER = ["us", "tr", "gb", "kr", "br", "jp", "de", "fr", "mx", "in"];

export function useNow(step = 1000) {
  const [now, setNow] = useState(Date.now() / 1000);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() / 1000), step);
    return () => clearInterval(t);
  }, [step]);
  return now;
}

function pickHero(open: ApiMarket[]) {
  const rank = (m: ApiMarket) => {
    const i = HERO_ORDER.indexOf(m.entity.toLowerCase());
    return i === -1 ? HERO_ORDER.length : i;
  };
  return [...open].filter((m) => !m.demo).sort((a, b) => a.lockTime - b.lockTime || rank(a) - rank(b))[0] ?? open[0];
}

function Hero({ m, wallet, onArt }: { m: ApiMarket; wallet: Wallet; onArt: (a?: string) => void }) {
  const { chain } = useMarket(m.id, wallet.address);
  const t = useT();
  const lang = useLang();
  const scope = useRef<HTMLDivElement>(null);
  const tilt = useTilt<HTMLDivElement>(8);
  const cta = useMagnetic<HTMLAnchorElement>(0.25);
  const now = useNow();
  const pools = chain?.pools ?? m.outcomes.map(() => 0n);
  const lead = leaderIndex(pools);
  const total = pools.reduce((a, b) => a + b, 0n);
  const order = pools.map((_, i) => i).sort((a, b) => (pools[b] > pools[a] ? 1 : pools[b] < pools[a] ? -1 : a - b)).slice(0, 5);
  const cover = artFor(m.meta, lead) ?? coverOf(m);
  useEffect(() => onArt(cover), [cover, onArt]);
  useEntrance(scope, [m.id, lang]);
  const go = (pick?: number) => withViewTransition(() => (location.hash = `#/m/${m.id}${pick !== undefined ? `?pick=${pick}` : ""}`));

  return (
    <section className="split" ref={scope}>
      <div className="stage">
        <p className="kicker" data-rise>{t.today.kicker(decidedAt(m.resolveTime, lang))}</p>
        <Headline text={displayQuestion(m, { short: true, lang })} />
        <div className="cover" ref={tilt} data-cover style={{ viewTransitionName: `cover-${m.id}` }}>{cover && <img src={cover} alt="" />}</div>
        <div className="facts" data-rise>
          <div><span>{t.today.closesIn}</span><b>{countdown(m.lockTime, now, lang)}</b></div>
          <div><span>{t.today.pool}</span><b>{usd(total, lang)} tUSD</b></div>
          <div><span>{t.today.outcomes}</span><b>{m.outcomes.length}</b></div>
        </div>
        <a ref={cta} className="btn light" href={`#/m/${m.id}`} onClick={(e) => { e.preventDefault(); go(); }} data-rise>{t.today.cta}</a>
      </div>
      <div>
        <div className="board-head" data-rise><h2>{t.today.board}</h2><span>{t.today.multHint}</span></div>
        <div className="opts">
          {order.map((i) => (
            <OptionRow key={i} label={m.outcomes[i]} art={artFor(m.meta, i)} index={i} pools={pools} stake={chain?.stakes[i] ?? 0n}
              selected={false} won={false} disabled={false} onSelect={(k) => go(k)} />
          ))}
        </div>
        <div className="how" data-rise>
          {t.today.how.map(([h, p]) => <div key={h}><b>{h}</b><p>{p}</p></div>)}
        </div>
      </div>
    </section>
  );
}

export function Today({ markets, wallet, onArt }: { markets: ApiMarket[]; wallet: Wallet; onArt: (a?: string) => void }) {
  const now = useNow(15_000);
  const t = useT();
  const open = markets.filter((m) => m.status === "open" && m.lockTime > now).sort((a, b) => a.lockTime - b.lockTime);
  const hero = pickHero(open);
  const rest = open.filter((m) => m !== hero);
  const deciding = markets.filter((m) => m.status !== "open" || m.lockTime <= now).slice(0, 12);

  if (!hero) return <p className="loading">{t.today.empty}</p>;
  return (
    <>
      <Hero m={hero} wallet={wallet} onArt={onArt} />
      {rest.length > 0 && (
        <>
          <div className="rail-head"><h2>{t.today.alsoOpen}</h2><span className="muted">{t.today.nMarkets(rest.length)}</span></div>
          <Rail>{rest.map((m) => <MarketTile key={m.id} m={m} now={now} />)}</Rail>
        </>
      )}
      {deciding.length > 0 && (
        <>
          <div className="rail-head"><h2>{t.today.deciding}</h2><span className="muted">{t.today.decidingHint}</span></div>
          <Rail>{deciding.map((m) => <MarketTile key={m.id} m={m} now={now} />)}</Rail>
        </>
      )}
    </>
  );
}
