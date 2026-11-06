# Wave Protocol verification

The user story under test is: create a basket in the dashboard, deposit mUSDC, observe underlying holdings, receive a bounded forwarder report, trade flagship shares, redeem to mUSDC or underlying assets, and inspect the read-routing policy.

## Observed evidence

| Boundary | Result | Evidence |
| --- | --- | --- |
| Dependency setup | Passed | npm workspace installs; project-local Foundry 1.7.1 and Bun run. |
| Contract compilation | Passed during implementation | Solidity 0.8.26/Cancun; factory separated from the vault deployer after an EIP-170 size finding. Final sizes/checks are recorded after review. |
| Chain deployment | Passed locally | Disposable Anvil chain 31337; real PoolManager, asset pools, factory/vault, mined hook pool, and report receiver deployed by the runner. |
| Browser → deposit → holdings | Passed locally | 1,000 mUSDC deposit confirmed; NAV moved from $99,665.72 to $100,662.03 in the controlled-price fixture. |
| Browser → settlement exit | Passed locally | 500 FUND redeemed; confirmed receipt and lower share balance reflected in the dashboard. |
| Browser → in-kind exit | Passed locally | 500-share request confirmed and pro-rata holdings decreased; fee shares retained by the configured treasury. |
| Browser → factory → list | Passed locally | Wave Horizons / HRZN created with a 40/35/25 allocation and appeared beside Wave Blue Chip. |
| Browser → hooked pool | Passed locally | Buy FUND and sell FUND swaps both confirmed through the adapter and hook pool. |
| Forwarder → receiver → vault | Passed locally | Deterministic local report fixture accepted; explicitly not a CRE CLI simulation. |
| Browser private transport → Sepolia RPC | Passed | Real worker became ready; an anonymized eth_blockNumber request returned Sepolia block 12,074,528. The probe meter recorded 1 anon success, 2 bootstrap successes, 0 explicit-direct successes, and 0 failures. |
| Privacy failure behavior | Passed in focused test | Worker failure makes no automatic direct call; a direct opt-in affects exactly one request. Batch successes/errors reconcile individually. |
| CRE compilation | Passed | Official SDK compiler produced workflow WASM using Bun/Javy. This does not prove CLI simulation or broadcast. |

Representative local transaction hashes (valid only in the running disposable fixture):

- Deposit: `0x9d4b…76d0` (full receipt is available through the UI/session or local node).
- Settlement exit: `0xd1ae…77e2`.
- In-kind exit: `0xa887…f75e`.
- Basket creation: `0x5660…3a57`.
- Hook buy/sell: `0x894d…7876`, `0x2083…8305`.
- Report fixture: `0x6c74627c127e964333f91853d931e36621b2d1f67b011490852f0c314d408677`.

These are implementation-time observations, not production evidence or return promises. Restarting the demo replaces this chain. The initial shallow-liquidity deposit failure was reproduced in a failing real-PoolManager test, fixed by deeper demo liquidity, and then passed both the test and browser deposit. All wallet writes now have a public-client preflight simulation.

## Required external evidence still missing

- Funded Sepolia deployment and explorer contract verification.
- A fork run against the actual intended Sepolia addresses and current feeds.
- Authenticated CRE CLI simulation with a real broadcast and successful receiver execution.
- A full Sepolia browser lifecycle with measured private startup below ten seconds and at least 95% successful anonymous-read coverage. The worker-only probe above measured 33.3% coverage and is not a substitute for this session.
- Partner eligibility confirmation, public repository/line anchors, feedback form, demo recording, and event submission.

## Dependency finding

The installed CRE SDK pins Zod 3.25.76, reported by npm audit under GHSA-mrhx-c7xc-m3w5 (collection-size memory exhaustion). A compatible upstream SDK fix is not available in the installed version. No forced major dependency override was applied. Test tooling was upgraded to Vitest 5.1.0 to remove the reported critical test-runner issues.
