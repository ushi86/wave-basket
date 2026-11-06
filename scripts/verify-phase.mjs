import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { relative, resolve } from "node:path";
import { root } from "./foundry.mjs";
const phase = process.argv[2];
if (!phase || !/^[a-z0-9-]+$/.test(phase))
  throw new Error("Usage: npm run verify:phase -- <lowercase-phase-name>");
const stamp = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace(/\.\d+Z$/, "Z");
const directory = resolve(root, "docs/readiness", `${phase}-${stamp}`);
await mkdir(directory, { recursive: true });
const checks = [
  ["typecheck", ["npm", "run", "typecheck"]],
  ["tests", ["npm", "test"]],
  ["web-build", ["npm", "run", "build"]],
  ["workflow-build", ["npm", "run", "build:workflow"]],
  ["contract-size", ["npm", "run", "check:contracts"]],
  [
    "foundry-verbose",
    [
      process.execPath,
      "scripts/foundry.mjs",
      "forge",
      "test",
      "--root",
      "contracts",
      "-vvv",
    ],
  ],
];
const report = {
  phase,
  scope: "local-check-only",
  startedAt: new Date().toISOString(),
  finishedAt: null,
  checks: [],
};
for (const [name, argv] of checks) {
  const startedAt = new Date().toISOString();
  const result = await new Promise((resolveResult) => {
    const child = spawn(argv[0], argv.slice(1), {
      cwd: root,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("error", (error) =>
      resolveResult({ exitCode: 1, output: output + error.message + "\n" }),
    );
    child.on("close", (code) => resolveResult({ exitCode: code ?? 1, output }));
  });
  const log = resolve(directory, `${name}.log`);
  await writeFile(log, result.output);
  report.checks.push({
    name,
    argv,
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode: result.exitCode,
    log: relative(root, log),
    sha256: createHash("sha256").update(result.output).digest("hex"),
  });
  console.log(
    `${name}: ${result.exitCode === 0 ? "passed" : "FAILED"} (${relative(root, log)})`,
  );
}
report.finishedAt = new Date().toISOString();
await writeFile(
  resolve(directory, "report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
process.exitCode = report.checks.every((check) => check.exitCode === 0) ? 0 : 1;
