import { useEffect, useState } from "react";
import { ADDRESSES, poolMarketsAbi } from "@cwf/templates";
import type { Wallet } from "../hooks/useWallet";
import type { ApiMarket } from "../lib/api";
import { pub } from "../lib/chain";
import { usd } from "../lib/format";

type Line = { m: ApiMarket; staked: bigint; claimable: bigint };

export function MyBets({ markets, wallet }: { markets: ApiMarket[]; wallet: Wallet }) {
  const [lines, setLines] = useState<Line[] | null>(null);

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
      <div style={{ paddingTop: 40 }}>
        <button className="btn primary" onClick={wallet.login}>Connect wallet to see your bets</button>
      </div>
    );
  }
  if (!lines) return <p className="preview" style={{ paddingTop: 40 }}>Reading your bets…</p>;

  return (
    <div className="ledger">
      <div className="section-head"><h2>My bets</h2><span className="eyebrow">{lines.length} markets</span></div>
      {lines.length === 0 && <p className="preview" style={{ padding: "24px 0" }}>No bets yet. Pick something on Today.</p>}
      <div className="rows">
        {lines.map(({ m, staked, claimable }) => (
          <a className="row" key={m.id} href={`#/m/${m.id}`}>
            <span className="q">{m.question}</span>
            <span className="lead">{m.status}</span>
            <span className="num">{usd(staked)} staked</span>
            <span className="t num">{claimable > 0n ? `collect ${usd(claimable)}` : "—"}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
