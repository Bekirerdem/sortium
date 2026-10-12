import { multiplier, share, usd } from "../lib/format";

type Props = {
  label: string;
  index: number;
  pools: bigint[];
  stake: bigint;
  selected: boolean;
  won: boolean;
  disabled: boolean;
  onSelect: (i: number) => void;
};

export function OutcomeRow({ label, index, pools, stake, selected, won, disabled, onSelect }: Props) {
  const pct = share(pools, index);
  const mult = multiplier(pools, index);
  return (
    <button
      className={`outcome${won ? " won" : ""}`}
      aria-pressed={selected}
      disabled={disabled && !selected}
      onClick={() => onSelect(index)}
    >
      <span>
        <span className="label">{label}</span>
        {stake > 0n && <span className="mine num">your stake {usd(stake)}</span>}
      </span>
      <span className="pct num">{pct.toFixed(0)}%</span>
      <span className="mult num">{mult > 0 ? `×${mult.toFixed(2)}` : "—"}</span>
      <span className="bar-fill" style={{ width: "100%", transform: `scaleX(${pct / 100})` }} />
    </button>
  );
}
