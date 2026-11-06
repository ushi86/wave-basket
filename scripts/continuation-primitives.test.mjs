// Synthetic guard tests only; never live evidence.
import test from "node:test";
import assert from "node:assert/strict";
import {
  requirePlan,
  requireState,
  OWNER,
  FAILED,
} from "./continuation-primitives.mjs";
test("continuation requires the exact unused nonce 20 on both Sepolia providers", () => {
  const rows = () =>
    Array.from({ length: 2 }, () => ({
      chainId: 11155111,
      latestNonce: 20,
      pendingNonce: 20,
      forkNonce: 20,
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
      blockHash: "same",
      balanceWei: "same",
      managerCodeHash: "same",
      create2CodeHash: "same",
      feeds: Array.from({ length: 4 }, () => ({ healthy: true })),
    }));
  assert.doesNotThrow(() => requireState(rows()));
  for (const mutate of [
    (r) => r.pop(),
    (r) => (r[0].latestNonce = 19),
    (r) => (r[1].pendingNonce = 21),
    (r) => (r[0].forkNonce = 1),
    (r) => (r[1].chainId = 31337),
    (r) => (r[1].blockHash = "other"),
    (r) => (r[0].feeds[0].healthy = false),
    (r) => (r[0].prior.canonical = false),
    (r) => (r[0].forwarderCodeHash = "other"),
  ]) {
    const r = rows();
    mutate(r);
    assert.throws(() => requireState(r));
  }
});
test("only permits 23 unsigned zero-value operations with consecutive nonces 20–42", () => {
  const plan = () => ({
    chain: 11155111,
    receipts: [],
    transactions: Array.from({ length: 23 }, (_, i) => ({
      hash: null,
      transaction: {
        from: OWNER,
        nonce: "0x" + (i + 20).toString(16),
        chainId: "0xaa36a7",
        gas: "0x10000",
        value: "0x0",
      },
    })),
  });
  assert.doesNotThrow(() => requirePlan(plan()));
  for (const mutate of [
    (p) => p.transactions.pop(),
    (p) => (p.transactions[0].transaction.nonce = "0x1"),
    (p) => (p.transactions[22].transaction.nonce = "0x2b"),
    (p) => (p.transactions[0].transaction.value = "0x1"),
    (p) => (p.transactions[0].hash = FAILED),
    (p) => p.receipts.push({}),
    (p) => (p.chain = 31337),
  ]) {
    const p = plan();
    mutate(p);
    assert.throws(() => requirePlan(p));
  }
});
