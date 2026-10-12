import { useState } from "react";
import type { ApiMarket } from "../lib/api";
import { MarketRow, family } from "./Today";

const SOON = [
  { name: "Film & TV", q: "Will the new Stranger Things episode drop before Friday?" },
  { name: "Games", q: "Peak Steam players on GTA 6 launch day?" },
  { name: "Streamers", q: "Will the stream pass 1M concurrent viewers?" },
  { name: "Speech", q: "Will the Fed chair say “tariff” in the press conference?" },
  { name: "Weather", q: "Will it rain in Istanbul tomorrow?" },
  { name: "Charts", q: "Rotten Tomatoes score of this week's biggest release?" },
];

export function Category({ markets }: { markets: ApiMarket[] }) {
  const [tab, setTab] = useState<"YouTube" | "Music" | "Soon">("Music");
  const now = Date.now() / 1000;
  const list = markets.filter((m) => family(m.templateKey) === tab && m.status === "open" && m.lockTime > now);
  return (
    <>
      <div className="tabs" role="group" aria-label="Categories">
        {(["Music", "YouTube", "Soon"] as const).map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t === "Soon" ? "Coming soon" : t}
          </button>
        ))}
      </div>
      {tab === "Soon" ? (
        <div className="soon">
          {SOON.map((s) => (
            <div key={s.name}>
              <span className="tag">soon</span>
              <h3>{s.name}</h3>
              <p>{s.q}</p>
            </div>
          ))}
        </div>
      ) : list.length ? (
        <div className="rows">{list.map((m) => <MarketRow key={m.id} m={m} now={now} />)}</div>
      ) : (
        <p className="preview" style={{ padding: "24px 0" }}>
          {tab === "YouTube" ? "YouTube markets open as soon as tracked creators upload and the daily charts refresh." : "No open music markets right now."}
        </p>
      )}
    </>
  );
}
