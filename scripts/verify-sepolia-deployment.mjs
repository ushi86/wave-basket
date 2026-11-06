// Read-only corroboration. Never sends, signs, resumes, or installs a manifest.
import { readFile, writeFile, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  decodeEventLog,
  decodeFunctionData,
  decodeFunctionResult,
  encodeFunctionData,
  encodeAbiParameters,
  parseAbi,
  keccak256,
  toHex,
} from "viem";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OWNER = "0xde25d83481c0c2a711397c44ee3317dd826952d5";
const RPCS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.gateway.tenderly.co",
];
const hash = (x) => createHash("sha256").update(x).digest("hex");
const json = (x) =>
  JSON.stringify(x, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2) +
  "\n";
const lower = (x) => (typeof x === "string" ? x.toLowerCase() : x);
const same = (a, b) => json(a) === json(b);
const need = (condition, message) => {
  if (!condition) throw Error(message);
};

export function requireReceiptPair(receipts, transactionHash) {
  need(
    receipts.length === 2 &&
      receipts.every(
        (r) =>
          r &&
          lower(r.transactionHash) === lower(transactionHash) &&
          r.status === "0x1" &&
          /^0x[0-9a-f]{64}$/i.test(r.blockHash) &&
          lower(r.from) === OWNER &&
          r.logs.every(
            (l) =>
              !l.removed &&
              lower(l.transactionHash) === lower(transactionHash) &&
              l.blockHash === r.blockHash,
          ),
      ),
    "Missing, reverted, malformed, or unexpected-sender receipt",
  );
  const normalize = (r) => ({
    blockHash: r.blockHash,
    blockNumber: r.blockNumber,
    transactionIndex: r.transactionIndex,
    from: lower(r.from),
    to: lower(r.to),
    contractAddress: lower(r.contractAddress),
    gasUsed: r.gasUsed,
    effectiveGasPrice: r.effectiveGasPrice,
    logs: r.logs.map((l) => ({
      address: lower(l.address),
      topics: l.topics.map(lower),
      data: lower(l.data),
      logIndex: l.logIndex,
    })),
  });
  need(
    same(normalize(receipts[0]), normalize(receipts[1])),
    "Providers disagree on receipt, logs, gas, or contract address",
  );
}

export function requireTransaction(tx, planned, receipt) {
  need(
    tx &&
      lower(tx.hash) === lower(receipt.transactionHash) &&
      tx.blockHash === receipt.blockHash &&
      tx.blockNumber === receipt.blockNumber &&
      lower(tx.from) === OWNER &&
      lower(tx.to) === lower(planned.to) &&
      BigInt(tx.nonce) === BigInt(planned.nonce) &&
      BigInt(tx.chainId) === 11155111n &&
      BigInt(tx.value) === 0n &&
      hash(tx.input) === planned.inputHash &&
      BigInt(tx.gas) === BigInt(planned.gasLimit),
    "Canonical transaction differs from reviewed sender, chain, nonce, target, input, value, or gas limit",
  );
}

export function requireRuntime(code, artifact) {
  need(/^0x[0-9a-f]+$/i.test(code), "No deployed code");
  const actual = Buffer.from(code.slice(2), "hex");
  const expected = Buffer.from(
    artifact.deployedBytecode.object.slice(2),
    "hex",
  );
  need(
    actual.length === expected.length && actual.length <= 24576,
    "Runtime size mismatch or conservative limit exceeded",
  );
  const immutableValues = [];
  for (const references of Object.values(
    artifact.deployedBytecode.immutableReferences ?? {},
  )) {
    const values = references.map(({ start, length }) =>
      actual.subarray(start, start + length).toString("hex"),
    );
    need(
      values.every((v) => v === values[0]),
      "Repeated immutable values disagree",
    );
    immutableValues.push("0x" + values[0]);
    for (const { start, length } of references) {
      actual.fill(0, start, start + length);
      expected.fill(0, start, start + length);
    }
  }
  need(
    actual.equals(expected),
    "Runtime instruction bytes or metadata differ from compiled artifact",
  );
  return { bytes: actual.length, codeHash: keccak256(code), immutableValues };
}

