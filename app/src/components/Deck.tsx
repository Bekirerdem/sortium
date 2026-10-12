import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useMarket } from "../hooks/useMarket";
import { useNow } from "../hooks/useNow";
import type { Wallet } from "../hooks/useWallet";
import type { ApiMarket } from "../lib/api";
import { countdown, multiplier } from "../lib/format";
import { useLang, useT } from "../lib/i18n";
import { artFor, coverOf, family, splitLabel } from "../lib/market";
import { EASE, reduced, useMagnetic, useTilt, withViewTransition } from "../lib/motion";
import { displayQuestion } from "../lib/question";

type Props = { markets: ApiMarket[]; wallet: Wallet; onArt: (a?: string) => void };

/** The home page's hands-on moment: a stack of live markets you can flip through and pick from without leaving the page. */
export function Deck({ markets, wallet, onArt }: Props) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const swipe = useRef<number | null>(null);
  const tilt = useTilt<HTMLDivElement>(6);
  const cta = useMagnetic<HTMLAnchorElement>(0.2);

  const m = markets[idx % markets.length];
  const { chain } = useMarket(m.id, wallet.address);
  const pools = chain?.pools ?? m.outcomes.map(() => 0n);
  const total = pools.reduce((a, b) => a + b, 0n);
  // the four most backed outcomes, or the chart's own order while the pool is empty
  const shown = pools.map((_, i) => i).filter((i) => m.outcomes[i] !== "Other")
    .sort((a, b) => (total === 0n ? a - b : pools[b] > pools[a] ? 1 : pools[b] < pools[a] ? -1 : a - b)).slice(0, 4);
  const focus = pick ?? shown[0] ?? 0;
  const cover = artFor(m.meta, focus) ?? coverOf(m);

  useEffect(() => onArt(cover), [cover, onArt]);

  useLayoutEffect(() => {
    if (!card.current || reduced()) return;
    gsap.fromTo(card.current, { y: 24, scale: 0.95, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.7, ease: EASE.pop });
    gsap.fromTo(card.current.querySelectorAll(".dchip"), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: EASE.land, delay: 0.15 });
  }, [idx]);

  const go = (dir: 1 | -1) => {
    if (busy.current || markets.length < 2) return;
    const next = () => { setPick(null); setIdx((i) => (i + dir + markets.length) % markets.length); };
    if (!card.current || reduced()) return next();
    busy.current = true;
    gsap.to(card.current, {
      x: dir * -140, rotation: dir * -9, opacity: 0, duration: 0.38, ease: "power2.in",
      onComplete: () => { gsap.set(card.current, { x: 0, rotation: 0 }); busy.current = false; next(); },
    });
  };

  const choose = (i: number) => {
    setPick(i);
    const img = card.current?.querySelector<HTMLImageElement>(".dcover img");
    if (img && !reduced()) gsap.fromTo(img, { scale: 1.12, filter: "blur(8px)" }, { scale: 1, filter: "blur(0px)", duration: 0.6, ease: EASE.land });
  };

  const href = `#/m/${m.id}${pick !== null ? `?pick=${pick}` : ""}`;
  const mult = pick !== null ? multiplier(pools, pick, 10_000000n) : 0;
  const behind = [1, 2].map((k) => markets[(idx + k) % markets.length]).filter((x) => markets.length > 1 && x !== m);

  return (
    <div className="deck"
      onPointerDown={(e) => { swipe.current = e.clientX; }}
      onPointerUp={(e) => {
        if (swipe.current === null) return;
        const dx = e.clientX - swipe.current;
        swipe.current = null;
        if (Math.abs(dx) > 70) go(dx < 0 ? 1 : -1);
      }}
      onKeyDown={(e) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); }}
    >
      {behind.map((b, k) => (
        <div key={b.id} className={`dback d${k + 1}`} aria-hidden>{coverOf(b) && <img src={coverOf(b)} alt="" />}</div>
      ))}
      <div className="dcard" ref={card}>
        <div className="dtop">
          <div className="dcover" ref={tilt} style={{ viewTransitionName: `cover-${m.id}` }}>{cover && <img src={cover} alt="" />}</div>
          <div className="dmeta">
            <span className="dfam">{family(m.templateKey) === "YouTube" ? t.family.youtube : t.family.music}<i />{t.tile.closesIn(countdown(m.lockTime, now, lang))}</span>
            <h3>{displayQuestion(m, { short: true, lang })}</h3>
          </div>
        </div>
        <div className="dchips">
          {shown.map((i) => {
            const { title, by } = splitLabel(m.outcomes[i]);
            const x = multiplier(pools, i);
            return (
              <button key={i} className="dchip" aria-pressed={pick === i} onClick={() => choose(i)}>
                {artFor(m.meta, i) ? <img src={artFor(m.meta, i)} alt="" /> : <span className="ph" />}
                <span className="dt"><b>{title}</b><span>{by}</span></span>
                <span className="dm tab">{x > 0 ? `×${x.toFixed(2)}` : t.option.fresh}</span>
              </button>
            );
          })}
        </div>
        <div className="dfoot">
          <a ref={cta} className="btn light" href={href} onClick={(e) => { e.preventDefault(); withViewTransition(() => (location.hash = href)); }}>
            {pick === null ? t.today.cta : t.home.deckCta}
          </a>
          <span className="dhint">{pick === null ? t.home.deckHint : mult > 0 ? t.home.deckPays(`×${mult.toFixed(2)}`) : t.home.deckFresh}</span>
        </div>
      </div>
      {markets.length > 1 && (
        <div className="dnav">
          <button onClick={() => go(-1)} aria-label={t.home.prev}>‹</button>
          <span className="tab">{(idx % markets.length) + 1} / {markets.length}</span>
          <button onClick={() => go(1)} aria-label={t.home.next}>›</button>
        </div>
      )}
    </div>
  );
}
