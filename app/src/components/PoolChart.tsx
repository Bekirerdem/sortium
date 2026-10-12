import { useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import type { Activity } from "../lib/api";
import { locale, useLang, useT } from "../lib/i18n";
import { shareSeries, splitLabel } from "../lib/market";
import { EASE, reduced } from "../lib/motion";
import { displayOutcome } from "../lib/question";

const COLORS = ["#ffd84d", "#ff6b8b", "#7cc7ff", "#9dffb0"];
const RANGES = { h1: 3600, h6: 21600, d1: 86400, all: Infinity } as const;
type Range = keyof typeof RANGES;
const W = 640;
const H = 200;

/** Each leading outcome's share of the pool over time, replayed from the indexed bets; lines draw in when shown. */
export function PoolChart({ bets, outcomes, pools, now }: { bets: Activity[]; outcomes: string[]; pools: bigint[]; now: number }) {
  const t = useT();
  const lang = useLang();
  const [range, setRange] = useState<Range>("all");
  const svg = useRef<SVGSVGElement>(null);

  const series = useMemo(() => shareSeries(bets.filter((b) => b.kind === "bet"), outcomes.length), [bets, outcomes.length]);
  // the four outcomes holding the most stake now
  const tracked = pools.map((_, i) => i).sort((a, b) => (pools[b] > pools[a] ? 1 : pools[b] < pools[a] ? -1 : a - b)).slice(0, 4).filter((i) => pools[i] > 0n);

  const from = range === "all" ? (series[0]?.t ?? now) : now - RANGES[range];
  const start = Math.min(from, now - 60);
  const before = [...series].reverse().find((p) => p.t < start);
  const pts = [...(before ? [{ ...before, t: start }] : []), ...series.filter((p) => p.t >= start)];
  const x = (tm: number) => ((tm - start) / Math.max(1, now - start)) * W;
  const y = (v: number) => H - (v / 100) * H;
  const path = (i: number) => {
    if (!pts.length) return "";
    let d = `M ${x(pts[0].t).toFixed(1)} ${y(pts[0].shares[i]).toFixed(1)}`;
    for (let k = 1; k < pts.length; k++) d += ` H ${x(pts[k].t).toFixed(1)} V ${y(pts[k].shares[i]).toFixed(1)}`;
    return `${d} H ${W}`;
  };

  useLayoutEffect(() => {
    if (!svg.current || reduced()) return;
    const lines = svg.current.querySelectorAll(".pl");
    gsap.fromTo(lines, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, stagger: 0.12, ease: EASE.land });
    gsap.fromTo(svg.current.querySelectorAll(".pd"), { scale: 0, transformOrigin: "center" }, { scale: 1, duration: 0.5, delay: 0.8, stagger: 0.12, ease: EASE.pop });
  }, [range, series.length]);

  const fmt = (tm: number) => new Date(tm * 1000).toLocaleString(locale(lang), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <section className="chart panel">
      <div className="chart-head">
        <h3>{t.chart.title}</h3>
        <div className="ranges" role="group">
          {(Object.keys(RANGES) as Range[]).map((r) => (
            <button key={r} aria-pressed={range === r} onClick={() => setRange(r)}>{t.chart.ranges[r]}</button>
          ))}
        </div>
      </div>
      <ul className="legend">
        {tracked.map((i, k) => {
          const last = series[series.length - 1]?.shares[i] ?? 0;
          const label = outcomes[i] === "Other" ? t.option.other : splitLabel(displayOutcome(outcomes[i], lang)).title;
          return <li key={i}><i style={{ background: COLORS[k] }} />{label}<b className="tab">{last.toFixed(0)}%</b></li>;
        })}
      </ul>
      {series.length === 0 ? (
        <p className="empty">{t.chart.empty}</p>
      ) : (
        <>
          <svg ref={svg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={t.chart.title}>
            {[0, 25, 50, 75, 100].map((g) => <line key={g} className="grid" x1="0" x2={W} y1={y(g)} y2={y(g)} />)}
            {tracked.map((i, k) => (
              <g key={i}>
                <path className="pl" d={path(i)} stroke={COLORS[k]} pathLength={1} strokeDasharray="1" vectorEffect="non-scaling-stroke" />
                <circle className="pd" cx={W} cy={y(pts[pts.length - 1]?.shares[i] ?? 0)} r="4" fill={COLORS[k]} />
              </g>
            ))}
          </svg>
          <div className="axis tab"><span>{fmt(start)}</span><span>{fmt(now)}</span></div>
        </>
      )}
    </section>
  );
}