async function main() {
  need(
    process.argv.length === 3,
    "Usage: node scripts/verify-sepolia-deployment.mjs <broadcast capture.json>",
  );
  const capturePath = resolve(ROOT, process.argv[2]);
  const directory = dirname(capturePath);
  const capture = JSON.parse(await readFile(capturePath));
  need(
    capture.mode === "broadcast",
    "A real broadcast capture is required, never a dry-run capture",
  );
  try {
    await copyFile(
      resolve(directory, "verified-deployment.json"),
      resolve(directory, "verification-attempt-" + Date.now() + ".json"),
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const report = {
    scope:
      "Live Sepolia deployment corroboration on PublicNode and Tenderly; provider diversity, not proof of independent infrastructure",
    startedAt: new Date().toISOString(),
    capture: capturePath,
    providers: RPCS,
    verified: false,
    receipts: [],
    contracts: [],
    state: [],
    errors: [],
  };
  let id = 0;
  const clocks = [0, 0];
  const methods = new Set([
    "eth_chainId",
    "eth_blockNumber",
    "eth_getTransactionReceipt",
    "eth_getTransactionByHash",
    "eth_getBlockByNumber",
    "eth_getCode",
    "eth_call",
    "eth_getBalance",
    "eth_getTransactionCount",
  ]);
  async function rpc(index, method, params) {
    need(methods.has(method), "Only explicit read-only methods are allowed");
    for (let attempt = 0; attempt < 4; attempt++) {
      const delay = Math.max(0, clocks[index] + 750 - Date.now());
      if (delay) await new Promise((r) => setTimeout(r, delay));
      clocks[index] = Date.now();
      try {
        const response = await fetch(RPCS[index], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
          signal: AbortSignal.timeout(25000),
        });
        if (response.status === 429) throw Error("Read-only RPC rate limit");
        need(response.ok, `Read-only RPC HTTP ${response.status}`);
        const data = await response.json();
        need(
          !data.error && Object.hasOwn(data, "result"),
          `Read-only RPC error: ${method}`,
        );
        return data.result;
      } catch (error) {
        if (attempt === 3) throw error;
        await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
      }
    }
  }
  const both = (method, params) =>
    Promise.all(RPCS.map((_, i) => rpc(i, method, params)));
  const artifacts = {};
  const artifact = async (name) =>
    (artifacts[name] ??= JSON.parse(
      await readFile(
        resolve(
          ROOT,
          "contracts/out",
          name.includes("/") ? name + ".json" : name + ".sol/" + name + ".json",
        ),
      ),
    ));
  try {
    need(
      (await both("eth_chainId", [])).every((x) => x === "0xaa36a7"),
      "Both providers must confirm Sepolia",
    );
    for (const [path, expected] of Object.entries(capture.sources))
      need(
        hash(await readFile(resolve(ROOT, path))) === expected,
        "Reviewed sources changed: " + path,
      );
    const broadcast = JSON.parse(
      await readFile(
        capture.broadcastRecord
          ? resolve(ROOT, capture.broadcastRecord)
          : resolve(
              capture.broadcastRoot,
              "DeployDemo.s.sol/11155111/run-latest.json",
            ),
      ),
    );
    need(
      broadcast.chain === 11155111 &&
        capture.planSummary.length === 42 &&
        broadcast.transactions.length === 42,
      "Complete 42-operation Sepolia plan required",
    );
    const submitted = broadcast.transactions.filter((t) => t.hash);
    need(
      submitted.length > 0 &&
        new Set(submitted.map((t) => t.hash)).size === submitted.length &&
        submitted.every(
          (t, i) =>
            /^0x[0-9a-f]{64}$/i.test(t.hash) &&
            t.hash === broadcast.transactions[i].hash,
        ),
      "Unique real hashes in the submitted nonce prefix required",
    );
    report.submittedCount = submitted.length;
    report.receiptFailures = [];
    const blocks = new Map();
    const liveTransactions = [];
    for (let i = 0; i < submitted.length; i++) {
      const planned = capture.planSummary[i];
      const txHash = broadcast.transactions[i].hash;
      let observations;
      try {
        need(planned.nonce === i + 1, "Unexpected nonce sequence");
        const receipts = await both("eth_getTransactionReceipt", [txHash]);
        observations = receipts;
        requireReceiptPair(receipts, txHash);
        const transactions = await both("eth_getTransactionByHash", [txHash]);
        for (let j = 0; j < 2; j++)
          requireTransaction(transactions[j], planned, receipts[j]);
        const blockNumber = receipts[0].blockNumber;
        if (!blocks.has(blockNumber))
          blocks.set(
            blockNumber,
            await both("eth_getBlockByNumber", [blockNumber, false]),
          );
        const canonical = blocks.get(blockNumber);
        need(
          canonical.every(
            (b) =>
              b && b.hash === receipts[0].blockHash && b.number === blockNumber,
          ) && canonical[0].timestamp === canonical[1].timestamp,
          "Receipt block is not canonical on both providers",
        );
        const creation = capture.creations.find((c) => c.nonce === i + 1);
        if (creation?.type === "CREATE")
          need(
            lower(receipts[0].contractAddress) ===
              lower(creation.predictedAddress),
            "Created address differs from reviewed prediction",
          );
        const summaries = transactions.map((t) => ({
          hash: t.hash,
          chainId: t.chainId,
          from: t.from,
          to: t.to,
          nonce: t.nonce,
          value: t.value,
          gas: t.gas,
          inputHash: hash(t.input),
        }));
        report.receipts.push({
          nonce: i + 1,
          transactionHash: txHash,
          blockNumber: Number(BigInt(blockNumber)),
          blockHash: receipts[0].blockHash,
          action: planned.function ?? planned.name,
          canonicalTimestamp: Number(BigInt(canonical[0].timestamp)),
          providers: receipts,
          transactions: summaries,
        });
        liveTransactions.push(transactions[0]);
        console.log(
          `Corroborated ${i + 1}/42: ${txHash} at ${Number(BigInt(blockNumber))}`,
        );
      } catch (error) {
        report.receiptFailures.push({
          nonce: i + 1,
          transactionHash: txHash,
          providers: observations,
          error: error.message,
        });
        console.log(`Receipt check failed at nonce ${i + 1}: ${error.message}`);
      }
    }
    need(
      report.receiptFailures.length === 0 && report.receipts.length === 42,
      "All 42 operations must have corroborated successful canonical receipts; partial results are retained, never promoted",
    );
    const heads = await both("eth_blockNumber", []);
    const snapshot = heads.map(BigInt).reduce((a, b) => (a < b ? a : b)) - 3n;
    need(
      snapshot >= BigInt(report.receipts.at(-1).blockNumber),
      "Wait for at least three block confirmations, then repeat reads only",
    );
    const snapshotTag = toHex(snapshot);
    const snapshotBlocks = await both("eth_getBlockByNumber", [
      snapshotTag,
      false,
    ]);
    need(
      snapshotBlocks[0]?.hash &&
        snapshotBlocks[0].hash === snapshotBlocks[1]?.hash &&
        snapshotBlocks[0].timestamp === snapshotBlocks[1].timestamp,
      "State snapshot is not canonical on both providers",
    );
    report.stateBlock = {
      number: Number(snapshot),
      hash: snapshotBlocks[0].hash,
      timestamp: Number(BigInt(snapshotBlocks[0].timestamp)),
    };
    const d = JSON.parse(
      await readFile(
        resolve(directory, "broadcast-PREDICTIONS-NOT-VERIFIED.json"),
      ),
    );
    const preflight = JSON.parse(
      await readFile(resolve(directory, "preflight.json")),
    );
    need(
      d.chainId === 11155111 &&
        d.oracleMode === "chainlink" &&
        d.mockTokens === true &&
        d.receiverMode === "simulation" &&
        d.reportVersion === 2 &&
        d.maxReportAge === 900 &&
        ["usdc", "eth", "btc", "link"].every(
          (s) => d[s + "FeedMock"] === false,
        ),
      "Manifest disclosures/configuration differ from reviewed plan",
    );
    need(
      lower(d.poolManager) === lower(preflight.settings.POOL_MANAGER) &&
        lower(d.forwarder) === lower(preflight.settings.CRE_FORWARDER) &&
        ["usdc", "eth", "btc", "link"].every(
          (s) =>
            lower(d[s + "Feed"]) ===
            lower(preflight.settings[s.toUpperCase() + "_FEED"]),
        ),
      "Reused manager, forwarder or feed addresses differ from reviewed configuration",
    );
    const definitions = [
      ["usdc", "DemoAssets.sol/DemoToken", 1],
      ["eth", "DemoAssets.sol/DemoToken", 2],
      ["btc", "DemoAssets.sol/DemoToken", 3],
      ["link", "DemoAssets.sol/DemoToken", 4],
      ["registry", "AssetRegistry", 5],
      ["adapter", "WaveSwapAdapter", 10],
      ["seeder", "DemoLiquiditySeeder", 11],
      ["factory", "WaveFactory", 31],
      ["hook", "NavGuardHook", 34],
      ["receiver", "WaveRebalanceReceiver", 41],
      ["vaultDeployer", "WaveFactory.sol/WaveVaultDeployer", 31],
      ["flagship", "WaveVault", 33],
    ];
    d.vaultDeployer = capture.creations.find(
      (c) => c.name === "WaveVaultDeployer",
    ).predictedAddress;
    const targetAbis = new Map();
    const runtimeByName = {};
    for (const [key, name, creationNonce] of definitions) {
      const prediction =
        key === "vaultDeployer"
          ? capture.creations.find((c) => c.name === "WaveVaultDeployer")
          : key === "flagship"
            ? capture.creations.find((c) => c.name === "WaveVault (flagship)")
            : capture.creations.find((c) => c.nonce === creationNonce);
      need(
        lower(d[key]) === lower(prediction?.predictedAddress),
        "Manifest address differs from corroborated creation: " + key,
      );
      const a = await artifact(name);
      const codes = await both("eth_getCode", [d[key], snapshotTag]);
      need(codes[0] === codes[1], "Runtime disagrees across providers: " + key);
      const runtime = requireRuntime(codes[0], a);
      runtimeByName[key] = runtime;
      const receipt = report.receipts[creationNonce - 1];
      report.contracts.push({
        name: key,
        address: d[key],
        artifact: name,
        creationTransactionHash: receipt.transactionHash,
        creationBlockNumber: receipt.blockNumber,
        ...runtime,
      });
      targetAbis.set(lower(d[key]), a.abi);
    }
    const padded = (x) => "0x" + x.slice(2).toLowerCase().padStart(64, "0");
    need(
      same(
        [...runtimeByName.factory.immutableValues].sort(),
        [d.registry, d.adapter, d.usdc, OWNER, d.vaultDeployer]
          .map(padded)
          .sort(),
      ),
      "Factory private deployer or public immutables differ",
    );
    need(
      same(runtimeByName.vaultDeployer.immutableValues, [padded(d.factory)]),
      "Internal deployer is not bound to the verified factory",
    );
    const managerAbi = (await artifact("IPoolManager")).abi;
    targetAbis.set(lower(d.poolManager), managerAbi);
    const events = [...targetAbis.values()]
      .flat()
      .filter((x) => x.type === "event");
    function event(receipt, emitter, eventName, predicate = () => true) {
      for (const log of receipt.providers[0].logs) {
        if (lower(log.address) !== lower(emitter)) continue;
        try {
          const decoded = decodeEventLog({
            abi: events,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === eventName && predicate(decoded.args))
            return decoded.args;
        } catch {}
      }
      throw Error(
        `Missing expected ${eventName} log at nonce ${receipt.nonce}`,
      );
    }
    const poolKeyType = {
      type: "tuple",
      components: [
        { name: "currency0", type: "address" },
        { name: "currency1", type: "address" },
        { name: "fee", type: "uint24" },
        { name: "tickSpacing", type: "int24" },
        { name: "hooks", type: "address" },
      ],
    };
    const poolId = (key) =>
      keccak256(encodeAbiParameters([poolKeyType], [key]));
    const pools = [];
    for (let i = 0; i < 42; i++) {
      const tx = liveTransactions[i],
        receipt = report.receipts[i];
      if (!tx.to || i === 33) continue;
      const decoded = decodeFunctionData({
        abi: targetAbis.get(lower(tx.to)),
        data: tx.input,
      });
      const args = decoded.args;
      switch (decoded.functionName) {
        case "setAsset":
          event(
            receipt,
            d.registry,
            "AssetConfigured",
            (x) =>
              lower(x.token) === lower(args[0]) &&
              lower(x.feed) === lower(args[1]) &&
              x.allowed === true,
          );
          break;
        case "faucet":
          event(
            receipt,
            tx.to,
            "Transfer",
            (x) =>
              BigInt(x.from) === 0n && lower(x.to) === OWNER && x.value > 0n,
          );
          break;
        case "approve":
          event(
            receipt,
            tx.to,
            "Approval",
            (x) =>
              lower(x.owner) === OWNER &&
              lower(x.spender) === lower(args[0]) &&
              x.value === args[1],
          );
          break;
        case "initialize":
          event(
            receipt,
            d.poolManager,
            "Initialize",
            (x) =>
              lower(x.id) === lower(poolId(args[0])) &&
              x.sqrtPriceX96 === args[1],
          );
          pools.push(args[0]);
          break;
        case "setPool":
          event(
            receipt,
            d.adapter,
            "PoolConfigured",
            (x) =>
              lower(x.token0) === lower(args[0].currency0) &&
              lower(x.token1) === lower(args[0].currency1) &&
              x.fee === args[0].fee &&
              lower(x.hook) === lower(args[0].hooks),
          );
          break;
        case "seed":
          event(
            receipt,
            d.poolManager,
            "ModifyLiquidity",
            (x) =>
              lower(x.id) === lower(poolId(args[0])) &&
              lower(x.sender) === lower(d.seeder) &&
              x.liquidityDelta === args[1] &&
              x.liquidityDelta > 0n,
          );
          break;
        case "createBasket":
          event(
            receipt,
            d.factory,
            "BasketCreated",
            (x) =>
              lower(x.vault) === lower(d.flagship) &&
              lower(x.creator) === OWNER &&
              same(x.assets.map(lower), args[2].map(lower)) &&
              same(x.targetBps, args[3]) &&
              x.perfFeeBps === args[4],
          );
          event(
            receipt,
            d.flagship,
            "Deposited",
            (x) =>
              lower(x.user) === OWNER && x.usdcIn === args[5] && x.shares > 0n,
          );
          break;
        case "registerPool":
          event(
            receipt,
            d.hook,
            "PoolRegistered",
            (x) =>
              lower(x.id) === lower(d.flagshipPoolId) &&
              lower(x.vault) === lower(d.flagship),
          );
          break;
        case "setRebalancer":
          event(
            receipt,
            d.factory,
            "RebalancerSet",
            (x) => lower(x.receiver) === lower(d.receiver),
          );
          break;
        default:
          throw Error(
            "Unrecognized deployment action: " + decoded.functionName,
          );
      }
    }
    need(pools.length === 4, "Four initialized v4 pools required");
    report.operationEventsVerified = liveTransactions.filter(
      (t, i) => t.to && i !== 33,
    ).length;
    async function read(label, address, name, functionName, args, predicate) {
      const abi = typeof name === "string" ? (await artifact(name)).abi : name;
      const data = encodeFunctionData({ abi, functionName, args });
      const values = await both("eth_call", [
        { to: address, data },
        snapshotTag,
      ]);
      need(values[0] === values[1], "Providers disagree on state: " + label);
      const value = decodeFunctionResult({
        abi,
        functionName,
        data: values[0],
      });
      need(predicate(value), "Unexpected deployed state: " + label);
      report.state.push({ label, address, functionName, args, value });
      return value;
    }
    const eqAddr = (expected) => (x) => lower(x) === lower(expected);
    for (const [key, name] of definitions.filter(([key]) =>
      ["registry", "adapter", "seeder", "factory", "hook", "flagship"].includes(
        key,
      ),
    ))
      await read(key + ".owner", d[key], name, "owner", [], eqAddr(OWNER));
    for (const [key, name] of [
      ["factory", "WaveFactory"],
      ["flagship", "WaveVault"],
    ])
      for (const [field, expected] of [
        ["registry", d.registry],
        ["adapter", d.adapter],
        ["usdc", d.usdc],
        ["treasury", OWNER],
      ])
        await read(
          key + "." + field,
          d[key],
          name,
          field,
          [],
          eqAddr(expected),
        );
    await read(
      "factory.rebalancer",
      d.factory,
      "WaveFactory",
      "rebalancer",
      [],
      eqAddr(d.receiver),
    );
    await read(
      "factory.basketsLength",
      d.factory,
      "WaveFactory",
      "basketsLength",
      [],
      (x) => x === 1n,
    );
    await read(
      "factory.firstBasket",
      d.factory,
      "WaveFactory",
      "baskets",
      [0n],
      eqAddr(d.flagship),
    );
    await read(
      "factory.isBasket",
      d.factory,
      "WaveFactory",
      "isBasket",
      [d.flagship],
      (x) => x === true,
    );
    await read(
      "flagship.factory",
      d.flagship,
      "WaveVault",
      "factory",
      [],
      eqAddr(d.factory),
    );
    for (const [field, expected] of [
      ["perfFeeBps", 1000],
      ["MAX_WEIGHT_BPS", 5000],
      ["MAX_TURNOVER_BPS", 2000],
      ["MAX_SLIPPAGE_BPS", 100],
      ["WEIGHT_TIMELOCK", 600],
      ["MIN_INTERVAL", 300],
      ["WITHDRAWAL_FEE_BPS", 10],
      ["rebalanceCount", 0],
    ])
      await read(
        "flagship." + field,
        d.flagship,
        "WaveVault",
        field,
        [],
        (x) => BigInt(x) === BigInt(expected),
      );
    await read(
      "flagship.assets",
      d.flagship,
      "WaveVault",
      "assetList",
      [],
      (x) => same(x.map(lower), [d.eth, d.btc, d.link].map(lower)),
    );
    await read(
      "flagship.targetWeights",
      d.flagship,
      "WaveVault",
      "targetWeights",
      [],
      (x) => same(x, [4000, 3500, 2500]),
    );
    await read(
      "flagship.nav",
      d.flagship,
      "WaveVault",
      "navUsdc",
      [],
      (x) => x[0] > 0n && x[1] === true,
    );
    await read(
      "flagship.totalSupply",
      d.flagship,
      "WaveVault",
      "totalSupply",
      [],
      (x) => x > 0n,
    );
    for (const [key, name, field] of [
      ["adapter", "WaveSwapAdapter", "manager"],
      ["seeder", "DemoLiquiditySeeder", "manager"],
      ["hook", "NavGuardHook", "poolManager"],
    ])
      await read(
        key + ".manager",
        d[key],
        name,
        field,
        [],
        eqAddr(d.poolManager),
      );
    for (const [field, expected] of [
      ["forwarder", d.forwarder],
      ["factory", d.factory],
      ["expectedAuthor", OWNER],
    ])
      await read(
        "receiver." + field,
        d.receiver,
        "WaveRebalanceReceiver",
        field,
        [],
        eqAddr(expected),
      );
    await read(
      "receiver.simulationMode",
      d.receiver,
      "WaveRebalanceReceiver",
      "simulationMode",
      [],
      (x) => x === true,
    );
    await read(
      "receiver.maxReportAge",
      d.receiver,
      "WaveRebalanceReceiver",
      "maxReportAge",
      [],
      (x) => x === 900n,
    );
    await read(
      "receiver.expectedWorkflowId",
      d.receiver,
      "WaveRebalanceReceiver",
      "expectedWorkflowId",
      [],
      (x) => lower(x) === lower(preflight.settings.WORKFLOW_ID),
    );
    await read(
      "receiver.expectedWorkflowName",
      d.receiver,
      "WaveRebalanceReceiver",
      "expectedWorkflowName",
      [],
      (x) => lower(x) === lower(preflight.settings.WORKFLOW_NAME.slice(0, 22)),
    );
    await read(
      "receiver.lastNonce",
      d.receiver,
      "WaveRebalanceReceiver",
      "lastNonce",
      [d.flagship],
      (x) => x === 0n,
    );
    await read(
      "hook.approvedPoolId",
      d.hook,
      "NavGuardHook",
      "approvedPoolId",
      [],
      (x) => lower(x) === lower(d.flagshipPoolId),
    );
    await read(
      "hook.poolConfigured",
      d.hook,
      "NavGuardHook",
      "poolConfigured",
      [],
      (x) => x === true,
    );
    await read(
      "hook.vault",
      d.hook,
      "NavGuardHook",
      "vaults",
      [d.flagshipPoolId],
      eqAddr(d.flagship),
    );
    await read(
      "hook.snapshot",
      d.hook,
      "NavGuardHook",
      "poolSnapshot",
      [],
      (x) => x[0] > 0n && x[1] > 0n && x[2] === true,
    );
    for (const [i, key] of ["usdc", "eth", "btc", "link"].entries()) {
      const decimals = [6, 18, 8, 18][i];
      const amount = [
        1000000000n * 10n ** 6n,
        1000000n * 10n ** 18n,
        1000000n * 10n ** 8n,
        100000000n * 10n ** 18n,
      ][i];
      await read(
        key + ".registry",
        d.registry,
        "AssetRegistry",
        "assets",
        [d[key]],
        (x) =>
          lower(x[0]) === lower(d[key + "Feed"]) &&
          x[1] === (i === 0 ? 108000 : 4500) &&
          x[2] === decimals &&
          x[3] === 8 &&
          x[4] === 1n &&
          x[5] === 100000000000000n &&
          x[6] === true,
      );
      await read(
        key + ".claimAmount",
        d[key],
        "DemoAssets.sol/DemoToken",
        "claimAmount",
        [],
        (x) => x === amount,
      );
      await read(
        key + ".supply",
        d[key],
        "DemoAssets.sol/DemoToken",
        "totalSupply",
        [],
        (x) => x === amount,
      );
      await read(
        key + ".claimCooldown",
        d[key],
        "DemoAssets.sol/DemoToken",
        "nextClaim",
        [OWNER],
        (x) => x === BigInt(report.receipts[i + 11].canonicalTimestamp + 3600),
      );
    }
    const storageAbi = parseAbi([
      "function extsload(bytes32 slot) view returns(bytes32)",
    ]);
    for (const key of pools) {
      const id = poolId(key);
      await read(
        "adapter.pool." + id,
        d.adapter,
        "WaveSwapAdapter",
        "poolFor",
        [key.currency0, key.currency1],
        (x) => same(Object.values(x).map(lower), Object.values(key).map(lower)),
      );
      const slot = keccak256(
        encodeAbiParameters(
          [{ type: "bytes32" }, { type: "uint256" }],
          [id, 6n],
        ),
      );
      await read(
        "pool.slot0." + id,
        d.poolManager,
        storageAbi,
        "extsload",
        [slot],
        (x) => (BigInt(x) & ((1n << 160n) - 1n)) > 0n,
      );
      await read(
        "pool.liquidity." + id,
        d.poolManager,
        storageAbi,
        "extsload",
        [toHex(BigInt(slot) + 3n, { size: 32 })],
        (x) => (BigInt(x) & ((1n << 128n) - 1n)) > 0n,
      );
    }
    const nonce = await both("eth_getTransactionCount", [OWNER, snapshotTag]);
    need(
      nonce.every((x) => BigInt(x) === 43n),
      "Verified deployment must end at public nonce 43",
    );
    for (const [address, expectedHash] of [
      [d.poolManager, preflight.rows[0].managerCodeHash],
      [d.forwarder, preflight.rows[0].forwarderCodeHash],
    ]) {
      const code = await both("eth_getCode", [address, snapshotTag]);
      need(
        code[0] === code[1] && keccak256(code[0]) === expectedHash,
        "Reused contract code changed",
      );
      report.state.push({
        label: "reusedCodeHash",
        address,
        codeHash: expectedHash,
      });
    }
    report.deployerBalanceWei = (
      await both("eth_getBalance", [OWNER, snapshotTag])
    ).map((x) => BigInt(x).toString());
    need(
      report.deployerBalanceWei[0] === report.deployerBalanceWei[1],
      "Providers disagree on remaining balance",
    );
    const closingBlocks = await both("eth_getBlockByNumber", [
      snapshotTag,
      false,
    ]);
    need(
      closingBlocks.every((b) => b?.hash === report.stateBlock.hash),
      "Canonical state snapshot changed during verification",
    );
    report.totalGasUsed = report.receipts.reduce(
      (n, r) => n + BigInt(r.providers[0].gasUsed),
      0n,
    );
    report.totalFeeWei = report.receipts.reduce(
      (n, r) =>
        n +
        BigInt(r.providers[0].gasUsed) *
          BigInt(r.providers[0].effectiveGasPrice),
      0n,
    );
    report.manifest = {
      ...d,
      deployBlock: String(report.receipts[0].blockNumber),
      deploymentCompleteBlock: report.receipts.at(-1).blockNumber,
      deploymentVerifiedAt: new Date().toISOString(),
      deploymentReceiptVerification:
        "docs/readiness/" +
        directory.split("/").at(-1) +
        "/verified-deployment.json",
    };
    report.verified = true;
  } catch (error) {
    report.errors.push(error.message);
    process.exitCode = 1;
  } finally {
    report.finishedAt = new Date().toISOString();
    await writeFile(
      resolve(directory, "verified-deployment.json"),
      json(report),
    );
    console.log(
      json({
        verified: report.verified,
        receipts: report.receipts.length,
        contracts: report.contracts.length,
        stateChecks: report.state.length,
        errors: report.errors,
      }),
    );
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
