# Configured deployment dry run — complete, not broadcast

The owner supplied the tenant's `ethereum-testnet-sepolia` entry from authenticated CRE CLI v1.39.0 output. Only that public entry was extracted into `docs/cre/sepolia-tenant-forwarder.json`; the pasted login URL, email, organization details and unrelated terminal history were not copied into the repository.

Selected **simulation** forwarder (`mockAddress`): `0x15fC6ae953E024d975e77382eEeC56A9101f9F88`. The distinct `address` field is the normal deployed-workflow forwarder; it is not selected for the planned CLI simulation receiver. [Official simulation/production distinction](https://docs.chain.link/cre/guides/workflow/using-evm-client/forwarder-directory-ts).

## Preflight and rate-limit handling

The first parallel Tenderly preflight hit HTTP 429 while reading BTC/USD. The retry paced sequential requests; it used no account, key, paid service or replacement provider. The intermediate [finalized snapshot](tenant-forwarder-finalized-preflight.json) predates the owner's funding and correctly shows the **historical** zero balance; it is not the current balance result.

The subsequent [funded snapshot](tenant-forwarder-preflight.json), observed **6 November 2026 15:51:05 IST**, uses fixed canonical block **12,075,935**, hash `0x16bce61fcc1c39ef7430544d45e297e8b25c0f871ff625d0f4344f2c8ebe7733`. Both PublicNode and Tenderly reported:

- Public deployer balance **0.199243140019909222 Sepolia ETH**.
- **4,579 bytes** at the selected mock forwarder, matching code hash `0x0a1b63dd9c5ee32c042a5124c96d3d344eea29c0daca30e54d2d91c09cc940b7`.
- Healthy real USDC/USD, ETH/USD, BTC/USD and LINK/USD feeds under unchanged registry limits. Ages: 4,128 / 588 / 1,788 / 3,492 seconds respectively; maxima 108,000 / 4,500 / 4,500 / 4,500.

This is provider diversity, not proof of fully independent infrastructure. Freshness and balances must be checked again before broadcasting.

## Actual dry-run result

The [capture](configured-dry-run-2026-11-06T10-21-45-343Z/capture.json) and [full Forge output](configured-dry-run-2026-11-06T10-21-45-343Z/forge.log) record the configured run from **15:51:45 to 15:52:40 IST**, exit **0**. Source remained at `35aacf7be2540a6074cb1a94e19141140e19de13`, with no tracked source edits. Public configuration was written to ignored `contracts/.env`; no private key, password or explorer credential was supplied or read.

Forge actually reported:

```text
Chain 11155111
Estimated gas price: 1.00000002 gwei
Estimated total gas used for script: 27792864
Estimated amount required: 0.02779286455585728 ETH
SIMULATION COMPLETE.
```

This estimate concerns the deployment batch only at that fork state. It is not a paid fee, a fixed future quote, a lifecycle/CRE cost estimate or evidence that contracts exist on-chain. The checked balance exceeds this deployment estimate; later gas prices, nonce changes and repeated transactions can change the requirement.

The run used the approved Tenderly endpoint for **reads only**, pinned to block 12,075,935, with `--compute-units-per-second 40` to reduce RPC request pressure. No safety/execution bound changed. No `--broadcast`, keystore/account unlock, state/balance override, actual CRE workflow run or browser measurement occurred.

The script-generated manifest was moved immediately out of `deployments/sepolia.json` into [predicted-deployment-NOT-DEPLOYED.json](configured-dry-run-2026-11-06T10-21-45-343Z/predicted-deployment-NOT-DEPLOYED.json). Those addresses are ephemeral predictions. The canonical deployment path remains absent until a real broadcast is verified. The ordinary dry-run transaction plan remains under Foundry's ignored `contracts/broadcast/DeployDemo.s.sol/11155111/dry-run/` directory; it is not broadcast evidence.

## Prepared owner command; do not run yet

After the owner configures explorer verification locally and final pre-broadcast checks pass:

```bash
cd '/Users/hano/Projects/Wave Eth/contracts'
forge script script/DeployDemo.s.sol:DeployDemo \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --account wave-sepolia --broadcast --slow --verify
```

The owner enters the keystore password locally. Do not paste keys, passwords or API credentials into chat or Git. The agent has **not** executed this command. Tenderly remains read-only. A normal CRE workflow-deployment access approval is separate from the planned local CLI simulation; no request for registry deployment or mainnet key linking was made. CRE broadcast and full browser privacy measurement remain after actual contract deployment.

There are no actual Wave Sepolia addresses, lifecycle receipts or CLI broadcast results to add yet. Earlier failed attempts remain retained in `FUNDING_AND_DRY_RUN.md`; this completed configured dry run supersedes only their preflight outcome, not the missing live-evidence gates.
