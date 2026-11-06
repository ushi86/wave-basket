import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { foundry, root } from "./foundry.mjs";
import { writeManifest } from "./manifest.mjs";
const rpcUrl = "http://127.0.0.1:8545";
// Public Anvil default test key. Never used for Sepolia or real funds.
const demoKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const children = [];
let shuttingDown = false;
function stop() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill("SIGTERM");
}
process.on("SIGINT", () => {
  stop();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stop();
  process.exit(0);
});
process.on("exit", stop);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(file, args, env = process.env) {
  return new Promise((res, rej) => {
    const child = spawn(file, args, {
      cwd: resolve(root, "contracts"),
      env,
      stdio: "inherit",
    });
    children.push(child);
    child.on("error", rej);
    child.on("exit", (code) =>
      code === 0 ? res() : rej(new Error(`Command failed with exit ${code}`)),
    );
  });
}
try {
  try {
    await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      }),
      signal: AbortSignal.timeout(500),
    });
    throw new Error(
      "Port 8545 is already in use. Stop that node or use a separate port before launching the demo.",
    );
  } catch (e) {
    if (e.message?.startsWith("Port")) throw e;
  }
  console.log("Starting Wave Protocol on a disposable local Anvil chain…");
  const anvil = spawn(
    foundry("anvil"),
    [
      "--host",
      "127.0.0.1",
      "--port",
      "8545",
      "--chain-id",
      "31337",
      "--silent",
    ],
    { cwd: root, stdio: "ignore" },
  );
  children.push(anvil);
  anvil.on("error", (e) => {
    console.error(e.message);
    stop();
    process.exitCode = 1;
  });
  let online = false;
  for (let i = 0; i < 50; i++) {
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_chainId",
          params: [],
        }),
      });
      online = (await response.json()).result === "0x7a69";
      if (online) break;
    } catch {}
    await delay(200);
  }
  if (!online) throw new Error("Anvil did not become ready");
  mkdirSync(resolve(root, "deployments"), { recursive: true });
  await run(
    foundry("forge"),
    [
      "script",
      "script/DeployDemo.s.sol:DeployDemo",
      "--rpc-url",
      rpcUrl,
      "--broadcast",
      "--slow",
      "--non-interactive",
      "--code-size-limit",
      "100000",
      "--disable-code-size-limit",
      "--gas-limit",
      "1000000000",
    ],
    { ...process.env, DEPLOYER_PRIVATE_KEY: demoKey },
  );
  const manifest = writeManifest(
    resolve(root, "deployments/demo.json"),
    resolve(root, "web/public/deployment.local.json"),
    rpcUrl,
  );
  writeFileSync(
    resolve(root, "web/.env.local"),
    "VITE_DEPLOYMENT_URL=/deployment.local.json\n",
  );
  console.log(
    `\nWave Protocol deployed on local chain ${manifest.chainId}.\nDashboard: http://127.0.0.1:5173\nDemo reads are direct, counted, and labeled. No real assets or credentials are used.\n`,
  );
  const vite = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "dev", "-w", "web"],
    { cwd: root, stdio: "inherit" },
  );
  children.push(vite);
  vite.on("error", (e) => {
    console.error(e.message);
    stop();
    process.exitCode = 1;
  });
  vite.on("exit", (code) => {
    stop();
    process.exitCode = code ?? 1;
  });
} catch (error) {
  console.error(error.message);
  stop();
  process.exitCode = 1;
}
