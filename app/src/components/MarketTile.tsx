import type { ApiMarket } from "../lib/api";
import { countdown } from "../lib/format";
import { coverOf } from "../lib/market";
import { withViewTransition } from "../lib/motion";
import { displayQuestion } from "../lib/question";

export function MarketTile({ m, now }: { m: ApiMarket; now: number }) {
  const open = m.status === "open" && m.lockTime > now;
  const cover = coverOf(m);
  const status = open ? `Closes in ${countdown(m.lockTime, now)}` : m.status === "proposed" ? "Result being checked on UMA" : m.status === "settled" ? "Decided" : "Closed";
  return (
    <a
      className="tile"
      href={`#/m/${m.id}`}
      onClick={(e) => {
        e.preventDefault();
        withViewTransition(() => (location.hash = `#/m/${m.id}`));
      }}
    >
      <div className="pic" style={{ viewTransitionName: `cover-${m.id}` }}>{cover && <img src={cover} alt="" loading="lazy" />}</div>
      <div className="q">
        {displayQuestion(m)}
        {m.demo && <span className="demo">demo</span>}
      </div>
      <div className="c tab">{status}</div>
    </a>
  );
}
