import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
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
  const symbols = ["usdc", "eth", "btc", "link"];
  const decimals = [6, 18, 8, 18];
  const names = ["mUSDC", "mWETH", "mWBTC", "mLINK"];
  const ids = ["usd-coin", "ethereum", "bitcoin", "chainlink"];
  const tokens = symbols.map((key, i) => ({
    address: deployed[key],
    feed: deployed[`${key}Feed`],
    symbol: names[i],
    decimals: decimals[i],
    marketId: ids[i],
  }));
  const manifest = { ...deployed, rpcUrl, tokens };
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
