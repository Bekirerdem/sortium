import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ADDRESSES } from "@cwf/templates";
import { BetSlip } from "../components/BetSlip";
import { Headline } from "../components/Headline";
import { OptionRow } from "../components/OptionRow";
import { Steps } from "../components/Steps";
import { useMarket } from "../hooks/useMarket";
import type { Wallet } from "../hooks/useWallet";
import { evidenceUrl } from "../lib/api";
import { EXPLORER, claim, readCodeHash } from "../lib/chain";
import { compactNum, countdown, usd } from "../lib/format";
import { decidedAt, errorText, useLang, useT } from "../lib/i18n";
import { artFor, coverOf, leaderIndex, splitLabel } from "../lib/market";
import { EASE, reduced, useEntrance, useMagnetic, useTilt } from "../lib/motion";
import { displayQuestion } from "../lib/question";
import { useNow } from "../hooks/useNow";
import { family } from "../lib/market";

type Props = { id: number; initialPick: number | null; wallet: Wallet; onToast: (m: string) => void; onArt: (a?: string) => void };

export function Market({ id, initialPick, wallet, onToast, onArt }: Props) {
  const { meta, chain, error, reload } = useMarket(id, wallet.address);
  const t = useT();
  const lang = useLang();
  const [selected, setSelected] = useState<number | null>(initialPick);
  const [codeHash, setCodeHash] = useState<string | null>(null);
  const scope = useRef<HTMLDivElement>(null);
  const tilt = useTilt<HTMLDivElement>(8);
  const coverImg = useRef<HTMLImageElement>(null);
  const claimBtn = useMagnetic<HTMLButtonElement>(0.25);
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
      <BetSlip marketId={id} label={selected === null ? undefined : meta.outcomes[selected]} art={selected === null ? undefined : artFor(meta.meta, selected)}
        pools={pools} selected={selected} open={open} wallet={wallet} onDone={reload} onToast={onToast} />
    </>
  );
}
