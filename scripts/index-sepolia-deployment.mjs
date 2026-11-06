// Indexes REAL recorded hashes from two preserved attempts. No RPC/signing/writes to live manifests.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
const root = resolve(import.meta.dirname, "..");
const hash = (x) => createHash("sha256").update(x).digest("hex");
const json = (x) => JSON.stringify(x, null, 2) + "\n";
const need = (x, m) => {
  if (!x) throw Error(m);
};
if (process.argv.length !== 3)
  throw Error("Specify the completed nonce-20 capture.json");
const tailPath = resolve(root, process.argv[2]);
const tail = JSON.parse(await readFile(tailPath));
const prefixPath = resolve(root, tail.parent, "capture.json");
const prefix = JSON.parse(await readFile(prefixPath));
need(
  tail.mode === "broadcast" &&
    tail.broadcastAttempted &&
    prefix.mode === "broadcast",
  "Actual broadcast attempts required",
);
const sources = {
  ...tail.sources,
  "scripts/index-sepolia-deployment.mjs": hash(
    await readFile(import.meta.filename),
  ),
};
for (const [p, h] of Object.entries(prefix.sources))
  need(sources[p] === h, "Reviewed production source differs between attempts");
const originals = [
  resolve(prefix.broadcastRoot, "DeployDemo.s.sol/11155111/run-latest.json"),
  resolve(
    tail.broadcastRoot,
    "CompleteDeployment.s.sol/11155111/run-latest.json",
  ),
];
const bytes = await Promise.all(originals.map((p) => readFile(p)));
const records = bytes.map((b) => JSON.parse(b));
need(
  hash(bytes[0]) === tail.parentBroadcastSha256,
  "Original partial record changed",
);
const transactions = [
  ...records[0].transactions.slice(0, 19),
  ...records[1].transactions,
];
need(
  transactions.length === 42 &&
    new Set(transactions.map((t) => t.hash)).size === 42 &&
    transactions.every(
      (t, i) =>
        /^0x[0-9a-f]{64}$/i.test(t.hash ?? "") &&
        BigInt(t.transaction.nonce) === BigInt(i + 1),
    ),
  "42 distinct actual submitted hashes in nonce order required",
);
const byHash = new Map(
  records
    .flatMap((r) => r.receipts)
    .map((r) => [r.transactionHash.toLowerCase(), r]),
);
const receipts = transactions.map((t) => byHash.get(t.hash.toLowerCase()));
need(
  receipts.every((r) => r?.status === "0x1"),
  "All recorded receipts must be present and successful; RPC corroboration still required",
);
const planSummary = [
  ...prefix.planSummary.slice(0, 19),
  ...tail.planSummary.map((p, i) => ({
    ...p,
    name: prefix.planSummary[i + 19].name,
    function: prefix.planSummary[i + 19].function,
  })),
];
for (let i = 0; i < 42; i++)
  need(
    planSummary[i].inputHash === prefix.planSummary[i].inputHash &&
      planSummary[i].to?.toLowerCase() ===
        prefix.planSummary[i].to?.toLowerCase(),
    "Targets/calldata changed between attempts",
  );
const dir =
  "docs/readiness/sepolia-live-verification-" +
  new Date().toISOString().replace(/[:.]/g, "-");
await mkdir(resolve(root, dir));
const snapshots = [
  dir + "/broadcast-prefix.json",
  dir + "/broadcast-continuation.json",
];
for (let i = 0; i < snapshots.length; i++)
  await writeFile(resolve(root, snapshots[i]), bytes[i]);
const index = {
  scope:
    "DERIVED index of actual public broadcast records. No transaction was created, signed or sent by this indexer. Receipt verification is separate.",
  chain: 11155111,
  origins: originals.map((path, i) => ({
    path: snapshots[i],
    originalPath: path,
    sha256: hash(bytes[i]),
  })),
  transactions,
  receipts,
};
await writeFile(resolve(root, dir, "verification-index.json"), json(index));
const capture = {
  scope:
    "Derived verification input for real Sepolia operations across two preserved attempts; NOT a new broadcast or fabricated result",
  mode: "broadcast",
  isDerivedVerificationIndex: true,
  parents: [prefixPath, tailPath],
  sources,
  broadcastRecord: dir + "/verification-index.json",
  creations: prefix.creations,
  planSummary,
};
await writeFile(resolve(root, dir, "capture.json"), json(capture));
await writeFile(
  resolve(root, dir, "preflight.json"),
  await readFile(resolve(tailPath, "../preflight.json")),
);
await writeFile(
  resolve(root, dir, "broadcast-PREDICTIONS-NOT-VERIFIED.json"),
  await readFile(
    resolve(prefixPath, "../broadcast-PREDICTIONS-NOT-VERIFIED.json"),
  ),
);
await writeFile("/tmp/wave-current-verification-dir", dir);
console.log(dir + "/capture.json");
