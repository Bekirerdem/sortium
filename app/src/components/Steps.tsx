const time = (t: number) => new Date(t * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** Where the market is in its life: open → locked → checked on UMA → paid out (or refunded). */
export function Steps({ state, lockTime, resolveTime }: { state: number; lockTime: number; resolveTime: number }) {
  const steps = [
    { name: "Betting open", at: "" },
    { name: "Betting closes", at: time(lockTime) },
    { name: "Result posted to UMA, open to disputes", at: time(resolveTime) },
    { name: state === 4 ? "Cancelled, everyone refunded" : "Winners paid", at: "" },
  ];
  const current = state === 4 ? 3 : Math.min(state, 3);
  return (
    <div className="panel">
      <h3>Where this market is</h3>
      <ol className="steps">
        {steps.map((s, i) => (
          <li key={s.name} className={i === current ? "now" : i < current ? "done" : ""}>
            <span>{s.name}</span>
            <span className="tab">{s.at}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
