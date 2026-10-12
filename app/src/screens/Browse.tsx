import { useRef, useState } from "react";
import { MarketTile } from "../components/MarketTile";
import type { ApiMarket } from "../lib/api";
import { useEntrance } from "../lib/motion";
import { family, useNow } from "./Today";

const SOON = [
  { name: "Film and TV", q: "Will the next Stranger Things episode drop before Friday?" },
  { name: "Games", q: "How many people will play GTA 6 on launch day?" },
  { name: "Streamers", q: "Will the stream pass a million viewers?" },
  { name: "Speeches", q: "Will the Fed chair say “tariff” at the press conference?" },
  { name: "Weather", q: "Will it rain in Istanbul tomorrow?" },
];

export function Browse({ markets }: { markets: ApiMarket[] }) {
  const [tab, setTab] = useState<"Music" | "YouTube" | "Soon">("Music");
  const now = useNow(15_000);
  const scope = useRef<HTMLDivElement>(null);
  useEntrance(scope, [tab]);
  const list = markets.filter((m) => family(m.templateKey) === tab && m.status === "open" && m.lockTime > now);
  return (
    <div ref={scope}>
      <h1 className="page-title" data-rise>Browse markets</h1>
      <div className="chips" role="group" aria-label="Category" data-rise>
        {(["Music", "YouTube", "Soon"] as const).map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{t === "Soon" ? "Coming next" : t}</button>
        ))}
      </div>
      {tab === "Soon" ? (
        <div className="grid">
          {SOON.map((s) => (
            <div className="tile soon" key={s.name} data-rise>
              <div className="pic">{s.name}</div>
              <div className="q">{s.q}</div>
              <div className="c">Coming after the hackathon</div>
            </div>
          ))}
        </div>
      ) : list.length ? (
        <div className="grid">{list.map((m) => <div key={m.id} data-rise><MarketTile m={m} now={now} /></div>)}</div>
      ) : (
        <p className="empty">{tab === "YouTube" ? "YouTube markets open when tracked creators upload and when the daily charts refresh." : "No music markets are open right now. New ones open every day."}</p>
      )}
    </div>
  );
}
