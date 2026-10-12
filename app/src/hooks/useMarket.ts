import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { getMarket, type ApiMarket } from "../lib/api";
import { readMarket, type ChainMarket } from "../lib/chain";

export function useMarket(id: number, user: Address | null) {
  const [meta, setMeta] = useState<{ id: number; v: ApiMarket } | null>(null);
  const [chain, setChain] = useState<{ id: number; v: ChainMarket } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([getMarket(id), readMarket(BigInt(id), user ?? undefined)]);
      setMeta({ id, v: m });
      setChain({ id, v: c });
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

  // values that belong to a previous id are never shown under the new one
  return {
    meta: meta?.id === id ? meta.v : null,
    chain: chain?.id === id ? chain.v : null,
    error,
    reload: load,
  };
}
