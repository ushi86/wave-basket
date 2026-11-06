# Wave Protocol product progress

Updated 6 November 2026. Source baseline: commit 1213bf0. Product spec: [Basket Product Experience and Submission](../specs/WAVE_PRODUCT_EXPERIENCE_SPEC.md). The owner confirmed the testing boundaries and all added negative/regression conditions. The original [product brief](provenance/PRODUCT_EXPERIENCE_BRIEF.txt) is preserved as planning provenance.

**Current phase: Phase 0 complete; Phase 1 authorized and in progress.** Phase 0 changed no product code and sent no transactions. The owner explicitly authorized Phase 1 next, revoked setup/implement-spec, and designated the spec and this document as the source of truth and tracker. Stop after Phase 1.

## Blockers

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

**Next:** implement the authorized Phase 1 UI only, run checks and unchanged contract regressions, capture actual local-app screenshots, commit/push, and stop. Phase 2 and all deployment activity require their respective owner approval.

## Phase 0 completion — whitepaper and deployment answer

All 15 whitepaper pages were read. Pages 3–11 describe asset-management abstraction, collateralized shares, NAV per share = total fund value / share supply, deposit allocation, exits and the Vault/Allocation/Settlement layers. Pages 13–14 describe manual and algorithmic products. The illustrated issuance/fee examples, trustless/decentralized/ETF language, governance, cross-chain, audits and backtesting promises are not copied as current product claims. Wave retains actual measured-value issuance, high-water-mark fee dilution and the disclosed stale-feed fee exception. Risk/return protection is not promised.

**Did deployment succeed? No.** The [fresh two-provider observation](readiness/product-phase0-20261106/deployment-recheck.json) at 12:01 UTC confirms transaction `0x5eb42ec1baaeb837ca64021bd561ca05bb3596ff42ceb9b42eca3e621d18765f` reverted at block 12,076,125, consumed all 706,678 gas and created no code. Latest/pending nonces remain 1/1. There are no verified successful Wave Sepolia addresses to list; predicted addresses are not deployed contracts.

**What the owner needs to do:** do not retry the old helper or use resume. No new funding, login or secret is requested now. A new recovery plan must start from freshly verified nonce 1, preserve the failed plan/cache, use native Foundry 1.8.3 Amsterdam runtime with the existing compiler target, recheck feeds/balance/gas/receiver settings and pass its deployment checks. The full Foundry fork run passes; the optional full remote RPC batch remains incomplete and must be disclosed. Once a reviewed exact recovery command is ready, separately approve broadcast and run it locally, entering the encrypted keystore password yourself. The agent will then verify every receipt before publishing any address as deployed. This work is not silently folded into Phase 1.
