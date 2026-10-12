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
  const stack = useRef<HTMLDivElement>(null);
  const entering = useRef<0 | 1 | -1>(0);
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

  // after the swap the stack is re-rendered in its resting places; only the incoming card's content still has to arrive
  useLayoutEffect(() => {
    const el = card.current;
    const dir = entering.current;
    entering.current = 0;
    if (!el || reduced()) return;
    const backs = [...(stack.current?.querySelectorAll<HTMLElement>(".dback") ?? [])];
    // cards that moved up keep their React element; hand their position back to the stylesheet
    gsap.set(backs, { clearProps: "transform,opacity" });
    gsap.set(backs.map((b) => b.querySelector("img")), { clearProps: "filter" });
    if (dir === -1) {
      // going back: the previous card slides in from the left, on top of the stack
      gsap.fromTo(el, { x: -160, y: 0, scale: 1, rotation: -8, opacity: 0 }, { x: 0, rotation: 0, opacity: 1, duration: 0.55, ease: EASE.pop });
    } else if (dir === 0) {
      gsap.fromTo(el, { x: 0, y: 24, scale: 0.95, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.7, ease: EASE.pop });
    } else {
      gsap.set(el, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 });
      const last = stack.current?.querySelector(".d2");
      if (last) gsap.from(last, { opacity: 0, scale: 0.9, duration: 0.5, ease: EASE.land, clearProps: "opacity,transform" });
    }
    gsap.fromTo(el.querySelectorAll(".dmeta, .dchip, .dfoot"), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.04, ease: EASE.land });
  }, [idx]);

  const go = (dir: 1 | -1) => {
    if (busy.current || markets.length < 2) return;
    const next = () => { entering.current = dir; setPick(null); setIdx((i) => (i + dir + markets.length) % markets.length); };
    const el = card.current;
    if (!el || reduced()) return next();
    busy.current = true;
    const done = () => { busy.current = false; next(); };
    const tl = gsap.timeline({ onComplete: done });
    if (dir === 1) {
      // the top card is flung off, every card behind it moves up one place
      tl.to(el, { x: -180, y: 20, rotation: -12, opacity: 0, duration: 0.42, ease: "power2.in" }, 0);
      const d1 = stack.current?.querySelector<HTMLElement>(".d1");
      const d2 = stack.current?.querySelector<HTMLElement>(".d2");
      // second card takes the first one's resting place, read from the stylesheet so mobile offsets hold too
      const d1Rest = d1 ? getComputedStyle(d1).transform : "none";
      if (d1) tl.to(d1, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.5, ease: EASE.land }, 0.08);
      if (d1) tl.to(d1.querySelector("img"), { filter: "blur(0px) brightness(1) saturate(1)", duration: 0.5 }, 0.08);
      if (d2) tl.to(d2, { transform: d1Rest, opacity: 1, duration: 0.5, ease: EASE.land }, 0.08);
    } else {
      // going back: the top card steps down into the stack before the previous one lands on top
      tl.to(el, { x: 22, y: -14, rotation: 3.5, scale: 0.97, opacity: 0, duration: 0.32, ease: "power2.in" }, 0);
    }
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
      <div className="dstack" ref={stack}>
      {behind.map((b, k) => (
        <div key={b.id} className={`dback d${k + 1}`} aria-hidden>{coverOf(b) && <img src={coverOf(b)} alt="" />}</div>
      )).reverse()}
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
