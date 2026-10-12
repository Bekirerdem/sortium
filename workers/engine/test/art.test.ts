import { expect, test } from "bun:test";
import { appleIdsByCountry, withArt } from "../src/art";

type M = { templateKey: string; meta: Record<string, unknown> };
type C = { art?: string };
const am: M = { templateKey: "AM_TOP_COUNTRY", meta: { cc: "tr", candidates: [{ id: "11", label: "a" }, { id: "22", label: "b" }] } };
const amUs: M = { templateKey: "AM_TOP_COUNTRY", meta: { cc: "us", candidates: [{ id: "33", label: "c" }] } };
const yt: M = { templateKey: "YT_TOP_COUNTRY", meta: { candidates: [{ id: "vid1", label: "v" }] } };
const views: M = { templateKey: "YT_VIEWS_24H", meta: { videoId: "vid9", bounds: [1, 2, 3] } };

test("groups Apple track ids by storefront, since lookups are per country", () => {
  expect(appleIdsByCountry([am, yt, am, amUs])).toEqual({ tr: ["11", "22"], us: ["33"] });
});

test("adds artwork: Apple from the storefront lookup (600px), YouTube from the thumbnail URL", () => {
  const lookup = new Map([["tr:11", "https://x/100x100bb.jpg"]]);
  const [a, y, v] = withArt([am, yt, views], lookup);
  expect((a.meta.candidates as C[])[0].art).toBe("https://x/600x600bb.jpg");
  expect((a.meta.candidates as C[])[1].art).toBeUndefined();
  expect((y.meta.candidates as C[])[0].art).toBe("https://i.ytimg.com/vi/vid1/hqdefault.jpg");
  expect(v.meta.art).toBe("https://i.ytimg.com/vi/vid9/hqdefault.jpg");
});
