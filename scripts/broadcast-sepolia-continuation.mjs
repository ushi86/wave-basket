// Explicit fresh nonce-20 execution. No resume/retry path or contract changes.
import { readFile, writeFile, copyFile, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { createPublicClient, http } from "viem";
import {
  OWNER,
  publicSettings,
  preflight,
  forgeRun,
  requirePlan,
} from "./continuation-primitives.mjs";
const root = resolve(import.meta.dirname, "..");
if (!process.stdin.isTTY || !process.env.ETHERSCAN_API_KEY)
  throw Error(
    "Authorized interactive terminal and privately configured explorer key required",
  );
if (process.argv.length !== 3)
  throw Error("Specify one reviewed fresh nonce-20 capture.json");
const capturePath = resolve(root, process.argv[2]),
  run = resolve(capturePath, "..");
const record = JSON.parse(await readFile(capturePath));
if (
  !record.accepted ||
  record.mode ||
  record.startingNonce !== 20 ||
  record.operations !== 23 ||
  record.confirmations !== 3 ||
  !record.transactionValidation?.allOperationsSuccessful
)
  throw Error(
    "A fresh accepted unsigned nonce-20 preparation is required; never retry this executable",
  );
const hash = (x) => createHash("sha256").update(x).digest("hex");
const json = (x) =>
  JSON.stringify(x, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2) +
  "\n";
const need = (x, m) => {
  if (!x) throw Error(m);
};
const save = () => writeFile(capturePath, json(record));
await copyFile(capturePath, resolve(run, "preparation-capture.json"));
record.mode = "broadcast";
record.broadcastAttempted = false;
record.executionStartedAt = new Date().toISOString();
await save();
try {
  for (const [p, h] of Object.entries(record.sources))
    need(
      hash(await readFile(resolve(root, p))) === h,
      "Reviewed sources changed: " + p,
    );
  record.executionCodeSha256 = hash(await readFile(import.meta.filename));
  const parent = JSON.parse(
    await readFile(resolve(root, record.parent, "capture.json")),
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
    "Preserved partial broadcast changed",
  );
  need(
    hash(
      await readFile(
        resolve(
          root,
          "contracts/broadcast/DeployDemo.s.sol/11155111/run-latest.json",
        ),
      ),
    ) === parent.originalBroadcastSha256,
    "Original failed transaction changed",
  );
  need(
    !(await access(resolve(root, "deployments/sepolia.json")).then(
      () => true,
      () => false,
    )),
    "Unverified canonical manifest exists",
  );
  const dryPlan = JSON.parse(
    await readFile(
      resolve(
        record.broadcastRoot,
        "CompleteDeployment.s.sol/11155111/dry-run/run-latest.json",
      ),
    ),
  );
  requirePlan(dryPlan);
  const settings = await publicSettings();
  const tenantOutput = execFileSync(
    resolve(homedir(), ".cre/bin/cre"),
    ["workflow", "supported-chains", "--output", "json", "--non-interactive"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 45000 },
  );
  const chains = JSON.parse(
    tenantOutput.replace(/("chainSelector"\s*:\s*)(\d+)/g, '$1"$2"'),
  );
  const tenant = (Array.isArray(chains) ? chains : chains.chains).find(
    (c) => c.chainName === "ethereum-testnet-sepolia",
  );
  need(
    tenant?.mockAddress?.toLowerCase() ===
      settings.CRE_FORWARDER.toLowerCase() &&
      String(tenant.chainSelector) === "16015286601757825753",
    "Authenticated tenant forwarder changed",
  );
  const clients = [
    "https://ethereum-sepolia-rpc.publicnode.com",
    "https://sepolia.gateway.tenderly.co",
  ].map((u) =>
    createPublicClient({
      transport: http(u, { retryCount: 2, timeout: 25000 }),
    }),
  );
  const fresh = await preflight(clients, settings);
  await writeFile(resolve(run, "before-signing.json"), json(fresh));
  need(
    BigInt(fresh.rows[0].balanceWei) > BigInt(record.maxFeeBudgetWei),
    "Insufficient live balance",
  );
  need(
    fresh.rows.every(
      (r) =>
        r.baseFeeWei + BigInt(record.priorityFeeWei) <=
        BigInt(record.feeCapWei),
    ),
    "Fee market exceeds reviewed cap",
  );
  const env = { ...process.env, ...settings };
  for (const k of Object.keys(env))
    if (
      k.startsWith("FOUNDRY_") ||
      ["PRIVATE_KEY", "DEPLOYER_PRIVATE_KEY", "ETH_PRIVATE_KEY"].includes(k)
    )
      delete env[k];
  env.FOUNDRY_BROADCAST = record.broadcastRoot;
  env.FOUNDRY_CACHE_PATH = record.cacheRoot;
  const forge = resolve(homedir(), ".foundry/bin/forge");
  need(
    execFileSync(forge, ["--version"], { encoding: "utf8" }).includes(
      "Version: 1.9.0",
    ),
    "Native Forge version changed",
  );
  const config = JSON.parse(
    execFileSync(forge, ["config", "--json", "--hardfork", "amsterdam"], {
      cwd: resolve(root, "contracts"),
      env,
      encoding: "utf8",
    }),
  );
  need(
    config.solc === "0.8.26" &&
      config.evm_version === "cancun" &&
      config.hardfork === "Amsterdam" &&
      config.optimizer &&
      config.optimizer_runs === 200 &&
      config.via_ir &&
      config.broadcast === record.broadcastRoot &&
      config.cache_path === record.cacheRoot,
    "Effective compiler/runtime/cache settings differ",
  );
  record.effectiveConfigChecked = true;
  for (const [p, h] of Object.entries(record.sources))
    need(
      hash(await readFile(resolve(root, p))) === h,
      "Sources changed before signing",
    );
  record.broadcastAttempted = true;
  await save();
  console.log(
    "All fresh nonce-20 guards passed. Real Sepolia submission via PublicNode only; Tenderly read-only. No resume. Three confirmations.",
  );
  record.broadcast = await forgeRun(
    forge,
    [
      ...record.args,
      "--account",
      "wave-sepolia",
      "--broadcast",
      "--verify",
      "--verify-external",
    ],
    env,
    resolve(run, "broadcast.log"),
    true,
  );
  if (record.broadcast.code !== 0)
    throw Error(
      "Execution failed or partial; inspect receipts before any further signing",
    );
  record.broadcastSucceeded = true;
  console.log(
    "Execution finished. No canonical live manifest is installed until all real receipts and state are corroborated.",
  );
} catch (error) {
  record.error = error.message;
  record.broadcastSucceeded = false;
  console.error("STOP: " + error.message);
  process.exitCode = 1;
} finally {
  record.executionFinishedAt = new Date().toISOString();
  await save();
}
