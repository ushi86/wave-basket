// Explorer source publication/verification only. No wallet, signer or transaction submission.
import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { decodeFunctionData, encodeAbiParameters } from "viem";
import { isExactExplorerSource } from "./verify-sepolia-deployment.mjs";
const root = resolve(import.meta.dirname, "..");
if (process.argv.length !== 3 || !process.env.ETHERSCAN_API_KEY)
  throw Error(
    "Verified deployment report and privately configured explorer key required",
  );
const reportPath = resolve(root, process.argv[2]),
  dir = dirname(reportPath),
  proof = JSON.parse(await readFile(reportPath));
if (
  !proof.verified ||
  proof.receipts.length !== 42 ||
  proof.contracts.length !== 12
)
  throw Error("Full canonical deployment proof is required");
const capture = JSON.parse(await readFile(proof.capture));
const index = JSON.parse(
  await readFile(resolve(root, capture.broadcastRecord)),
);
const d = proof.manifest,
  key = process.env.ETHERSCAN_API_KEY;
const digest = (x) => createHash("sha256").update(x).digest("hex");
const result = {
  scope:
    "Real Etherscan source verification, not transaction or CRE/privacy evidence",
  startedAt: new Date().toISOString(),
  contracts: [],
  allVerified: false,
};
const wait = () => new Promise((r) => setTimeout(r, 1500));
async function explorer(address) {
  await wait();
  const url = new URL("https://api.etherscan.io/v2/api");
  for (const [k, v] of Object.entries({
    chainid: "11155111",
    module: "contract",
    action: "getsourcecode",
    address,
    apikey: key,
  }))
    url.searchParams.set(k, v);
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
    const data = await response.json();
    const row = Array.isArray(data.result) ? data.result[0] : null;
    return row?.SourceCode
      ? {
          name: row.ContractName,
          compiler: row.CompilerVersion,
          optimizer: row.OptimizationUsed,
          runs: row.Runs,
          evmVersion: row.EVMVersion,
          similarMatch: row.SimilarMatch ?? "",
          proxy: row.Proxy,
          constructorArgsSha256: digest(
            "0x" + (row.ConstructorArguments ?? "").replace(/^0x/, ""),
          ),
          sourceSha256: digest(row.SourceCode),
          abiSha256: digest(row.ABI),
        }
      : null;
  } catch {
    return null;
  }
}
try {
  const factoryArtifact = JSON.parse(
    await readFile(
      resolve(root, "contracts/out/WaveFactory.sol/WaveFactory.json"),
    ),
  );
  const basketTx = index.transactions[32].transaction;
  const basket = decodeFunctionData({
    abi: factoryArtifact.abi,
    data: basketTx.input ?? basketTx.data,
  });
  for (const c of proof.contracts) {
    const artifactPath = c.artifact.includes("/")
      ? c.artifact
      : c.artifact + ".sol/" + c.artifact;
    const a = JSON.parse(
      await readFile(resolve(root, "contracts/out", artifactPath + ".json")),
    );
    const name = artifactPath.split("/").at(-1);
    const source =
      name === "DemoToken"
        ? "src/mocks/DemoAssets.sol:DemoToken"
        : name === "DemoLiquiditySeeder"
          ? "src/mocks/DemoLiquiditySeeder.sol:DemoLiquiditySeeder"
          : name === "WaveVaultDeployer"
            ? "src/WaveFactory.sol:WaveVaultDeployer"
            : "src/" + name + ".sol:" + name;
    let args = "0x";
    if (c.name === "flagship")
      args = encodeAbiParameters(
        a.abi.find((x) => x.type === "constructor").inputs,
        [
          basket.args[0],
          basket.args[1],
          basket.args[2],
          basket.args[3],
          {
            factory: d.factory,
            creator: "0xDe25D83481c0c2A711397c44eE3317dD826952D5",
            registry: d.registry,
            adapter: d.adapter,
            usdc: d.usdc,
            treasury: "0xDe25D83481c0c2A711397c44eE3317dD826952D5",
            perfFeeBps: basket.args[4],
          },
        ],
      );
    else if (c.name !== "vaultDeployer") {
      const nonce = proof.receipts.find(
        (r) => r.transactionHash === c.creationTransactionHash,
      ).nonce;
      const tx = index.transactions[nonce - 1].transaction;
      const input = tx.input ?? tx.data;
      const init = c.name === "hook" ? "0x" + input.slice(66) : input;
      if (!init.startsWith(a.bytecode.object))
        throw Error("Creation code does not match current artifact: " + c.name);
      args = "0x" + init.slice(a.bytecode.object.length);
    }
    const row = {
      name: c.name,
      address: c.address,
      source,
      constructorArgsSha256: digest(args),
      verified: false,
    };
    let status = await explorer(c.address);
    if (
      !isExactExplorerSource(
        status,
        name,
        a.metadata.compiler.version,
        row.constructorArgsSha256,
      )
    ) {
      const argv = [
        "verify-contract",
        c.address,
        source,
        "--chain",
        "11155111",
        "--watch",
        "--skip-is-verified-check",
        "--constructor-args",
        args,
        "--compiler-version",
        a.metadata.compiler.version,
        "--num-of-optimizations",
        "200",
        "--via-ir",
        "--evm-version",
        "cancun",
        "--retries",
        "10",
        "--delay",
        "5",
      ];
      const env = { ...process.env };
      for (const k of Object.keys(env))
        if (
          k.startsWith("FOUNDRY_") ||
          ["PRIVATE_KEY", "DEPLOYER_PRIVATE_KEY", "ETH_PRIVATE_KEY"].includes(k)
        )
          delete env[k];
      const outcome = await new Promise((res, rej) => {
        const child = spawn(resolve(homedir(), ".foundry/bin/forge"), argv, {
          cwd: resolve(root, "contracts"),
          env,
          stdio: ["ignore", "pipe", "pipe"],
        });
        let output = "";
        child.stdout.on("data", (c) => (output += c));
        child.stderr.on("data", (c) => (output += c));
        child.once("error", rej);
        child.once("close", (code) =>
          res({ code, output: output.split(key).join("<REDACTED>") }),
        );
      });
      row.commandExitCode = outcome.code;
      row.log = "source-" + c.name + ".log";
      await writeFile(resolve(dir, row.log), outcome.output);
      status = await explorer(c.address);
    }
    row.verified = isExactExplorerSource(
      status,
      name,
      a.metadata.compiler.version,
      row.constructorArgsSha256,
    );
    if (status) row.explorer = status;
    result.contracts.push(row);
    console.log(
      c.name + ": " + (row.verified ? "source verified" : "SOURCE UNVERIFIED"),
    );
  }
  result.allVerified =
    result.contracts.length === 12 && result.contracts.every((r) => r.verified);
  if (!result.allVerified) process.exitCode = 1;
} catch (error) {
  result.error = error.message.split(key).join("<REDACTED>");
  process.exitCode = 1;
} finally {
  result.finishedAt = new Date().toISOString();
  await writeFile(
    resolve(dir, "explorer-verification.json"),
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      allVerified: result.allVerified,
      checked: result.contracts.length,
      error: result.error,
    }),
  );
}
