import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import type { ApiMarket } from "../lib/api";
import { useT } from "../lib/i18n";
import { category } from "../lib/market";
import { EASE, reduced } from "../lib/motion";

export type Cat = "all" | "music" | "youtube" | "views" | "fast" | "soon";
export const CATS: Cat[] = ["all", "music", "youtube", "views", "fast", "soon"];

/** Open markets in a category ("soon" holds roadmap cards, not markets). */
export function inCat(markets: ApiMarket[], c: Cat, now: number): ApiMarket[] {
  const open = markets.filter((m) => m.status === "open" && m.lockTime > now);
  return c === "all" ? open : c === "soon" ? [] : open.filter((m) => category(m) === c);
}

export const catCounts = (markets: ApiMarket[], now: number) =>
  Object.fromEntries(CATS.filter((c) => c !== "soon").map((c) => [c, inCat(markets, c, now).length])) as Partial<Record<Cat, number>>;

/** Category strip with a pill that slides to the active category; counts show what is open in each. */
export function CategoryBar({ value, counts, onChange }: { value: Cat; counts: Partial<Record<Cat, number>>; onChange: (c: Cat) => void }) {
  const t = useT();
  const row = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const btn = row.current?.querySelector<HTMLElement>(`[data-cat="${value}"]`);
    if (!btn || !pill.current) return;
    const to = { x: btn.offsetLeft, width: btn.offsetWidth };
    if (reduced()) gsap.set(pill.current, to);
    else gsap.to(pill.current, { ...to, duration: 0.5, ease: EASE.land });
    btn.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [value, t]);

  return (
    <div className="cats" role="tablist" aria-label={t.home.gridTitle} ref={row}>
      <span className="cats-pill" ref={pill} aria-hidden />
      {CATS.map((c) => (
        <button key={c} role="tab" data-cat={c} aria-selected={value === c} onClick={() => onChange(c)}>
          {t.home.cats[c]}
          {counts[c] !== undefined && <span className="n tab">{counts[c]}</span>}
        </button>
      ))}
    </div>
  );
}
