import type { Chain } from "./chain";

const DAY = 86_400;

/** Wallets one network may fund per day: a shared office or event wifi still works, a script farming addresses does not. */
export const IP_DAILY_CAP = 8;

export function faucetDecision(byAddr: { last: number } | null, ipToday: number, now: number) {
  if (byAddr && now < byAddr.last + DAY) return { ok: false as const, reason: "address cooldown" };
  if (ipToday >= IP_DAILY_CAP) return { ok: false as const, reason: "ip cooldown" };
  return { ok: true as const };
}

export async function handleFaucet(req: Request, db: D1Database, chain: Chain): Promise<Response> {
  const { address } = (await req.json().catch(() => ({}))) as { address?: string };
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) return Response.json({ ok: false, error: "bad address" }, { status: 400 });
  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
  const now = Math.floor(Date.now() / 1000);
  const byAddr = await db.prepare("SELECT last FROM faucet WHERE address = ?").bind(address.toLowerCase()).first<{ last: number }>();
  const byIp = await db.prepare("SELECT COUNT(*) AS n FROM faucet WHERE ip = ? AND last > ?").bind(ip, now - DAY).first<{ n: number }>();
  const d = faucetDecision(byAddr, byIp?.n ?? 0, now);
  if (!d.ok) return Response.json({ ok: false, error: d.reason }, { status: 429 });
  await db.prepare("INSERT OR REPLACE INTO faucet(address, ip, last) VALUES (?, ?, ?)").bind(address.toLowerCase(), ip, now).run();
  try {
    const txs = await chain.drip(address as `0x${string}`);
    return Response.json({ ok: true, txs });
  } catch (e) {
    // give the slot back so a transient RPC failure does not lock the user out for a day
    await db.prepare("DELETE FROM faucet WHERE address = ?").bind(address.toLowerCase()).run();
    return Response.json({ ok: false, error: `faucet failed: ${String(e).slice(0, 160)}` }, { status: 502 });
  }
}
