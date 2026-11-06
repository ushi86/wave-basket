import { readFile, realpath } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { root } from "../../scripts/foundry.mjs";
import { validateEvidence, type EvidenceIO } from "./evidence";
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--json"))
  throw new Error(
    "Usage: npm run check:evidence -- [--json]. This command never writes artifacts.",
  );
const io: EvidenceIO = {
  read: async (path) => {
    const target = resolve(root, path);
    const rel = relative(root, target);
    if (
      rel.startsWith("..") ||
      rel.startsWith("/") ||
      /(^|\/)\.env(?:\.|$)/.test(rel)
    )
      return undefined;
    try {
      const actual = await realpath(target);
      if (relative(root, actual).startsWith("..")) return undefined;
      return await readFile(actual);
    } catch {
      return undefined;
    }
  },
  fetch: (url, init) =>
    fetch(url, {
      ...init,
      credentials: "omit",
      signal: AbortSignal.timeout(12_000),
    }),
};
try {
  const manifest = await io.read("evidence/submission.json");
  const result = await validateEvidence(
    manifest ? JSON.parse(new TextDecoder().decode(manifest)) : {},
    io,
  );
  if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(
      result.ok
        ? "Submission evidence validated. This is not eligibility certification."
        : "Submission evidence is INCOMPLETE. No artifacts were created or changed.",
    );
    for (const issue of result.issues) console.log(`- ${issue}`);
    for (const item of result.checked) console.log(`Verified: ${item}`);
  }
  process.exitCode = result.ok ? 0 : 1;
} catch (error) {
  console.error(
    `Evidence verification failed closed: ${error instanceof Error ? error.message : "invalid evidence input"}`,
  );
  process.exitCode = 1;
}
