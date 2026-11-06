# RPC tip/state diagnosis and local demo

The owner requested fixing the Sepolia setup locally and launching the disposable Anvil demo. The standing instruction against agent-operated Sepolia broadcast remains in force. No owner keystore/password/API key was accessed, and no Sepolia transaction was sent by the agent.

## Observed failed attempt and transaction state

The owner's [failed command output](sepolia-deploy-20261106T103902Z.log) stops during state loading with `block not found: 0xb843fd`. No real Sepolia broadcast record exists. Both providers reported latest nonce 0, pending nonce 0 and unchanged balance 0.199243140019909222 ETH during diagnosis. This supports no mined/pending deployment, rather than inferring success from the `--broadcast` command flag.

## Feedback loop and diagnosis

The [unfixed reproduction](rpc-tip-repro-2026-11-06T10-43-29-639Z/capture.json), with [actual output](rpc-tip-repro-2026-11-06T10-43-29-639Z/forge.log), ran the original PublicNode simulation path **without** account unlock or broadcasting. It failed in about two seconds with the same `block not found` symptom. Direct account reads at a later head succeeded, consistent with a transient tip/state availability issue.

Ranked hypotheses before the fix: (1) advertised header tip ahead of available account state on a provider backend; (2) inconsistent routing/batching of account-state calls; (3) local Forge cache issue. Backend internals were not inspected, so a specific load-balancer implementation is not claimed as proven.

A [fresh two-provider preflight](rpc-fixed-block-preflight.json) confirmed a recent common block, balance, forwarder code and healthy feeds. The [fixed comparison](rpc-fixed-repro-2026-11-06T10-47-12-792Z/capture.json), [full output](rpc-fixed-repro-2026-11-06T10-47-12-792Z/forge.log), used the same provider and arguments as the failed simulation, adding only `--fork-block-number 12076057`. It passed, estimating 27,791,510 gas at 0.156640656 gwei (0.00435328035763056 ETH). This demonstrates the fixed-block workaround; it does not prove exactly which backend component caused the transient failure.

## Local operational fix

`scripts/deploy-sepolia.sh` is a Bash helper for this owner's initial deployment. It defaults to dry run. It checks Sepolia identity and unchanged initial nonce on both providers, selects the smaller observed head minus three blocks, requires matching block hashes, and passes that fixed block to the existing Forge deployment script. It never changes contract code, prices, bounds or simulated balances. Forge's existing healthy-feed and execution checks remain active.

A separately explicit `--broadcast` mode requires an interactive owner terminal and a locally exported explorer key. It refuses existing canonical manifests/broadcast records pending review. The agent tested that a noninteractive broadcast invocation was rejected **before any RPC calls or Forge execution**. The agent then ran the helper's actual read-only dry-run mode successfully; its result is in `owner-deploy-20261106T105021Z/`. This live external-provider failure is not meaningfully locked down by a mocked unit test; the retained red/green Forge runs and guarded helper dry run form the operational regression check.

The helper remains subject to provider availability and rate limits; an unavailable fixed block or failed check stops the run. It does not silently change providers. If any broadcast later partly lands or verification fails, inspect records/receipts before retrying; do not rerun an initial deployment blindly. The owner must run broadcast themselves and enter their password locally.

## Local demo delivered

The disposable local runner was started and left running at **http://127.0.0.1:5173**, with Anvil RPC **http://127.0.0.1:8545**, chain **31337**. HTTP returned 200 and the browser loaded the seeded flagship with mock holdings and NAV. The manifest labels mock tokens, demo feeds and an authenticated fixture receiver; reads are direct loopback calls. No private worker or Sepolia wallet was used. Local deployment activity is not Sepolia evidence. The current ignored Vite setting points to this local manifest; use the explicit Sepolia manifest setting after an actual Sepolia deployment.

No product, contract, worker pin or privacy policy behavior changed. Throwaway diagnosis scripts stayed in `/tmp`; retained logs are clearly scoped evidence, not live deployment receipts. The local demo continues running at the owner's request.
