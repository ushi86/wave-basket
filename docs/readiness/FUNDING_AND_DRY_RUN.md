# Funding and deployment preflight

Owner decisions on 6 November 2026: retain the existing immutable Nox 0.4.0 pin for submission; no automatic switch after browser failure. Approve accountless read-only Tenderly as the second receipt-verification provider. This is provider diversity, not proof of fully independent infrastructure. Any account/key/payment requirement stops work for owner input.

## Balance and feeds

Actual read-only [balance/feed results](funding-feed-preflight.json) at **15:25:24 IST**, Sepolia block **12,075,811**, hash `0xf764a0b4fed2c5518b0512e51df3dd2dbd93f7f674a0493f9d587122b7f69cfc`: PublicNode and Tenderly both reported **0 Sepolia ETH** for `0xDe25D83481c0c2A711397c44eE3317dD826952D5` and the same feed data.

| Feed | Observed age (seconds) | Existing maximum | Result at observed block |
| --- | ---: | ---: | --- |
| USDC/USD | 2,640 | 108,000 | Healthy |
| ETH/USD | 2,724 | 4,500 | Healthy |
| BTC/USD | 300 | 4,500 | Healthy |
| LINK/USD | 2,004 | 4,500 | Healthy |

Positive answers, nonfuture nonzero updates and answered-in-round consistency passed. Recheck at deployment time; this observation does not promise future feed health. Funding, wallet signatures, faucet verification and credentials remain owner-controlled. No claim was made by the agent.

## Actual dry-run attempts

1. [First attempt](deployment-dry-run.json), [full output](deployment-dry-run.log): PublicNode, no account unlock or broadcast, exit 1. The provider returned `block not found: 0xb84326` during fork account loading. No gas estimate resulted.
2. [Fixed-block retry](deployment-dry-run-fixed-block.json), [full output](deployment-dry-run-fixed-block.log): approved Tenderly read endpoint at finalized block **12,075,754**, with the block hash corroborated against PublicNode. No state overrides, key access or broadcast. Exit 1: `vm.envAddress: environment variable "CRE_FORWARDER" not found`.

The retry simulated the script against the canonical PoolManager and configured real feeds, then stopped at the missing immutable receiver-forwarder input. The full deployment did not finish and **no complete deployment gas estimate exists**. Do not promote the prior local gas estimate or sum an aborted trace into a live deployment quote. Trace addresses/events are ephemeral simulation results, not actual deployed contracts or transaction evidence. No Sepolia deployment manifest was produced by these failed attempts.

The owner must provide the public Sepolia simulation forwarder from authenticated tenant discovery (`cre workflow supported-chains --output json`). This is prerequisite configuration, not CRE workflow execution. Do not substitute a documentation example, mock deployment or arbitrary address. A completed configured dry run must pass before broadcast.

## Owner deployment command, prepared only

After funding, verified matching keystore/address, complete public `contracts/.env` configuration (including the tenant-confirmed forwarder), healthy feeds, successful full dry run, reviewed gas estimate and locally configured explorer credential:

```bash
cd '/Users/hano/Projects/Wave Eth/contracts'
forge script script/DeployDemo.s.sol:DeployDemo \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --account wave-sepolia --broadcast --slow --verify
```

**Do not run this command yet.** It is the requested future owner command, not an action performed by the agent. Use the runbook's logging procedure when the prerequisites are met. The prepared command intentionally broadcasts through the primary provider; Tenderly remains read-only. CRE execution and the full browser measurement remain after deployment.

## Checker verification

The evidence boundary was checked red before green: the updated contradiction test initially failed while the checker still used dRPC, then passed after the approved Tenderly selection. All 30 readiness tests and tools typecheck pass; formatting and whitespace checks pass. No chain, canonical block, receipt status/target/log or state-validation predicate was removed or weakened. Only provider selection and provider-diversity wording changed; contracts, app RPC transport and Nox pin are untouched. The evidence gate remains incomplete for missing real submission artifacts.
