import { compactNum } from "../lib/format";

export function LiveCounter({ live }: { live?: { label: string; value: string } }) {
  if (!live) return null;
  const n = Number(live.value);
  const shown = Number.isFinite(n) && live.value !== "" ? compactNum(n) : live.value;
  return (
    <div className="counter-line">
      <span className="live-dot" aria-hidden />
      <span className="eyebrow">{live.label}</span>
      {/* key forces the swap animation each time the value changes */}
      <span className="big swap" key={live.value}>
        {shown}
      </span>
    </div>
  );
}
