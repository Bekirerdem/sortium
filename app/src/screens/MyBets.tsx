import { useEffect, useRef, useState } from "react";
import { ADDRESSES, poolMarketsAbi } from "@cwf/templates";
import type { Wallet } from "../hooks/useWallet";
import type { ApiMarket } from "../lib/api";
import { pub } from "../lib/chain";
import { usd } from "../lib/format";
import { useLang, useT } from "../lib/i18n";
import { coverOf } from "../lib/market";
import { useEntrance, withViewTransition } from "../lib/motion";
import { displayQuestion } from "../lib/question";

type Line = { m: ApiMarket; staked: bigint; claimable: bigint };

export function MyBets({ markets, wallet }: { markets: ApiMarket[]; wallet: Wallet }) {
  const t = useT();
  const lang = useLang();
  const [lines, setLines] = useState<Line[] | null>(null);
  const scope = useRef<HTMLDivElement>(null);
  useEntrance(scope, [lines?.length ?? -1, lang]);

  useEffect(() => {
    const user = wallet.address;
    if (!user || markets.length === 0) return;
    let alive = true;
    (async () => {
      const calls = markets.flatMap((m) => [
        { address: ADDRESSES.markets, abi: poolMarketsAbi, functionName: "totalStakeOf", args: [BigInt(m.id), user] } as const,
        { address: ADDRESSES.markets, abi: poolMarketsAbi, functionName: "previewClaim", args: [BigInt(m.id), user] } as const,
      ]);
      const res = await pub.multicall({ contracts: calls, allowFailure: true });
      const out: Line[] = [];
      markets.forEach((m, i) => {
        const staked = (res[2 * i].result as bigint | undefined) ?? 0n;
        const claimable = (res[2 * i + 1].result as bigint | undefined) ?? 0n;
        if (staked > 0n) out.push({ m, staked, claimable });
      });
      if (alive) setLines(out);
    })().catch(() => alive && setLines([]));
    return () => {
      alive = false;
    };
  }, [markets, wallet.address]);

  if (!wallet.address) {
    return (
      <div ref={scope}>
        <h1 className="page-title" data-rise>{t.me.title}</h1>
        <button className="btn light" onClick={wallet.login} data-rise>{t.me.connect}</button>
      </div>
    );
  }

  return (
    <div ref={scope}>
      <h1 className="page-title" data-rise>{t.me.title}</h1>
      {!lines && <p className="loading">{t.me.reading}</p>}
      {lines?.length === 0 && <p className="empty">{t.me.empty}</p>}
      <div className="picks">
        {lines?.map(({ m, staked, claimable }) => {
          const cover = coverOf(m);
          return (
            <a key={m.id} className="pick-row" href={`#/m/${m.id}`} data-rise
              onClick={(e) => { e.preventDefault(); withViewTransition(() => (location.hash = `#/m/${m.id}`)); }}>
              {cover ? <img src={cover} alt="" /> : <span className="ph" />}
              <div><div className="q">{displayQuestion(m, { lang })}</div><div className="s tab">{t.me.staked(usd(staked, lang))}</div></div>
              <span className="s">{t.me.status[m.status === "open" || m.status === "settled" || m.status === "void" ? m.status : "other"]}</span>
              <span className="btn ghost">{claimable > 0n ? t.me.collect(usd(claimable, lang)) : t.me.view}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
