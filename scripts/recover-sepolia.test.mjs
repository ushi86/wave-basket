import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  requireMode,
  requireState,
  requirePlan,
  OWNER,
  FAILED,
} from "./recover-sepolia.mjs";

const rows = () =>
  Array.from({ length: 2 }, () => ({
    chainId: 11155111,
    latestNonce: 1,
    pendingNonce: 1,
    forkNonce: 1,
    prior: {
      hash: FAILED,
      txHash: FAILED,
      status: "reverted",
      canonical: true,
      nonce: 0,
      codeBytes: 0,
      from: OWNER,
    },
    forwarderCodeHash:
      "0x0a1b63dd9c5ee32c042a5124c96d3d344eea29c0daca30e54d2d91c09cc940b7",
    managerCodeBytes: 1,
    create2CodeBytes: 1,
    blockHash: "same canonical block",
    balanceWei: "1000000000000000000",
    managerCodeHash: "same manager",
    create2CodeHash: "same CREATE2 deployer",
    feeds: Array.from({ length: 4 }, (_, i) => ({
      symbol: String(i),
      healthy: true,
    })),
  }));
const plan = () => ({
  chain: 11155111,
  receipts: [],
  transactions: Array.from({ length: 42 }, (_, i) => ({
    hash: null,
    transaction: {
      from: OWNER,
      nonce: `0x${(i + 1).toString(16)}`,
      chainId: "0xaa36a7",
      gas: "0x45b122",
      value: "0x0",
    },
  })),
});

test("defaults to dry run and requires owner terminal, explicit mode and a review path", () => {
  assert.equal(requireMode([], false, false), "dry-run");
  assert.equal(requireMode(["--dry-run"], false, false), "dry-run");
  assert.throws(() => requireMode(["--resume"], true, true));
  assert.throws(() => requireMode(["--broadcast"], true, true));
  assert.throws(
    () =>
      requireMode(
        ["--broadcast", "--reviewed-run", "capture.json"],
        false,
        true,
      ),
    /interactive/,
  );
  assert.throws(
    () =>
      requireMode(
        ["--broadcast", "--reviewed-run", "capture.json"],
        true,
        false,
      ),
    /ETHERSCAN/,
  );
  assert.equal(
    requireMode(["--broadcast", "--reviewed-run", "capture.json"], true, true),
    "broadcast",
  );
});
test("noninteractive broadcast stops in the executable before RPC, backup or keystore work", () => {
  let error;
  try {
    execFileSync(
      process.execPath,
      [
        "scripts/recover-sepolia.mjs",
        "--broadcast",
        "--reviewed-run",
        "does-not-exist.json",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (e) {
    error = e;
  }
  assert.equal(error?.status, 1);
  assert.match(error.stderr.toString(), /owner in an interactive terminal/);
  assert.equal(error.stdout.toString(), "");
});
test("requires both providers to agree on failed nonce-0 receipt and unused nonce 1", () => {
  requireState(rows());
  for (const mutate of [
    (r) => r.pop(),
    (r) => (r[0].latestNonce = 2),
    (r) => (r[0].pendingNonce = 2),
    (r) => (r[0].forkNonce = 0),
    (r) => (r[0].chainId = 31337),
    (r) => (r[0].prior.status = "success"),
    (r) => (r[0].prior.hash = "different"),
    (r) => (r[0].prior.txHash = "different"),
    (r) => (r[0].prior.canonical = false),
    (r) => (r[0].prior.codeBytes = 1),
    (r) => (r[0].prior.from = "0x0000000000000000000000000000000000000001"),
    (r) => (r[1].blockHash = "different"),
    (r) => (r[1].balanceWei = "different"),
  ]) {
    const v = rows();
    mutate(v);
    assert.throws(() => requireState(v));
  }
});
test("unhealthy feeds, missing code and provider state disagreement stop recovery", () => {
  for (const mutate of [
    (r) => (r[0].feeds[0].healthy = false),
    (r) => r[0].feeds.pop(),
    (r) => (r[1].feeds[1].healthy = false),
    (r) => (r[0].managerCodeBytes = 0),
    (r) => (r[0].create2CodeBytes = 0),
    (r) => (r[0].forwarderCodeHash = "different"),
    (r) => (r[1].managerCodeHash = "different"),
    (r) => (r[1].create2CodeHash = "different"),
  ]) {
    const v = rows();
    mutate(v);
    assert.throws(() => requireState(v));
  }
});
test("only accepts a fresh complete sequence from nonce 1 with no paid native value", () => {
  requirePlan(plan());
  for (const mutate of [
    (p) => (p.chain = 31337),
    (p) => p.transactions.pop(),
    (p) => p.receipts.push({ status: 1 }),
    (p) => (p.transactions[0].hash = FAILED),
    (p) => (p.transactions[0].transaction.nonce = "0x0"),
    (p) => (p.transactions[10].transaction.nonce = "0xc"),
    (p) => (p.transactions[0].transaction.from = "wrong"),
    (p) => (p.transactions[0].transaction.chainId = "0x1"),
    (p) => (p.transactions[0].transaction.gas = "0x0"),
    (p) => (p.transactions[0].transaction.value = "0x1"),
  ]) {
    const v = plan();
    mutate(v);
    assert.throws(() => requirePlan(v));
  }
});
