const STATES = ["Open", "Locked", "Proposed", "Resolved", "Void"] as const;

const time = (t: number) => new Date(t * 1000).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function Timeline({ state, lockTime, resolveTime }: { state: number; lockTime: number; resolveTime: number }) {
  const steps = [
    { name: "Betting open", at: "", reached: true },
    { name: "Locked", at: time(lockTime), reached: state >= 1 },
    { name: "Outcome proposed to UMA", at: time(resolveTime), reached: state >= 2 },
    { name: state === 4 ? "Void — stakes refunded" : "Resolved — winners paid", at: "", reached: state >= 3 },
  ];
  const current = state === 4 ? 3 : Math.min(state, 3);
  return (
    <div className="panel">
      <h3>Status · {STATES[state]}</h3>
      <ol className="timeline">
        {steps.map((s, i) => (
          <li key={s.name} className={i === current ? "now" : s.reached ? "done" : ""}>
            <span>{s.name}</span>
            <span className="num">{s.at}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
