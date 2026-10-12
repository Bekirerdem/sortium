import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { WalletError, balanceOf, connectInjected, connectInstant, disconnect, hasInstant, resumeInjected, type Eip1193 } from "../lib/chain";

export type Wallet = ReturnType<typeof useWallet>;
export type Discovered = { id: string; name: string; icon?: string; provider: Eip1193 };

const LAST = "sortium.wallet";
const remember = (v: string | null) => {
  try {
    if (v) localStorage.setItem(LAST, v);
    else localStorage.removeItem(LAST);
  } catch {
    // only a convenience
  }
};
const recall = () => {
  try {
    return localStorage.getItem(LAST);
  } catch {
    return null;
  }
};

/** Browser wallets announced through EIP-6963, with window.ethereum as the fallback for older extensions. */
function useDiscovered() {
  const [list, setList] = useState<Discovered[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const { info, provider } = (e as CustomEvent<{ info: { uuid: string; name: string; icon: string; rdns: string }; provider: Eip1193 }>).detail;
      setList((l) => (l.some((w) => w.id === info.rdns) ? l : [...l, { id: info.rdns, name: info.name, icon: info.icon, provider }]));
    };
    window.addEventListener("eip6963:announceProvider", on);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    const t = setTimeout(() => {
      const eth = (window as unknown as { ethereum?: Eip1193 }).ethereum;
      setList((l) => (l.length || !eth ? l : [{ id: "injected", name: "Browser wallet", provider: eth }]));
    }, 400);
    return () => {
      window.removeEventListener("eip6963:announceProvider", on);
      clearTimeout(t);
    };
  }, []);
  return list;
}

export function useWallet() {
  const wallets = useDiscovered();
  const [address, setAddress] = useState<Address | null>(null);
  const [kind, setKind] = useState<"instant" | "injected" | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);
  const [error, setError] = useState<WalletError | Error | null>(null);
  const [picking, setPicking] = useState(false);

  const refresh = useCallback(async () => {
    if (address) setBalance(await balanceOf(address).catch(() => 0n));
  }, [address]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15_000);
    return () => clearInterval(t);
  }, [refresh]);

  // come back to the wallet used last time, without prompting
  useEffect(() => {
    if (address) return;
    const last = recall();
    if (last === "instant" && hasInstant()) {
      setAddress(connectInstant());
      setKind("instant");
      return;
    }
    const w = wallets.find((x) => x.id === last);
    if (w) resumeInjected(w.provider, w.name).then((a) => a && (setAddress(a), setKind("injected")));
  }, [wallets, address]);

  const pickInjected = async (w: Discovered) => {
    try {
      setError(null);
      const a = await connectInjected(w.provider, w.name);
      setAddress(a);
      setKind("injected");
      remember(w.id);
      setPicking(false);
    } catch (e) {
      setError(e as Error);
    }
  };

  const pickInstant = () => {
    setError(null);
    setAddress(connectInstant());
    setKind("instant");
    remember("instant");
    setPicking(false);
  };

  const logout = () => {
    disconnect();
    remember(null);
    setAddress(null);
    setKind(null);
    setBalance(0n);
  };

  return {
    address, kind, balance, error, wallets, picking, refresh,
    login: () => { setError(null); setPicking(true); },
    close: () => setPicking(false),
    pickInjected, pickInstant, logout,
    clearError: () => setError(null),
  };
}
