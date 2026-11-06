// Synthetic fixtures only for verifier rejection tests; never deployment evidence.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  isExactExplorerSource,
  isFactorySeedDeposit,
  requireReceiptPair,
  requireRuntime,
  requireTransaction,
} from "./verify-sepolia-deployment.mjs";
const txHash = "0x" + "a".repeat(64);
const blockHash = "0x" + "b".repeat(64);
const owner = "0xde25d83481c0c2a711397c44ee3317dd826952d5";
const address = "0x" + "c".repeat(40);
test("source verification requires an exact constructor match and rejects similar-code associations", () => {
  const exact = {
    name: "DemoToken",
    compiler: "v0.8.26+commit.8a97fa7a",
    optimizer: "1",
    runs: "200",
    proxy: "0",
    similarMatch: "",
    constructorArgsSha256: "expected",
  };
  assert.equal(
    isExactExplorerSource(
      exact,
      "DemoToken",
      "0.8.26+commit.8a97fa7a",
      "expected",
    ),
    true,
  );
  for (const changed of [
    { ...exact, similarMatch: address },
    { ...exact, constructorArgsSha256: "wrong" },
    { ...exact, proxy: "1" },
  ])
    assert.equal(
      isExactExplorerSource(
        changed,
        "DemoToken",
        "0.8.26+commit.8a97fa7a",
        "expected",
      ),
      false,
    );
});
test("factory-funded seed deposit must identify the factory payer and owner recipient separately", () => {
  const seed = {
    user: address,
    receiver: owner,
    usdcIn: 100000000000n,
    shares: 99292712649999999999000n,
  };
  assert.equal(isFactorySeedDeposit(seed, address, owner, seed.usdcIn), true);
  for (const changed of [
    { ...seed, user: owner },
    { ...seed, receiver: address },
    { ...seed, usdcIn: 1n },
    { ...seed, shares: 0n },
  ])
    assert.equal(
      isFactorySeedDeposit(changed, address, owner, seed.usdcIn),
      false,
    );
});
const receipt = () => ({
  transactionHash: txHash,
  status: "0x1",
  blockHash,
  blockNumber: "0x10",
  transactionIndex: "0x0",
  from: owner,
  to: address,
  contractAddress: null,
  gasUsed: "0x100",
  effectiveGasPrice: "0x10",
  logs: [
    {
      address,
      topics: [txHash],
      data: "0x",
      logIndex: "0x0",
      transactionHash: txHash,
      blockHash,
      removed: false,
    },
  ],
});
test("rejects reverted receipts and disagreements in canonical logs or gas", () => {
  assert.doesNotThrow(() => requireReceiptPair([receipt(), receipt()], txHash));
  for (const change of [
    (r) => (r.status = "0x0"),
    (r) => (r.blockHash = txHash),
    (r) => (r.gasUsed = "0x101"),
    (r) => (r.logs[0].data = "0x12"),
    (r) => (r.logs[0].removed = true),
  ]) {
    const r = receipt();
    change(r);
    assert.throws(() => requireReceiptPair([receipt(), r], txHash));
  }
});
test("binds the live transaction to every reviewed plan input and sender", () => {
  const input = "0x1234";
  const plan = {
    nonce: 1,
    to: address,
    gasLimit: 100000,
    inputHash: createHash("sha256").update(input).digest("hex"),
  };
  const tx = {
    hash: txHash,
    blockHash,
    blockNumber: "0x10",
    from: owner,
    to: address,
    nonce: "0x1",
    chainId: "0xaa36a7",
    value: "0x0",
    input,
    gas: "0x186a0",
  };
  assert.doesNotThrow(() => requireTransaction(tx, plan, receipt()));
  for (const change of [
    (t) => (t.chainId = "0x7a69"),
    (t) => (t.from = address),
    (t) => (t.to = owner),
    (t) => (t.nonce = "0x2"),
    (t) => (t.value = "0x1"),
    (t) => (t.input = "0x5678"),
    (t) => (t.gas = "0x186a1"),
  ]) {
    const changed = { ...tx };
    change(changed);
    assert.throws(() => requireTransaction(changed, plan, receipt()));
  }
});
test("checks runtime instructions and metadata, masking only repeated compiler immutable spans", () => {
  const artifact = {
    deployedBytecode: {
      object: "0x60000000aabb0000",
      immutableReferences: {
        1: [
          { start: 1, length: 2 },
          { start: 6, length: 2 },
        ],
      },
    },
  };
  assert.doesNotThrow(() => requireRuntime("0x60123400aabb1234", artifact));
  for (const code of [
    "0x60123400aabc1234",
    "0x60123400aabb5678",
    "0x60123400aabb123400",
    "0x",
  ])
    assert.throws(() => requireRuntime(code, artifact));
});
