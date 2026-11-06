# Wave Protocol product progress

Updated 6 November 2026. Source baseline: commit 1213bf0. Product spec: [Basket Product Experience and Submission](../specs/WAVE_PRODUCT_EXPERIENCE_SPEC.md). The owner confirmed the testing boundaries and all added negative/regression conditions. The original [product brief](provenance/PRODUCT_EXPERIENCE_BRIEF.txt) is preserved as planning provenance.

**Current phase: Phase 1 approved. Separate Sepolia recovery is prepared; Phase 2 remains paused pending verified deployment and explicit continue.** Phase 0 changed no product code and sent no transactions. The owner explicitly authorized Phase 1 next, revoked setup/implement-spec, and designated the spec and this document as the source of truth and tracker. Stop after Phase 1.

## Resolved prerequisites and remaining live-integration gates

- Resolved: the original whitepaper was supplied at the repository root. All 15 pages were read and its NAV formula/diagram visually reviewed. An identical documentation copy is preserved as [whitepaper.pdf](whitepaper.pdf); the original is untouched.
- Removed by explicit owner instruction: external tracker, ticket graph, setup skill and implement-spec are not project requirements. Track phases here.
- No verified successful Wave Sepolia deployment. Preserve the failed broadcast record. A guarded nonce-1 recovery command and fresh pre-broadcast checks remain pending. No automatic retry/resume is authorized here.
- No actual CRE CLI broadcast or full Sepolia Anon-RPC browser session accepted. LLM provider and privately configured credentials are not selected; this becomes a prerequisite at Phase 5, not a reason to invent AI output now.

## Current behavior versus requested product

| Area | Inspected behavior | Remaining gap |
| --- | --- | --- |
| Product shell | Existing Explore, Portfolio, Create, Privacy and Faucet pages, cards, basket controls and a shared protocol model | Refine around the 100-test-USDC entry point and card system; move faucet prominence into setup; verify screenshots/responsiveness during UI phases |
| Basket lifecycle | Public factory/vault flow and local real-v4 integration tests; registry supports up to four assets with settlement exposure | Create and verify actual Growth, Balanced and Yield instances with valid weights and liquidity; do not hard-code cards as live products |
| Deployment | Known first Sepolia creation reverted; later Amsterdam fork simulation completed 42 operations | Owner recovery, fresh gas/state checks, canonical receipts and deployed-state validation; dry-run predictions remain quarantined |
| Strategy/CRE | External 24-hour market-change data, deterministic bounded strategy, first three factory entries only, receiver with nonce/freshness/authentication | Explicit coverage for all intended baskets, sourced news/structured risk, optional approved LLM, hold on every required-source failure, genuine CRE execution evidence |
| Yield | No separately implemented reserve-backed yield asset identified | Separate token/adapter and backing conservation, stop at depletion, valid registry integration and NAV history; no frozen vault/deployer changes |
| Rebalance UX | Current/target holdings, recent history and transaction references exist | Coherent before/after cards, actual swap activity, sourced decisions and visible multi-step animation/cooldown |
| Replay | No authentic historical crash dataset/replay established | Saved sources with publication/observation times, bounded sequence, fair comparison and persistent REPLAY label |
| Hook | Approved flagship-key guard and directional fee tests | Price/NAV and actual fee explanation/evidence; other baskets must not imply hooked pools |
| Privacy | Fail-closed transport and accounting tests; immutable Nox 0.4.0 decision retained | Full Sepolia session startup/coverage/export/screenshot; onchain-public and wallet/bootstrap/CRE exception disclosures |
| Withdrawals/creator | Both exits, healthy creator-fee crystallization, stale full net pro-rata exit, existing Create flow | Polish previews, confirmations and fees; keep stale-fee escape limitation; preserve existing regressions |
| Submission | Existing README, evidence checker, partner/provenance documents | Updated product narrative, actual live proof, human-recorded demo and owner-completed forms/prize selections/submission |

