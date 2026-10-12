import { useEffect, useState } from "react";
import { ADDRESSES } from "@cwf/templates";
import { BetBox } from "../components/BetBox";
import { LiveCounter } from "../components/LiveCounter";
import { OutcomeRow } from "../components/OutcomeRow";
import { Timeline } from "../components/Timeline";
import { useMarket } from "../hooks/useMarket";
import type { Wallet } from "../hooks/useWallet";
import { evidenceUrl } from "../lib/api";
import { EXPLORER, claim, readCodeHash } from "../lib/chain";
import { countdown, usd } from "../lib/format";
import { family } from "./Today";

export function Market({ id, wallet, onToast }: { id: number; wallet: Wallet; onToast: (m: string) => void }) {
  const { meta, chain, error, reload } = useMarket(id, wallet.address);
  const [selected, setSelected] = useState<number | null>(null);
  const [codeHash, setCodeHash] = useState<string | null>(null);
  const [tab, setTab] = useState<"rules" | "evidence">("rules");

  useEffect(() => {
    if (chain) readCodeHash(chain.market.templateId).then(setCodeHash).catch(() => setCodeHash(null));
  }, [chain?.market.templateId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !meta) return <p className="err" style={{ paddingTop: 40 }}>Could not load market {id}: {error}</p>;
  if (!meta || !chain) return <p className="preview" style={{ paddingTop: 40 }}>Loading market…</p>;

  const open = chain.state === 0;
  const resolved = chain.state === 3;
  const total = chain.pools.reduce((a, b) => a + b, 0n);
  const share = `${location.origin}${location.pathname}#/m/${id}`;
  const tweet = `https://x.com/intent/post?text=${encodeURIComponent(`${meta.question} — I picked my answer.`)}&url=${encodeURIComponent(share)}`;

  const doClaim = async () => {
    try {
      const hash = await claim(wallet.address!, BigInt(id));
      onToast(`Paid out ${usd(chain.claimable)} tUSD.`);
      window.open(`${EXPLORER}/tx/${hash}`, "_blank", "noopener");
      reload();
      wallet.refresh();
    } catch (e) {
      onToast((e as Error).message.split("\n")[0].slice(0, 140));
    }
  };

  return (
    <div className="market">
      <section>
        <span className="eyebrow">
          {family(meta.templateKey)} · market #{id} {meta.demo && <span className="tag demo">demo · shortened timing, real data</span>}
        </span>
        <h1>{meta.question}</h1>
        <LiveCounter live={meta.live} />
        <div className="outcomes">
          {meta.outcomes.map((label, i) => (
            <OutcomeRow
              key={i}
              label={label}
              index={i}
              pools={chain.pools}
              stake={chain.stakes[i] ?? 0n}
              selected={selected === i}
              won={resolved && chain.market.winningOutcome === i}
              disabled={!open}
              onSelect={setSelected}
            />
          ))}
        </div>
        <p className="preview" style={{ marginTop: 16 }}>
          Pool <span className="num">{usd(total)}</span> tUSD · {open ? <>closes in <span className="num">{countdown(meta.lockTime)}</span></> : "betting closed"} · 2% fee · max 500 per player
        </p>
      </section>

      <aside className="side">
        {chain.claimable > 0n ? (
          <div className="betbox">
            <span className="eyebrow">{chain.state === 4 ? "Market void" : "You won"}</span>
            <span className="pick num">{usd(chain.claimable)} tUSD</span>
            <button className="btn primary" onClick={doClaim}>{chain.state === 4 ? "Get refund" : "Collect winnings"}</button>
          </div>
        ) : (
          <BetBox marketId={id} outcomes={meta.outcomes} pools={chain.pools} selected={selected} open={open} wallet={wallet} onDone={reload} onToast={onToast} />
        )}

        <Timeline state={chain.state} lockTime={meta.lockTime} resolveTime={meta.resolveTime} />

        <div className="panel">
          <div className="tabs" style={{ padding: 0 }}>
            <button aria-pressed={tab === "rules"} onClick={() => setTab("rules")}>Rules</button>
            <button aria-pressed={tab === "evidence"} onClick={() => setTab("evidence")}>Evidence</button>
          </div>
          {tab === "rules" ? (
            <>
              <p>{meta.rules}</p>
              <span className="eyebrow">Resolver code hash (onchain)</span>
              <code>{codeHash ?? "…"}</code>
            </>
          ) : (
            <>
              <p>When the market resolves, the engine stores the raw source snapshot, posts its sha256 and the outcome to UMA, and anyone can re-run the open resolver to check it.</p>
              {meta.assertionId ? (
                <>
                  <span className="eyebrow">UMA assertion</span>
                  <code>{meta.assertionId}</code>
                  <a href={evidenceUrl(id)} target="_blank" rel="noopener">Raw evidence snapshot →</a>
                  <span className="eyebrow">Verify yourself</span>
                  <code>bun run verify {id}</code>
                </>
              ) : (
                <p>No proposal yet.</p>
              )}
              <a href={`${EXPLORER}/address/${ADDRESSES.markets}`} target="_blank" rel="noopener">PoolMarkets contract →</a>
            </>
          )}
        </div>

        <a className="btn" href={tweet} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          Share on X
        </a>
      </aside>
    </div>
  );
}
