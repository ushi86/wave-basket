import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { root } from "./foundry.mjs";
export function writeManifest(sourcePath, outputPath, rpcUrl) {
  const deployed = JSON.parse(readFileSync(sourcePath, "utf8"));
  const broadcastPath = resolve(
    root,
    `contracts/broadcast/DeployDemo.s.sol/${deployed.chainId}/run-latest.json`,
  );
  if (existsSync(broadcastPath)) {
    const broadcast = JSON.parse(readFileSync(broadcastPath, "utf8"));
    const blocks = (broadcast.receipts || [])
      .filter((receipt) => receipt.blockNumber)
      .map((receipt) => BigInt(receipt.blockNumber));
    if (blocks.length)
      deployed.deployBlock = blocks
        .reduce((a, b) => (a < b ? a : b))
        .toString();
  }
  const definitions = [
    { key: "usdc", symbol: "mUSDC", decimals: 6, marketId: "usd-coin" },
    { key: "eth", symbol: "mWETH", decimals: 18, marketId: "ethereum" },
    { key: "btc", symbol: "mWBTC", decimals: 8, marketId: "bitcoin" },
    { key: "link", symbol: "mLINK", decimals: 18, marketId: "chainlink" },
  ];
  const tokens = definitions.map(({ key, ...metadata }) => ({
    address: deployed[key],
    feed: deployed[`${key}Feed`],
    feedMode:
      deployed[`${key}FeedMock`] === true
        ? "mock"
        : deployed[`${key}FeedMock`] === false
          ? "chainlink"
          : "unknown",
    ...metadata,
  }));
  const codeCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const workingTreeDirty = Boolean(
    execFileSync(
      "git",
      [
        "status",
        "--porcelain",
        "--untracked-files=all",
        "--",
        "contracts/src",
        "contracts/script",
        "cre/src",
        "shared",
        "web/src",
        "scripts",
        "package.json",
        "package-lock.json",
      ],
      { cwd: root, encoding: "utf8" },
    ).trim(),
  );
  const transactionHashes = existsSync(broadcastPath)
    ? (JSON.parse(readFileSync(broadcastPath, "utf8")).receipts || [])
        .map((receipt) => receipt.transactionHash)
        .filter(Boolean)
    : [];
  const manifest = {
    ...deployed,
    rpcUrl,
    tokens,
    codeCommit,
    workingTreeDirty,
    transactionHashes,
    verification: "unverified-broadcast-manifest",
  };
  writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}
if (process.argv[1]?.endsWith("/manifest.mjs")) {
  const [, , input, output, rpc] = process.argv;
  if (!input || !output || !rpc)
    throw new Error(
      "Usage: node scripts/manifest.mjs <deployment.json> <public-manifest.json> <RPC URL>",
    );
  const manifest = writeManifest(resolve(input), resolve(output), rpc);
  if (manifest.chainId === 11155111) {
    const configPath = resolve(root, "cre/config.staging.json");
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    config.factory = manifest.factory;
    config.receiver = manifest.receiver;
    config.assetIds = Object.fromEntries(
      manifest.tokens.map((t) => [t.address.toLowerCase(), t.marketId]),
    );
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
  }
  console.log(`Wrote ${manifest.name} manifest to ${output}`);
}
