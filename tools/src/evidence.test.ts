import { describe, it, expect } from "vitest";
import { validateEvidence, digest } from "./evidence";
describe("read-only submission evidence boundary", () => {
  it("fails when the required feedback artifact is missing and never creates evidence", async () => {
    const reads: string[] = [];
    const result = await validateEvidence(
      {},
      {
        read: async (path) => {
          reads.push(path);
          return undefined;
        },
        fetch: async () => {
          throw new Error("No external evidence configured");
        },
      },
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.includes("FEEDBACK.md"))).toBe(
      true,
    );
    expect(reads).toContain("FEEDBACK.md");
  });
});

it("rejects a complete-looking local/mock checklist as submission evidence", async () => {
  const result = await validateEvidence(
    {
      schemaVersion: 1,
      release: {
        repository: "https://github.com/example/wave-test-fixture",
        commit: "1".repeat(40),
      },
      deployment: "deployments/sepolia.json",
      contractLinks: [
        {
          symbol: "_beforeSwap",
          url:
            "https://github.com/example/wave-test-fixture/blob/" +
            "1".repeat(40) +
            "/contracts/src/NavGuardHook.sol#L1",
        },
      ],
      transactions: [
        { kind: "deposit", hash: "0x" + "11".repeat(32), environment: "local" },
      ],
      cre: {
        log: "docs/test-only.log",
        capture: "docs/test-only.json",
        transactionHash: "0x" + "22".repeat(32),
      },
      privacy: {
        report: "docs/PRIVACY.md",
        data: "docs/test-only-privacy.json",
        screenshot: "docs/test-only.jpg",
      },
      claims: [],
      gates: {},
    },
    {
      read: async (path) =>
        path === "FEEDBACK.md"
          ? new TextEncoder().encode(
              "Synthetic feedback used only inside this unit test. ".repeat(5),
            )
          : undefined,
      fetch: async () => {
        throw new Error("Synthetic fixture has no live network");
      },
    },
  );
  expect(result.ok).toBe(false);
  expect(
    result.issues.some(
      (issue) => issue.includes("local") || issue.includes("Sepolia"),
    ),
  ).toBe(true);
});

import { syntheticFixture } from "./evidence.fixture";
it("accepts internally consistent synthetic proof fixtures without writing them", async () => {
  const fixture = syntheticFixture();
  const original = JSON.stringify(fixture.manifest);
  const filesBefore = Array.from(fixture.files, ([path, bytes]) => [
    path,
    Array.from(bytes),
  ]);
  const result = await validateEvidence(fixture.manifest, fixture.io);
  expect(result.issues).toEqual([]);
  expect(result.ok).toBe(true);
  expect(JSON.stringify(fixture.manifest)).toBe(original);
  expect(
    Array.from(fixture.files, ([path, bytes]) => [path, Array.from(bytes)]),
  ).toEqual(filesBefore);
});

