import { keccak256, toHex } from "viem";
import { CODE_HASHES } from "./codehashes";
import type { Template } from "./types";

/** keccak256 of the pure resolve source (see scripts/gen-hashes.ts); test/hash.test.ts fails if it goes stale. */
export const codeHash = (t: Template) => {
  const h = CODE_HASHES[t.resolveFile];
  if (!h) throw new Error(`no code hash for ${t.resolveFile}; run bun scripts/gen-hashes.ts`);
  return h;
};
export const rulesHash = (t: Template) => keccak256(toHex(t.rules));
