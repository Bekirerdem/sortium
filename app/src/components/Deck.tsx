import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useMarket } from "../hooks/useMarket";
import { useNow } from "../hooks/useNow";
import type { Wallet } from "../hooks/useWallet";
import type { ApiMarket } from "../lib/api";
import { countdown, multiplier } from "../lib/format";
import { useLang, useT } from "../lib/i18n";
import { artFor, coverOf, family, splitLabel } from "../lib/market";
import { EASE, reduced, withViewTransition } from "../lib/motion";
import { displayQuestion } from "../lib/question";

type Props = { markets: ApiMarket[]; wallet: Wallet; onArt: (a?: string) => void };

/** The first four outcomes in chart order (current #1 first); "Other" stays on the market page. */
const shownOf = (m: ApiMarket) => m.outcomes.map((_, i) => i).filter((i) => m.outcomes[i] !== "Other").slice(0, 4);

/** One card's face. The cards waiting in the stack use the same face, so the one that moves up already looks right. */
function Face({ m, pools, pick, onPick, now }: { m: ApiMarket; pools: bigint[] | null; pick: number | null; onPick?: (i: number) => void; now: number }) {
  const t = useT();
  const lang = useLang();
  const focus = pick ?? shownOf(m)[0] ?? 0;
  const cover = artFor(m.meta, focus) ?? coverOf(m);
  return (
    <>
      <div className="dtop">
        <div className="dcover">{cover && <img src={cover} alt="" />}</div>
        <div className="dmeta">
          <span className="dfam">{family(m.templateKey) === "YouTube" ? t.family.youtube : t.family.music}<i />{t.tile.closesIn(countdown(m.lockTime, now, lang))}</span>
          <h3>{displayQuestion(m, { short: true, lang })}</h3>
        </div>
      </div>
      <div className="dchips">
        {shownOf(m).map((i) => {
          const { title, by } = splitLabel(m.outcomes[i]);
          const x = pools ? multiplier(pools, i) : 0;
          return (
            <button key={i} className="dchip" aria-pressed={pick === i} tabIndex={onPick ? 0 : -1} onClick={() => onPick?.(i)}>
              {artFor(m.meta, i) ? <img src={artFor(m.meta, i)} alt="" /> : <span className="ph" />}
              <span className="dt"><b>{title}</b><span>{by}</span></span>
              <span className="dm tab">{!pools ? "" : x > 0 ? `×${x.toFixed(2)}` : t.option.fresh}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/** The home page's hands-on moment: a stack of live markets you can flip through and pick from without leaving the page. */
export function Deck({ markets, wallet, onArt }: Props) {
  const t = useT();
  const now = useNow();
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const stack = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const entering = useRef<0 | 1 | -1>(0);
  const swipe = useRef<number | null>(null);
  const cta = useRef<HTMLAnchorElement>(null);

  const n = markets.length;
  const m = markets[idx % n];
  const { chain } = useMarket(m.id, wallet.address);
  const pools = chain?.pools ?? null;
  const focus = pick ?? shownOf(m)[0] ?? 0;
  const cover = artFor(m.meta, focus) ?? coverOf(m);
  useEffect(() => onArt(cover), [cover, onArt]);

  // after a swap React renders the stack in its resting places; only arrivals are animated here
  useLayoutEffect(() => {
    const el = card.current;
    const root = stack.current;
    const dir = entering.current;
    entering.current = 0;
    if (!el || !root || reduced()) return;
    const backs = [...root.querySelectorAll<HTMLElement>(".dback")];
    gsap.set([el, ...backs], { clearProps: "transform,opacity" });
    gsap.set(root.querySelectorAll(".dshade"), { clearProps: "opacity" });
    if (dir === -1) {
      gsap.fromTo(el, { x: -el.offsetWidth * 0.9, y: 40, rotation: -16 }, { x: 0, y: 0, rotation: 0, duration: 0.6, ease: EASE.pop });
      const shade = root.querySelector(".d1 .dshade");
      if (shade) gsap.from(shade, { opacity: 0, duration: 0.45 });
    } else if (dir === 1) {
      const last = root.querySelector(".dback.d2");
      if (last) gsap.from(last, { opacity: 0, scale: 0.9, duration: 0.45, ease: EASE.land });
    } else {
      gsap.from(el, { y: 24, scale: 0.96, opacity: 0, duration: 0.7, ease: EASE.pop });
    }
  }, [idx]);

  const go = (dir: 1 | -1) => {
    if (busy.current || n < 2) return;
    const next = () => { entering.current = dir; setPick(null); setIdx((i) => (i + dir + n) % n); };
    const el = card.current;
    const root = stack.current;
    if (!el || !root || reduced()) return next();
    busy.current = true;
    const tl = gsap.timeline({ onComplete: () => { busy.current = false; next(); } });
    const d1 = root.querySelector<HTMLElement>(".dback.d1");
    const d2 = root.querySelector<HTMLElement>(".dback.d2");
    if (dir === 1) {
      // top card is flung off; every card behind moves up exactly one place, read from the stylesheet so mobile offsets hold
      const d1Rest = d1 ? getComputedStyle(d1).transform : "none";
      // stays opaque while it covers the next card, fades only once it is mostly off
      tl.to(el, { x: -el.offsetWidth * 0.9, y: 40, rotation: -16, duration: 0.5, ease: "power2.in" }, 0)
        .to(el, { opacity: 0, duration: 0.14 }, 0.36);
      if (d1) tl.to(d1, { transform: "none", duration: 0.55, ease: EASE.land }, 0.1).to(d1.querySelector(".dshade"), { opacity: 0, duration: 0.55 }, 0.1);
      if (d2) tl.to(d2, { transform: d1Rest, duration: 0.55, ease: EASE.land }, 0.1).to(d2.querySelector(".dshade"), { opacity: 0.35, duration: 0.55 }, 0.1);
    } else {
      // going back: the top card steps down into the first slot, the previous one will land on top
      const d1Rest = d1 ? getComputedStyle(d1).transform : "translate(22px,-14px) rotate(3.5deg) scale(0.97)";
      tl.to(el, { transform: d1Rest, duration: 0.3, ease: "power2.in" }, 0);
      if (d1 && d2) tl.to(d1, { transform: getComputedStyle(d2).transform, duration: 0.3, ease: "power2.in" }, 0);
      if (d2) tl.to(d2, { opacity: 0, duration: 0.3 }, 0);
    }
  };

  // autoplay: a progress line fills, then the stack moves on; hovering, touching or picking holds it
  const bar = useRef<HTMLSpanElement>(null);
  const hold = useRef(false);
  const auto = useRef<gsap.core.Tween | null>(null);
  const goRef = useRef(go);
  goRef.current = go;
  useEffect(() => {
    if (!bar.current || n < 2 || reduced()) return;
    auto.current = gsap.fromTo(bar.current, { scaleX: 0 }, { scaleX: 1, duration: 6, ease: "none", onComplete: () => goRef.current(1) });
    if (hold.current || pick !== null) auto.current.pause();
    return () => { auto.current?.kill(); };
  }, [idx, n, pick]);
  const holdOn = () => { hold.current = true; auto.current?.pause(); };
  const holdOff = () => { hold.current = false; if (pick === null) auto.current?.resume(); };

  const href = `#/m/${m.id}${pick !== null ? `?pick=${pick}` : ""}`;
  const mult = pick !== null && pools ? multiplier(pools, pick, 10_000000n) : 0;
  const behind = n > 1 ? [1, 2].slice(0, Math.min(2, n - 1)).map((k) => markets[(idx + k) % n]) : [];

  return (
    <div className="deck"
      onPointerEnter={(e) => { if (e.pointerType === "mouse") holdOn(); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") holdOff(); }}
      onFocus={holdOn}
      onBlur={holdOff}
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
          <div key={b.id} className={`dback d${k + 1}`} aria-hidden>
            <Face m={b} pools={null} pick={null} now={now} />
            <span className="dshade" />
          </div>
        )).reverse()}
        <div className="dcard" ref={card}>
          <Face m={m} pools={pools} pick={pick} onPick={setPick} now={now} />
          <div className="dfoot">
            <a ref={cta} className="btn light" href={href} onClick={(e) => { e.preventDefault(); withViewTransition(() => (location.hash = href)); }}>
              {pick === null ? t.today.cta : t.home.deckCta}
            </a>
            <span className="dhint">{pick === null ? t.home.deckHint : mult > 0 ? t.home.deckPays(`×${mult.toFixed(2)}`) : t.home.deckFresh}</span>
          </div>
        </div>
      </div>
      {n > 1 && (
        <div className="dnav">
          <button onClick={() => go(-1)} aria-label={t.home.prev}>‹</button>
          <span className="dprog" aria-hidden><span ref={bar} /></span>
          <span className="tab">{(idx % n) + 1} / {n}</span>
          <button onClick={() => go(1)} aria-label={t.home.next}>›</button>
        </div>
      )}
    </div>
  );
}
