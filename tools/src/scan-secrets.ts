import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { root } from "../../scripts/foundry.mjs";
import { scanSecretText, type SecretFinding } from "./secrets";
const git = (args: string[]) =>
  execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
const local = readFileSync(`${root}/scripts/local-demo.mjs`, "utf8");
const key = /const demoKey\s*=\s*["'](0x[a-f\d]{64})["']/i.exec(local)?.[1];
const allowed =
  key &&
  privateKeyToAccount(key as Hex).address.toLowerCase() ===
    "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    ? key
    : undefined;
const findings: SecretFinding[] = [];
const paths = git([
  "ls-files",
  "--cached",
  "--others",
  "--exclude-standard",
  "-z",
])
  .split("\0")
  .filter(Boolean);
for (const path of new Set(paths)) {
  try {
    const bytes = readFileSync(`${root}/${path}`);
    if (bytes.length < 5_000_000 && !bytes.includes(0))
      findings.push(...scanSecretText(path, bytes.toString("utf8"), allowed));
  } catch {
    /* deleted file */
  }
}
// Scan each committed version, preserving multiline assignments. No secret text is printed.
for (const revision of git(["rev-list", "--all"])
  .trim()
  .split("\n")
  .filter(Boolean)) {
  for (const path of git(["ls-tree", "-r", "--name-only", revision])
    .trim()
    .split("\n")
    .filter(Boolean)) {
    if (!/\.(?:[cm]?[jt]sx?|json|md|sol|ya?ml|toml|env|sh)$/.test(path))
      continue;
    const content = git(["show", `${revision}:${path}`]);
    findings.push(
      ...scanSecretText(path, content, allowed).map((finding) => ({
        ...finding,
        path: `${revision.slice(0, 7)}:${path}`,
      })),
    );
  }
}
console.log(
  JSON.stringify(
    {
      scope:
        "working tree and all reachable committed text versions; heuristic, not an audit",
      findings,
    },
    null,
    2,
  ),
);
process.exitCode = findings.length ? 1 : 0;
