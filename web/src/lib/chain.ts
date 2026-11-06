import { AnonRpcWorker } from "@anon-rpc/browser-harness";
import {
  parseEventLogs,
  type TransactionReceipt,
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
import { hookAbi } from "../../../shared/abi";
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
  const startedAt = new Date().toISOString();
  const lifecycle: Record<string, Hash> = {};
  const observations: Array<{
    functionName: string;
    hash: Hash;
    blockNumber: string;
    observedAt: string;
  }> = [];
  let failureDemo:
    | {
        privateReadFailed: boolean;
        directBefore: number;
        directAfter: number;
        observedAt: string;
      }
    | undefined;

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
  function recordTransaction(
    functionName: string,
    receipt: TransactionReceipt,
  ) {
    if (receipt.status !== "success") return;
    observations.push({
      functionName,
      hash: receipt.transactionHash,
      blockNumber: receipt.blockNumber.toString(),
      observedAt: new Date().toISOString(),
    });
    const kinds: Record<string, string> = {
      createBasket: "createBasket",
      deposit: "deposit",
      redeem: "redeemUsdc",
      redeemInKind: "redeemInKind",
    };
    if (kinds[functionName])
      lifecycle[kinds[functionName]] = receipt.transactionHash;
    if (functionName === "swap")
      for (const log of parseEventLogs({
        abi: hookAbi,
        logs: receipt.logs,
        eventName: "HookFeeApplied",
        strict: true,
      })) {
        if (log.address.toLowerCase() !== config.hook?.toLowerCase()) continue;
        const { spot18, nav18, sellingFund, fee } = log.args;
        const toward =
          spot18 > nav18 ? sellingFund : spot18 < nav18 ? !sellingFund : false;
        if (toward && fee === 500)
          lifecycle.hookToward = receipt.transactionHash;
        if (!toward && fee === 10000)
          lifecycle.hookAway = receipt.transactionHash;
      }
  }
  function recordRebalance(hash: Hash, timestamp: bigint) {
    if (Number(timestamp) >= Math.floor(Date.parse(startedAt) / 1000))
      lifecycle.rebalance = hash;
  }
  async function testFailClosed() {
    if (status !== "ready")
      throw new Error(
        "Start a private worker before testing its failure behavior",
      );
    const directBefore = meter.snapshot().direct;
    status = "failed";
    worker?.close();
    clearTimeout(timeout);
    update(
      "failed",
      "Worker stopped for a fail-closed test. Reload to reconnect privately.",
    );
    let privateReadFailed = false;
    try {
      await client.getBlockNumber({ cacheTime: 0 });
    } catch {
      privateReadFailed = true;
    }
    failureDemo = {
      privateReadFailed,
      directBefore,
      directAfter: meter.snapshot().direct,
      observedAt: new Date().toISOString(),
    };
    return { ...failureDemo };
  }
  function exportMeasurement(intendedArtifactPath: string) {
    const snapshot = meter.snapshot();
    const required = [
      "createBasket",
      "deposit",
      "hookToward",
      "hookAway",
      "rebalance",
      "redeemUsdc",
      "redeemInKind",
    ];
    const complete =
      required.every((kind) => lifecycle[kind]) &&
      !config.workingTreeDirty &&
      Boolean(config.codeCommit);
    return {
      schemaVersion: 1,
      environment: local ? "local" : "sepolia",
      scope:
        complete && !local
          ? "full-lifecycle"
          : config.factory
            ? "partial-session"
            : "worker-only",
      verification: "unverified-browser-observation",
      releaseCommit: config.codeCommit ?? null,
      workingTreeDirty: config.workingTreeDirty ?? null,
      startedAt,
      finishedAt: new Date().toISOString(),
      workerSpecifier: local
        ? null
        : config.anonSpecifier ||
          import.meta.env.VITE_ANON_SPECIFIER ||
          "0xDf5Db854BA75B52a4bF1a250a93D8d25cB982b2d",
      harnessVersion: "0.4.0",
      startupSeconds: bootTimeMs === undefined ? null : bootTimeMs / 1000,
      rpcOrigin: new URL(rpcUrl).origin,
      mockComponents: {
        tokens: config.mockTokens ?? true,
        oracleMode: config.oracleMode,
        receiverMode: config.receiverMode ?? "unconfigured",
      },
      routes: {
        anon: snapshot.anon,
        bootstrap: snapshot.bootstrap,
        direct: snapshot.direct,
        failed: snapshot.failed,
        attempted: snapshot.attempted,
      },
      coveragePercent: snapshot.coverage,
      methods: snapshot.byMethod,
      lifecycle: { ...lifecycle },
      observations: [...observations],
      failureDemo: failureDemo
        ? { ...failureDemo, artifact: intendedArtifactPath }
        : null,
    };
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
    recordTransaction,
    recordRebalance,
    testFailClosed,
    exportMeasurement,
    close() {
      stopped = true;
      clearTimeout(timeout);
      worker?.close();
    },
  };
}
export type ChainSession = ReturnType<typeof createChainSession>;