## Partner map and page/card plan

- **Fair value / Uniswap Foundation:** Deposit, Swap Activity, Allocation/Timeline, settlement Withdraw and Price vs NAV show real v4 settlement and the approved hook's direction-dependent fees. In-kind exits transfer assets and must not invent swap activity.
- **Target allocation / Chainlink:** Basket/Portfolio/Yield NAV uses disclosed valuation inputs. AI Decision and Rebalance Timeline separate sourced observations, bounded proposals, CRE report delivery and confirmed receiver/vault execution. A correct hold is visible.
- **Private visibility / Ethereum Foundation:** Privacy card and default app reads use the pinned Anon-RPC worker with traffic accounting and fail-closed states. Onchain holdings remain public; no silent direct fallback.
- **Explore:** basket purpose/risk/assets/NAV/fees plus Put in $100; no primary faucet step. **Basket/position detail:** Allocation, Swap Activity, AI Decision, Timeline, Yield/NAV where applicable, Price vs NAV only where applicable, Privacy and Withdraw. **Portfolio:** actual owned shares/holdings/value. **Create:** existing allowlist/weight/fee controls with clearer states. **Settings/Demo Setup:** faucets, prepared-wallet/network configuration and diagnostics.

## Sepolia observation — not a successful deployment

At 11:55:17–19 UTC on 6 November 2026, fresh read-only calls to PublicNode and Tenderly both reported chain 11155111, canonical reverted receipt for [0x5eb42ec1baaeb837ca64021bd561ca05bb3596ff42ceb9b42eca3e621d18765f](https://sepolia.etherscan.io/tx/0x5eb42ec1baaeb837ca64021bd561ca05bb3596ff42ceb9b42eca3e621d18765f), block **12,076,125**, zero code at the receipt's predicted creation address, and latest/pending owner nonces **1/1**. No successful Wave addresses are listed as deployed. The existing [failure record](readiness/SEPOLIA_CREATION_GAS_FAILURE.md) and [Amsterdam dry-run record](readiness/AMSTERDAM_RECOVERY_PREFLIGHT.md) retain the supporting artifacts and limits. Provider diversity is not proof of fully independent infrastructure.

## Checks run in this preparation

The [local baseline logs](readiness/product-phase0-20261106/) are local verification only, not Sepolia/CRE/browser acceptance:

- Full workspace and Foundry tests: passed, including the unchanged accounting/stale-exit, fee, hook, receiver and guard suites; 27 Foundry tests, zero failures/skips.
- Workspace typecheck: passed.
- Dashboard build: passed, with the existing over-500-kB chunk warning. No warning threshold was raised.
- CRE WASM build: passed using the installed/cached toolchain. This is compilation, not a CRE simulation or broadcast.
- Secret scan: passed with no heuristic findings before publication. This is not a security audit.

No UI product change was made, so no new product screenshots are claimed. Existing local/mock/replay/live distinctions remain intact. The official [submission rules](https://ethglobal.com/events/mumbai/info/details) confirm 7 November 2026 at 09:00 IST; the owner's target remains 07:30 IST.

**Next:** owner review of Phase 1. Phase 2 requires “continue”; all deployment/broadcast activity still requires separate approval. No automatic progression is authorized.

## Phase 0 completion — whitepaper and deployment answer

All 15 whitepaper pages were read. Pages 3–11 describe asset-management abstraction, collateralized shares, NAV per share = total fund value / share supply, deposit allocation, exits and the Vault/Allocation/Settlement layers. Pages 13–14 describe manual and algorithmic products. The illustrated issuance/fee examples, trustless/decentralized/ETF language, governance, cross-chain, audits and backtesting promises are not copied as current product claims. Wave retains actual measured-value issuance, high-water-mark fee dilution and the disclosed stale-feed fee exception. Risk/return protection is not promised.

**Did deployment succeed? No.** The [fresh two-provider observation](readiness/product-phase0-20261106/deployment-recheck.json) at 12:01 UTC confirms transaction `0x5eb42ec1baaeb837ca64021bd561ca05bb3596ff42ceb9b42eca3e621d18765f` reverted at block 12,076,125, consumed all 706,678 gas and created no code. Latest/pending nonces remain 1/1. There are no verified successful Wave Sepolia addresses to list; predicted addresses are not deployed contracts.

**What the owner needs to do:** do not retry the old helper or use resume. No new funding, login or secret is requested now. A new recovery plan must start from freshly verified nonce 1, preserve the failed plan/cache, use native Foundry 1.8.3 Amsterdam runtime with the existing compiler target, recheck feeds/balance/gas/receiver settings and pass its deployment checks. The full Foundry fork run passes; the optional full remote RPC batch remains incomplete and must be disclosed. Once a reviewed exact recovery command is ready, separately approve broadcast and run it locally, entering the encrypted keystore password yourself. The agent will then verify every receipt before publishing any address as deployed. This work is not silently folded into Phase 1.

## Phase 1 complete — consumer product shell

**Visible change:** the landing page now starts with “Put in $100. Find your balance.” and prepares a 100-test-mUSDC deposit without signing. A three-step introduction and three partner cards explain the journey. Reusable basket cards read the actual configured factory/vault state, with assets, NAV/share, fee, target allocation and address. A single available basket uses a wider layout rather than an empty three-column grid. Growth/Balanced/Yield remain separate PLANNED / NOT DEPLOYED cards with no fabricated NAV, weights, addresses, deposit controls or yield. Their real deployment remains Phase 2.

Portfolio now has position cards, actual-value summary, wallet/empty states and a route back to available baskets. Faucets are retained only under Demo setup in the secondary tools navigation. Route changes scroll back to the start. Missing/loading basket data no longer shows the previous hard-coded allocation, default fund name or 10% fee as if loaded from a contract.

**Working:** local contract-backed basket discovery and valuation; $100 preparation; existing deposit/withdrawal controls; portfolio rendering from account/basket state; navigation, setup access and responsive card layouts. No contracts, receiver, workflow, shared ABI, limits, worker pin or privacy-routing logic changed. React review kept pure display components and the existing shared protocol model; no extra fetching layer, wallet package or dependency was introduced.

**Mock/local:** screenshots show the existing chain-31337 Anvil deployment, mock assets, mock feeds, fixture receiver and direct loopback reads. They are UI verification only. No screenshot, balance, decision or transaction result was fabricated. The separate [local state observation](readiness/product-phase1-20261106/local-state.json) returned NAV 99,665.718687 test USDC and target weights 4,000/3,500/2,500 bps, consistent with the rendered local basket. No replay is shown.

**Unverified/not performed:** a new UI deposit/withdrawal transaction, a connected-owner-wallet portfolio session, three real new baskets, funded Yield, news/LLM decisions, live CRE broadcast, full Sepolia private-read acceptance and successful Wave Sepolia deployment. These are later phases or separately approved owner operations. Existing local integration tests do not establish live Sepolia execution.

**Validation:** [captured checks](readiness/product-phase1-20261106/) pass: 35 TypeScript tests, 27 Foundry tests including all unchanged accounting/stale-exit/fee/hook/receiver/guard regressions, workspace typecheck, dashboard build, CRE WASM build and formatting. The existing over-500-kB bundle warning remains; no threshold was raised. Secret scanning returned no heuristic findings. Browser checks verified the $100 CTA resets a changed amount to 100 and selects Deposit without signing; portfolio navigation/empty state; Demo setup with no primary Testnet faucet button; all three planned labels; no console errors; and no horizontal overflow at 1440- and 390-pixel test widths. The temporary viewport override was reset.

**Screenshots:** [landing desktop](screenshots/phase1/landing-desktop.jpg), [complete basket view](screenshots/phase1/baskets-desktop.jpg), [portfolio desktop](screenshots/phase1/portfolio-desktop.jpg), [landing mobile](screenshots/phase1/landing-mobile.jpg). These capture the actual updated local app, not a design mockup. The app remains available at http://127.0.0.1:5173.

**Stop:** Phase 1 is the end of this authorized increment. No Phase 2 work, Sepolia redeployment, broadcast, wallet unlock or fund movement occurred.

## Sepolia recovery prepared — separate owner operation

The owner approved Phase 1 and explicitly kept Phase 2 paused. A [reviewed nonce-1 recovery runbook](readiness/SEPOLIA_RECOVERY_RUNBOOK.md) now explains the original out-of-gas cause, exact changes, fresh two-provider checks, all 12 predicted creations and the exact owner-only command. No production contract or Solidity deployment routine changed.

Native Foundry was updated to signed/attested **1.9.0** after 1.8.3's strict admission path rejected a large Amsterdam transaction using the older total-gas cap. Its official source fixes the distinction between execution gas and state gas. All failed diagnostic attempts are retained. A short timeout, upstream forwarding at the fork boundary and the fixed 50M eth_simulateV1 budget are disclosed rather than called successful validation. The existing local UI demo was restored without changing its head hash or account state.

The [accepted dry run](readiness/sepolia-recovery-2026-11-06T12-41-55-341Z/capture.json) completed all 42 planned operations from nonce 1, estimating **175,152,507 gas**, with conservative quoted deployment budget **0.000000007356405294 Sepolia ETH** at the observed fee settings. All 42 exact unsigned operations also passed the mandatory strict transaction path on a disposable localhost fork with the real forked balance and nonce, zero generated accounts and no signing keys. That fork is local only, was stopped afterward, and is not evidence of live Sepolia execution. The real account remains subject to fresh nonce-1 checks before signing.

The original failed transaction, public broadcast file/hash and logs are unchanged. Its sensitive cache is preserved privately without inspection/publication. Recovery broadcast/cache directories are separate; no old helper, resume or start-fresh path is used. Generated manifests remain quarantined predictions until every real receipt is verified on PublicNode and Tenderly.

Local compatibility checks show a single factory/registry/adapter and receiver support multiple baskets, settlement exposure and a newly registered standard asset. They do not implement or prove reserve-backed Yield. New basket instances are normal factory creations, not replacements of an existing core instance. The hook remains single-pool; CRE's three-entry coverage must be respected or adjusted offchain later. No Phase 2 implementation or plan is started here.

Validation: 35 workspace tests, 33 Foundry tests (all 27 existing tests retained, one new compatibility test and five inherited integration reruns), five runner guard tests, typecheck, web/CRE builds, code sizes and secret scan pass. Largest new production runtime remains WaveVaultDeployer at 24,186 bytes. The initial no-op compatibility probe failed on a sub-unit swap quote; the corrected nontrivial bounded-proposal probe passes without changing any production check. Evidence validation still fails for missing live proof; production audit retains the known SDK/Zod high advisory (two affected package entries).

**Next owner step:** review and run the exact guarded command in the runbook, enter the keystore password locally, and send the output. The agent has not signed or sent a Sepolia transaction. If the command fails, stop for receipt review. After output, verify every real receipt/state on both providers, update EVIDENCE/live addresses, then provide the Phase 2 plan and wait for continue.

**Fresh operational recheck (13:35 UTC):** the owner subsequently authorized agent-driven terminal execution. The full recovery dry run and all 42 strict local-fork operations passed again; reviewed sources and creation predictions are unchanged. Both providers still show nonce 1 and the original funded balance. The required explorer key is absent from the agent environment and ignored contracts/.env; the guard was not removed, no signing/broadcast occurred, and Phase 2 remains paused. See the [fresh capture](readiness/sepolia-recovery-2026-11-06T13-30-33-046Z/capture.json).
