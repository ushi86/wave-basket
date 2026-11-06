# Amsterdam recovery preflight — 6 November 2026

Status: the complete **Foundry fork dry run passed**, but no recovery broadcast has occurred. The original initial-deployment helper still refuses the retained failed broadcast record; do not rerun it or use `--resume`. A guarded owner recovery command has not yet been prepared or approved by execution.

Native Foundry was updated to **1.8.3** using `foundryup --install v1.8.3`. The installer verified its Sigstore bundle, archive and individual binaries without disabling verification. The local Anvil demo was paused with a saved state and restored using its original packaged 1.7.1 binary. Local head hash and all saved account code, balances and storage were verified equal; the dashboard returned HTTP 200. The repository's npm Foundry dependencies remain unchanged.

## Fresh balance, feed and nonce checks

[Both approved providers](amsterdam-recovery-2026-11-06T11-19-32-764Z/preflight.json) corroborated block **12,076,223**, hash `0x59902ceb855537d8c1bb8f377f9502be544e52201ef013a7cf2a216820c4ddf3`:

- Balance **0.199039970082895696 Sepolia ETH**.
- Latest, pending and fixed-block account nonce all **1**.
- The prior failed receipt remains canonical and reverted.
- All four real Chainlink feeds healthy under the unchanged limits: USDC age 7,656 / maximum 108,000 seconds; ETH 480 / 4,500; BTC 1,680 / 4,500; LINK 3,384 / 4,500.
- Selected simulation forwarder code hash unchanged, with code at the official PoolManager. Provider diversity does not prove fully independent infrastructure.

Freshness, account state and fees must be checked again immediately before an owner broadcast.

## Full Foundry dry run

The [capture](amsterdam-recovery-2026-11-06T11-19-32-764Z/capture.json) and [Forge log](amsterdam-recovery-2026-11-06T11-19-32-764Z/forge.log) retain the actual invocation: native Forge 1.8.3, fixed PublicNode fork block 12,076,223, runtime `--hardfork amsterdam`, unchanged Solidity **0.8.26 / Cancun** compiler target, owner sender, `--slow --non-interactive`, and **no** account unlock or broadcast flags. No state/balance overrides, skipped simulation or lowered execution bounds were used.

Forge exited **0**, completing all **42** planned transactions from nonce **1** through **42**. Its total gas allowance including the default 130% multiplier was **175,154,050 gas**. At the observed maximum fee quote of **34 wei/gas**, Forge quoted **0.0000000059552377 ETH**. Both providers corroborated the unusually low live gas-price observation of **18 wei/gas**, with base fee **16 wei/gas** at the fork block. These are genuine observations, not a funding guarantee or a lifecycle/CRE budget. At a hypothetical 1 gwei, the same total allowance would require about **0.17515405 ETH**.

The original failed broadcast record's SHA-256 was unchanged. The generated manifest was immediately quarantined as [predicted-NOT-DEPLOYED.json](amsterdam-recovery-2026-11-06T11-19-32-764Z/predicted-NOT-DEPLOYED.json); the canonical manifest path remains absent. The [plan summary](amsterdam-recovery-2026-11-06T11-19-32-764Z/plan-summary-NOT-BROADCAST.json) contains predictions, nonces and gas limits, not submitted transaction hashes.

The outer diagnostic harness initially exited 1 because rebuilding with the newer Foundry changed raw creation-bytecode hashes. The subsequent [comparison](amsterdam-recovery-2026-11-06T11-19-32-764Z/bytecode-metadata-comparison.json) found that **all seven unique application creation bytecodes differ only in embedded Solidity IPFS metadata hash fields**, including the vault/deployer bytecode embedded in the factory. Instruction bytes are unchanged. The new build's expanded automatic remapping metadata is the supported explanation; source and compiler version/optimizer target were not changed. Metadata changes still change code hashes and CREATE2 predictions; old predicted addresses must not be reused.

## Additional live RPC checks and their limits

The [two-provider first-creation checks](amsterdam-recovery-2026-11-06T11-19-32-764Z/rpc-gas-check.json) both estimate **3,542,382 gas** and successfully execute the exact new token creation with the planned **4,567,330** limit using `eth_call`. These are read-only executions, not deployments.

An optional full `eth_simulateV1` check with validation enabled did **not** pass:

- PublicNode returned `-38013: intrinsic gas too low` for all 42 calls. [Prefix minimization](amsterdam-recovery-2026-11-06T11-19-32-764Z/rpc-prefix-check.json) shows the first 30 exact calls succeed; adding factory creation at index 30 produces an empty revert. Spreading the plan over two synthetic blocks also failed.
- Tenderly returned `-32005: rate limit exceeded` for the full batch, including the paced multiblock retry. No account, key, payment or replacement service was used.
- Both providers pass an [isolated factory-creation diagnostic](amsterdam-recovery-2026-11-06T11-19-32-764Z/isolated-factory-DIAGNOSTIC.json), estimating **43,853,674 gas**, below the plan's **56,566,914** limit. **This diagnostic uses existing PoolManager code addresses for the constructor's dependency code-existence checks. It is not the actual configured factory deployment or proof of the dependent basket flow.**
- The full-batch behavior is consistent with an RPC-wide simulation gas cap, but the actual provider cap has **not** been confirmed. [Geth documents a cap across the entire simulation](https://geth.ethereum.org/docs/interacting-with-geth/rpc/ns-eth), with a [default of 50,000,000](https://geth.ethereum.org/docs/fundamentals/command-line-options). This is an inference, not proof of PublicNode's configuration.
- Both providers reject the optional `eth_txGasLimitCap` discovery method as unavailable. No per-transaction admission cap is claimed from that probe.

The full live RPC batch is therefore **incomplete**, while the exact full Foundry fork simulation completed. Do not substitute the isolated probe, partial prefixes, or local fork results for successful Sepolia transactions. No CRE or browser privacy measurement has been run.

## Next owner deployment preparation

Prepare a separate guarded recovery entry point that verifies the known failed receipt and nonce 1, preserves the original public broadcast record and sensitive cache locally, checks fresh chain/block/feed/balance/configuration state, and uses the Amsterdam runtime without changing contract behavior. It must default to dry run and require explicit owner broadcast mode, local keystore entry and explorer credentials. Retain the original helper's initial-deployment refusal. Show the owner the fresh gas estimate and command before any further signature.
