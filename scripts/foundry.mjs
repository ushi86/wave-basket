import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export function foundry(tool) {
  const arch = process.arch === "x64" ? "amd64" : process.arch;
  const binary = process.platform === "win32" ? `${tool}.exe` : tool;
  const path = resolve(
    root,
    "node_modules/@foundry-rs",
    `${tool}-${process.platform}-${arch}`,
    "bin",
    binary,
  );
  if (existsSync(path)) return path;
  throw new Error(
    `Missing ${tool} binary. Run npm install with optional dependencies enabled.`,
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [tool, ...args] = process.argv.slice(2);
  const result = spawnSync(foundry(tool), args, {
    cwd: root,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
