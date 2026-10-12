import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ADDRESSES } from "@cwf/templates";
import { BetSlip } from "../components/BetSlip";
import { Headline } from "../components/Headline";
import { OptionRow } from "../components/OptionRow";
import { Steps } from "../components/Steps";
import { useMarket } from "../hooks/useMarket";
import type { Wallet } from "../hooks/useWallet";
import { evidenceUrl, getActivity, type Activity, type ApiMarket } from "../lib/api";
import { MarketTile } from "../components/MarketTile";
import { PoolChart } from "../components/PoolChart";
import { Rail } from "../components/Rail";
import { usePoll } from "../hooks/usePoll";
import { EXPLORER, claim, readCodeHash } from "../lib/chain";
import { avatar, compactNum, countdown, shortAddr, usd } from "../lib/format";
import { ago, decidedAt, errorText, useLang, useT } from "../lib/i18n";
import { artFor, coverOf, leaderIndex, splitLabel } from "../lib/market";
import { EASE, reduced, useEntrance, useTilt } from "../lib/motion";
import { displayOutcome, displayQuestion } from "../lib/question";
import { useNow } from "../hooks/useNow";
import { category, family } from "../lib/market";

type Props = { id: number; initialPick: number | null; wallet: Wallet; markets: ApiMarket[] | null; onToast: (m: string) => void; onArt: (a?: string) => void };

