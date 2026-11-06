// All data in this module is synthetic test-only data. Never export it as project evidence.
import {
  encodeAbiParameters,
  encodeEventTopics,
  parseAbiParameters,
  type Abi,
  type Address,
} from "viem";
import { receiptAbi, SEPOLIA_MANAGER } from "./canonical";
import { digest, type EvidenceIO, type EvidenceManifest } from "./evidence";
const address = (n: number): Address => `0x${n.toString(16).padStart(40, "0")}`;
export function syntheticFixture() {
  const commit = "1".repeat(40);
  const repository = "https://github.com/example/wave-test-fixture";
  const deployment = {
    chainId: 11155111,
    factory: address(1),
    flagship: address(2),
    receiver: address(3),
    forwarder: address(4),
    adapter: address(5),
    hook: address(6),
    poolManager: SEPOLIA_MANAGER,
    oracleMode: "demo",
  };
  const kinds = [
    "createBasket",
    "deposit",
    "hookToward",
    "hookAway",
    "rebalance",
    "redeemUsdc",
    "redeemInKind",
  ];
  const hashes = Object.fromEntries(
    kinds.map((kind, index) => [kind, `0x${String(index + 1).repeat(64)}`]),
  );
  const poolId = `0x${"88".repeat(32)}`;
  const event = (
    name: string,
    args: Record<string, unknown>,
    parameters: string,
    values: readonly unknown[],
    emitter: string,
  ) => ({
    address: emitter,
    topics: encodeEventTopics({
      abi: receiptAbi as Abi,
      eventName: name,
      args,
    }),
    data: encodeAbiParameters(parseAbiParameters(parameters), values),
  });
  const logs: Record<string, unknown[]> = {
    createBasket: [
      event(
        "BasketCreated",
        { vault: deployment.flagship, creator: address(7) },
        "address[],uint16[],uint16",
        [[address(8), address(9)], [5000, 5000], 1000],
        deployment.factory,
      ),
    ],
    deposit: [
      event(
        "Deposited",
        { user: address(7), receiver: address(7) },
        "uint256,uint256,uint256",
        [1000n, 999n, 999n],
        deployment.flagship,
      ),
    ],
    hookToward: [
      event(
        "Swap",
        { id: poolId, sender: deployment.adapter },
        "int128,int128,uint160,uint128,int24,uint24",
        [-10n, 9n, 1n, 1n, 0, 500],
        deployment.poolManager,
      ),
      event(
        "HookFeeApplied",
        { id: poolId },
        "uint256,uint256,bool,uint24",
        [102n, 100n, true, 500],
        deployment.hook,
      ),
    ],
    hookAway: [
      event(
        "Swap",
        { id: poolId, sender: deployment.adapter },
        "int128,int128,uint160,uint128,int24,uint24",
        [9n, -10n, 1n, 1n, 0, 10000],
        deployment.poolManager,
      ),
      event(
        "HookFeeApplied",
        { id: poolId },
        "uint256,uint256,bool,uint24",
        [102n, 100n, false, 10000],
        deployment.hook,
      ),
    ],
    rebalance: [
      event(
        "Rebalanced",
        { id: 0n },
        "uint16[],uint16[],uint256,uint256,uint256,bytes32",
        [
          [4000, 3500, 2500],
          [4500, 3000, 2500],
          1000n,
          999n,
          500n,
          `0x${"aa".repeat(32)}`,
        ],
        deployment.flagship,
      ),
      event(
        "ReportAccepted",
        { vault: deployment.flagship },
        "uint64,uint64,bytes32",
        [1n, 1n, `0x${"aa".repeat(32)}`],
        deployment.receiver,
      ),
    ],
    redeemUsdc: [
      event(
        "Redeemed",
        { user: address(7), receiver: address(7) },
        "uint256,uint256,uint256",
        [1n, 1n, 1n],
        deployment.flagship,
      ),
    ],
    redeemInKind: [
      event(
        "RedeemedInKind",
        { user: address(7), receiver: address(7) },
        "uint256,uint256[],uint256",
        [1n, [1n, 1n], 1n],
        deployment.flagship,
      ),
    ],
  };
  const targets: Record<string, string> = {
    createBasket: deployment.factory,
    deposit: deployment.flagship,
    hookToward: deployment.adapter,
    hookAway: deployment.adapter,
    rebalance: deployment.forwarder,
    redeemUsdc: deployment.flagship,
    redeemInKind: deployment.flagship,
  };
  const receipts = Object.fromEntries(
    kinds.map((kind) => [
      hashes[kind],
      {
        transactionHash: hashes[kind],
        status: "0x1",
        blockHash: `0x${"ab".repeat(32)}`,
        blockNumber: "0x1",
        to: targets[kind],
        logs: logs[kind],
      },
    ]),
  );
  const files = new Map<string, Uint8Array>();
  const write = (path: string, text: string) =>
    files.set(path, new TextEncoder().encode(text));
  write(
    "FEEDBACK.md",
    "Synthetic test-only Uniswap v4 developer feedback. This fixture is not a submission artifact. ".repeat(
      3,
    ),
  );
  const quote =
    "Synthetic test-only README claim. This fixture never represents a live project.";
  const id = `claim-${digest(quote).slice(0, 12)}`;
  write("README.md", `# Synthetic fixture\n\n${quote}\n`);
  write(
    "EVIDENCE.md",
    `| Claim | Status | Evidence link | Date/time IST |\n| --- | --- | --- | --- |\n| ${id} | Proven | docs/check.log | 2026-11-06T12:00:00+05:30 |\n`,
  );
  write(
    "docs/check.log",
    "Synthetic test-only verification artifact, never live evidence.",
  );
  write("deployments/sepolia.json", JSON.stringify(deployment));
  const creLog = `Synthetic test fixture only. cre workflow simulate . --broadcast\nTransaction ${hashes.rebalance}\nReceiver accepted; vault rebalanced.\n`;
  write("docs/cre/simulate.log", creLog);
  write(
    "docs/cre/capture.json",
    JSON.stringify({
      execution: "cli-broadcast",
      environment: "sepolia",
      exitCode: 0,
      releaseCommit: commit,
      transactionHash: hashes.rebalance,
      logSha256: digest(creLog),
      argv: ["workflow", "simulate", ".", "--broadcast"],
      cliVersion: "cre 1.0.0",
      startedAt: "2026-11-06T06:00:00Z",
      finishedAt: "2026-11-06T06:01:00Z",
    }),
  );
  write(
    "docs/PRIVACY.md",
    "Synthetic test-only privacy report, never a live measurement.",
  );
  write(
    "docs/privacy.json",
    JSON.stringify({
      environment: "sepolia",
      scope: "full-lifecycle",
      releaseCommit: commit,
      workerSpecifier: address(10),
      harnessVersion: "0.4.0",
      startupSeconds: 4.4,
      routes: { anon: 40, bootstrap: 2, direct: 0, failed: 0, attempted: 42 },
      coveragePercent: (40 / 42) * 100,
      methods: {
        "anon:eth_call": { attempted: 40, successful: 40 },
        "bootstrap:eth_call": { attempted: 2, successful: 2 },
      },
      lifecycle: hashes,
      failureDemo: {
        privateReadFailed: true,
        directBefore: 0,
        directAfter: 0,
        artifact: "docs/check.log",
      },
    }),
  );
  files.set("docs/privacy.jpg", new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));
  const manifest: EvidenceManifest = {
    schemaVersion: 1,
    release: { repository, commit },
    deployment: "deployments/sepolia.json",
    contractLinks: [
      "_beforeInitialize",
      "_beforeSwap",
      "unlockCallback",
      "onReport",
      "runRebalance",
      "createChainSession",
    ].map((symbol) => ({
      symbol,
      url: `${repository}/blob/${commit}/contracts/src/${symbol}.sol#L1`,
    })),
    transactions: kinds.map((kind) => ({
      kind,
      hash: hashes[kind],
      environment: "sepolia",
    })),
    cre: {
      log: "docs/cre/simulate.log",
      capture: "docs/cre/capture.json",
      transactionHash: hashes.rebalance,
    },
    privacy: {
      report: "docs/PRIVACY.md",
      data: "docs/privacy.json",
      screenshot: "docs/privacy.jpg",
    },
    gates: Object.fromEntries(
      [
        "eligibility",
        "healthyInKind",
        "approvedHook",
        "nonceReceiver",
        "rebalanceSafety",
        "securityReview",
      ].map((gate) => [gate, { status: "Proven", artifact: "docs/check.log" }]),
    ),
    claims: [
      {
        id,
        quote,
        status: "Proven",
        artifacts: ["docs/check.log"],
        observedAtIST: "2026-11-06T12:00:00+05:30",
      },
    ],
  };
  let rpcOverride:
    ((url: string, method: string, params: unknown[]) => unknown) | undefined;
  const io: EvidenceIO = {
    read: async (path) => files.get(path),
    fetch: async (url, init) => {
      if (url === `https://api.github.com/repos/example/wave-test-fixture`)
        return Response.json({
          private: false,
          full_name: "example/wave-test-fixture",
        });
      if (url.includes("/commits/")) return Response.json({ sha: commit });
      if (url.startsWith("https://raw.githubusercontent.com/"))
        return new Response(
          `function ${url.split("/").pop()!.replace(".sol", "")}() {}`,
        );
      const request = JSON.parse(String(init?.body));
      let result: unknown;
      if (rpcOverride)
        result = rpcOverride(url, request.method, request.params);
      if (result === undefined) {
        if (request.method === "eth_chainId") result = "0xaa36a7";
        else if (request.method === "eth_getTransactionReceipt")
          result = receipts[request.params[0]] ?? null;
        else if (request.method === "eth_getBlockByNumber")
          result = { hash: `0x${"ab".repeat(32)}` };
        else if (request.method === "eth_call") result = poolId;
        else
          throw new Error(
            `Unsupported synthetic RPC method: ${request.method}`,
          );
      }
      return Response.json({ jsonrpc: "2.0", id: request.id, result });
    },
  };
  return {
    manifest,
    io,
    files,
    write,
    receipts,
    overrideRpc: (override: typeof rpcOverride) => {
      rpcOverride = override;
    },
  };
}
