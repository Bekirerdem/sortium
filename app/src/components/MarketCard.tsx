import type { ApiMarket } from "../lib/api";
import { countdown, share, usd } from "../lib/format";
import { useLang, useT } from "../lib/i18n";
import { artFor, coverOf, family, poolsOf, splitLabel } from "../lib/market";
import { withViewTransition } from "../lib/motion";
import { displayOutcome, displayQuestion } from "../lib/question";

/** Grid card: the question, the two outcomes people back most (chart order while the pool is empty), pool and clock. */
export function MarketCard({ m, now }: { m: ApiMarket; now: number }) {
  const t = useT();
  const lang = useLang();
  const pools = poolsOf(m);
  const total = BigInt(m.pool?.total ?? "0");
  const order = m.outcomes.map((_, i) => i).filter((i) => m.outcomes[i] !== "Other" || pools[i] > 0n)
    .sort((a, b) => (total === 0n ? a - b : pools[b] > pools[a] ? 1 : pools[b] < pools[a] ? -1 : a - b)).slice(0, 2);
  const cover = coverOf(m);
  const href = `#/m/${m.id}`;
  const go = (pick?: number) => withViewTransition(() => (location.hash = pick === undefined ? href : `${href}?pick=${pick}`));
  const cc = String(m.meta.cc ?? m.meta.region ?? "").toUpperCase();

  return (
    <article className="mcard" onClick={() => go()}>
      <header>
        <div className="mpic" style={{ viewTransitionName: `cover-${m.id}` }}>{cover && <img src={cover} alt="" loading="lazy" />}</div>
        <div className="mq">
          <span className="mfam">{family(m.templateKey) === "YouTube" ? t.family.youtube : t.family.music}{cc && <em>{cc}</em>}{m.demo && <em className="d">{t.tile.demo}</em>}</span>
          <a href={href} onClick={(e) => { e.preventDefault(); e.stopPropagation(); go(); }}>{displayQuestion(m, { short: true, lang })}</a>
        </div>
      </header>
      <ul>
        {order.map((i) => {
          const label = m.outcomes[i] === "Other" ? t.option.other : splitLabel(displayOutcome(m.outcomes[i], lang)).title;
          const pct = share(pools, i);
          return (
            <li key={i}>
              <button onClick={(e) => { e.stopPropagation(); go(i); }}>
                {artFor(m.meta, i) ? <img src={artFor(m.meta, i)} alt="" loading="lazy" /> : <span className="ph" />}
                <span className="ml">{label}</span>
                <span className="mbar"><i style={{ transform: `scaleX(${pct / 100})` }} /></span>
                <b className="tab">{total === 0n ? "–" : `${pct.toFixed(0)}%`}</b>
              </button>
            </li>
          );
        })}
      </ul>
      <footer className="tab">
        <span>{usd(total, lang)} tUSD {t.home.poolLabel}</span>
        <span>{t.home.bettors(m.pool?.bettors ?? 0)}</span>
        <span>{countdown(m.lockTime, now, lang)}</span>
      </footer>
    </article>
  );
}
