# Wave Protocol — three-minute walkthrough script

Public video: captions and original music; no system-voice narration. This is edited read-only app footage, not proof of completed wallet or CRE flows.

## 00:00 — Wave Protocol

Meet Wave Protocol. Token baskets, in balance. One token brings your basket into view.

## 00:09 — Many assets. One position.

Managing a portfolio means many swaps, constant rebalancing, and exposing reads to an RPC provider. Wave brings a basket into one token, with fair value, target allocation, and private visibility in the same journey.

## 00:25 — Start with 100 test USDC.

Growth is the existing flagship. Assets, target weights, fees, and net asset value come from contracts. This button prepares one hundred test USDC. Approval and the mock token faucet are verified; the deposit is still pending. No completed deposit is staged here.

## 00:45 — Fair value. A reference for every swap.

Uniswap v4 executes the swaps. Nav Guard Hook compares the approved pool price with Chainlink based net asset value before each swap. Outside a one percent band, a trade toward NAV pays zero point zero five percent; a trade away pays one percent. Inside the band, both pay zero point zero five percent. Live directional swap receipts are still pending.

## 01:10 — A target. Hard limits.

Chainlink feeds value the holdings. CRE proposes a bounded rebalance, while the vault independently enforces weight, turnover, timing, and execution limits. A genuine hold is acceptable. The workflow compiles, but real CRE broadcast and receiver proof remain pending. Local reports do not replace that proof.

## 01:33 — Your basket. Your exit.

Withdraw into mock USDC, or take the underlying assets in kind. Healthy feeds crystallize creator fees. Stale feed in kind exits stay immediate and pro rata after the withdrawal fee, with no reserve. They can avoid uncrystallized creator fees. These are controls, not completed withdrawals.

## 01:53 — Private reads. Public holdings.

Anon RPC is the default for application reads. This short session shows actual startup and method counters. Stopping the private worker rejects a read without increasing direct successes. It is partial evidence, not full lifecycle acceptance. Wallet RPC and bootstrap are separate. On chain holdings remain public.

## 02:18 — Show the proof. Keep the gaps.

The public record verifies forty two deployment transactions, plus approval and the mock token faucet, using PublicNode and Tenderly. Provider diversity does not prove independent infrastructure. Sixty eight local tests pass. Missing live deposits, swaps, withdrawals, and CRE execution stay visibly pending.

## 02:43 — Token baskets, in balance.

Wave Protocol. Token baskets, in balance. Uniswap for execution. Chainlink for valuation and bounded allocation. Anon RPC for less RPC exposure. Unaudited Sepolia, mock assets, no promised returns.
