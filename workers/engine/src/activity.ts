import { decodeAbiParameters, toEventSelector, type Hex } from "viem";
import { ADDRESSES } from "@cwf/templates";

const RPC = "https://sepolia-rollup.arbitrum.io/rpc";
const BET = toEventSelector("BetPlaced(uint256,address,uint8,uint256)");
const CLAIM = toEventSelector("Claimed(uint256,address,uint256)");
/** Public Arbitrum Sepolia RPC answers 5M-block getLogs ranges; 50k keeps responses small. */
export const MAX_RANGE = 50_000;
/** Distinct blocks whose timestamps are fetched in one batched request per tick. */
export const MAX_BLOCKS = 40;

export type RawLog = { topics: Hex[]; data: Hex; blockNumber: Hex; transactionHash: Hex; logIndex: Hex };
export type Activity = {
  tx: Hex;
  logIndex: number;
  marketId: number;
  user: string;
  outcome: number | null;
  amount: number;
  kind: "bet" | "claim";
  block: number;
};

export function decodeActivity(logs: RawLog[]): Activity[] {
  const out: Activity[] = [];
  for (const l of logs) {
    const kind = l.topics[0] === BET ? "bet" : l.topics[0] === CLAIM ? "claim" : null;
    if (!kind) continue;
    const base = {
      tx: l.transactionHash,
      logIndex: Number(l.logIndex),
      marketId: Number(BigInt(l.topics[1])),
      user: `0x${l.topics[2].slice(26)}`.toLowerCase(),
    };
    if (kind === "bet") {
      const [outcome, amount] = decodeAbiParameters([{ type: "uint8" }, { type: "uint256" }], l.data);
      out.push({ ...base, outcome, amount: Number(amount), kind, block: Number(l.blockNumber) });
    } else {
      const [amount] = decodeAbiParameters([{ type: "uint256" }], l.data);
      out.push({ ...base, outcome: null, amount: Number(amount), kind, block: Number(l.blockNumber) });
    }
  }
  return out;
}

export function nextRange(cursor: number, head: number, max: number): { from: number; to: number } | null {
  if (cursor >= head) return null;
  return { from: cursor + 1, to: Math.min(head, cursor + max) };
}

/**
 * Keeps rows from the first `maxBlocks` distinct blocks (rows are in block order). The cursor moves to the end of the
 * range when everything fits, otherwise to the last kept block, so the next tick resumes at the first dropped block.
 */
export function planBlocks<T extends { block: number }>(rows: T[], maxBlocks: number, rangeEnd: number) {
  const blocks: number[] = [];
  const keep: T[] = [];
  for (const r of rows) {
    if (blocks[blocks.length - 1] !== r.block) {
      if (blocks.length === maxBlocks) return { keep, blocks, cursor: blocks[blocks.length - 1] };
      blocks.push(r.block);
    }
    keep.push(r);
  }
  return { keep, blocks, cursor: rangeEnd };
}

async function rpc<T>(body: unknown): Promise<T> {
  const res = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`rpc ${res.status}`);
  return (await res.json()) as T;
}

type One<T> = { result?: T; error?: { message: string } };
const unwrap = <T>(r: One<T>) => {
  if (r.error || r.result === undefined) throw new Error(r.error?.message ?? "rpc: empty result");
  return r.result;
};

async function ensureTables(db: D1Database) {
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS bets (tx_hash TEXT NOT NULL, log_index INTEGER NOT NULL, market_id INTEGER NOT NULL, user TEXT NOT NULL, " +
        "outcome INTEGER, amount INTEGER NOT NULL, kind TEXT NOT NULL, block INTEGER NOT NULL, time INTEGER NOT NULL, PRIMARY KEY (tx_hash, log_index))",
    ),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_bets_block ON bets(block DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_bets_user ON bets(user)"),
    db.prepare("CREATE TABLE IF NOT EXISTS index_state (name TEXT PRIMARY KEY, last INTEGER NOT NULL)"),
  ]);
}

/**
 * Indexes BetPlaced and Claimed with at most three subrequests: head, logs, and one batched request for the exact
 * timestamps of the blocks that hold new events. Large backlogs are caught up over several ticks.
 */
