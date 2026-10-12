import { useEffect, useRef } from "react";
import { multiplier, share, usd } from "../lib/format";
import { useLang, useT } from "../lib/i18n";
import { splitLabel } from "../lib/market";
import gsap from "gsap";
import { reduced, tweenNumber } from "../lib/motion";
import { displayOutcome } from "../lib/question";

type Props = {
  label: string;
  art?: string;
  index: number;
  pools: bigint[];
  stake: bigint;
  selected: boolean;
  won: boolean;
  disabled: boolean;
  onSelect: (i: number) => void;
};

export function OptionRow({ label, art, index, pools, stake, selected, won, disabled, onSelect }: Props) {
  const t = useT();
  const lang = useLang();
  const { title, by } = splitLabel(displayOutcome(label, lang));
  const pct = share(pools, index);
  const mult = multiplier(pools, index);
  const multRef = useRef<HTMLSpanElement>(null);
  useEffect(() => tweenNumber(multRef.current, mult, (n) => (n > 0 ? `×${n.toFixed(2)}` : t.option.fresh)), [mult, t]);
  // when someone else's pick moves this row's odds, the number flashes green (pays more) or red (pays less)
  const prev = useRef(mult);
  const right = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const was = prev.current;
    prev.current = mult;
    if (!right.current || was === mult || was === 0 || reduced()) return;
    gsap.fromTo(right.current, { backgroundColor: mult > was ? "rgba(62, 224, 143, 0.32)" : "rgba(255, 107, 139, 0.32)" },
      { backgroundColor: "rgba(0, 0, 0, 0)", duration: 1.4, ease: "power2.out", clearProps: "backgroundColor" });
  }, [mult]);
  return (
    <button className={`opt${won ? " won" : ""}`} aria-pressed={selected} disabled={disabled} onClick={() => onSelect(index)} data-rise>
      {art ? <img className="art" src={art} alt="" loading="lazy" /> : <span className="art">{title === "Other" ? "?" : title.slice(0, 1)}</span>}
      <span>
        <span className="t">{title === "Other" ? t.option.other : title}</span>
        {by && <span className="b">{by}</span>}
        <span className="share"><i style={{ transform: `scaleX(${pct / 100})` }} /></span>
        {stake > 0n && <span className="mine">{t.option.mine(usd(stake, lang))}</span>}
      </span>
      <span className="r" ref={right}>
        <span className="m" ref={multRef}>{mult > 0 ? `×${mult.toFixed(2)}` : t.option.fresh}</span>
        <span className="p">{pct > 0 ? t.option.ofPool(pct.toFixed(0)) : disabled ? t.option.noPicks : t.option.first}</span>
      </span>
    </button>
  );
}
