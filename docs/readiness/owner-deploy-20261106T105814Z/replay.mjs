// Historical failed-transaction diagnosis. Read-only RPC methods only.
// Exit 1 means the original transaction's gas limit is insufficient.
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const hash =
  "0x5eb42ec1baaeb837ca64021bd561ca05bb3596ff42ceb9b42eca3e621d18765f";
const results = [];
for (const endpoint of [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.gateway.tenderly.co",
]) {
  let id = 0;
  async function rpc(method, params) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (body.error) throw Error(JSON.stringify(body.error));
    return body.result;
  }
  if (BigInt(await rpc("eth_chainId", [])) !== 11155111n)
    throw Error("Wrong chain");
  const receipt = await rpc("eth_getTransactionReceipt", [hash]);
  const tx = await rpc("eth_getTransactionByHash", [hash]);
  if (!receipt || !tx || receipt.status !== "0x0")
    throw Error("Expected historical failed receipt");
  const block = await rpc("eth_getBlockByNumber", [receipt.blockNumber, false]);
  if (block.hash !== receipt.blockHash || tx.blockHash !== block.hash)
    throw Error("Noncanonical receipt");
  const before = `0x${(BigInt(receipt.blockNumber) - 1n).toString(16)}`;
  const creation = { from: tx.from, data: tx.input };
  const estimate = await rpc("eth_estimateGas", [creation, before]);
  let originalGasError;
  try {
    await rpc("eth_call", [{ ...creation, gas: tx.gas }, before]);
    throw Error("Unexpected success at original gas");
  } catch (error) {
    if (!/out of gas/i.test(error.message)) throw error;
    originalGasError = error.message;
  }
  const runtime = await rpc("eth_call", [
    { ...creation, gas: "0x4c4b40" },
    before,
  ]);
  const code = await rpc("eth_getCode", [
    receipt.contractAddress,
    receipt.blockNumber,
  ]);
  if (code !== "0x") throw Error("Unexpected code after failed creation");
  const result = {
    endpoint,
    chainId: 11155111,
    hash,
    status: "reverted",
    blockNumber: Number(BigInt(receipt.blockNumber)),
    blockHash: block.hash,
    from: tx.from,
    nonce: Number(BigInt(tx.nonce)),
    predictedAddressNotDeployed: receipt.contractAddress,
    gasLimit: Number(BigInt(tx.gas)),
    gasUsed: Number(BigInt(receipt.gasUsed)),
    effectiveGasPriceWei: BigInt(receipt.effectiveGasPrice).toString(),
    transactionFeeWei: (
      BigInt(receipt.gasUsed) * BigInt(receipt.effectiveGasPrice)
    ).toString(),
    observedBalanceWei: BigInt(
      await rpc("eth_getBalance", [tx.from, "latest"]),
    ).toString(),
    observedLatestNonce: Number(
      BigInt(await rpc("eth_getTransactionCount", [tx.from, "latest"])),
    ),
    observedPendingNonce: Number(
      BigInt(await rpc("eth_getTransactionCount", [tx.from, "pending"])),
    ),
    logs: receipt.logs.length,
    codeBytesAfterReceipt: 0,
    replayBlock: Number(BigInt(before)),
    replayBlockHash: (await rpc("eth_getBlockByNumber", [before, false])).hash,
    creationInputSha256: createHash("sha256")
      .update(Buffer.from(tx.input.slice(2), "hex"))
      .digest("hex"),
    originalGasError,
    rpcGasEstimate: Number(BigInt(estimate)),
    successfulReadOnlyCallGasLimit: 5000000,
    returnedRuntimeBytes: (runtime.length - 2) / 2,
    originalGasLimitSufficient: BigInt(tx.gas) >= BigInt(estimate),
  };
  results.push(result);
  console.log(
    `${endpoint}: receipt REVERTED, gas ${result.gasUsed}/${result.gasLimit}, RPC estimate ${result.rpcGasEstimate}, replay at 5000000 succeeds`,
  );
}
if (results[0].blockHash !== results[1].blockHash)
  throw Error("Providers disagree");
writeFileSync(
  new URL("./failed-first-transaction.json", import.meta.url),
  JSON.stringify(
    {
      observedAt: new Date().toISOString(),
      purpose:
        "Historical failure diagnosis; NOT successful deployment evidence",
      results,
    },
    null,
    2,
  ) + "\n",
);
if (results.some((result) => !result.originalGasLimitSufficient)) {
  console.error(
    "FAIL: original deployment gas limit is below the live Sepolia estimate. Do not retry or resume this plan.",
  );
  process.exitCode = 1;
}