export async function indexActivity(db: D1Database) {
  await ensureTables(db);
  const state = await db.prepare("SELECT last FROM index_state WHERE name = 'bets'").first<{ last: number }>();
  const cursor = state?.last ?? Number(ADDRESSES.deployBlock) - 1;
  const head = Number(unwrap(await rpc<One<Hex>>({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] })));
  const range = nextRange(cursor, head, MAX_RANGE);
  if (!range) return;
  const logs = unwrap(
    await rpc<One<RawLog[]>>({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getLogs",
      params: [{ address: ADDRESSES.markets, fromBlock: `0x${range.from.toString(16)}`, toBlock: `0x${range.to.toString(16)}`, topics: [[BET, CLAIM]] }],
    }),
  );
  const rows = decodeActivity(logs).sort((a, b) => a.block - b.block || a.logIndex - b.logIndex);
  const plan = planBlocks(rows, MAX_BLOCKS, range.to);
  const times = new Map<number, number>();
  if (plan.blocks.length) {
    const res = await rpc<(One<{ timestamp: Hex }> & { id: number })[]>(
      plan.blocks.map((b) => ({ jsonrpc: "2.0", id: b, method: "eth_getBlockByNumber", params: [`0x${b.toString(16)}`, false] })),
    );
    for (const r of res) times.set(r.id, Number(unwrap(r).timestamp));
  }
  const stmts = plan.keep.map((r) =>
    db
      .prepare("INSERT OR IGNORE INTO bets (tx_hash, log_index, market_id, user, outcome, amount, kind, block, time) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(r.tx, r.logIndex, r.marketId, r.user, r.outcome, r.amount, r.kind, r.block, times.get(r.block)!),
  );
  stmts.push(
    db.prepare("INSERT INTO index_state (name, last) VALUES ('bets', ?) ON CONFLICT(name) DO UPDATE SET last = excluded.last").bind(plan.cursor),
  );
  await db.batch(stmts);
}

const raw = (n: number | null | undefined) => String(n ?? 0);

export async function getActivity(db: D1Database, url: URL) {
  await ensureTables(db);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 30));
  const { results } = await db
    .prepare("SELECT market_id, user, outcome, amount, kind, block, tx_hash, time FROM bets ORDER BY block DESC, log_index DESC LIMIT ?")
    .bind(limit)
    .all<{ market_id: number; user: string; outcome: number | null; amount: number; kind: string; block: number; tx_hash: string; time: number }>();
  return Response.json({
    items: results.map((r) => ({
      marketId: r.market_id,
      user: r.user,
      outcome: r.outcome,
      amount: raw(r.amount),
      kind: r.kind,
      block: r.block,
      tx: r.tx_hash,
      time: r.time,
    })),
  });
}

export async function getStats(db: D1Database) {
  await ensureTables(db);
  const now = Math.floor(Date.now() / 1000);
  const [b, m] = await db.batch([
    db.prepare(
      "SELECT COALESCE(SUM(CASE WHEN kind = 'bet' THEN amount END), 0) AS volume, COUNT(CASE WHEN kind = 'bet' THEN 1 END) AS bets, " +
        "COUNT(DISTINCT CASE WHEN kind = 'bet' THEN user END) AS players, COALESCE(SUM(CASE WHEN kind = 'claim' THEN amount END), 0) AS paid FROM bets",
    ),
    db.prepare(
      "SELECT COUNT(CASE WHEN status = 'open' AND lock_time > ? THEN 1 END) AS open, COUNT(CASE WHEN status = 'settled' THEN 1 END) AS settled FROM markets",
    ).bind(now),
  ]);
  const s = b.results[0] as { volume: number; bets: number; players: number; paid: number };
  const k = m.results[0] as { open: number; settled: number };
  return Response.json({ volume: raw(s.volume), bets: s.bets, players: s.players, openMarkets: k.open, settledMarkets: k.settled, paidOut: raw(s.paid) });
}

/** Winnings count claims on settled markets only; refunds from cancelled markets are not wins. */
export async function getLeaderboard(db: D1Database) {
  await ensureTables(db);
  const { results } = await db
    .prepare(
      "SELECT b.user AS user, COALESCE(SUM(CASE WHEN b.kind = 'bet' THEN b.amount END), 0) AS volume, " +
        "COALESCE(SUM(CASE WHEN b.kind = 'claim' AND m.status = 'settled' THEN b.amount END), 0) AS won, " +
        "COUNT(CASE WHEN b.kind = 'bet' THEN 1 END) AS bets, COUNT(CASE WHEN b.kind = 'claim' AND m.status = 'settled' THEN 1 END) AS wins " +
        "FROM bets b LEFT JOIN markets m ON m.market_id = b.market_id GROUP BY b.user ORDER BY won DESC, volume DESC LIMIT 10",
    )
    .all<{ user: string; volume: number; won: number; bets: number; wins: number }>();
  return Response.json({ items: results.map((r) => ({ user: r.user, volume: raw(r.volume), won: raw(r.won), bets: r.bets, wins: r.wins })) });
}
