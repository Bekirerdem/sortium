import { makeChain } from "./chain";
import { confirmCreations, runFactory } from "./factory";
import { confirmProposals, confirmSettlements, runResolver, runSettle } from "./resolver";
import { getEvidence, getMarket, listMarkets } from "./api";
import { handleFaucet } from "./faucet";
import { factoryTemplateFor, MAX_SENDS_PER_TICK } from "./logic";

interface WEnv {
  DB: D1Database;
  OPERATOR_KEY: string;
  /** Separate dripper key so faucet requests never race the cron on the operator nonce. */
  FAUCET_KEY: string;
  YOUTUBE_API_KEY?: string;
  YT_CREATORS?: string;
  APP_ORIGIN: string;
  PUBLIC_URL: string;
}

const FACTORY_KEYS = ["AM_TOP_COUNTRY", "AM_TOP_DEMO", "YT_TOP_COUNTRY", "YT_VIEWS_24H"];

/** One engine run at a time: overlapping cron runs would race on the operator nonce. */
async function withLock(db: D1Database, now: number, fn: () => Promise<void>) {
  await db.prepare("CREATE TABLE IF NOT EXISTS locks (name TEXT PRIMARY KEY, until INTEGER NOT NULL)").run();
  const got = await db
    .prepare("INSERT INTO locks(name, until) VALUES ('engine', ?) ON CONFLICT(name) DO UPDATE SET until = excluded.until WHERE locks.until < ?")
    .bind(now + 240, now)
    .run();
  if (!got.meta.changes) return;
  try {
    await fn();
  } finally {
    await db.prepare("UPDATE locks SET until = 0 WHERE name = 'engine'").run();
  }
}

export default {
  async scheduled(_e: ScheduledController, env: WEnv, ctx: ExecutionContext) {
    const now = Math.floor(Date.now() / 1000);
    const chain = makeChain(env.OPERATOR_KEY);
    const tenv = { YOUTUBE_API_KEY: env.YOUTUBE_API_KEY, YT_CREATORS: env.YT_CREATORS, now };
    ctx.waitUntil(
      withLock(env.DB, now, async () => {
        const budget = { sends: MAX_SENDS_PER_TICK };
        // cheap receipt reads first, then at most MAX_SENDS_PER_TICK new transactions
        await confirmCreations(env.DB, chain);
        await confirmProposals(env.DB, chain, now);
        await confirmSettlements(env.DB, chain);
        await runResolver(env.DB, chain, tenv, env.PUBLIC_URL, budget);
        await runSettle(env.DB, chain, now, budget);
        await runFactory(env.DB, chain, tenv, factoryTemplateFor(now, FACTORY_KEYS), budget);
      }),
    );
  },

  async fetch(req: Request, env: WEnv): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get("origin") ?? "";
    // APP_ORIGIN lists the app's origins, primary first; preview deploys live on subdomains of each
    const apps = env.APP_ORIGIN.split(",").map((s) => s.trim());
    const allowed = origin.startsWith("http://localhost:") ||
      apps.some((a) => origin === a || origin.endsWith(`.${a.replace(/^https:\/\//, "")}`));
    const cors: Record<string, string> = {
      "access-control-allow-origin": allowed ? origin : apps[0],
      vary: "origin",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    let res: Response;
    const m = url.pathname.match(/^\/api\/(markets|evidence)\/(\d+)$/);
    if (url.pathname === "/api/markets") res = await listMarkets(env.DB, url);
    else if (m?.[1] === "markets") res = await getMarket(env.DB, Number(m[2]), env.YOUTUBE_API_KEY);
    else if (m?.[1] === "evidence") res = await getEvidence(env.DB, Number(m[2]));
    else if (url.pathname === "/api/faucet" && req.method === "POST") res = await handleFaucet(req, env.DB, makeChain(env.FAUCET_KEY));
    else res = new Response("not found", { status: 404 });
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    return out;
  },
};
