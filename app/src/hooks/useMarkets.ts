import { useEffect, useState } from "react";
import { listMarkets, type ApiMarket } from "../lib/api";

export function useMarkets() {
  const [markets, setMarkets] = useState<ApiMarket[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      listMarkets("all")
        .then((m) => alive && (setMarkets(m), setError(null)))
        .catch((e) => alive && setError(String(e)));
    load();
    const t = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return { markets, error };
}
