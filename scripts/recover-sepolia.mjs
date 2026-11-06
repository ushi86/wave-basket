// Separate nonce-1 recovery. Defaults to reads and local fork simulation only.
import {
  readFile,
  writeFile,
  mkdir,
  cp,
  rename,
  access,
} from "node:fs/promises";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  http,
  parseAbi,
  keccak256,
  getContractAddress,
  formatEther,
} from "viem";
export const OWNER = "0xDe25D83481c0c2A711397c44eE3317dD826952D5";
export const FAILED =
  "0x5eb42ec1baaeb837ca64021bd561ca05bb3596ff42ceb9b42eca3e621d18765f";
const RPCS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.gateway.tenderly.co",
];
const MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const FORWARDER = "0x15fC6ae953E024d975e77382eEeC56A9101f9F88";
const CREATE2 = "0x4e59b44847b379578588920cA78FbF26c0B4956C";
const FW_HASH =
  "0x0a1b63dd9c5ee32c042a5124c96d3d344eea29c0daca30e54d2d91c09cc940b7";
const FEEDS = [
  ["USDC", "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E", 108000n],
  ["ETH", "0x694AA1769357215DE4FAC081bf1f309aDC325306", 4500n],
  ["BTC", "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43", 4500n],
  ["LINK", "0xc59E3633BAAC79493d908e63626716e204A45EdF", 4500n],
];
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const json = (x) =>
  JSON.stringify(x, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2) +
  "\n";
