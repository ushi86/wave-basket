import { useEffect, useState } from "react";
import type { Address, Hash } from "viem";
import {
  adapterAbi,
  factoryAbi,
  hookAbi,
  tokenAbi,
  vaultAbi,
} from "../../../shared/abi";
import { loadBaskets, type Basket } from "../lib/baskets";
import {
  createChainSession,
  type ChainSession,
  type PrivacyState,
} from "../lib/chain";
import { loadDeployment, type Deployment } from "../lib/config";
import { errorText } from "../lib/format";
import type { PrivacySnapshot } from "../lib/privacy";
const emptyMeter: PrivacySnapshot = {
  anon: 0,
  bootstrap: 0,
  direct: 0,
  failed: 0,
  attempted: 0,
  coverage: 0,
  byMethod: {},
};
type Transaction = {
  label: string;
  status: "waiting" | "pending" | "confirmed" | "error";
  hash?: Hash;
  error?: string;
};
export function useWaveProtocol() {
  const [session, setSession] = useState<ChainSession>();
  const [config, setConfig] = useState<Deployment>();
  const [privacy, setPrivacy] = useState<PrivacyState>("booting");
  const [privacyError, setPrivacyError] = useState("");
  const [meter, setMeter] = useState(emptyMeter);
  const [account, setAccount] = useState<Address>();
  const [baskets, setBaskets] = useState<Basket[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tx, setTx] = useState<Transaction>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [walletBalance, setWalletBalance] = useState<bigint>();
  const [hookSnapshot, setHookSnapshot] =
    useState<readonly [bigint, bigint, boolean, number, number]>();
  const [hookError, setHookError] = useState("");
  useEffect(() => {
    let alive = true;
    let current: ChainSession | undefined;
    loadDeployment()
      .then((c) => {
        if (!alive) return;
        setConfig(c);
        current = createChainSession(c, (state, message) => {
          if (alive) {
            setPrivacy(state);
            setPrivacyError(message || "");
          }
        });
        setSession(current);
      })
      .catch((e) => setError(errorText(e)));
    return () => {
      alive = false;
      current?.close();
    };
  }, []);
  useEffect(() => {
    if (!session) return;
    setMeter(session.meter.snapshot());
    return session.meter.subscribe(() => setMeter(session.meter.snapshot()));
  }, [session]);
  useEffect(() => {
    const provider = window.ethereum;
    if (!provider?.on) return;
    const reset = () => {
      setAccount(undefined);
      setWalletBalance(undefined);
      setRefreshKey((k) => k + 1);
    };
    provider.on("accountsChanged", reset);
    provider.on("chainChanged", reset);
    return () => {
      provider.removeListener?.("accountsChanged", reset);
      provider.removeListener?.("chainChanged", reset);
    };
  }, []);
  useEffect(() => {
    if (!session || !config?.factory || !["ready", "local"].includes(privacy))
      return;
    let alive = true;
    let busy = false;
    const refresh = async () => {
      if (busy) return;
      busy = true;
      setLoading(true);
      try {
        const data = await loadBaskets(session, account);
        if (alive) {
          setBaskets(data);
          setError("");
        }
        if (config.hook) {
          try {
            const snapshot = await session.client.readContract({
              address: config.hook,
              abi: hookAbi,
              functionName: "poolSnapshot",
            });
            if (alive) {
              setHookSnapshot(snapshot);
              setHookError("");
            }
          } catch (e) {
            if (alive) {
              setHookSnapshot(undefined);
              setHookError(errorText(e));
            }
          }
        }
        if (account) {
          const usdc = config.tokens.find((t) => t.symbol === "mUSDC");
          if (usdc) {
            const balance = await session.client.readContract({
              address: usdc.address,
              abi: tokenAbi,
              functionName: "balanceOf",
              args: [account],
            });
            if (alive) setWalletBalance(balance);
          }
        }
      } catch (e) {
        if (alive) setError(errorText(e));
      } finally {
        busy = false;
        if (alive) setLoading(false);
      }
    };
    refresh();
    const interval = setInterval(refresh, 15_000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [session, config, privacy, account, refreshKey]);
  const connect = async () => {
    try {
      if (!session) throw new Error("Configuration is still loading");
      const { account } = await session.connect();
      setAccount(account);
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  };
  const run = async (
    label: string,
    work: (
      submit: (
        address: Address,
        abi:
          | typeof tokenAbi
          | typeof vaultAbi
          | typeof factoryAbi
          | typeof adapterAbi,
        fn: string,
        args: readonly unknown[],
      ) => Promise<void>,
    ) => Promise<void>,
  ) => {
    if (!session || !account) {
      setError("Connect a wallet first");
      return;
    }
    if (tx?.status === "pending" || tx?.status === "waiting") return;
    setTx({ label, status: "waiting" });
    setError("");
    try {
      await work(async (address, abi, fn, args) => {
        setTx({ label: `${label} · ${fn}`, status: "waiting" });
        const hash = await session.send(address, abi, fn, args, account);
        setTx({ label, status: "pending", hash });
        const receipt = await session.client.waitForTransactionReceipt({
          hash,
          timeout: 180_000,
        });
        if (receipt.status !== "success")
          throw new Error("Transaction reverted");
        session.recordTransaction(fn, receipt);
        setTx({ label, status: "confirmed", hash });
      });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setTx((t) => ({ ...t!, status: "error", error: errorText(e) }));
    }
  };

  const busy = tx?.status === "pending" || tx?.status === "waiting";
  const ready = Boolean(
    config?.factory && ["ready", "local"].includes(privacy),
  );
  const usdc = config?.tokens.find((t) => t.symbol === "mUSDC");
  const statusLabel =
    privacy === "local"
      ? "Local · direct reads"
      : privacy === "ready"
        ? meter.direct
          ? "Direct read used"
          : "Private reads active"
        : privacy === "failed"
          ? "Private reads unavailable"
          : "Connecting privately";

  return {
    session,
    config,
    privacy,
    privacyError,
    meter,
    account,
    baskets,
    error,
    setError,
    loading,
    tx,
    setTx,
    setRefreshKey,
    walletBalance,
    hookSnapshot,
    hookError,
    connect,
    run,
    busy,
    ready,
    usdc,
    statusLabel,
  };
}
export type WaveProtocolModel = ReturnType<typeof useWaveProtocol>;
