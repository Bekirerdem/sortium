import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { getMarket, type ApiMarket } from "../lib/api";
import { readMarket, type ChainMarket } from "../lib/chain";

export function useMarket(id: number, user: Address | null) {
  const [meta, setMeta] = useState<ApiMarket | null>(null);
  const [chain, setChain] = useState<ChainMarket | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([getMarket(id), readMarket(BigInt(id), user ?? undefined)]);
      setMeta(m);
      setChain(c);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [id, user]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  return { meta, chain, error, reload: load };
}
