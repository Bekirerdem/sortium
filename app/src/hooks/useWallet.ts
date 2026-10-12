import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { balanceOf, connect } from "../lib/chain";

export type Wallet = ReturnType<typeof useWallet>;

export function useWallet() {
  const [address, setAddress] = useState<Address | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (address) setBalance(await balanceOf(address).catch(() => 0n));
  }, [address]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15_000);
    return () => clearInterval(t);
  }, [refresh]);

  const login = async () => {
    try {
      setError(null);
      setAddress(await connect());
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return { address, balance, error, login, refresh };
}
