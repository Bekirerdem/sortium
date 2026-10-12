import { sha256, toHex, type Hex } from "viem";
import { TEMPLATES, VOID, type Env } from "@cwf/templates";
import type { Chain } from "./chain";
import type { Budget } from "./factory";
import { dueForProposal, dueForSettle, statusFromState, type Row } from "./logic";

const VOID_GRACE = 6 * 3600;

/** Snapshot the source, store it, send the UMA proposal. Confirmation happens in confirmProposals on a later tick. */
export async function runResolver(db: D1Database, chain: Chain, env: Env, publicUrl: string, budget: Budget) {
  const { results } = await db.prepare("SELECT * FROM markets WHERE status = 'open' AND resolve_time <= ? LIMIT 8").bind(env.now).all<Row>();
  for (const r of results) {
    if (budget.sends <= 0) return;
    if (!dueForProposal(r, env.now) || r.market_id === null) continue;
    const t = TEMPLATES[r.template_key];
    const meta = JSON.parse(r.meta) as Record<string, unknown>;
    let body: string;
    let outcome: number;
    try {
      const snap = await t.snapshot(meta, env);
      body = JSON.stringify(snap);
      outcome = t.resolve(meta, snap);
    } catch (e) {
      if (env.now < r.resolve_time + VOID_GRACE) {
        console.error("snapshot failed, retrying next tick", r.market_id, String(e));
        continue;
      }
      body = JSON.stringify({ source: "unavailable", fetchedAt: env.now, body: { error: String(e) } });
      outcome = VOID;
    }
    const hash = sha256(toHex(body));
    // a re-proposal after a rejected assertion must not erase the evidence the earlier assertion committed to
    await db.batch([
      db.prepare("CREATE TABLE IF NOT EXISTS snapshot_archive (market_id INTEGER NOT NULL, fetched_at INTEGER NOT NULL, sha256 TEXT NOT NULL, body TEXT NOT NULL)"),
      db.prepare("INSERT INTO snapshot_archive SELECT market_id, fetched_at, sha256, body FROM snapshots WHERE market_id = ? AND sha256 != ?").bind(r.market_id, hash),
      db.prepare("INSERT OR REPLACE INTO snapshots(market_id, fetched_at, sha256, body) VALUES (?, ?, ?, ?)").bind(r.market_id, env.now, hash, body),
    ]);
    try {
      const tx = await chain.sendPropose(r.market_id, outcome, hash, `${publicUrl}/api/evidence/${r.market_id}`);
      budget.sends -= 1;
      await db.prepare("UPDATE markets SET status = 'proposing', tx_hash = ? WHERE draft_key = ?").bind(tx, r.draft_key).run();
      console.log("sent propose", r.market_id, outcome, tx);
    } catch (e) {
      // propose is permissionless: if someone else already asserted, follow the chain instead of retrying forever
      console.error("propose", r.market_id, String(e).slice(0, 300));
      await syncState(db, chain, r).catch(() => {});
    }
  }
}

export async function confirmProposals(db: D1Database, chain: Chain, now: number) {
  const { results } = await db.prepare("SELECT * FROM markets WHERE status = 'proposing' LIMIT 10").all<Row>();
  for (const r of results) {
    const res = await chain.confirmPropose(r.tx_hash as Hex);
    if (!res) continue;
    if (res.ok) {
      await db.prepare("UPDATE markets SET status = 'proposed', assertion_id = ?, proposed_at = ? WHERE draft_key = ?").bind(res.assertionId, now, r.draft_key).run();
      console.log("proposed", r.market_id, res.assertionId);
    } else {
      await db.prepare("UPDATE markets SET status = 'open' WHERE draft_key = ?").bind(r.draft_key).run();
      console.error("propose reverted", r.market_id, r.tx_hash);
    }
  }
}

export async function runSettle(db: D1Database, chain: Chain, now: number, budget: Budget) {
  const { results } = await db.prepare("SELECT * FROM markets WHERE status = 'proposed' LIMIT 8").all<Row>();
  for (const r of results) {
    if (budget.sends <= 0) return;
    // asserted by someone else: we hold no assertion id, so just follow the market until it settles or voids
    if (!r.assertion_id) {
      await syncState(db, chain, r).catch(() => {});
      continue;
    }
    if (!dueForSettle(r, now)) continue;
    try {
      const tx = await chain.sendSettle(r.assertion_id as Hex);
      budget.sends -= 1;
      await db.prepare("UPDATE markets SET status = 'settling', tx_hash = ? WHERE draft_key = ?").bind(tx, r.draft_key).run();
    } catch (e) {
      // estimateGas reverts when someone else already settled it; read the market state and move on
      await syncState(db, chain, r);
      console.error("settle", r.market_id, String(e).slice(0, 200));
    }
  }
}

export async function confirmSettlements(db: D1Database, chain: Chain) {
  const { results } = await db.prepare("SELECT * FROM markets WHERE status = 'settling' LIMIT 10").all<Row>();
  for (const r of results) {
    const mined = await chain.mined(r.tx_hash as Hex);
    if (mined === null) continue;
    await syncState(db, chain, r);
  }
}

async function syncState(db: D1Database, chain: Chain, r: Row) {
  if (r.market_id === null) return;
  const status = statusFromState(await chain.marketState(r.market_id));
  await db.prepare("UPDATE markets SET status = ? WHERE draft_key = ?").bind(status, r.draft_key).run();
}
