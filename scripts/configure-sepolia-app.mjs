// Selects an already verified deployment. No signing, broadcasts, CRE changes or deployment.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const deployment = JSON.parse(
  readFileSync(resolve(root, "deployments/sepolia.json"), "utf8"),
);
const proofPath = deployment.deploymentReceiptVerification;
if (
  typeof proofPath !== "string" ||
  !/^docs\/readiness\/[\w-]+\/verified-deployment\.json$/.test(proofPath)
)
  throw Error("Verified public deployment proof required");
const proof = JSON.parse(readFileSync(resolve(root, proofPath), "utf8"));
if (
  !proof.verified ||
  proof.errors.length ||
  proof.receipts.length !== 42 ||
  proof.contracts.length !== 12 ||
  deployment.chainId !== 11155111 ||
  deployment.oracleMode !== "chainlink" ||
  deployment.receiverMode !== "simulation"
)
  throw Error("Confirmed Sepolia deployment/configuration required");
for (const field of [
  "factory",
  "flagship",
  "adapter",
  "hook",
  "receiver",
  "registry",
  "forwarder",
  "poolManager",
])
  if (deployment[field]?.toLowerCase() !== proof.manifest[field]?.toLowerCase())
    throw Error("Manifest/proof address mismatch: " + field);
if (
  proof.receipts.some(
    (r) =>
      r.providers.length !== 2 ||
      r.providers.some(
        (p) => p.status !== "0x1" || p.blockHash !== r.blockHash,
      ),
  )
)
  throw Error("Corroborated successful receipts required");
const definitions = [
  ["usdc", "mUSDC", "usd-coin"],
  ["eth", "mWETH", "ethereum"],
  ["btc", "mWBTC", "bitcoin"],
  ["link", "mLINK", "chainlink"],
];
const tokens = definitions.map(([key, symbol, marketId]) => {
  const asset = proof.state.find((s) => s.label === key + ".registry")?.value;
  if (
    !asset ||
    asset[0].toLowerCase() !== deployment[key + "Feed"].toLowerCase() ||
    asset[6] !== true ||
    deployment[key + "FeedMock"] !== false
  )
    throw Error("Verified real-feed asset configuration required: " + key);
  return {
    address: deployment[key],
    symbol,
    decimals: asset[2],
    feed: deployment[key + "Feed"],
    feedMode: "chainlink",
    marketId,
  };
});
const sourcePaths = [
  "contracts/src",
  "contracts/script",
  "cre/src",
  "shared",
  "web/src",
  "scripts",
  "package.json",
  "package-lock.json",
];
const manifest = {
  ...deployment,
  rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  bootstrapRpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  anonSpecifier: "0xDf5Db854BA75B52a4bF1a250a93D8d25cB982b2d",
  tokens,
  codeCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
  workingTreeDirty: Boolean(
    execFileSync(
      "git",
      ["status", "--porcelain", "--untracked-files=all", "--", ...sourcePaths],
      { cwd: root, encoding: "utf8" },
    ).trim(),
  ),
  transactionHashes: proof.receipts.map((r) => r.transactionHash),
  verification: "deployment-corroborated-on-publicnode-and-tenderly",
};
writeFileSync(
  resolve(root, "web/public/deployment.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
const envPath = resolve(root, "web/.env.local");
const lines = (existsSync(envPath) ? readFileSync(envPath, "utf8") : "")
  .split(/\r?\n/)
  .filter((l) => l.trim() && !/^\s*VITE_DEPLOYMENT_URL\s*=/.test(l));
lines.push("VITE_DEPLOYMENT_URL=/deployment.json");
writeFileSync(envPath, lines.join("\n") + "\n", { mode: 0o600 });
console.log(
  "Selected verified Sepolia flagship " +
    manifest.flagship +
    ". Anon-RPC 0.4.0 remains default; no wallet action or transaction performed.",
);