/** Who picked what on this market: the latest picks, or the biggest ones. */
function Picks({ bets, outcomes, meta }: { bets: Activity[] | null; outcomes: string[]; meta: Record<string, unknown> }) {
  const t = useT();
  const lang = useLang();
  const now = useNow(10_000);
  const [tab, setTab] = useState<"recent" | "top">("recent");
  const list = (bets ?? []).filter((b) => b.kind === "bet" && b.outcome !== null);
  const shown = (tab === "top" ? [...list].sort((a, b) => Number(BigInt(b.amount) - BigInt(a.amount))) : list).slice(0, 8);
  return (
    <section className="panel picks-panel">
      <div className="chart-head">
        <div className="ranges" role="tablist">
          {(["recent", "top"] as const).map((k) => <button key={k} role="tab" aria-pressed={tab === k} onClick={() => setTab(k)}>{t.tabs[k]}</button>)}
        </div>
      </div>
      {bets && shown.length === 0 && <p className="empty">{t.chart.empty}</p>}
      <ol className="feed">
        {shown.map((b) => {
          const raw = outcomes[b.outcome!] ?? "";
          const title = raw === "Other" ? t.option.other : splitLabel(displayOutcome(raw, lang)).title;
          return (
            <li key={`${b.tx}-${b.outcome}`}>
              <a href={`${EXPLORER}/tx/${b.tx}`} target="_blank" rel="noopener">
                <span className="av" style={{ background: avatar(b.user) }} aria-hidden />
                <span className="fx"><b>{t.home.tickerBet(shortAddr(b.user), usd(BigInt(b.amount), lang), title)}</b><span>{ago(b.time, lang, now)}</span></span>
                {artFor(meta, b.outcome!) ? <img src={artFor(meta, b.outcome!)} alt="" /> : <span />}
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function Market({ id, initialPick, wallet, markets, onToast, onArt }: Props) {
  const bets = usePoll(() => getActivity(300, id), 15_000);
  const { meta, chain, error, reload } = useMarket(id, wallet.address);
  const t = useT();
  const lang = useLang();
  const [selected, setSelected] = useState<number | null>(initialPick);
  const [codeHash, setCodeHash] = useState<string | null>(null);
  const scope = useRef<HTMLDivElement>(null);
  const tilt = useTilt<HTMLDivElement>(8);
  const coverImg = useRef<HTMLImageElement>(null);
  const claimBtn = useRef<HTMLButtonElement>(null);
  const now = useNow();
  const ready = !!meta && !!chain;

  const pools = chain?.pools ?? [];
  const focus = selected ?? (ready ? leaderIndex(pools) : 0);
  const focusArt = meta ? artFor(meta.meta, focus) ?? coverOf(meta) : undefined;

  useEffect(() => onArt(focusArt), [focusArt, onArt]);
  useEffect(() => {
    if (chain) readCodeHash(chain.market.templateId).then(setCodeHash).catch(() => setCodeHash(null));
  }, [chain?.market.templateId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEntrance(scope, [ready, lang]);

  const pick = (i: number) => {
    if (i === selected) return;
    setSelected(i);
    const img = coverImg.current;
    const next = meta ? artFor(meta.meta, i) ?? coverOf(meta) : undefined;
    if (!img || !next) return;
    if (reduced()) { img.src = next; return; }
    gsap.timeline()
      .to(img, { rotationY: 90, scale: 0.94, duration: 0.28, ease: "power2.in" })
      .add(() => { img.src = next; })
      .to(img, { rotationY: 0, scale: 1, duration: 0.6, ease: EASE.pop });
  };

  if (error && !meta) return <p className="err">{t.market.cantLoad(id, error)}</p>;
  if (!meta || !chain) return <p className="loading">{t.market.loading(id)}</p>;

  const open = chain.state === 0;
  const resolved = chain.state === 3;
  const total = pools.reduce((a, b) => a + b, 0n);
  const focusLabel = splitLabel(meta.outcomes[focus] ?? "");
  const shareUrl = `${location.origin}${location.pathname}#/m/${id}`;
  const question = displayQuestion(meta, { lang });
  const tweet = `https://x.com/intent/post?text=${encodeURIComponent(t.market.tweet(question))}&url=${encodeURIComponent(shareUrl)}`;
  const liveValue = meta.live ? (Number.isFinite(Number(meta.live.value)) ? compactNum(Number(meta.live.value), lang) : meta.live.value) : null;
  const related = (markets ?? [])
    .filter((r) => r.id !== id && r.status === "open" && r.lockTime > now && !r.demo)
    .sort((a, b) => Number(b.entity === meta.entity) - Number(a.entity === meta.entity) || Number(category(b) === category(meta)) - Number(category(a) === category(meta)) || a.lockTime - b.lockTime)
    .slice(0, 10);
  const familyName = family(meta.templateKey) === "YouTube" ? t.family.youtube : t.family.music;
  const claimable = usd(chain.claimable, lang);

  const doClaim = async () => {
    try {
      const hash = await claim(wallet.address!, BigInt(id));
      onToast(chain.state === 4 ? t.market.refunded(claimable) : t.market.collected(claimable));
      window.open(`${EXPLORER}/tx/${hash}`, "_blank", "noopener");
      reload();
      wallet.refresh();
    } catch (e) {
      onToast(errorText(e, lang));
    }
  };

  return (
    <>
      <section className="split" ref={scope}>
        <div className="stage">
          <p className="kicker" data-rise>
            {t.market.kicker(familyName, decidedAt(meta.resolveTime, lang))}
            {meta.demo && <span className="demo-note">{t.market.demo}</span>}
          </p>
          <Headline text={displayQuestion(meta, { short: true, lang })} />
          <div className="cover" ref={tilt} data-cover style={{ viewTransitionName: `cover-${id}` }}>
            {focusArt ? <img ref={coverImg} src={focusArt} alt="" /> : null}
          </div>
          <div className="now" data-rise>
            <div className="t">{focusLabel.title === "Other" ? t.option.other : focusLabel.title}</div>
            {focusLabel.by && <div className="b">{focusLabel.by}</div>}
          </div>
          <div className="facts" data-rise>
            <div><span>{open ? t.today.closesIn : t.market.statusLabel}</span><b>{open ? countdown(meta.lockTime, now, lang) : t.market.status[chain.state]}</b></div>
            <div><span>{t.today.pool}</span><b>{usd(total, lang)} tUSD</b></div>
          </div>
          {meta.live && (
            <div className="live" data-rise><span className="dot" /><span>{t.market.live[meta.live.label] ?? meta.live.label}</span><b>{liveValue}</b></div>
          )}
        </div>

        <div>
          <div className="board-head" data-rise>
            <h2>{open ? t.market.boardOpen : resolved ? t.market.boardResolved : t.market.boardClosed}</h2><span>{t.today.multHint}</span>
          </div>
          <div className="opts">
            {meta.outcomes.map((label, i) => (
              <OptionRow key={i} label={label} art={artFor(meta.meta, i)} index={i} pools={pools} stake={chain.stakes[i] ?? 0n}
                selected={selected === i} won={resolved && chain.market.winningOutcome === i} disabled={!open} onSelect={pick} />
            ))}
          </div>

          <div className="details">
            <PoolChart bets={bets ?? []} outcomes={meta.outcomes} pools={pools} now={now} />
            <Picks bets={bets} outcomes={meta.outcomes} meta={meta.meta} />
            {chain.claimable > 0n && (
              <div className="panel" data-rise>
                <h3>{chain.state === 4 ? t.market.cancelledTitle : t.market.wonTitle}</h3>
                <p className="rules">{chain.state === 4 ? t.market.cancelledBody : t.market.wonBody}</p>
                <div className="links"><button ref={claimBtn} className="btn light" onClick={doClaim}>{chain.state === 4 ? t.market.refundBtn : t.market.collectBtn(claimable)}</button></div>
              </div>
            )}
            <Steps state={chain.state} lockTime={meta.lockTime} resolveTime={meta.resolveTime} />
            <div className="panel">
              <h3>{t.market.howTitle}</h3>
              <p className="rules">{t.market.rules[meta.templateKey] ?? meta.rules}</p>
              <span className="hash">{t.market.fingerprint} {codeHash ?? t.market.loadingShort}</span>
              <div className="links">
                {meta.assertionId && <a href={evidenceUrl(id)} target="_blank" rel="noopener">{t.market.evidence}</a>}
                <a href={`${EXPLORER}/address/${ADDRESSES.markets}`} target="_blank" rel="noopener">{t.market.contract}</a>
                <a href={tweet} target="_blank" rel="noopener">{t.market.share}</a>
              </div>
            </div>
          </div>
        </div>
      </section>
      {related.length > 0 && (
        <>
          <div className="rail-head"><h2>{t.tabs.related}</h2></div>
          <Rail>{related.map((r) => <MarketTile key={r.id} m={r} now={now} />)}</Rail>
        </>
      )}
      <BetSlip marketId={id} label={selected === null ? undefined : meta.outcomes[selected]} art={selected === null ? undefined : artFor(meta.meta, selected)}
        pools={pools} selected={selected} open={open} wallet={wallet} onDone={reload} onToast={onToast} />
    </>
  );
}
