import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { keccak256, toHex } from "viem";
import { codeHash, rulesHash } from "../src/hash";
import { TEMPLATES } from "../src/index";

test("generated code hashes match the resolver sources on disk", () => {
  for (const t of Object.values(TEMPLATES)) {
    const src = readFileSync(join(import.meta.dir, "..", "src", t.resolveFile), "utf8");
    expect(codeHash(t)).toBe(keccak256(toHex(src)));
  }
});

test("demo and live Apple templates share resolver code", () => {
  expect(codeHash(TEMPLATES.AM_TOP_DEMO)).toBe(codeHash(TEMPLATES.AM_TOP_COUNTRY));
});
test("different resolvers hash differently", () => {
  expect(codeHash(TEMPLATES.AM_TOP_COUNTRY)).not.toBe(codeHash(TEMPLATES.YT_TOP_COUNTRY));
  expect(codeHash(TEMPLATES.YT_TOP_COUNTRY)).not.toBe(codeHash(TEMPLATES.YT_VIEWS_24H));
});
test("rules hash is a 32-byte hex", () => {
  expect(rulesHash(TEMPLATES.YT_VIEWS_24H)).toMatch(/^0x[0-9a-f]{64}$/);
});
test("every template has rules and a resolve file", () => {
  for (const t of Object.values(TEMPLATES)) {
    expect(t.rules.length).toBeGreaterThan(50);
    expect(t.resolveFile.startsWith("resolve/")).toBe(true);
  }
});
