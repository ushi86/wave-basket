import { AnonRpcWorker } from "@anon-rpc/browser-harness";
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  http,
  type Abi,
  type Address,
  type EIP1193Provider,
  type Hash,
} from "viem";
import type { Deployment } from "./config";
import { PrivateRpc } from "./privacy";
export type PrivacyState = "booting" | "ready" | "failed" | "local";
export type WalletProvider = EIP1193Provider & {
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
};
declare global {
  interface Window {
    ethereum?: WalletProvider;
  }
}
export function createChainSession(
  config: Deployment,
  update: (state: PrivacyState, error?: string) => void,
) {
  const local = config.chainId === 31337;
  const rpcUrl =
    config.rpcUrl ||
    import.meta.env.VITE_SEPOLIA_RPC_URL ||
    "https://ethereum-sepolia-rpc.publicnode.com";
  const bootstrapUrl =
    config.bootstrapRpcUrl || import.meta.env.VITE_BOOTSTRAP_RPC_URL || rpcUrl;
  const chain = defineChain({
    id: config.chainId,
    name: config.name,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
    blockExplorers: local
      ? undefined
      : { default: { name: "Etherscan", url: "https://sepolia.etherscan.io" } },
  });
  let worker: AnonRpcWorker | undefined;
  let status: PrivacyState = local ? "local" : "booting";
  let id = 0;
  let stopped = false;
  const bootStarted = performance.now();
  let bootTimeMs: number | undefined;
  const meter = new PrivateRpc({
    anonymous: async (input, init) => {
      if (status !== "ready" || !worker)
        throw new Error("Private reads are not ready");
      return worker.fetch(
        input instanceof Request ? input.url : String(input),
        init,
      );
    },
    direct: fetch.bind(globalThis),
  });
  const fetchFn = local ? meter.readDirectlyOnce : meter.fetch;
  const client = createPublicClient({
    chain,
    transport: http(rpcUrl, {
      fetchFn,
      retryCount: 0,
      timeout: 30_000,
      batch: { wait: 20, batchSize: 50 },
    }),
    batch: { multicall: false },
    cacheTime: 15_000,
  });
  const bootstrap = {
    request: async ({
      method,
      params,
    }: {
      method: string;
      params?: unknown[];
    }) => {
      const response = await meter.bootstrap(bootstrapUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: ++id,
          method,
          params: params || [],
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.result;
    },
  };
  let timeout: ReturnType<typeof setTimeout> | undefined;
  if (!local) {
    try {
      worker = new AnonRpcWorker({
        address:
          config.anonSpecifier ||
          import.meta.env.VITE_ANON_SPECIFIER ||
          "0xDf5Db854BA75B52a4bF1a250a93D8d25cB982b2d",
        preExisting: { rpcProvider: bootstrap },
      });
      timeout = setTimeout(() => {
        if (!stopped && status === "booting") {
          status = "failed";
          worker?.close();
          update(
            "failed",
            "Private connection timed out. No direct fallback was used.",
          );
        }
      }, 60_000);
      worker.ready
        .then(() => {
          if (stopped || status !== "booting") return;
          clearTimeout(timeout);
          status = "ready";
          bootTimeMs = performance.now() - bootStarted;
          update(status);
        })
        .catch((error) => {
          if (stopped) return;
          clearTimeout(timeout);
          status = "failed";
          update(status, String(error));
        });
    } catch (error) {
      status = "failed";
      queueMicrotask(() => update("failed", String(error)));
    }
  } else queueMicrotask(() => update("local"));
  async function connect() {
    const provider = window.ethereum;
    if (!provider && local) {
      const wallet = createWalletClient({ chain, transport: http(rpcUrl) });
      const [account] = await wallet.getAddresses();
      if (!account) throw new Error("Local node has no demo account");
      return { wallet, account };
    }
    if (!provider) throw new Error("Install an Ethereum wallet to connect");
    const wallet = createWalletClient({ chain, transport: custom(provider) });
    try {
      await wallet.switchChain({ id: chain.id });
    } catch (error) {
      if ((error as { code?: number }).code !== 4902) throw error;
      await wallet.addChain({ chain });
      await wallet.switchChain({ id: chain.id });
    }
    const [account] = await wallet.requestAddresses();
    if (!account) throw new Error("Wallet did not return an account");
    return { wallet, account };
  }
  async function send(
    address: Address,
    abi: Abi,
    functionName: string,
    args: readonly unknown[],
    account: Address,
  ): Promise<Hash> {
    const provider = window.ethereum;
    if (!provider && !local) throw new Error("Wallet is disconnected");
    const wallet = createWalletClient({
      chain,
      transport: provider ? custom(provider) : http(rpcUrl),
    });
    if ((await wallet.getChainId()) !== chain.id)
      throw new Error(`Switch your wallet to ${chain.name}`);
    const accounts = await wallet.getAddresses();
    if (!accounts.some((a) => a.toLowerCase() === account.toLowerCase()))
      throw new Error("Wallet account changed. Connect again.");
    await client.simulateContract({
      address,
      abi,
      functionName,
      args,
      account,
    });
    return wallet.writeContract({
      address,
      abi,
      functionName,
      args,
      account,
      chain,
    });
  }
  async function readBlockDirectlyOnce() {
    const response = await meter.readDirectlyOnce(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: ++id,
        method: "eth_blockNumber",
        params: [],
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return BigInt(data.result).toString();
  }
  return {
    get bootTimeMs() {
      return bootTimeMs;
    },
    config,
    chain,
    client,
    meter,
    connect,
    send,
    readBlockDirectlyOnce,
    close() {
      stopped = true;
      clearTimeout(timeout);
      worker?.close();
    },
  };
}
export type ChainSession = ReturnType<typeof createChainSession>;
