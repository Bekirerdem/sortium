import { useEffect, useState } from "react";
import type { ApiMarket } from "../lib/api";
import { countdown } from "../lib/format";

export const family = (key: string) => (key.startsWith("YT") ? "YouTube" : "Music");

function useNow() {
  const [now, setNow] = useState(Date.now() / 1000);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const hhmm = (to: number, now: number) => {
  const s = Math.max(0, Math.floor(to - now));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export function MarketRow({ m, now }: { m: ApiMarket; now: number }) {
  const open = m.status === "open" && m.lockTime > now;
  return (
    <a className="row" href={`#/m/${m.id}`}>
      <span className="eyebrow">{family(m.templateKey)} · {m.entity.length <= 3 ? m.entity.toUpperCase() : "video"}</span>
      <span>
        <span className="q">{m.question}</span>
        {m.demo && <span className="tag demo" style={{ marginLeft: 8 }}>demo</span>}
      </span>
      <span className="lead">{open ? "closes in" : m.status === "proposed" ? "awaiting UMA" : m.status}</span>
      <span className="t num">{open ? countdown(m.lockTime, now) : "—"}</span>
    </a>
  );
}

export function Today({ markets }: { markets: ApiMarket[] }) {
  const now = useNow();
  const open = markets.filter((m) => m.status === "open" && m.lockTime > now).sort((a, b) => a.lockTime - b.lockTime);
  const hero = open.find((m) => !m.demo) ?? open[0];
  const rest = open.filter((m) => m !== hero);
  const settled = markets.filter((m) => m.status === "settled" || m.status === "void" || m.status === "proposed").slice(0, 6);

  return (
    <>
      {hero ? (
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><span className="live-dot" /> &nbsp;Today's big one · {family(hero.templateKey)}</span>
            <h1 className="hero-q"><a href={`#/m/${hero.id}`}>{hero.question}</a></h1>
            <div className="hero-meta">
              <span>{hero.outcomes.length} outcomes · pool bet · resolved by open code + UMA</span>
              <a className="btn primary" href={`#/m/${hero.id}`} style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Pick an outcome</a>
            </div>
          </div>
          <div className="hero-counter num">
            <small>Betting closes in</small>
            {hhmm(hero.lockTime, now)}
          </div>
        </section>
      ) : (
        <section className="hero"><div className="hero-copy"><h1 className="hero-q">The factory is opening today's markets.</h1><p>New markets appear every 15 minutes.</p></div></section>
      )}

      <div className="section-head"><h2>Open now</h2><span className="eyebrow">{open.length} markets</span></div>
      <div className="rows">{rest.map((m) => <MarketRow key={m.id} m={m} now={now} />)}</div>

      {settled.length > 0 && (
        <>
          <div className="section-head"><h2>Settling</h2><span className="eyebrow">outcomes checked on UMA</span></div>
          <div className="rows">{settled.map((m) => <MarketRow key={m.id} m={m} now={now} />)}</div>
        </>
      )}
    </>
  );
}
