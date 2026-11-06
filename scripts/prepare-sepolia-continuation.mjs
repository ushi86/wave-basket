// READ ONLY preparation; this file has no broadcast/signing branch.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import {
  createPublicClient,
  http,
  formatEther,
  decodeFunctionData,
  encodeAbiParameters,
  parseAbi,
  keccak256,
  toHex,
} from "viem";
import {
  OWNER,
  publicSettings,
  sourceHashes,
  preflight,
  forgeRun,
  requirePlan,
  validateRealTransactions,
} from "./continuation-primitives.mjs";
import { requireRuntime } from "./verify-sepolia-deployment.mjs";
const root = resolve(import.meta.dirname, "..");
const dir = (
  await readFile("/tmp/wave-current-continuation-dir", "utf8")
).trim();
if (!/^docs\/readiness\/sepolia-continuation-nonce20-[\w-]+$/.test(dir))
  throw Error("Unexpected preparation directory");
const run = resolve(root, dir),
  record = JSON.parse(await readFile(resolve(run, "capture.json")));
const json = (x) =>
  JSON.stringify(x, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2) +
  "\n";
const hash = (x) => createHash("sha256").update(x).digest("hex");
const need = (x, m) => {
  if (!x) throw Error(m);
};
const save = (name, x) => writeFile(resolve(run, name), json(x));
try {
  const forge = resolve(homedir(), ".foundry/bin/forge");
  need(
    execFileSync(forge, ["--version"], { encoding: "utf8" }).includes(
      "Version: 1.9.0",
    ),
    "Reviewed native Forge required",
  );
  const parent = JSON.parse(
    await readFile(resolve(root, record.parent, "capture.json")),
  );
  const proof = JSON.parse(
    await readFile(resolve(root, record.parent, "verified-deployment.json")),
  );
  need(
    proof.receipts.length === 19 && !proof.receiptFailures?.length,
    "19 corroborated canonical receipts required",
  );
  const original = await readFile(
    resolve(parent.broadcastRoot, "DeployDemo.s.sol/11155111/run-latest.json"),
  );
  need(
    hash(original) === record.parentBroadcastSha256,
    "Preserved partial broadcast changed",
  );
  const priorPlan = JSON.parse(original);
  const predicted = JSON.parse(
    await readFile(
      resolve(root, record.parent, "broadcast-PREDICTIONS-NOT-VERIFIED.json"),
    ),
  );
  const settings = await publicSettings();
  const allSources = await sourceHashes();
  allSources["scripts/prepare-sepolia-continuation.mjs"] = hash(
    await readFile(import.meta.filename),
  );
  for (const [p, h] of Object.entries(parent.sources))
    need(allSources[p] === h, "Production/reviewed source changed: " + p);
  record.sources = allSources;
  const chains = JSON.parse(
    execFileSync(
      resolve(homedir(), ".cre/bin/cre"),
      ["workflow", "supported-chains", "--output", "json", "--non-interactive"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 45000 },
    ).replace(/("chainSelector"\s*:\s*)(\d+)/g, '$1"$2"'),
  );
  const tenant = (Array.isArray(chains) ? chains : chains.chains).find(
    (c) => c.chainName === "ethereum-testnet-sepolia",
  );
  need(
    tenant?.mockAddress?.toLowerCase() ===
      settings.CRE_FORWARDER.toLowerCase() &&
      String(tenant.chainSelector) === "16015286601757825753",
    "Tenant forwarder differs",
  );
  record.tenant = {
    chainName: tenant.chainName,
    chainSelector: String(tenant.chainSelector),
    mockAddress: tenant.mockAddress,
  };
  const clients = [
    "https://ethereum-sepolia-rpc.publicnode.com",
    "https://sepolia.gateway.tenderly.co",
  ].map((u) =>
    createPublicClient({
      transport: http(u, { retryCount: 2, timeout: 25000 }),
    }),
  );
  const pre = await preflight(clients, settings);
  await save("preflight.json", pre);
  const block = pre.rows[0].block;
  const prefix = {
    scope:
      "Live partial prefix state, corroborated on both providers; not a complete deployment",
    blockNumber: block,
    blockHash: pre.rows[0].blockHash,
    contracts: [],
    state: [],
    missing: [],
    verified: false,
  };
  async function pair(fn) {
    await new Promise((r) => setTimeout(r, 750));
    const v = await Promise.all(clients.map(fn));
    need(json(v[0]) === json(v[1]), "Providers disagree on prefix state");
    return v[0];
  }
  const artifacts = {};
  for (const [key, path] of [
    ["usdc", "DemoAssets.sol/DemoToken"],
    ["eth", "DemoAssets.sol/DemoToken"],
    ["btc", "DemoAssets.sol/DemoToken"],
    ["link", "DemoAssets.sol/DemoToken"],
    ["registry", "AssetRegistry.sol/AssetRegistry"],
    ["adapter", "WaveSwapAdapter.sol/WaveSwapAdapter"],
    ["seeder", "DemoLiquiditySeeder.sol/DemoLiquiditySeeder"],
  ]) {
    const a = JSON.parse(
      await readFile(resolve(root, "contracts/out", path + ".json")),
    );
    artifacts[key] = a;
    const code = await pair((c) =>
      c.getCode({ address: predicted[key], blockNumber: block }),
    );
    const runtime = requireRuntime(code, a);
    const creation = parent.creations.find(
      (c) => c.predictedAddress.toLowerCase() === predicted[key].toLowerCase(),
    );
    const receipt = proof.receipts.find((r) => r.nonce === creation.nonce);
    prefix.contracts.push({
      name: key,
      address: predicted[key],
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      ...runtime,
    });
  }
  for (const c of parent.creations.filter(
    (c) => c.nonce >= 20 || c.type === "internal CREATE",
  )) {
    const code = await pair((p) =>
      p
        .getCode({ address: c.predictedAddress, blockNumber: block })
        .then((x) => x ?? "0x"),
    );
    need(code === "0x", "Unexpected already-created core code");
    prefix.missing.push({
      name: c.name,
      address: c.predictedAddress,
      codeBytes: 0,
    });
  }
  async function read(label, key, name, args, predicate) {
    const value = await pair((c) =>
      c.readContract({
        address: predicted[key],
        abi: artifacts[key].abi,
        functionName: name,
        args,
        blockNumber: block,
      }),
    );
    need(predicate(value), "Unexpected prefix state: " + label);
    prefix.state.push({ label, value });
    return value;
  }
  for (const key of ["registry", "adapter", "seeder"])
    await read(
      key + ".owner",
      key,
      "owner",
      [],
      (x) => x.toLowerCase() === OWNER.toLowerCase(),
    );
  for (const key of ["adapter", "seeder"])
    await read(
      key + ".manager",
      key,
      "manager",
      [],
      (x) => x.toLowerCase() === settings.POOL_MANAGER.toLowerCase(),
    );
  for (const [i, key] of ["usdc", "eth", "btc", "link"].entries()) {
    await read(
      key + ".registry",
      "registry",
      "assets",
      [predicted[key]],
      (x) =>
        x[0].toLowerCase() === predicted[key + "Feed"].toLowerCase() &&
        x[1] === (i === 0 ? 108000 : 4500) &&
        x[2] === [6, 18, 8, 18][i] &&
        x[3] === 8 &&
        x[4] === 1n &&
        x[5] === 100000000000000n &&
        x[6] === true,
    );
    await read(
      key + ".price",
      "registry",
      "priceUsd",
      [predicted[key]],
      (x) => x[0] > 0n && x[1] === true,
    );
    const amount = await read(
      key + ".claimAmount",
      key,
      "claimAmount",
      [],
      (x) => x > 0n,
    );
    await read(key + ".supply", key, "totalSupply", [], (x) => x === amount);
    await read(
      key + ".balance",
      key,
      "balanceOf",
      [OWNER],
      (x) => x === amount,
    );
    await read(
      key + ".cooldown",
      key,
      "nextClaim",
      [OWNER],
      (x) => x === BigInt(proof.receipts[i + 11].canonicalTimestamp + 3600),
    );
  }
  for (const key of ["usdc", "eth"])
    await read(
      key + ".seederAllowance",
      key,
      "allowance",
      [OWNER, predicted.seeder],
      (x) => x === 2n ** 256n - 1n,
    );
  const pool = await read(
    "firstPool.configuration",
    "adapter",
    "poolFor",
    [predicted.usdc, predicted.eth],
    (x) => x.fee === 3000 && x.tickSpacing === 60 && BigInt(x.hooks) === 0n,
  );
  const poolType = {
    type: "tuple",
    components: [
      { name: "currency0", type: "address" },
      { name: "currency1", type: "address" },
      { name: "fee", type: "uint24" },
      { name: "tickSpacing", type: "int24" },
      { name: "hooks", type: "address" },
    ],
  };
  const id = keccak256(encodeAbiParameters([poolType], [pool]));
  const slot = keccak256(
    encodeAbiParameters([{ type: "bytes32" }, { type: "uint256" }], [id, 6n]),
  );
  const storageAbi = parseAbi([
    "function extsload(bytes32) view returns(bytes32)",
  ]);
  for (const [label, s, predicate] of [
    [
      "firstPool.initialized",
      slot,
      (x) => (BigInt(x) & ((1n << 160n) - 1n)) > 0n,
    ],
    [
      "firstPool.liquidity",
      toHex(BigInt(slot) + 3n, { size: 32 }),
      (x) => BigInt(x) === 0n,
    ],
  ]) {
    const value = await pair((c) =>
      c.readContract({
        address: settings.POOL_MANAGER,
        abi: storageAbi,
        functionName: "extsload",
        args: [s],
        blockNumber: block,
      }),
    );
    need(predicate(value), label);
    prefix.state.push({ label, value });
  }
  prefix.verified = true;
  await save("prefix-state.json", prefix);
  const price = pre.rows.reduce(
      (n, r) => (r.gasPriceWei > n ? r.gasPriceWei : n),
      pre.rows[0].baseFeeWei,
    ),
    tip = pre.rows.reduce(
      (n, r) => (r.priorityFeeWei > n ? r.priorityFeeWei : n),
      2n,
    ),
    maxFee = price * 2n + tip;
  record.feeCapWei = maxFee;
  record.priorityFeeWei = tip;
  const stamp = dir.split("nonce20-")[1];
  const broadcastRoot = resolve(
      root,
      "contracts/broadcast/continuation-nonce20",
      stamp,
    ),
    cacheRoot = resolve(root, "contracts/cache/continuation-nonce20", stamp);
  const env = {
    ...process.env,
    ...settings,
    FOUNDRY_BROADCAST: broadcastRoot,
    FOUNDRY_CACHE_PATH: cacheRoot,
  };
  for (const k of ["PRIVATE_KEY", "DEPLOYER_PRIVATE_KEY", "ETH_PRIVATE_KEY"])
    delete env[k];
  delete env.ETHERSCAN_API_KEY;
  const args = [
    "script",
    "script/CompleteDeployment.s.sol:CompleteDeployment",
    "--rpc-url",
    settings.SEPOLIA_RPC_URL,
    "--sender",
    OWNER,
    "--sender-nonce",
    "20",
    "--fork-block-number",
    String(block),
    "--hardfork",
    "amsterdam",
    "--isolate",
    "--gas-estimate-multiplier",
    "130",
    "--with-gas-price",
    String(maxFee),
    "--priority-gas-price",
    String(tip),
    "--slow",
    "--confirmations",
    "3",
    "--disable-external-identification",
  ];
  record.args = args;
  record.broadcastRoot = broadcastRoot;
  record.cacheRoot = cacheRoot;
  await save("capture.json", record);
  const outcome = await forgeRun(
    forge,
    [...args, "--non-interactive"],
    env,
    resolve(run, "dry-run.log"),
    false,
  );
  record.dryRun = outcome;
  need(outcome.code === 0, "Fresh continuation Forge dry run failed");
  const plan = JSON.parse(
    await readFile(
      resolve(
        broadcastRoot,
        "CompleteDeployment.s.sol/11155111/dry-run/run-latest.json",
      ),
    ),
  );
  requirePlan(plan);
  for (let i = 0; i < 23; i++) {
    const a = plan.transactions[i].transaction,
      b = priorPlan.transactions[i + 19].transaction;
    need(
      (a.to ?? null)?.toLowerCase() === (b.to ?? null)?.toLowerCase() &&
        hash(a.input ?? a.data) === hash(b.input ?? b.data),
      "Continuation target or input differs at nonce " + (i + 20),
    );
  }
  record.planSummary = plan.transactions.map((t) => ({
    nonce: Number(BigInt(t.transaction.nonce)),
    to: t.transaction.to,
    name: t.contractName,
    function: t.function,
    gasLimit: Number(BigInt(t.transaction.gas)),
    inputHash: hash(t.transaction.input ?? t.transaction.data),
  }));
  record.totalGasLimit = plan.transactions.reduce(
    (n, t) => n + BigInt(t.transaction.gas),
    0n,
  );
  record.maxFeeBudgetWei = record.totalGasLimit * (maxFee + tip);
  record.maxFeeBudgetETH = formatEther(record.maxFeeBudgetWei);
  need(
    BigInt(pre.rows[0].balanceWei) > record.maxFeeBudgetWei,
    "Insufficient balance",
  );
  env.WAVE_MAX_FEE_HEX = toHex(maxFee);
  env.WAVE_PRIORITY_FEE_HEX = toHex(tip);
  record.transactionValidation = await validateRealTransactions(
    plan,
    pre,
    env,
    run,
  );
  need(
    hash(
      await readFile(
        resolve(
          parent.broadcastRoot,
          "DeployDemo.s.sol/11155111/run-latest.json",
        ),
      ),
    ) === record.parentBroadcastSha256,
    "Original partial record changed",
  );
  const finalSources = await sourceHashes();
  finalSources["scripts/prepare-sepolia-continuation.mjs"] = hash(
    await readFile(import.meta.filename),
  );
  need(
    json(finalSources) === json(allSources),
    "Sources changed during preparation",
  );
  record.accepted = true;
  record.scope =
    "Reviewed fresh nonce-20 continuation, READ-ONLY preparation, no broadcast/signing performed";
  await writeFile(
    resolve(run, "broadcast-PREDICTIONS-NOT-VERIFIED.json"),
    json(predicted),
  );
  console.log(
    json({
      accepted: true,
      operations: 23,
      gas: record.totalGasLimit,
      budgetETH: record.maxFeeBudgetETH,
      confirmations: 3,
      targetsAndPayloadsUnchanged: true,
    }),
  );
} catch (error) {
  record.error = error.message;
  record.accepted = false;
  console.error("STOP: " + error.message);
  process.exitCode = 1;
} finally {
  record.finishedAt = new Date().toISOString();
  await save("capture.json", record);
  console.log("Preparation record: " + dir + "/capture.json");
}
