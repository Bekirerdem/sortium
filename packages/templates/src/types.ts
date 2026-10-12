/** Outcome index meaning "source unavailable → refund everyone". Matches UmaResolver.VOID_OUTCOME. */
export const VOID = 255 as const;

export interface Candidate { id: string; label: string }

export interface MarketDraft {
  templateKey: string;
  entity: string;
  windowKey: string;
  question: string;
  outcomes: string[];
  lockTime: number;
  resolveTime: number;
  meta: Record<string, unknown>;
}

export interface Snapshot { source: string; fetchedAt: number; body: unknown }

export interface Env { YOUTUBE_API_KEY?: string; YT_CREATORS?: string; now: number }

export interface Template {
  key: string;
  version: number;
  demo: boolean;
  rules: string;
  /** Path (relative to src/) of the pure resolve file whose text is hashed into codeHash. */
  resolveFile: string;
  /** Draft keys (template:entity:window) this template would open now, computable without fetching sources; lets the engine skip work. */
  plannedKeys?(env: Env): string[];
  drafts(env: Env): Promise<MarketDraft[]>;
  snapshot(meta: Record<string, unknown>, env: Env): Promise<Snapshot>;
  resolve(meta: Record<string, unknown>, snap: Snapshot): number;
}
