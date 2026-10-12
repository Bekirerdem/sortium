import { locale, useLang, useT } from "../lib/i18n";

/** Where the market is in its life: open → locked → checked on UMA → paid out (or refunded). */
export function Steps({ state, lockTime, resolveTime }: { state: number; lockTime: number; resolveTime: number }) {
  const t = useT();
  const lang = useLang();
  const time = (s: number) => new Date(s * 1000).toLocaleString(locale(lang), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const steps = [
    { name: t.steps.open, at: "" },
    { name: t.steps.closes, at: time(lockTime) },
    { name: t.steps.posted, at: time(resolveTime) },
    { name: state === 4 ? t.steps.cancelled : t.steps.paid, at: "" },
  ];
  const current = state === 4 ? 3 : Math.min(state, 3);
  return (
    <div className="panel">
      <h3>{t.steps.title}</h3>
      <ol className="steps">
        {steps.map((s, i) => (
          <li key={i} className={i === current ? "now" : i < current ? "done" : ""}>
            <span>{s.name}</span>
            <span className="tab">{s.at}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
