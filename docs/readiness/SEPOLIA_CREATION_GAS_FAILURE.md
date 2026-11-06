# Failed first Sepolia transaction — 6 November 2026

Status: deployment blocked. No successful Wave deployment is claimed. No recovery transaction has been broadcast by the agent, and no contract behavior or safety bound has been changed.

## Canonical observation

The owner's explicit broadcast submitted only the first token-creation transaction, [0x5eb42ec1baaeb837ca64021bd561ca05bb3596ff42ceb9b42eca3e621d18765f](https://sepolia.etherscan.io/tx/0x5eb42ec1baaeb837ca64021bd561ca05bb3596ff42ceb9b42eca3e621d18765f). PublicNode and accountless read-only Tenderly corroborate:

- Receipt status **0 (reverted)** at block **12,076,125**, canonical hash `0x9e81d1cc51adb2a1309667a63f47f25c1efed688bd6ff260fa95d64c9ead7bff`.
- Gas consumed **706,678 / 706,678**; no logs and no deployed code at predicted address `0x5d8b7a6fd3257fa7a42a38c7231646f0d3aeb3d3`.
- Owner account latest and pending nonce both **1**. The failed transaction consumed nonce 0. The other 41 entries in Forge's saved plan have no transaction hash.
- The original Forge estimate of 27,794,694 total gas is **not a valid live deployment budget** under the observed Sepolia gas rules.

See the retained [owner log](owner-deploy-20261106T105814Z/forge.log), [run context](owner-deploy-20261106T105814Z/context.txt), and [two-provider receipt/replay observations](owner-deploy-20261106T105814Z/failed-first-transaction.json). Provider diversity does not establish fully independent infrastructure. Tenderly was used only for reads.

## Minimal, read-only reproduction

```sh
node docs/readiness/owner-deploy-20261106T105814Z/replay.mjs
```

This fetches the public transaction input and replays it with `eth_call` at block 12,076,124. It never signs or sends a transaction. Both providers returned:

```text
receipt REVERTED, gas 706678/706678, RPC estimate 3542382, replay at 5000000 succeeds
FAIL: original deployment gas limit is below the live Sepolia estimate. Do not retry or resume this plan.
```

The command exits 1 intentionally when the historical gas limit is insufficient. This is diagnosis of an immutable failed transaction, not an accepted deployment test. Its successful higher-gas `eth_call` returns 1,984 runtime bytes and is **not** a deployed contract. An earlier PublicNode replay specifically reported `contract creation code storage out of gas`; `debug_traceTransaction` was unavailable on PublicNode.

The ranked hypotheses were insufficient gas, an opcode mismatch, and constructor failure. Changing only the read-only call's gas makes the exact bytecode succeed. This establishes insufficient transaction gas; the source constructor does not need a behavior change to address this failure.

## Gas-model mismatch and proposed recovery

The repository pins Solidity 0.8.26's compiler target and current simulation to **Cancun**. Installed native Foundry is **1.7.1**, built 8 May 2026; a read-only `FOUNDRY_EVM_VERSION=amsterdam forge config --json` probe rejects Amsterdam as unknown.

The [Ethereum Foundation announcement](https://blog.ethereum.org/2026/09/17/glamsterdam-testnet-announcement) schedules Sepolia Glamsterdam for 6 October 2026 and describes changed state-creation/access gas costs. The chain/model mismatch is therefore the supported explanation for the severe underestimate. The [official Foundry 1.8.3 release](https://github.com/foundry-rs/foundry/releases/tag/v1.8.3) includes Glamsterdam state-gas fixes and a runtime `--hardfork` override separate from compiler settings.

Proposed next step: update the existing native Foundry toolchain to reviewed 1.8.3, then test Amsterdam **runtime** simulation while preserving the Cancun compiler target and existing bytecode. Do not change `evm_version` to Amsterdam: Solidity 0.8.26 cannot compile for that target. Do not compensate with an arbitrary global multiplier or skip simulation. Upgrade installation, helper recovery changes and a new full deployment dry run have **not** been performed in this phase. A newer tool alone is not proof the full deployment works.

Before any further owner broadcast:

1. Preserve the failed broadcast record and sensitive cache locally; never commit the sensitive cache. Do not use `--resume`: the original plan contains insufficient gas and starts at the consumed nonce.
2. Prepare a separate recovery attempt from freshly corroborated nonce 1, with new nonce-derived predictions. Preserve the failed attempt and retain all chain, block, feed, sender, balance, receiver and receipt checks.
3. Pass the full read-only deployment simulation using current Sepolia gas rules, cross-check the first creation against both providers' live estimate, and determine the revised full gas/funding budget. Dependent transactions also require validation; estimating only the first creation is insufficient.
4. Show the revised command and estimates to the owner before their next explicit broadcast. Owner alone unlocks the keystore and signs.

The script-generated `deployments/sepolia.json` was quarantined as [predicted-NOT-DEPLOYED.json](owner-deploy-20261106T105814Z/predicted-NOT-DEPLOYED.json). Its addresses and `deployBlock` came from simulation and are not deployment evidence. The canonical manifest path is absent. The original helper still stops on the retained broadcast record, so a blind redeploy remains blocked.

CRE and full browser Anon-RPC measurement remain deferred until a verified deployment. [Chainlink's Glamsterdam notice](https://dev.chain.link/changelog/ethereum-glamsterdam-upgrade-action-required-for-workflows-with-a-gas-limit) also calls for testing explicit workflow gas limits; receiver/broadcast gas must be revalidated before CRE execution.
