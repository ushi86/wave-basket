# Phase 2A — existing live Growth basket

Status: preparation only; no new user-flow transaction has been sent or claimed. The owner signs every transaction. Stop between wallet actions and verify each completed hash before treating it as success.

## Fixed deployment, real data

- Network: Ethereum Sepolia, chain **11155111**.
- Growth: existing flagship **0x237eFeB9Db74341ebb3Ba207e991D8aeAc536b91**. On-chain name/symbol remain **Wave Blue Chip / FUND**. This alias creates no new basket.
- Settlement token: mock mUSDC **0x33297104581Dd29347d9Ed37936e4F16621D59aE**, six decimals.
- Swap adapter: **0x7cbe10AA965Edc8414ad0a4C68192f8ef117f21D**.
- Hook: **0x536a446ca6462522c5668A20a62f1503ca4d2080**, approved pool **0xea37800db83aad61438fef1371e144704b9e2596ee56cb9cbda38eff49e4e8e0**.
- Default app reads: immutable Nox 0.4.0. No silent direct fallback. Wallet RPC/broadcast is outside the app meter; on-chain holdings stay public.
- Testnet, mock assets, unaudited, real Chainlink feeds, CRE simulation receiver. No returns or production readiness claimed. Stale in-kind exits remain immediate and net pro-rata, with no reserve; they may avoid uncrystallized creator fees.

## Current owner action — connect only

Open **http://127.0.0.1:5173/#baskets** in the browser containing your Ethereum wallet. Click **Connect wallet**, select your account and permit the Sepolia network switch if requested. Do not sign a deposit, approval or swap yet. Supply only the public connected address/status afterward. Never share a key, seed, password or API credential.

## Subsequent actions, presented one at a time

1. **Account/funding check.** Read the connected account’s Sepolia ETH, mUSDC, FUND and allowances. If gas or mock tokens are missing, give the owner the one required funding/faucet step. The owner’s pre-existing seeded position must not be represented as the result of a new $100 deposit.
2. **Deposit 100 test mUSDC.** Prepare exact mUSDC approval of `100000000` units to the flagship. Then deposit that amount to the connected recipient with the app’s positive, fee-aware/current NAV minimum-share calculation and unchanged tolerance. The app may open the second wallet prompt after the approval confirms; leave it unsigned until that step is reviewed. Record approval and deposit separately. Only a confirmed `Deposited` event and share/balance changes count as deposit proof.
3. **Prepare live hook directions.** Read `poolSnapshot`, approved pool ID, balances and live v4 state immediately before each action. At an initial price inside the 1% band both fees are 0.05%; that is not evidence of an away trade charging 1%. If needed, propose an explicitly labeled setup trade to move the actual testnet pool price outside the band. Never change a feed, NAV, fee band or safety bound. Setup is not qualifying direction evidence.
4. **Away swap.** From an actually out-of-band price, approve only the chosen input amount to the adapter, then swap through it with a freshly prepared positive minimum output and connected recipient. The receipt must emit `HookFeeApplied` and v4 `Swap` for the approved pool, demonstrating away direction from the pre-swap spot/NAV and fee 10000 (1%). Fixed amounts/minimums are deliberately not invented before the account and current quote are known.
5. **Toward swap.** Prepare the opposite direction from the real current out-of-band state, approve exact input and execute with a fresh positive minimum. Require the approved-pool events, true toward direction and fee 500 (0.05%). Re-read after each completed swap; do not reuse a stale direction label or quote.
6. **USDC exit.** Reserve enough actual shares for both exits. Prepare a share amount within the connected account’s balance, read `previewRedeem` including pending creator fees, and use the unchanged 1% execution tolerance on that net quote. Call `redeem(shares, minimumUSDC, account)`. Verify `Redeemed`, mUSDC/treasury transfers and burned shares.
7. **In-kind exit.** Prepare the remaining reviewed share amount within balance and call `redeemInKind(shares, account)`. Verify `RedeemedInKind`, actual token amounts, fee shares and supply changes. No swaps should be invented for this path. If feeds are stale, preserve the immediate full net pro-rata path and disclose the uncrystallized creator-fee limitation.

No zero minimums, synthetic quotes, fake events, replayed results or lowered limits. Parameterized future steps become exact only after their just-in-time read/simulation succeeds. An approval alone is not the following operation’s proof. A failed or cancelled transaction remains failed/cancelled.

## Receipt evidence

For every supplied hash, corroborate chain ID, sender, nonce, target/calldata, status, canonical block, logs and resulting state on **PublicNode and Tenderly**. Their provider diversity is not proof of independent infrastructure. Save actual hashes/block numbers and decoded action evidence, then update EVIDENCE.md and the transaction manifest. Do not relabel the deployment’s internal factory seed deposit as this owner-driven deposit.

A read-only startup/UI check is partial evidence only. Full privacy acceptance, real CRE run/receiver execution (or an authentic hold), and the submission draft remain separate 2B–2D work. Ask the owner’s LLM/news preference before adding either; no such source has been added here.
