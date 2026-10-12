// Serves the built app on Deno Deploy. Wallet extensions (MetaMask) flag every *.pages.dev and *.workers.dev
// origin as a drainer, so the playable app lives on deno.net; unknown paths fall back to the SPA shell.
// `bun run deploy:deno` copies the build into ./www for the upload (dist is git-ignored and Deploy skips ignored files).
import { serveDir } from "jsr:@std/http@1.1.4/file-server";

const ROOT = `${import.meta.dirname}/www`;

Deno.serve(async (req) => {
  const res = await serveDir(req, { fsRoot: ROOT, quiet: true });
  if (res.status !== 404) return res;
  return serveDir(new Request(new URL("/index.html", req.url)), { fsRoot: ROOT, quiet: true });
});
