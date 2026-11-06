import { createHash } from "node:crypto";
import { isAddress } from "viem";
import {
  CanonicalSepolia,
  SEPOLIA_MANAGER,
  type Deployment,
} from "./canonical";
export type EvidenceIO = {
  read: (path: string) => Promise<Uint8Array | undefined>;
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
};
export type EvidenceResult = {
  ok: boolean;
  issues: string[];
  checked: string[];
};
export type EvidenceManifest = {
  schemaVersion: 1;
  release: { repository: string | null; commit: string | null };
  deployment: string;
  contractLinks: Array<{ symbol: string; url: string }>;
  transactions: Array<{ kind: string; hash: string; environment: string }>;
  cre: { log: string; capture: string; transactionHash: string } | null;
  privacy: { report: string; data: string; screenshot: string } | null;
  gates: Record<
    string,
    {
      status: "Proven" | "Partial" | "Not done" | "Mock-only";
      artifact: string;
    }
  >;
  claims: Array<{
    id: string;
    quote: string;
    status: "Proven" | "Partial" | "Not done" | "Mock-only";
    artifacts: string[];
    observedAtIST: string;
  }>;
};
export const digest = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
export function readmeClaims(markdown: string): string[] {
  let fenced = false;
  const lines: string[] = [];
  for (const line of markdown.split("\n")) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      lines.push("");
      continue;
    }
    if (!fenced && !/^\s*#/.test(line)) lines.push(line.trimEnd());
  }
  return lines
    .join("\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}
export async function validateEvidence(
  input: unknown,
  io: EvidenceIO,
): Promise<EvidenceResult> {
  try {
    return await assessEvidence(input, io);
  } catch {
    return {
      ok: false,
      issues: ["Malformed evidence records; verification failed closed"],
      checked: [],
    };
  }
}
async function assessEvidence(
  input: unknown,
  io: EvidenceIO,
): Promise<EvidenceResult> {
  const issues: string[] = [];
  const checked: string[] = [];
  const data = (
    input && typeof input === "object" ? input : {}
  ) as Partial<EvidenceManifest>;
  const artifact = async (path: unknown): Promise<Uint8Array | undefined> => {
    if (
      typeof path !== "string" ||
      !path ||
      path.startsWith("/") ||
      path.split(/[\\/]/).includes("..") ||
      path.includes("\0") ||
      path.length > 300
    ) {
      issues.push("Invalid or missing evidence artifact path");
      return undefined;
    }
    try {
      const bytes = await io.read(path);
      if (!bytes || bytes.length === 0 || bytes.length > 5_000_000) {
        issues.push(`Missing, empty, or oversized evidence artifact: ${path}`);
        return undefined;
      }
      return bytes;
    } catch {
      issues.push(`Cannot read evidence artifact: ${path}`);
      return undefined;
    }
  };
  const text = async (path: unknown) => {
    const bytes = await artifact(path);
    return bytes ? new TextDecoder().decode(bytes) : undefined;
  };
  const json = async (
    path: unknown,
  ): Promise<Record<string, unknown> | undefined> => {
    const raw = await text(path);
    if (!raw) return;
    try {
      const value = JSON.parse(raw);
      if (value && typeof value === "object" && !Array.isArray(value))
        return value;
      throw new Error();
    } catch {
      issues.push(`Invalid JSON evidence: ${String(path)}`);
    }
  };
  const guard = async (label: string, work: () => Promise<void>) => {
    try {
      await work();
      checked.push(label);
    } catch (error) {
      issues.push(
        `${label}: ${error instanceof Error ? error.message : "verification failed"}`,
      );
    }
  };
  if (data.schemaVersion !== 1)
    issues.push("Unsupported evidence schema version");
  const contractLinks = Array.isArray(data.contractLinks)
    ? data.contractLinks
    : [];
  const transactions = Array.isArray(data.transactions)
    ? data.transactions
    : [];

  const feedback = await text("FEEDBACK.md");
  if (!feedback || feedback.trim().length < 100)
    issues.push("FEEDBACK.md is missing or has no substantive feedback");
  else checked.push("FEEDBACK.md");
  if (!data.release?.repository)
    issues.push("Required public repository link is missing");
  if (!data.release?.commit)
    issues.push("Required submitted commit is missing");
  if (!data.contractLinks?.length)
    issues.push("Required immutable contract line links are missing");
  if (!transactions.length)
    issues.push("Required Sepolia transaction hashes are missing");
  for (const transaction of transactions)
    if (transaction.environment !== "sepolia")
      issues.push(
        `Sepolia evidence cannot use local, mock-only, or dry-run execution: ${transaction.kind}`,
      );
  if (!data.cre?.log) issues.push("Required CRE simulation log is missing");
  if (!data.privacy?.data)
    issues.push("Required Anon-RPC measurement is missing");
  const deployment = await json(data.deployment);
  if (
    deployment &&
    (deployment.chainId !== 11155111 ||
      deployment.poolManager?.toString().toLowerCase() !== SEPOLIA_MANAGER ||
      ![
        "factory",
        "flagship",
        "receiver",
        "forwarder",
        "adapter",
        "hook",
      ].every(
        (key) =>
          typeof deployment[key] === "string" &&
          isAddress(deployment[key] as string) &&
          !/^0x0{40}$/i.test(deployment[key] as string),
      ))
  )
    issues.push(
      "Deployment must identify canonical Sepolia and valid configured contract addresses",
    );
  const supportingProof = async (path: unknown, subject: string) => {
    const proof = await json(path);
    if (
      !proof ||
      proof.schemaVersion !== 1 ||
      proof.subject !== subject ||
      proof.status !== "Proven" ||
      proof.releaseCommit !== data.release?.commit ||
      proof.environment !== "reviewed-local-and-sepolia" ||
      !Array.isArray(proof.checks) ||
      !proof.checks.length
    ) {
      issues.push(`Unsupported Proven evidence: ${subject}`);
      return;
    }
    for (const item of proof.checks) {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item.path !== "string" ||
        typeof item.sha256 !== "string" ||
        item.result !== "passed" ||
        typeof item.command !== "string" ||
        !item.command.trim()
      ) {
        issues.push(`Invalid supporting check: ${subject}`);
        continue;
      }
      const bytes = await artifact(item.path);
      if (bytes && digest(bytes) !== item.sha256)
        issues.push(`Supporting artifact digest mismatch: ${subject}`);
    }
    if (
      subject === "eligibility" &&
      (proof.ownerDecision !== "approved" ||
        typeof proof.officialRules !== "string" ||
        !proof.officialRules.startsWith("https://ethglobal.com/") ||
        typeof proof.kickoffAt !== "string" ||
        !Number.isFinite(Date.parse(proof.kickoffAt)))
    )
      issues.push(
        "Eligibility requires explicit owner decision and official kickoff/rules record",
      );
    if (
      subject === "securityReview" &&
      (!Array.isArray(proof.tools) ||
        !["dependency-audit", "secret-scan", "static-analysis", "fuzz"].every(
          (tool) => (proof.tools as unknown[]).includes(tool),
        ) ||
        proof.findingsReviewed !== true)
    )
      issues.push(
        "Security review requires audit, secret, static and fuzz results plus reviewed findings",
      );
  };
  const readme = await text("README.md");
  const matrix = await text("EVIDENCE.md");
  if (readme) {
    const claims = Array.isArray(data.claims) ? data.claims : [];
    for (const quote of readmeClaims(readme)) {
      const id = `claim-${digest(quote).slice(0, 12)}`;
      const record = claims.find(
        (claim) => claim.id === id && claim.quote === quote,
      );
      if (!record) {
        issues.push(`README claim has no matching evidence record: ${id}`);
        continue;
      }
      if (
        !["Proven", "Partial", "Not done", "Mock-only"].includes(
          record.status,
        ) ||
        !record.observedAtIST?.endsWith("+05:30") ||
        Number.isNaN(Date.parse(record.observedAtIST))
      )
        issues.push(`Invalid status or IST observation time for ${id}`);
      const row = matrix
        ?.split("\n")
        .find((line) => line.startsWith(`| ${id} |`));
      if (!row || row.split("|")[2]?.trim() !== record.status)
        issues.push(`EVIDENCE.md row is absent or inconsistent: ${id}`);
      if (record.status === "Proven" && !record.artifacts?.length)
        issues.push(`Unsupported Proven README claim: ${id}`);
      for (const path of record.artifacts || []) {
        if (record.status === "Proven") await supportingProof(path, id);
        else await artifact(path);
      }
    }
  }
  const repository = data.release?.repository;
  const commit = data.release?.commit;
  const match =
    typeof repository === "string"
      ? /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)$/.exec(repository)
      : null;
  if (repository && !match)
    issues.push(
      "Public repository must be an explicit GitHub HTTPS URL without credentials",
    );
  if (commit && !/^[a-f0-9]{40}$/.test(commit))
    issues.push("Submitted commit must be a full immutable commit hash");
  if (match && commit && /^[a-f0-9]{40}$/.test(commit)) {
    const [, owner, repo] = match;
    await guard("Public repository and revision", async () => {
      const response = await io.fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
      );
      if (!response.ok) throw new Error("Public repository is inaccessible");
      const info = await response.json();
      if (
        info.private !== false ||
        info.full_name?.toLowerCase() !== `${owner}/${repo}`.toLowerCase()
      )
        throw new Error("Repository is private or mismatched");
      const revision = await io.fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits/${commit}`,
      );
      if (!revision.ok || (await revision.json()).sha !== commit)
        throw new Error("Submitted revision is unavailable");
    });
    const requiredSymbols = [
      "_beforeInitialize",
      "_beforeSwap",
      "unlockCallback",
      "onReport",
      "runRebalance",
      "createChainSession",
    ];
    for (const symbol of requiredSymbols) {
      const link = contractLinks.find((link) => link.symbol === symbol);
      if (!link) {
        issues.push(`Missing immutable source line link: ${symbol}`);
        continue;
      }
      await guard(`Source line ${symbol}`, async () => {
        const prefix = `${repository}/blob/${commit}/`;
        if (!link.url.startsWith(prefix))
          throw new Error("Source link uses the wrong repository or revision");
        const location = /^([^#]+)#L(\d+)(?:-L(\d+))?$/.exec(
          link.url.slice(prefix.length),
        );
        if (!location || location[1].split("/").includes(".."))
          throw new Error("Source line anchor is missing or malformed");
        const response = await io.fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${commit}/${location[1]}`,
        );
        if (!response.ok) throw new Error("Source is inaccessible");
        const lines = (await response.text()).split("\n");
        const start = Number(location[2]);
        const end = Number(location[3] || location[2]);
        if (
          start < 1 ||
          end < start ||
          end > lines.length ||
          !lines
            .slice(start - 1, end)
            .join("\n")
            .includes(symbol)
        )
          throw new Error("Line anchor does not identify the claimed function");
      });
    }
  }
  const canonical = new CanonicalSepolia(io);
  const transactionTimes = new Map<string, number>();
  const kinds = [
    "createBasket",
    "deposit",
    "hookToward",
    "hookAway",
    "rebalance",
    "redeemUsdc",
    "redeemInKind",
  ];
  for (const kind of kinds) {
    const transaction = transactions.find((tx) => tx.kind === kind);
    if (!transaction) {
      issues.push(`Required Sepolia transaction hash is missing: ${kind}`);
      continue;
    }
    if (
      !/^0x[0-9a-f]{64}$/i.test(transaction.hash) ||
      /^0x0+$/.test(transaction.hash)
    ) {
      issues.push(`Invalid full Sepolia transaction hash: ${kind}`);
      continue;
    }
    if (
      deployment &&
      deployment.chainId === 11155111 &&
      transaction.environment === "sepolia"
    )
      await guard(`Sepolia ${kind}`, async () => {
        const verified = await canonical.lifecycle(
          kind,
          transaction.hash,
          deployment as unknown as Deployment,
        );
        transactionTimes.set(transaction.hash, verified.timestamp);
      });
  }
  if (data.cre) {
    const log = await text(data.cre.log);
    const capture = await json(data.cre.capture);
    if (
      !log ||
      !capture ||
      capture.execution !== "cli-broadcast" ||
      typeof capture.startedAt !== "string" ||
      typeof capture.finishedAt !== "string" ||
      !Number.isFinite(Date.parse(capture.startedAt)) ||
      !Number.isFinite(Date.parse(capture.finishedAt)) ||
      Date.parse(capture.finishedAt) < Date.parse(capture.startedAt) ||
      Date.parse(capture.finishedAt) > Date.now() + 60_000 ||
      capture.environment !== "sepolia" ||
      capture.exitCode !== 0 ||
      capture.releaseCommit !== commit ||
      capture.transactionHash !== data.cre.transactionHash ||
      capture.logSha256 !== digest(log) ||
      !Array.isArray(capture.argv) ||
      !capture.argv.includes("--broadcast") ||
      capture.argv[0] !== "workflow" ||
      capture.argv[1] !== "simulate" ||
      typeof capture.cliVersion !== "string" ||
      !capture.cliVersion
    )
      issues.push(
        "CRE simulation log has missing or inconsistent CLI broadcast provenance",
      );
    if (
      log &&
      (!log.includes(data.cre.transactionHash) ||
        !/^0x[0-9a-f]{64}$/i.test(data.cre.transactionHash) ||
        /^0x0+$/.test(data.cre.transactionHash))
    )
      issues.push(
        "CRE simulation log lacks its nonzero broadcast transaction or uses a zero transaction hash",
      );
    if (
      !transactions.some(
        (tx) =>
          tx.kind === "rebalance" &&
          tx.environment === "sepolia" &&
          tx.hash === data.cre?.transactionHash,
      )
    )
      issues.push(
        "CRE CLI transaction is not the independently verified Sepolia rebalance",
      );
  }
  if (data.privacy) {
    await text(data.privacy.report);
    const measurement = await json(data.privacy.data);
    const screenshot = await artifact(data.privacy.screenshot);
    if (
      screenshot &&
      !(
        (screenshot[0] === 0xff && screenshot[1] === 0xd8) ||
        (screenshot[0] === 0x89 &&
          screenshot[1] === 0x50 &&
          screenshot[2] === 0x4e &&
          screenshot[3] === 0x47)
      )
    )
      issues.push("Anon-RPC screenshot is not a JPEG or PNG artifact");
    if (measurement) {
      const start =
        typeof measurement.startedAt === "string"
          ? Date.parse(measurement.startedAt)
          : NaN;
      const end =
        typeof measurement.finishedAt === "string"
          ? Date.parse(measurement.finishedAt)
          : NaN;
      const observations = measurement.observations as
        Array<{ hash: string; observedAt: string }> | undefined;
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        end < start ||
        end > Date.now() + 60_000 ||
        measurement.workingTreeDirty !== false ||
        typeof measurement.browser !== "string" ||
        !measurement.browser.trim()
      )
        issues.push(
          "Privacy session chronology, browser or clean release provenance is invalid",
        );
      for (const tx of transactions) {
        const observed = observations?.find((item) => item.hash === tx.hash);
        const when = observed ? Date.parse(observed.observedAt) : NaN;
        const blockTime = transactionTimes.get(tx.hash);
        if (
          !Number.isFinite(when) ||
          when < start ||
          when > end ||
          blockTime === undefined ||
          blockTime < start - 30_000 ||
          blockTime > end + 30_000
        )
          issues.push(
            `Privacy lifecycle transaction is outside its observed session: ${tx.kind}`,
          );
      }
    }
    const routes = measurement?.routes as Record<string, unknown> | undefined;
    const counts = ["anon", "bootstrap", "direct", "failed", "attempted"];
    if (
      !measurement ||
      measurement.environment !== "sepolia" ||
      measurement.scope !== "full-lifecycle" ||
      measurement.releaseCommit !== commit ||
      typeof measurement.workerSpecifier !== "string" ||
      !isAddress(measurement.workerSpecifier) ||
      typeof measurement.harnessVersion !== "string" ||
      typeof measurement.startupSeconds !== "number" ||
      !Number.isFinite(measurement.startupSeconds) ||
      measurement.startupSeconds < 0 ||
      !routes ||
      counts.some(
        (key) => !Number.isInteger(routes[key]) || Number(routes[key]) < 0,
      )
    )
      issues.push(
        "Anon-RPC measurement must be an actual full Sepolia lifecycle with valid counts, worker and version",
      );
    else {
      const successful =
        Number(routes.anon) + Number(routes.bootstrap) + Number(routes.direct);
      const coverage = successful
        ? (Number(routes.anon) / successful) * 100
        : 0;
      if (
        successful === 0 ||
        Number(routes.attempted) !== successful + Number(routes.failed) ||
        typeof measurement.coveragePercent !== "number" ||
        Math.abs(measurement.coveragePercent - coverage) > 0.01
      )
        issues.push(
          "Anon-RPC measurement counts or coverage denominator are inconsistent",
        );
      if (Number(measurement.startupSeconds) >= 10 || coverage < 95)
        issues.push(
          "Anon-RPC acceptance targets are unmet: startup must be <10s and successful coverage >=95%",
        );
      const methods = measurement.methods as
        Record<string, { attempted: number; successful: number }> | undefined;
      if (
        !methods ||
        Object.values(methods).some(
          (value) =>
            !Number.isInteger(value.attempted) ||
            !Number.isInteger(value.successful) ||
            value.attempted < value.successful ||
            value.successful < 0,
        ) ||
        Object.values(methods).reduce(
          (sum, value) => sum + value.attempted,
          0,
        ) !== Number(routes.attempted) ||
        Object.values(methods).reduce(
          (sum, value) => sum + value.successful,
          0,
        ) !== successful
      )
        issues.push("Anon-RPC per-method counts do not reconcile");
      if (methods)
        for (const route of ["anon", "bootstrap", "direct"]) {
          const perRoute = Object.entries(methods)
            .filter(([key]) => key.startsWith(`${route}:`))
            .reduce((sum, [, value]) => sum + value.successful, 0);
          if (perRoute !== Number(routes[route]))
            issues.push(`Anon-RPC method counts disagree with route ${route}`);
        }
      const lifecycle = measurement.lifecycle as
        Record<string, string> | undefined;
      if (
        !lifecycle ||
        kinds.some(
          (kind) =>
            !transactions.some(
              (tx) => tx.kind === kind && tx.hash === lifecycle[kind],
            ),
        )
      )
        issues.push(
          "Anon-RPC measurement is missing the canonical lifecycle transaction references",
        );
      const failure = measurement.failureDemo as
        | {
            privateReadFailed?: boolean;
            directBefore?: number;
            directAfter?: number;
            artifact?: string;
          }
        | undefined;
      if (
        !failure?.privateReadFailed ||
        failure.directBefore !== failure.directAfter ||
        typeof failure.directBefore !== "number"
      )
        issues.push("Anon-RPC fail-closed browser demonstration is missing");
      else await artifact(failure.artifact);
    }
  }
  for (const gate of [
    "eligibility",
    "healthyInKind",
    "approvedHook",
    "nonceReceiver",
    "rebalanceSafety",
    "securityReview",
  ]) {
    const record = data.gates?.[gate];
    if (!record || record.status !== "Proven")
      issues.push(`Required readiness gate is not Proven: ${gate}`);
    else await supportingProof(record.artifact, gate);
  }
  return { ok: issues.length === 0, issues, checked };
}
