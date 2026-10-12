import type { ApiMarket } from "../lib/api";
import { countdown } from "../lib/format";
import { useLang, useT } from "../lib/i18n";
import { coverOf } from "../lib/market";
import { withViewTransition } from "../lib/motion";
import { displayQuestion } from "../lib/question";

export function MarketTile({ m, now }: { m: ApiMarket; now: number }) {
  const t = useT();
  const lang = useLang();
  const open = m.status === "open" && m.lockTime > now;
  const cover = coverOf(m);
  const status = open ? t.tile.closesIn(countdown(m.lockTime, now, lang)) : m.status === "proposed" ? t.tile.checking : m.status === "settled" ? t.tile.decided : t.tile.closed;
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
        {displayQuestion(m, { short: true, lang })}
        {m.demo && <span className="demo">{t.tile.demo}</span>}
      </div>
      <div className="c tab">{status}</div>
    </a>
  );
}
