import type { MarketDraft } from "@cwf/templates";

export interface Row {
  draft_key: string;
  market_id: number | null;
  template_key: string;
  entity: string;
  question: string;
  outcomes: string;
  lock_time: number;
  resolve_time: number;
  meta: string;
  demo: number;
  status: string;
  assertion_id: string | null;
  proposed_at: number | null;
  tx_hash: string | null;
}

export const LIVENESS = { demo: 300, normal: 7200 } as const;
export const MARGIN = 60;

export const draftKey = (d: Pick<MarketDraft, "templateKey" | "entity" | "windowKey">) => `${d.templateKey}:${d.entity}:${d.windowKey}`;

export const dueForProposal = (r: Pick<Row, "status" | "resolve_time">, now: number) => r.status === "open" && now >= r.resolve_time;

export const dueForSettle = (r: Pick<Row, "status" | "proposed_at" | "demo">, now: number) =>
  r.status === "proposed" && r.proposed_at !== null && now >= r.proposed_at + (r.demo ? LIVENESS.demo : LIVENESS.normal) + MARGIN;

/**
 * Free Workers plan caps an invocation at 50 subrequests. Each send costs estimateGas + sendRawTransaction and
 * each draft may cost one source fetch, so a tick does at most this many sends and one factory template.
 */
export const MAX_SENDS_PER_TICK = 10;

export const factoryTemplateFor = (now: number, keys: string[]) => keys[Math.floor(now / 60) % keys.length];

/** PoolMarkets.State after settlement → engine status. Locked (1) means UMA rejected the assertion, so propose again. */
export function statusFromState(state: number): string {
  if (state === 3) return "settled";
  if (state === 4) return "void";
  if (state === 2) return "proposed";
  return "open";
}
