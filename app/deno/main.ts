// Serves the built app on Deno Deploy. Wallet extensions (MetaMask) flag every *.pages.dev and *.workers.dev
// origin as a drainer, so the playable app lives on deno.net; unknown paths fall back to the SPA shell.
import { serveDir } from "jsr:@std/http@1.1.4/file-server";

Deno.serve(async (req) => {
  const res = await serveDir(req, { fsRoot: "dist", quiet: true });
  if (res.status !== 404) return res;
  return serveDir(new Request(new URL("/index.html", req.url)), { fsRoot: "dist", quiet: true });
});
