// Uploads the current build to Deno Deploy (https://sortium.sortium.deno.net). Run after `bun run build`.
// The build is copied into deno/www for the upload and removed afterwards, so git never sees it.
import { cpSync, rmSync } from "node:fs";
import { join } from "node:path";

const deno = join(import.meta.dir, "..", "deno");
const www = join(deno, "www");
rmSync(www, { recursive: true, force: true });
cpSync(join(import.meta.dir, "..", "dist"), www, { recursive: true });
try {
  const p = Bun.spawnSync(["deno", "deploy", "--prod", "--non-interactive"], { cwd: deno, stdout: "inherit", stderr: "inherit" });
  if (p.exitCode !== 0) process.exit(p.exitCode ?? 1);
} finally {
  rmSync(www, { recursive: true, force: true });
}
