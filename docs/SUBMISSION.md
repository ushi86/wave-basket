# Owner submission kit — draft, not submitted

A [three-minute edited captioned walkthrough](media/Wave-Protocol-Demo.mp4) and [voiceover script](media/Wave-Protocol-Voiceover-Script.md) are now available. It contains original music, real UI captures and explicit pending labels; it does not demonstrate completed deposits, swaps, exits or real CRE execution. No public video-hosting upload, feedback-form confirmation or ETHGlobal submission has been performed. The owner's stated 09:00 IST close had passed at the final clock check. Historical recording suggestions below remain conditional on obtaining genuine proof.

Readiness is incomplete. Do not describe local Anvil, mock forwarding, workflow compilation or a worker-only probe as canonical Sepolia or CRE CLI evidence. Confirm event kickoff/track, public source, genuine integration evidence and current partner rules before recording final claims. No form or event submission has been sent.

## Submission narrative

**Wave Protocol - Token baskets, in balance.** Managing a token portfolio usually means many swaps, constant rebalancing, and exposing what you hold to an RPC provider. Wave turns a basket into one token and keeps fair value, target allocation, and private visibility in balance.

A user creates or enters a basket, checks its Chainlink-based NAV against the Uniswap v4 pool price, sees how NavGuardHook adjusts directional fees, follows a bounded CRE allocation proposal or submitted rebalance, and checks their basket through Anon-RPC app reads. Each partner supports an action in that journey: Uniswap Foundation for execution and NAV-sensitive fees, Chainlink for oracle reference and bounded automation, and Ethereum Foundation / Anon-RPC for reduced RPC exposure.

On-chain holdings and transactions stay public. Anon-RPC only reduces RPC exposure; wallet RPC is separate and local demo reads are direct. This is an unaudited testnet demo with mock assets and a labeled simulation receiver, with no promised returns, safety or production readiness. Healthy-feed exits crystallize pending creator fees; stale-feed in-kind exits remain immediate and pro-rata after the withdrawal fee and may avoid uncrystallized creator fees. No reserve is withheld. Missing live evidence remains missing.

## Recording outline (about 3 minutes)

- 0:00–0:20: “Managing a portfolio means many swaps, ongoing rebalancing and exposing reads to an RPC provider. Wave Protocol turns a basket into one token. Token baskets, in balance.” Show testnet/mock/unaudited labels.
- 0:20–0:55: Create a basket, deposit, inspect holdings and creator/withdrawal fees.
- 0:55–1:25: First, fair value. Show the Chainlink-based flagship NAV beside the Uniswap v4 pool price. Explain NavGuardHook's 0.05% toward/1% away fees outside the NAV band, without promising convergence. Open genuine receipts when available.
- 1:25–1:55: Second, target allocation. Show market inputs, the bounded CRE proposal or actual broadcast output, accepted receiver nonce and new vault history. A skipped/failed run stays labeled. If broadcast is absent, state “not demonstrated”; do not substitute the local fixture.
- 1:55–2:25: Show both exits. Healthy feeds crystallize pending creator fees. Stale in-kind payout remains immediate, but can avoid uncrystallized fees; no reserve.
- 2:25–2:50: Third, private visibility. Show measured Anon-RPC startup/coverage, route exceptions and worker-stop fail-closed behavior. Say: On-chain holdings stay public. Anon-RPC only reduces RPC exposure. Label worker-only probes and local direct reads.
- 2:50–3:00: Show public immutable source/evidence matrix and remaining limitations. The owner records their own narration and confirms actual video limits in the dashboard.

## Partner text drafts

**Uniswap Foundation - fair value:** At the trade step, the user compares pool price with underlying NAV. Wave integrates v4 PoolManager settlement through a dedicated adapter and a hook bound to one flagship PoolKey. Before each swap the hook compares share-market price with underlying oracle NAV, charging 500 units toward NAV and 10,000 away outside a precise ±1% band. Current proof: local PoolManager tests and source. Public source anchors and genuine Sepolia directional receipts are still required. Review `FEEDBACK.md`, complete the official feedback form yourself, and retain confirmation.

**Chainlink - target allocation:** At the allocation step, the user inspects oracle-valued holdings and the accepted rebalance history. A deterministic CRE TypeScript workflow reads external market changes, clips allocations under on-chain constraints, and submits nonce-ordered reports to a freshness/authentication-checking receiver. Current proof: compiled WASM and local tests. Actual CLI simulation with broadcast and receiver/vault success remain missing. Simulation mode authenticates the configured forwarder but omits workflow-identity metadata; do not present it as production authentication.

**Ethereum Foundation / Anon-RPC - private visibility:** At the read step, the user checks their basket with less RPC exposure while holdings remain public on-chain. The dashboard routes app reads through a hash-pinned worker and meters bootstrap, anonymous, explicit-direct and failed methods. Failure stops reads without silent fallback. Current full-lifecycle startup and coverage acceptance are unverified. The historical worker probe is narrower evidence. Replace this draft's status only after actual session export and screenshot review.

## Final owner actions

Confirm current prize names/eligibility/selection limits in the official dashboard. The public source is https://github.com/ushi86/wave-basket. Supply the funded Sepolia keystore address and supported CRE login/wallet configuration through local secret mechanisms; never paste keys into chat/source. Verify public history and immutable line links after publication. Run the read-only evidence checker, inspect each artifact and resolve failures. Record/upload the demo, select partners, complete the feedback form, and submit before the verified deadline. Save actual confirmation/time/URL only after seeing success. No confirmation is currently available.

Rollback requires matching manifests and workflow/report versions. The hardened contracts are immutable v2 deployments; old addresses are not upgraded by changing a manifest. Preserve safe exits from any old positions. Phase B starts only after confirmed submission.
