import { keccak256, toHex, type Hex } from "viem";
import { TEMPLATES, type Env, type MarketDraft } from "@cwf/templates";
import type { Chain } from "./chain";
import { draftKey, type Row } from "./logic";

export type Budget = { sends: number };

/** Phase 1: open missing markets for one template, spending at most budget.sends transactions. */
export async function runFactory(db: D1Database, chain: Chain, env: Env, key: string, budget: Budget) {
  const t = TEMPLATES[key];
  const planned = t.plannedKeys?.(env);
  if (planned) {
    if (planned.length === 0) return;
    const marks = planned.map(() => "?").join(",");
    const { results } = await db.prepare(`SELECT draft_key FROM markets WHERE draft_key IN (${marks})`).bind(...planned).all<{ draft_key: string }>();
    if (results.length === planned.length) return; // everything already opened, no source fetches needed
  }
  let drafts: MarketDraft[];
  try {
    drafts = await t.drafts(env);
  } catch (e) {
    console.error("drafts", key, String(e));
    return;
  }
  for (const d of drafts) {
    if (budget.sends <= 0) return;
    const dk = draftKey(d);
    const exists = await db.prepare("SELECT 1 FROM markets WHERE draft_key = ?").bind(dk).first();
    if (exists) continue;
    try {
      const hash = await chain.sendCreateMarket(d, keccak256(toHex(JSON.stringify(d.meta))));
      budget.sends -= 1;
      await db
        .prepare(
          `INSERT INTO markets(draft_key, template_key, entity, question, outcomes, lock_time, resolve_time, meta, demo, status, tx_hash, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'creating', ?, ?)`,
        )
        .bind(dk, d.templateKey, d.entity, d.question, JSON.stringify(d.outcomes), d.lockTime, d.resolveTime, JSON.stringify(d.meta), t.demo ? 1 : 0, hash, env.now)
        .run();
      console.log("sent createMarket", dk, hash);
    } catch (e) {
      console.error("createMarket", dk, String(e).slice(0, 300));
    }
  }
}

/** Phase 2: turn mined createMarket transactions into open markets with their onchain id. */
export async function confirmCreations(db: D1Database, chain: Chain) {
  const { results } = await db.prepare("SELECT * FROM markets WHERE status = 'creating' LIMIT 10").all<Row>();
  for (const r of results) {
    const res = await chain.confirmCreateMarket(r.tx_hash as Hex);
    if (!res) continue;
    if (res.ok && res.id !== undefined) {
      await db.prepare("UPDATE markets SET market_id = ?, status = 'open' WHERE draft_key = ?").bind(res.id, r.draft_key).run();
      console.log("created", r.draft_key, res.id);
    } else {
      // reverted: drop the row so the factory can try again in its next window
      await db.prepare("DELETE FROM markets WHERE draft_key = ?").bind(r.draft_key).run();
      console.error("createMarket reverted", r.draft_key, r.tx_hash);
    }
  }
}
