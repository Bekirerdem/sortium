import { amTop, amTopDemo } from "./templates/amTop";
import { ytTop } from "./templates/ytTop";
import { ytViews } from "./templates/ytViews";
import type { Template } from "./types";

export * from "./types";
export * from "./abi";

export const TEMPLATES: Record<string, Template> = {
  [amTop.key]: amTop,
  [amTopDemo.key]: amTopDemo,
  [ytTop.key]: ytTop,
  [ytViews.key]: ytViews,
};
