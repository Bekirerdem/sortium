import { expect, test } from "bun:test";
import { draftKey, dueForProposal, dueForSettle, factoryTemplateFor, MAX_SENDS_PER_TICK, statusFromState } from "../src/logic";

test("factory rotates one template per minute so a tick stays under the subrequest cap", () => {
  const keys = ["A", "B", "C", "D"];
  expect(factoryTemplateFor(0, keys)).toBe("A");
  expect(factoryTemplateFor(60, keys)).toBe("B");
  expect(factoryTemplateFor(4 * 60, keys)).toBe("A");
  expect(factoryTemplateFor(5 * 60 + 59, keys)).toBe("B");
});
test("send budget leaves room for reads under the free-plan cap of 50 subrequests", () => {
  // each send costs estimateGas + sendRawTransaction, each draft may cost one source fetch
  expect(MAX_SENDS_PER_TICK * 3 + 5).toBeLessThanOrEqual(45);
});

test("draft key is stable", () => {
  expect(draftKey({ templateKey: "AM_TOP_COUNTRY", entity: "tr", windowKey: "2026-10-13" })).toBe("AM_TOP_COUNTRY:tr:2026-10-13");
});
test("proposal due only after resolve time and while open", () => {
  expect(dueForProposal({ status: "open", resolve_time: 100 }, 99)).toBe(false);
  expect(dueForProposal({ status: "open", resolve_time: 100 }, 100)).toBe(true);
  expect(dueForProposal({ status: "proposed", resolve_time: 100 }, 500)).toBe(false);
});
test("settle due after liveness + margin", () => {
  expect(dueForSettle({ status: "proposed", proposed_at: 0, demo: 1 }, 359)).toBe(false);
  expect(dueForSettle({ status: "proposed", proposed_at: 0, demo: 1 }, 360)).toBe(true);
  expect(dueForSettle({ status: "proposed", proposed_at: 0, demo: 0 }, 7259)).toBe(false);
  expect(dueForSettle({ status: "proposed", proposed_at: 0, demo: 0 }, 7260)).toBe(true);
  expect(dueForSettle({ status: "proposed", proposed_at: null, demo: 0 }, 99_999)).toBe(false);
});
test("onchain state maps to engine status", () => {
  expect(statusFromState(3)).toBe("settled");
  expect(statusFromState(4)).toBe("void");
  expect(statusFromState(1)).toBe("open"); // assertion rejected → propose again
  expect(statusFromState(2)).toBe("proposed"); // still disputed
});