const hash = (x) => createHash("sha256").update(x).digest("hex");
const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  );
const pause = () => new Promise((r) => setTimeout(r, 700));
const persist = (p, x) => writeFile(p, json(x));
export function requireMode(args, tty, explorerKeyPresent) {
  if (!args.length || (args.length === 1 && args[0] === "--dry-run"))
    return "dry-run";
  if (
    args.length !== 3 ||
    args[0] !== "--broadcast" ||
    args[1] !== "--reviewed-run"
  )
    throw Error(
      "Use --dry-run, or --broadcast --reviewed-run <successful capture.json>. No resume option.",
    );
  if (!tty)
    throw Error("Broadcast requires the owner in an interactive terminal.");
  if (!explorerKeyPresent)
    throw Error(
      "Configure ETHERSCAN_API_KEY privately in this terminal; do not share it.",
    );
  return "broadcast";
}
export function requireState(rows) {
  if (rows.length !== 2) throw Error("Two providers required.");
  for (const r of rows) {
    if (
      r.chainId !== 11155111 ||
      r.latestNonce !== 1 ||
      r.pendingNonce !== 1 ||
      r.forkNonce !== 1
    )
      throw Error("Chain or nonce changed; stop for receipt review.");
    if (
      r.prior.hash !== FAILED ||
      r.prior.txHash !== FAILED ||
      r.prior.status !== "reverted" ||
      !r.prior.canonical ||
      r.prior.nonce !== 0 ||
      r.prior.codeBytes !== 0 ||
      r.prior.from.toLowerCase() !== OWNER.toLowerCase()
    )
      throw Error("Known failed transaction no longer matches reviewed state.");
    if (
      r.forwarderCodeHash !== FW_HASH ||
      !r.managerCodeBytes ||
      !r.create2CodeBytes
    )
      throw Error("Required deployed code is missing or changed.");
    if (r.feeds.length !== 4 || r.feeds.some((f) => !f.healthy))
      throw Error("A required feed is unhealthy; bounds remain unchanged.");
  }
  if (
    rows[0].blockHash !== rows[1].blockHash ||
    rows[0].balanceWei !== rows[1].balanceWei ||
    rows[0].managerCodeHash !== rows[1].managerCodeHash ||
    rows[0].create2CodeHash !== rows[1].create2CodeHash ||
    json(rows[0].feeds) !== json(rows[1].feeds)
  )
    throw Error("Providers disagree on canonical state.");
}
export function requirePlan(plan) {
  if (
    plan.chain !== 11155111 ||
    plan.transactions?.length !== 42 ||
    plan.receipts?.length
  )
    throw Error("Unexpected recovery plan shape.");
  for (let i = 0; i < plan.transactions.length; i++) {
    const t = plan.transactions[i];
    if (
      t.hash ||
      BigInt(t.transaction.nonce) !== BigInt(i + 1) ||
      t.transaction.from.toLowerCase() !== OWNER.toLowerCase() ||
      BigInt(t.transaction.chainId) !== 11155111n ||
      BigInt(t.transaction.gas) <= 0n ||
      BigInt(t.transaction.value ?? 0) !== 0n
    )
      throw Error(
        "Unexpected nonce, sender, chain, value or submitted transaction in dry plan.",
      );
  }
}
async function publicSettings() {
  const approved = {
    DEPLOYER_ADDRESS: OWNER,
    TREASURY: OWNER,
    SEPOLIA_RPC_URL: RPCS[0],
    POOL_MANAGER: MANAGER,
    CRE_FORWARDER: FORWARDER,
    CRE_SIMULATION: "true",
    USE_CHAINLINK_FEEDS: "true",
  };
  for (const [name, address] of FEEDS) {
    approved[name + "_FEED"] = address;
    approved["USE_MOCK_" + name + "_FEED"] = "false";
  }
  const text = await readFile(resolve(root, "contracts/.env"), "utf8");
  for (const [key, expected] of Object.entries(approved)) {
    const line = text
      .split(/\r?\n/)
      .find((l) => new RegExp("^\\s*(?:export\\s+)?" + key + "\\s*=").test(l));
    const value = line
      ?.slice(line.indexOf("=") + 1)
      .trim()
      .replace(/^(["'])(.*)\1$/, "$2");
    if (
      value?.toLowerCase() !== expected.toLowerCase() ||
      (process.env[key] &&
        process.env[key].toLowerCase() !== expected.toLowerCase())
    )
      throw Error(
        `Public setting ${key} differs from reviewed configuration. No values printed.`,
      );
  }
  // Fixed public fixture identities are intentionally unused for identity authentication in simulation mode.
  return {
    ...approved,
    WORKFLOW_ID: "0x" + "0".repeat(63) + "1",
    WORKFLOW_AUTHOR: OWNER,
    WORKFLOW_NAME: "0x77617665" + "0".repeat(56),
  };
}
async function sourceHashes() {
  const { readdir } = await import("node:fs/promises");
  const paths = [];
  async function visit(p) {
    for (const e of await readdir(resolve(root, p), { withFileTypes: true })) {
      const f = p + "/" + e.name;
      if (e.isDirectory()) await visit(f);
      else if (e.name.endsWith(".sol")) paths.push(f);
    }
  }
  await visit("contracts/src");
  paths.push(
    "contracts/script/DeployDemo.s.sol",
    "scripts/recover-sepolia.mjs",
    "contracts/foundry.toml",
    "package-lock.json",
  );
  return Object.fromEntries(
    await Promise.all(
      paths
        .sort()
        .map(async (p) => [p, hash(await readFile(resolve(root, p)))]),
    ),
  );
}
async function preflight(clients, settings) {
  const heads = [];
  for (const c of clients) {
    heads.push(await c.getBlockNumber());
    await pause();
  }
  const block = (heads[0] < heads[1] ? heads[0] : heads[1]) - 3n;
  const abi = parseAbi([
    "function decimals() view returns(uint8)",
    "function latestRoundData() view returns(uint80,int256,uint256,uint256,uint80)",
  ]);
  const rows = [];
  for (let i = 0; i < clients.length; i++) {
    const c = clients[i],
      b = await c.getBlock({ blockNumber: block });
    await pause();
    const r = {
      endpoint: RPCS[i],
      chainId: await c.getChainId(),
      block,
      blockHash: b.hash,
      timestamp: b.timestamp,
      blockGasLimit: b.gasLimit,
      baseFeeWei: b.baseFeePerGas,
    };
    await pause();
    r.latestNonce = await c.getTransactionCount({
      address: OWNER,
      blockTag: "latest",
    });
    await pause();
    r.pendingNonce = await c.getTransactionCount({
      address: OWNER,
      blockTag: "pending",
    });
    await pause();
    r.forkNonce = await c.getTransactionCount({
      address: OWNER,
      blockNumber: block,
    });
    await pause();
    r.balanceWei = (
      await c.getBalance({ address: OWNER, blockNumber: block })
    ).toString();
    r.balanceETH = formatEther(BigInt(r.balanceWei));
    await pause();
    r.gasPriceWei = await c.getGasPrice();
    await pause();
    r.priorityFeeWei = await c.estimateMaxPriorityFeePerGas();
    await pause();
    for (const [key, address] of [
      ["forwarder", FORWARDER],
      ["manager", MANAGER],
      ["create2", CREATE2],
    ]) {
      const code = await c.getCode({ address, blockNumber: block });
      r[key + "CodeBytes"] = code ? (code.length - 2) / 2 : 0;
      r[key + "CodeHash"] = code ? keccak256(code) : null;
      await pause();
    }
    const receipt = await c.getTransactionReceipt({ hash: FAILED });
    await pause();
    const rb = await c.getBlock({ blockNumber: receipt.blockNumber });
    await pause();
    const tx = await c.getTransaction({ hash: FAILED });
    await pause();
    const code = await c.getCode({
      address: receipt.contractAddress,
      blockNumber: block,
    });
    r.prior = {
      hash: receipt.transactionHash,
      txHash: tx.hash,
      status: receipt.status,
      block: receipt.blockNumber,
      blockHash: receipt.blockHash,
      canonical: rb.hash === receipt.blockHash,
      from: tx.from,
      nonce: tx.nonce,
      gasUsed: receipt.gasUsed,
      codeBytes: code ? (code.length - 2) / 2 : 0,
    };
    r.feeds = [];
    for (const [symbol, address, maxAge] of FEEDS) {
      await pause();
      const decimals = await c.readContract({
        address,
        abi,
        functionName: "decimals",
        blockNumber: block,
      });
      await pause();
      const [roundId, answer, , updatedAt, answeredInRound] =
        await c.readContract({
          address,
          abi,
          functionName: "latestRoundData",
          blockNumber: block,
        });
      const age = b.timestamp - updatedAt;
      r.feeds.push({
        symbol,
        address,
        decimals,
        roundId,
        answer,
        updatedAt,
        answeredInRound,
        ageSeconds: age,
        maxAge,
        healthy:
          decimals <= 18 &&
          answer >= 1n &&
          answer <= 1000000n * 10n ** BigInt(decimals) &&
          updatedAt > 0n &&
          age >= 0n &&
          age <= maxAge &&
          answeredInRound >= roundId,
      });
    }
    rows.push(r);
    console.log(
      `${RPCS[i]}: nonce ${r.latestNonce}/${r.pendingNonce}, ${r.balanceETH} ETH; feeds ${r.feeds.map((f) => f.symbol + ":" + (f.healthy ? "healthy" : "FAIL")).join(", ")}`,
    );
  }
  requireState(rows);
  return { observedAt: new Date().toISOString(), settings, rows };
}
async function forgeRun(forge, args, env, log, interactive) {
  const child = spawn(forge, args, {
    cwd: resolve(root, "contracts"),
    env,
    stdio: [interactive ? "inherit" : "ignore", "pipe", "pipe"],
  });
  let output = "";
  const consume = (data) => {
    output += data;
    process.stdout.write(data);
  };
  child.stdout.on("data", consume);
  child.stderr.on("data", consume);
  const timer = setTimeout(
    () => child.kill("SIGTERM"),
    interactive ? 1800000 : 600000,
  );
  try {
    return await new Promise((res, rej) => {
      child.once("error", rej);
      child.once("close", (code, signal) => res({ code, signal }));
    });
  } finally {
    clearTimeout(timer);
    await writeFile(log, output);
  }
}
async function validateRealTransactions(plan, pre, env, run) {
  // PRIVATE LOCAL FORK ONLY. Never route unsigned transactions to a public RPC.
  // Anvil's simulateV1 has a hard-coded 50M aggregate cap; its normal per-tx
  // path validates the whole sequence without relaxing protocol gas limits.
  const { createServer } = await import("node:net");
  const probe = createServer();
  await new Promise((res, rej) => {
    probe.once("error", rej);
    probe.listen(0, "127.0.0.1", res);
  });
  const port = probe.address().port;
  await new Promise((res) => probe.close(res));
  const endpoint = `http://127.0.0.1:${port}`;
  const args = [
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--accounts",
    "0",
    "--chain-id",
    "11155111",
    "--fork-url",
    RPCS[0],
    "--fork-block-number",
    String(pre.rows[0].block),
    "--hardfork",
    "amsterdam",
    "--enable-tx-gas-limit",
    "--gas-limit",
    String(pre.rows[0].blockGasLimit),
    "--silent",
  ];
  const binary = resolve(homedir(), ".foundry/bin/anvil");
  if (
    !execFileSync(binary, ["--version"], { encoding: "utf8" }).includes(
      "Version: 1.9.0",
    )
  )
    throw Error("Native Anvil 1.9.0 required.");
  const node = spawn(binary, args, { env, stdio: ["ignore", "pipe", "pipe"] });
  let log = "",
    spawnError;
  node.on("error", (e) => {
    spawnError = e;
  });
  node.stdout.on("data", (c) => (log += c));
  node.stderr.on("data", (c) => (log += c));
  async function rpc(method, params, timeout = 60000) {
    // The URL is a constant loopback URL of the child we own, NOT a caller option.
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(timeout),
    });
    const body = await response.json();
    if (body.error) throw Error(JSON.stringify(body.error));
    return body.result;
  }
  const result = {
    scope:
      "PRIVATE LOCAL FORK unsigned execution only; NOT Sepolia receipts/evidence. No signing keys, balance/nonce/code/block overrides or relaxed protocol limits. Signature checks alone are bypassed by the documented local unsigned method.",
    binary,
    args,
    all42Successful: false,
    localCalls: [],
  };
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (spawnError) throw spawnError;
      if (node.exitCode !== null) throw Error("Local validator exited.");
      try {
        ready = (await rpc("eth_chainId", [])) === "0xaa36a7";
      } catch {}
      if (ready) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!ready) throw Error("Local validator did not start.");
    const header = await rpc("eth_getBlockByNumber", ["latest", false]);
    if (
      header.hash !== pre.rows[0].blockHash ||
      BigInt(header.gasLimit) !== BigInt(pre.rows[0].blockGasLimit)
    )
      throw Error("Local fork block differs.");
    if (
      BigInt(await rpc("eth_getTransactionCount", [OWNER, "latest"])) !== 1n ||
      BigInt(await rpc("eth_getBalance", [OWNER, "latest"])) !==
        BigInt(pre.rows[0].balanceWei)
    )
      throw Error("Local fork owner state differs.");
    result.corroboratedForkBlock = { number: header.number, hash: header.hash };
    for (const [index, { transaction: t }] of plan.transactions.entries()) {
      const call = {
        from: t.from,
        ...(t.to ? { to: t.to } : {}),
        input: t.input ?? t.data,
        nonce: t.nonce,
        value: t.value ?? "0x0",
        gas: t.gas,
        maxFeePerGas: env.WAVE_MAX_FEE_HEX,
        maxPriorityFeePerGas: env.WAVE_PRIORITY_FEE_HEX,
        chainId: "0xaa36a7",
        type: "0x2",
      };
      // Anvil does not relay this to its fork RPC. No private key/unlock required.
      const localHash = await rpc("eth_sendUnsignedTransaction", [call]);
      let receipt;
      for (let i = 0; i < 100; i++) {
        receipt = await rpc("eth_getTransactionReceipt", [localHash]);
        if (receipt) break;
        await new Promise((r) => setTimeout(r, 200));
      }
      const row = {
        index,
        scope: "LOCAL ONLY; not a Sepolia receipt",
        status: receipt?.status ?? null,
        gasUsed: receipt?.gasUsed,
        gasLimit: t.gas,
        createdAddress: receipt?.contractAddress ?? null,
      };
      result.localCalls.push(row);
      if (receipt?.status !== "0x1" || BigInt(receipt.gasUsed) > BigInt(t.gas))
        throw Error(
          `Local protocol validation failed at index ${index}, nonce ${index + 1}.`,
        );
    }
    result.localFinalNonce = Number(
      BigInt(await rpc("eth_getTransactionCount", [OWNER, "latest"])),
    );
    result.localFinalBalanceWei = BigInt(
      await rpc("eth_getBalance", [OWNER, "latest"]),
    ).toString();
    result.all42Successful =
      result.localCalls.length === 42 && result.localFinalNonce === 43;
    if (!result.all42Successful) throw Error("Local sequence incomplete.");
    return result;
  } catch (error) {
    result.error = error.message;
    throw error;
  } finally {
    node.kill("SIGTERM");
    await writeFile(resolve(run, "local-validator.log"), log);
    await persist(resolve(run, "local-transaction-validation.json"), result);
  }
}
async function main() {
  const mode = requireMode(
    process.argv.slice(2),
    process.stdin.isTTY,
    Boolean(process.env.ETHERSCAN_API_KEY),
  );
  const forge = resolve(homedir(), ".foundry/bin/forge"),
    version = execFileSync(forge, ["--version"], { encoding: "utf8" });
  if (!version.includes("Version: 1.9.0"))
    throw Error("Reviewed native Forge 1.9.0 required. No automatic upgrades.");
  const settings = await publicSettings();
  const sources = await sourceHashes();
  let reviewed;
  if (mode === "broadcast") {
    reviewed = JSON.parse(
      await readFile(resolve(root, process.argv[4]), "utf8"),
    );
    if (
      reviewed.mode !== "dry-run" ||
      !reviewed.accepted ||
      json(reviewed.sources) !== json(sources)
    )
      throw Error(
        "Reviewed successful recovery dry run required; sources changed or review is invalid.",
      );
  }
  const canonical = resolve(root, "deployments/sepolia.json");
  if (await exists(canonical))
    throw Error(
      "Canonical manifest already exists: stop for live receipt review.",
    );
  const old = resolve(
    root,
    "contracts/broadcast/DeployDemo.s.sol/11155111/run-latest.json",
  );
  const originalBytes = await readFile(old);
  const original = JSON.parse(originalBytes);
  if (
    original.transactions[0].hash !== FAILED ||
    original.transactions.slice(1).some((t) => t.hash) ||
    original.receipts.length
  )
    throw Error("Original attempt differs; stop for review.");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const run = resolve(root, "docs/readiness/sepolia-recovery-" + stamp);
  await mkdir(run, { recursive: false });
  const privateBackup = resolve(
    root,
    "contracts/cache/recovery-preserved",
    stamp,
  );
  await mkdir(privateBackup, { recursive: true, mode: 0o700 });
  // Copy, never inspect or publish, the sensitive cache. The source remains untouched.
  const oldCache = resolve(root, "contracts/cache/DeployDemo.s.sol/11155111");
  if (await exists(oldCache))
    await cp(oldCache, resolve(privateBackup, "original-cache"), {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
  const preserved = resolve(
    root,
    "contracts/broadcast/recovery-preserved",
    stamp,
  );
  await mkdir(preserved, { recursive: true });
  await writeFile(resolve(preserved, "failed-run-latest.json"), originalBytes, {
    flag: "wx",
  });
  const broadcastRoot = resolve(
    root,
    "contracts/broadcast/recovery-nonce1",
    stamp,
  );
  const cacheRoot = resolve(root, "contracts/cache/recovery-nonce1", stamp);
  const record = {
    scope:
      "Nonce-1 recovery preparation; predictions are not deployed addresses",
    mode,
    startedAt: new Date().toISOString(),
    version: version.trim(),
    originalBroadcastSha256: hash(originalBytes),
    preservedFailedPlan: preserved,
    sources,
    broadcastRoot,
    cacheRoot,
    accepted: false,
  };
  await persist(resolve(run, "capture.json"), record);
  try {
    // Capture only the selected public chain entry, never account/organization/authentication output.
    let tenant;
    try {
      const out = execFileSync(
        resolve(homedir(), ".cre/bin/cre"),
        [
          "workflow",
          "supported-chains",
          "--output",
          "json",
          "--non-interactive",
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 45000 },
      );
      const data = JSON.parse(
        out.replace(/("chainSelector"\s*:\s*)(\d+)/g, '$1"$2"'),
      );
      tenant = (Array.isArray(data) ? data : data.chains).find(
        (c) => c.chainName === "ethereum-testnet-sepolia",
      );
    } catch {
      throw Error(
        "Authenticated CRE tenant lookup failed. Owner must resolve login; no authentication output captured.",
      );
    }
    if (
      !tenant ||
      tenant.mockAddress?.toLowerCase() !== FORWARDER.toLowerCase() ||
      String(tenant.chainSelector) !== "16015286601757825753"
    )
      throw Error(
        "Tenant simulation forwarder differs from reviewed configuration.",
      );
    record.tenant = {
      chainName: tenant.chainName,
      chainSelector: String(tenant.chainSelector),
      mockAddress: tenant.mockAddress,
      address: tenant.address,
    };
    const clients = RPCS.map((url) =>
      createPublicClient({
        transport: http(url, { retryCount: 1, timeout: 25000 }),
      }),
    );
    const pre = await preflight(clients, settings);
    await persist(resolve(run, "preflight.json"), pre);
    const tip = pre.rows.reduce(
      (n, r) => (r.priorityFeeWei > n ? r.priorityFeeWei : n),
      2n,
    );
    const price = pre.rows.reduce(
      (n, r) => (r.gasPriceWei > n ? r.gasPriceWei : n),
      pre.rows[0].baseFeeWei,
    );
    const maxFee = price * 2n + tip;
    record.feeCapWei = maxFee;
    record.priorityFeeWei = tip;
    const env = { ...process.env, ...settings };
    for (const k of Object.keys(env))
      if (
        k.startsWith("FOUNDRY_") ||
        ["DEPLOYER_PRIVATE_KEY", "PRIVATE_KEY", "ETH_PRIVATE_KEY"].includes(k)
      )
        delete env[k];
    env.FOUNDRY_BROADCAST = broadcastRoot;
    env.FOUNDRY_CACHE_PATH = cacheRoot;
    const args = [
      "script",
      "script/DeployDemo.s.sol:DeployDemo",
      "--rpc-url",
      RPCS[0],
      "--sender",
      OWNER,
      "--sender-nonce",
      "1",
      "--fork-block-number",
      String(pre.rows[0].block),
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
    ];
    const config = JSON.parse(
      execFileSync(forge, ["config", "--json", "--hardfork", "amsterdam"], {
        cwd: resolve(root, "contracts"),
        env,
        encoding: "utf8",
      }),
    );
    if (
      config.evm_version !== "cancun" ||
      config.solc !== "0.8.26" ||
      config.hardfork !== "Amsterdam" ||
      !config.optimizer ||
      config.optimizer_runs !== 200 ||
      !config.via_ir ||
      config.broadcast !== broadcastRoot ||
      config.cache_path !== cacheRoot
    )
      throw Error(
        "Effective Forge configuration differs from reviewed settings.",
      );
    record.args = args;
    record.blockHash = pre.rows[0].blockHash;
    const dryEnv = { ...env };
    delete dryEnv.ETHERSCAN_API_KEY;
    let outcome;
    try {
      outcome = await forgeRun(
        forge,
        [...args, "--non-interactive"],
        dryEnv,
        resolve(run, "dry-run.log"),
        false,
      );
    } finally {
      if (await exists(canonical))
        await rename(canonical, resolve(run, "predicted-NOT-DEPLOYED.json"));
    }
    record.dryRun = outcome;
    if (outcome.code !== 0)
      throw Error("Full Amsterdam dry run failed. Stop before signing.");
    const plan = JSON.parse(
      await readFile(
        resolve(
          broadcastRoot,
          "DeployDemo.s.sol/11155111/dry-run/run-latest.json",
        ),
      ),
    );
    requirePlan(plan);
    const totalGas = plan.transactions.reduce(
      (n, t) => n + BigInt(t.transaction.gas),
      0n,
    );
    const creations = [];
    for (const [index, t] of plan.transactions.entries())
      if (["CREATE", "CREATE2"].includes(t.transactionType)) {
        const input = t.transaction.input ?? t.transaction.data;
        const expected =
          t.transactionType === "CREATE"
            ? getContractAddress({
                from: OWNER,
                nonce: BigInt(t.transaction.nonce),
              })
            : getContractAddress({
                opcode: "CREATE2",
                from: CREATE2,
                salt: "0x" + input.slice(2, 66),
                bytecode: "0x" + input.slice(66),
              });
        if (expected.toLowerCase() !== t.contractAddress.toLowerCase())
          throw Error("Creation prediction mismatch.");
        creations.push({
          name: t.contractName,
          index,
          nonce: Number(BigInt(t.transaction.nonce)),
          type: t.transactionType,
          predictedAddress: expected,
          gasLimit: Number(BigInt(t.transaction.gas)),
          creationInputHash: hash(input),
        });
      }
    if (creations.length !== 10) throw Error("Unexpected creation count.");
    const factory = creations.find(
      (c) => c.name === "WaveFactory",
    ).predictedAddress;
    const deployer = getContractAddress({ from: factory, nonce: 1n });
    const vault = getContractAddress({ from: deployer, nonce: 1n });
    const prediction = JSON.parse(
      await readFile(resolve(run, "predicted-NOT-DEPLOYED.json")),
    );
    if (
      prediction.flagship.toLowerCase() !== vault.toLowerCase() ||
      prediction.receiverMode !== "simulation" ||
      prediction.forwarder.toLowerCase() !== FORWARDER.toLowerCase() ||
      prediction.maxReportAge !== 900 ||
      prediction.reportVersion !== 2 ||
      prediction.oracleMode !== "chainlink" ||
      FEEDS.some(([s]) => prediction[s.toLowerCase() + "FeedMock"])
    )
      throw Error("Predicted core configuration differs.");
    creations.push(
      {
        name: "WaveVaultDeployer",
        type: "internal CREATE",
        creator: factory,
        creatorNonce: 1,
        predictedAddress: deployer,
      },
      {
        name: "WaveVault (flagship)",
        type: "internal CREATE",
        creator: deployer,
        creatorNonce: 1,
        predictedAddress: vault,
      },
    );
    const codeSizes = {};
    for (const [path, name] of [
      ["DemoAssets.sol", "DemoToken"],
      ["WaveFactory.sol", "WaveFactory"],
      ["WaveFactory.sol", "WaveVaultDeployer"],
      ["WaveVault.sol", "WaveVault"],
      ["NavGuardHook.sol", "NavGuardHook"],
      ["AssetRegistry.sol", "AssetRegistry"],
      ["WaveSwapAdapter.sol", "WaveSwapAdapter"],
      ["DemoLiquiditySeeder.sol", "DemoLiquiditySeeder"],
      ["WaveRebalanceReceiver.sol", "WaveRebalanceReceiver"],
    ]) {
      const artifact = JSON.parse(
        await readFile(resolve(root, "contracts/out", path, name + ".json")),
      );
      codeSizes[name] = (artifact.deployedBytecode.object.length - 2) / 2;
      if (codeSizes[name] > 24576)
        throw Error("Conservative deployed-size bound exceeded: " + name);
    }
    const first = plan.transactions[0].transaction;
    record.firstCreationRpc = [];
    for (let i = 0; i < clients.length; i++) {
      const c = clients[i];
      await pause();
      const estimate = await c.estimateGas({
        account: OWNER,
        data: first.input ?? first.data,
        blockNumber: pre.rows[0].block,
      });
      await pause();
      const call = await c.call({
        account: OWNER,
        data: first.input ?? first.data,
        gas: BigInt(first.gas),
        blockNumber: pre.rows[0].block,
      });
      if (estimate > BigInt(first.gas) || !call.data || call.data === "0x")
        throw Error("First creation gas cross-check failed.");
      record.firstCreationRpc.push({
        endpoint: RPCS[i],
        estimate,
        plannedGasLimit: BigInt(first.gas),
        readOnlyCallSucceeded: true,
      });
    }
    env.WAVE_MAX_FEE_HEX = "0x" + maxFee.toString(16);
    env.WAVE_PRIORITY_FEE_HEX = "0x" + tip.toString(16);
    record.totalGasLimit = totalGas;
    record.conservativeFeeBudgetPerGasWei = maxFee + tip;
    record.maxFeeBudgetWei = totalGas * (maxFee + tip);
    record.maxFeeBudgetETH = formatEther(record.maxFeeBudgetWei);
    record.codeSizes = codeSizes;
    record.creations = creations;
    record.planSummary = plan.transactions.map((t, index) => ({
      index,
      name: t.contractName,
      function: t.function,
      nonce: Number(BigInt(t.transaction.nonce)),
      gasLimit: Number(BigInt(t.transaction.gas)),
      to: t.transaction.to,
      inputHash: hash(t.transaction.input ?? t.transaction.data),
    }));
    if (
      BigInt(pre.rows[0].balanceWei) < record.maxFeeBudgetWei ||
      totalGas <= 0n ||
      json(sources) !== json(await sourceHashes()) ||
      hash(await readFile(old)) !== record.originalBroadcastSha256
    )
      throw Error("Balance, source or preserved failed record check failed.");
    record.transactionValidation = await validateRealTransactions(
      plan,
      pre,
      env,
      run,
    );
    const invariantPlan = (x) =>
      x.creations.map((c) => ({
        name: c.name,
        predictedAddress: c.predictedAddress,
        creationInputHash: c.creationInputHash,
      }));
    if (
      reviewed &&
      json(invariantPlan(reviewed)) !== json(invariantPlan(record))
    )
      throw Error(
        "Creation plan changed from reviewed dry run. Review a new dry run before broadcast.",
      );
    record.accepted = true;
    await persist(resolve(run, "capture.json"), record);
    console.log(
      `\nRecovery dry run accepted: ${totalGas} gas, max fee ${maxFee} wei/gas, budget ${record.maxFeeBudgetETH} Sepolia ETH. Predictions ONLY:`,
    );
    console.log(json(creations));
    if (mode === "broadcast") {
      // Last-minute fresh feeds/balance/nonces before owner unlock. No automatic resume on failure.
      const fresh = await preflight(clients, settings);
      await persist(resolve(run, "before-owner-signing.json"), fresh);
      if (
        BigInt(fresh.rows[0].balanceWei) < record.maxFeeBudgetWei ||
        fresh.rows.some((r) => r.baseFeeWei + tip > maxFee)
      )
        throw Error(
          "Funds or fee market changed. Stop for a new reviewed run.",
        );
      console.log(
        "OWNER BROADCAST: real Sepolia transactions via PublicNode only. Enter keystore password locally. Tenderly stays read-only.",
      );
      try {
        record.broadcast = await forgeRun(
          forge,
          [
            ...args,
            "--account",
            "wave-sepolia",
            "--broadcast",
            "--verify",
            "--verify-external",
          ],
          env,
          resolve(run, "owner-broadcast.log"),
          true,
        );
      } finally {
        if (await exists(canonical))
          await rename(
            canonical,
            resolve(run, "broadcast-PREDICTIONS-NOT-VERIFIED.json"),
          );
      }
      if (record.broadcast.code !== 0)
        throw Error(
          "Broadcast failed or partial: stop for two-provider receipt review. Never retry/resume automatically.",
        );
      console.log(
        "Owner command completed; addresses remain unverified until every receipt is checked on both providers.",
      );
    }
  } catch (error) {
    record.error = error.message;
    record.accepted = false;
    throw error;
  } finally {
    record.finishedAt = new Date().toISOString();
    record.originalBroadcastUnchanged =
      hash(await readFile(old)) === record.originalBroadcastSha256;
    await persist(resolve(run, "capture.json"), record);
    console.log("Recovery record: " + resolve(run, "capture.json"));
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((e) => {
    console.error("STOP: " + e.message);
    process.exitCode = 1;
  });
