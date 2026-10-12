import { useRef, useState } from "react";
import { MarketTile } from "../components/MarketTile";
import type { ApiMarket } from "../lib/api";
import { useLang, useT } from "../lib/i18n";
import { useEntrance } from "../lib/motion";
import { useNow } from "../hooks/useNow";
import { family } from "../lib/market";

export function Browse({ markets }: { markets: ApiMarket[] }) {
  const t = useT();
  const lang = useLang();
  const [tab, setTab] = useState<"Music" | "YouTube" | "Soon">("Music");
  const now = useNow(15_000);
  const scope = useRef<HTMLDivElement>(null);
  useEntrance(scope, [tab, lang]);
  const list = markets.filter((m) => family(m.templateKey) === tab && m.status === "open" && m.lockTime > now);
  const label = { Music: t.family.music, YouTube: t.family.youtube, Soon: t.browse.soonTab };
  return (
    <div ref={scope}>
      <h1 className="page-title" data-rise>{t.browse.title}</h1>
      <div className="chips" role="group" aria-label={t.browse.category} data-rise>
        {(["Music", "YouTube", "Soon"] as const).map((k) => (
          <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>{label[k]}</button>
        ))}
      </div>
      {tab === "Soon" ? (
        <div className="grid">
          {t.browse.soon.map(([name, q]) => (
            <div className="tile soon" key={name} data-rise>
              <div className="pic">{name}</div>
              <div className="q">{q}</div>
              <div className="c">{t.browse.soonNote}</div>
            </div>
          ))}
        </div>
      ) : list.length ? (
        <div className="grid">{list.map((m) => <div key={m.id} data-rise><MarketTile m={m} now={now} /></div>)}</div>
      ) : (
        <p className="empty">{tab === "YouTube" ? t.browse.emptyYt : t.browse.emptyMusic}</p>
      )}
    </div>
  );
}
