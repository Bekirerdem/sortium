import { useEffect, useState } from "react";

/** Loads `fn` now and every `ms`; keeps the last good value when a refresh fails. */
export function usePoll<T>(fn: () => Promise<T>, ms: number): T | null {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => fn().then((v) => alive && setValue(v)).catch(() => {});
    load();
    const t = setInterval(load, ms);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms]);
  return value;
}