it.each([
  "repository",
  "contractLinks",
  "deposit",
  "creLog",
  "privacy",
  "feedback",
] as const)("fails when required %s evidence is missing", async (category) => {
  const fixture = syntheticFixture();
  if (category === "repository") fixture.manifest.release.repository = null;
  if (category === "contractLinks") fixture.manifest.contractLinks = [];
  if (category === "deposit")
    fixture.manifest.transactions = fixture.manifest.transactions.filter(
      (tx) => tx.kind !== "deposit",
    );
  if (category === "creLog") fixture.files.delete("docs/cre/simulate.log");
  if (category === "privacy") fixture.files.delete("docs/privacy.json");
  if (category === "feedback") fixture.files.delete("FEEDBACK.md");
  expect((await validateEvidence(fixture.manifest, fixture.io)).ok).toBe(false);
});
it("rejects impossible CLI capture times instead of accepting a complete-looking log", async () => {
  const fixture = syntheticFixture();
  const capture = JSON.parse(
    new TextDecoder().decode(fixture.files.get("docs/cre/capture.json")),
  );
  capture.finishedAt = "2026-11-06T05:00:00Z";
  fixture.write("docs/cre/capture.json", JSON.stringify(capture));
  expect((await validateEvidence(fixture.manifest, fixture.io)).ok).toBe(false);
});
it("rejects cross-route inflation even when the global totals reconcile", async () => {
  const fixture = syntheticFixture();
  const privacy = JSON.parse(
    new TextDecoder().decode(fixture.files.get("docs/privacy.json")),
  );
  privacy.methods = { "anon:eth_call": { attempted: 42, successful: 42 } };
  fixture.write("docs/privacy.json", JSON.stringify(privacy));
  expect((await validateEvidence(fixture.manifest, fixture.io)).ok).toBe(false);
});
it.each(["local", "mock-only", "dry-run"])(
  "rejects %s evidence labels without promoting them",
  async (environment) => {
    const fixture = syntheticFixture();
    fixture.manifest.transactions[0].environment = environment;
    expect((await validateEvidence(fixture.manifest, fixture.io)).ok).toBe(
      false,
    );
  },
);
it("rejects a private repository and mutable source anchors", async () => {
  const fixture = syntheticFixture();
  const originalFetch = fixture.io.fetch;
  fixture.io.fetch = async (url, init) =>
    url === "https://api.github.com/repos/example/wave-test-fixture"
      ? Response.json({ private: true, full_name: "example/wave-test-fixture" })
      : originalFetch(url, init);
  fixture.manifest.contractLinks[0].url =
    fixture.manifest.contractLinks[0].url.replace(
      fixture.manifest.release.commit!,
      "main",
    );
  const result = await validateEvidence(fixture.manifest, fixture.io);
  expect(result.ok).toBe(false);
  expect(result.issues.some((issue) => issue.includes("private"))).toBe(true);
  expect(result.issues.some((issue) => issue.includes("revision"))).toBe(true);
});
it("rejects unknown-chain receipts and missing receiver execution", async () => {
  const fixture = syntheticFixture();
  fixture.overrideRpc((_url, method) =>
    method === "eth_chainId" ? "0x7a69" : undefined,
  );
  expect((await validateEvidence(fixture.manifest, fixture.io)).ok).toBe(false);
  const second = syntheticFixture();
  second.receipts[second.manifest.cre!.transactionHash].logs.pop();
  const result = await validateEvidence(second.manifest, second.io);
  expect(result.ok).toBe(false);
  expect(result.issues.some((issue) => issue.includes("ReportAccepted"))).toBe(
    true,
  );
});
it("rejects truncated or zero transaction hashes and dry-run CLI captures", async () => {
  const fixture = syntheticFixture();
  fixture.manifest.transactions[0].hash = "0x123…456";
  const capture = JSON.parse(
    new TextDecoder().decode(fixture.files.get("docs/cre/capture.json")),
  );
  capture.execution = "dry-run";
  fixture.write("docs/cre/capture.json", JSON.stringify(capture));
  const result = await validateEvidence(fixture.manifest, fixture.io);
  expect(result.ok).toBe(false);
  expect(result.issues.some((issue) => issue.includes("hash"))).toBe(true);
  expect(result.issues.some((issue) => issue.includes("CLI"))).toBe(true);
});
it("rejects a worker-only probe and missing fail-closed proof", async () => {
  const fixture = syntheticFixture();
  const privacy = JSON.parse(
    new TextDecoder().decode(fixture.files.get("docs/privacy.json")),
  );
  privacy.scope = "worker-only";
  delete privacy.failureDemo;
  fixture.write("docs/privacy.json", JSON.stringify(privacy));
  expect((await validateEvidence(fixture.manifest, fixture.io)).ok).toBe(false);
});
it("rejects a Proven README claim with no supporting artifact", async () => {
  const fixture = syntheticFixture();
  fixture.files.delete("docs/check.log");
  expect((await validateEvidence(fixture.manifest, fixture.io)).ok).toBe(false);
});
it("rejects a wrong effective hook fee", async () => {
  const fixture = syntheticFixture();
  fixture.receipts[
    fixture.manifest.transactions.find((tx) => tx.kind === "hookAway")!.hash
  ].logs = [
    ...fixture.receipts[
      fixture.manifest.transactions.find((tx) => tx.kind === "hookToward")!.hash
    ].logs,
  ];
  expect((await validateEvidence(fixture.manifest, fixture.io)).ok).toBe(false);
});
it("rejects contradictory receipts from independent canonical sources", async () => {
  const fixture = syntheticFixture();
  const hash = fixture.manifest.transactions[0].hash;
  fixture.overrideRpc((url, method, params) =>
    url.includes("drpc") &&
    method === "eth_getTransactionReceipt" &&
    params[0] === hash
      ? {
          ...fixture.receipts[hash],
          to: "0x00000000000000000000000000000000000000ff",
        }
      : undefined,
  );
  expect((await validateEvidence(fixture.manifest, fixture.io)).ok).toBe(false);
});
it("allows zero-valued mock metadata alongside a verified nonzero CLI transaction", async () => {
  const fixture = syntheticFixture();
  const log =
    new TextDecoder().decode(fixture.files.get("docs/cre/simulate.log")) +
    "Mock workflow metadata: 0x" +
    "0".repeat(64) +
    "\n";
  fixture.write("docs/cre/simulate.log", log);
  const capture = JSON.parse(
    new TextDecoder().decode(fixture.files.get("docs/cre/capture.json")),
  );
  capture.logSha256 = digest(log);
  fixture.write("docs/cre/capture.json", JSON.stringify(capture));
  expect((await validateEvidence(fixture.manifest, fixture.io)).ok).toBe(true);
});
it.each([
  { startupSeconds: 10.1 },
  {
    coveragePercent: 90,
    routes: { anon: 36, bootstrap: 4, direct: 0, failed: 0, attempted: 40 },
    methods: {
      "anon:eth_call": { attempted: 36, successful: 36 },
      "bootstrap:eth_call": { attempted: 4, successful: 4 },
    },
  },
])("keeps missing privacy acceptance targets failing", async (changes) => {
  const fixture = syntheticFixture();
  const privacy = JSON.parse(
    new TextDecoder().decode(fixture.files.get("docs/privacy.json")),
  );
  fixture.write(
    "docs/privacy.json",
    JSON.stringify({ ...privacy, ...changes }),
  );
  expect((await validateEvidence(fixture.manifest, fixture.io)).ok).toBe(false);
});
it("returns a failed assessment for malformed nested records", async () => {
  const fixture = syntheticFixture();
  const malformed = { ...fixture.manifest, transactions: [null] };
  expect((await validateEvidence(malformed, fixture.io)).ok).toBe(false);
});
it("rejects a rebalance event without independently observable vault state", async () => {
  const fixture = syntheticFixture();
  // Zero for every getter makes the positive rebalance event inconsistent with state.
  fixture.overrideRpc((_url, method) =>
    method === "eth_call" ? "0x" + "0".repeat(64) : undefined,
  );
  const result = await validateEvidence(fixture.manifest, fixture.io);
  expect(result.ok).toBe(false);
  expect(result.issues.some((issue) => issue.includes("rebalance state"))).toBe(
    true,
  );
});

it("rejects arbitrary text as support for Proven gates and claims", async () => {
  const f = syntheticFixture();
  f.write("docs/check.log", "No supporting proof.");
  expect((await validateEvidence(f.manifest, f.io)).ok).toBe(false);
});
it("rejects contradictory or dirty privacy session provenance", async () => {
  const f = syntheticFixture();
  const p = JSON.parse(
    new TextDecoder().decode(f.files.get("docs/privacy.json")),
  );
  f.write(
    "docs/privacy.json",
    JSON.stringify({
      ...p,
      startedAt: "2030-01-01T00:00:00Z",
      finishedAt: "1990-01-01T00:00:00Z",
      workingTreeDirty: true,
    }),
  );
  expect((await validateEvidence(f.manifest, f.io)).ok).toBe(false);
});
it("rejects creation evidence for an undeclared basket", async () => {
  const fixture = syntheticFixture();
  const hash = fixture.manifest.transactions.find(
    (tx) => tx.kind === "createBasket",
  )!.hash;
  fixture.receipts[hash].logs[0].topics[1] =
    "0x" + "0".repeat(24) + "f".repeat(40);
  expect((await validateEvidence(fixture.manifest, fixture.io)).ok).toBe(false);
});
