# Wave Protocol — verified Sepolia deployment

**Token baskets, in balance.**

All **42 real Sepolia operations**, sender nonces **1–42**, succeeded between blocks **12076977–12077217**. PublicNode and Tenderly corroborated every receipt, canonical block, transaction input, log, created runtime and required state. All **12 contracts** are source-verified on Etherscan. Provider diversity is not proof of fully independent infrastructure.

This is an **unaudited testnet deployment with mock tokens, real Chainlink feeds and an explicitly labeled CRE simulation receiver**. It establishes deployment, not the complete app lifecycle, a real CRE workflow broadcast, an Anon-RPC acceptance session, reserve-backed Yield, returns, safety or production readiness. Phase 2 remains paused.

## Observed results

- Verification finished: **2026-11-06T20:19:33.663+05:30 (IST)**. Canonical state snapshot: block **12077246**, hash `0x91c9ccea02800b58d0cc840ae7cebcdec742319697b4ab2cd06dec8364a2c784`.
- Exact explorer source and constructor verification finished: **2026-11-06T20:29:51.676+05:30 (IST)**. All 12 have matching constructor arguments, no proxy flag and no SimilarMatch association.
- Receipt checks: **42/42**. Runtime checks: **12/12**, all within 24,576 bytes. Configuration/state checks: **76**, no errors. State snapshot and its closing canonical-block recheck agree on both providers.
- Deployer: `0xDe25D83481c0c2A711397c44eE3317dD826952D5`; corroborated public nonce after execution: **43**.
- Actual gas used: **130550418**. Actual recovery fees, excluding the earlier failed nonce-0 attempt: **0.000000002634669869 Sepolia ETH**.
- Remaining balance at the corroborated snapshot: **0.199039967448225827 Sepolia ETH**.
- Native deployment tools: Foundry **1.9.0**, Amsterdam runtime. Compiler: Solidity **0.8.26**, Cancun target, optimizer 200, via IR. Production code and portfolio safety bounds were not changed.
- Deployed source is unchanged from public source revision [1a59e233874e79fab7f70828addd535fce7b287f](https://github.com/ushi86/wave-basket/tree/1a59e233874e79fab7f70828addd535fce7b287f); operational verification fixes do not alter it.

[Full two-provider proof](sepolia-live-verification-2026-11-06T14-43-34-553Z/verified-deployment.json), [explorer results](sepolia-live-verification-2026-11-06T14-43-34-553Z/explorer-verification.json), [provenance index](sepolia-live-verification-2026-11-06T14-43-34-553Z/verification-index.json), [verified manifest](../../deployments/sepolia.json).

## Live addresses and creation receipts

Internal creations share their parent transaction. Every address below has corroborated deployed code; these are no longer predictions.

| Contract | Live address / verified source | Real creation transaction | Block |
| --- | --- | --- | --- |
| Mock USDC (mUSDC) | [`0x33297104581Dd29347d9Ed37936e4F16621D59aE`](https://sepolia.etherscan.io/address/0x33297104581Dd29347d9Ed37936e4F16621D59aE#code) | [0xd4edc8dbcca9761b87d5c4eafb89a0df235bb73320b44bb6aed32bddf976fb3c](https://sepolia.etherscan.io/tx/0xd4edc8dbcca9761b87d5c4eafb89a0df235bb73320b44bb6aed32bddf976fb3c) | 12076977 |
| Mock WETH (mWETH) | [`0x7B178cB5e0776E769BE44919889D5A57D8BB1742`](https://sepolia.etherscan.io/address/0x7B178cB5e0776E769BE44919889D5A57D8BB1742#code) | [0x5234c897226abb53b57624f73e93a2c6fa6f0b01c4a9664b7a819ca6a72deda5](https://sepolia.etherscan.io/tx/0x5234c897226abb53b57624f73e93a2c6fa6f0b01c4a9664b7a819ca6a72deda5) | 12076978 |
| Mock WBTC (mWBTC) | [`0xBe28019380A99649579B7E9fa7F1979e6f203F79`](https://sepolia.etherscan.io/address/0xBe28019380A99649579B7E9fa7F1979e6f203F79#code) | [0xf133c85ade8df32aa22c7c06be2aa574b16b0cca501e632b7e2df1284fdb36de](https://sepolia.etherscan.io/tx/0xf133c85ade8df32aa22c7c06be2aa574b16b0cca501e632b7e2df1284fdb36de) | 12076979 |
| Mock LINK (mLINK) | [`0xDd71a1BF041dcdb68AD70A6e0766996557759525`](https://sepolia.etherscan.io/address/0xDd71a1BF041dcdb68AD70A6e0766996557759525#code) | [0x73993772c2698a5925b0b457980ab538a5a7b9709a8e141611873ae1e5898bac](https://sepolia.etherscan.io/tx/0x73993772c2698a5925b0b457980ab538a5a7b9709a8e141611873ae1e5898bac) | 12076980 |
| AssetRegistry | [`0x97946eFDC076af3069C624dB65859Ba775aADbB4`](https://sepolia.etherscan.io/address/0x97946eFDC076af3069C624dB65859Ba775aADbB4#code) | [0xa3f11d7a536830f308d2cb7700d62acef8e6fdba4d340c0548046649787c39bc](https://sepolia.etherscan.io/tx/0xa3f11d7a536830f308d2cb7700d62acef8e6fdba4d340c0548046649787c39bc) | 12076981 |
| WaveSwapAdapter | [`0x7cbe10AA965Edc8414ad0a4C68192f8ef117f21D`](https://sepolia.etherscan.io/address/0x7cbe10AA965Edc8414ad0a4C68192f8ef117f21D#code) | [0xcb6e20d2d712513cfe6c17cb6d0eb6406b4e9b7a4149ae4043ed3a25dabb44ea](https://sepolia.etherscan.io/tx/0xcb6e20d2d712513cfe6c17cb6d0eb6406b4e9b7a4149ae4043ed3a25dabb44ea) | 12076986 |
| DemoLiquiditySeeder | [`0x2A9aD8D9406d768ebBF19Eb45Ae023E5664EE02f`](https://sepolia.etherscan.io/address/0x2A9aD8D9406d768ebBF19Eb45Ae023E5664EE02f#code) | [0x2250ced9dbf5dc0843614f246915f365a4177960b0acfa51fb31a5903d04a274](https://sepolia.etherscan.io/tx/0x2250ced9dbf5dc0843614f246915f365a4177960b0acfa51fb31a5903d04a274) | 12076987 |
| WaveFactory | [`0x6871Eb32a280498c8668139f812f41c8389f5999`](https://sepolia.etherscan.io/address/0x6871Eb32a280498c8668139f812f41c8389f5999#code) | [0x360446fcb53ab90c76cc08de0c13dc0831c3f7a20e1c32f5e956b54ed7dd2d0e](https://sepolia.etherscan.io/tx/0x360446fcb53ab90c76cc08de0c13dc0831c3f7a20e1c32f5e956b54ed7dd2d0e) | 12077180 |
| NavGuardHook | [`0x536a446ca6462522c5668A20a62f1503ca4d2080`](https://sepolia.etherscan.io/address/0x536a446ca6462522c5668A20a62f1503ca4d2080#code) | [0xfd9b5e2b00b7188a0464012ef4cdf7bf9f5e99c3c38022f101c58a465253440e](https://sepolia.etherscan.io/tx/0xfd9b5e2b00b7188a0464012ef4cdf7bf9f5e99c3c38022f101c58a465253440e) | 12077190 |
| WaveRebalanceReceiver | [`0xF9abD7a62311bA1BF1259ea3b1ADeF4d3456372F`](https://sepolia.etherscan.io/address/0xF9abD7a62311bA1BF1259ea3b1ADeF4d3456372F#code) | [0x5ffaafd3101b7e32abd12e0a306d1bcc651f5beee4c71247b0955ff782864be5](https://sepolia.etherscan.io/tx/0x5ffaafd3101b7e32abd12e0a306d1bcc651f5beee4c71247b0955ff782864be5) | 12077214 |
| WaveVaultDeployer (internal) | [`0x55fd77c9B780e5B9c8c806f926B2386840d6b860`](https://sepolia.etherscan.io/address/0x55fd77c9B780e5B9c8c806f926B2386840d6b860#code) | [0x360446fcb53ab90c76cc08de0c13dc0831c3f7a20e1c32f5e956b54ed7dd2d0e](https://sepolia.etherscan.io/tx/0x360446fcb53ab90c76cc08de0c13dc0831c3f7a20e1c32f5e956b54ed7dd2d0e) | 12077180 |
| Flagship WaveVault (internal) | [`0x237eFeB9Db74341ebb3Ba207e991D8aeAc536b91`](https://sepolia.etherscan.io/address/0x237eFeB9Db74341ebb3Ba207e991D8aeAc536b91#code) | [0xbca179a2c9327f5e46219e74c30db1bbb5f037d68e2d5f7418ca8455aa62a971](https://sepolia.etherscan.io/tx/0xbca179a2c9327f5e46219e74c30db1bbb5f037d68e2d5f7418ca8455aa62a971) | 12077187 |

## Partner wiring and safety checks

Uniswap v4 uses the existing official Sepolia PoolManager `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`. Three underlying-asset/mUSDC pools and the flagship share/mUSDC hook pool are initialized, configured in the adapter and have positive on-chain liquidity. The hook is bound only to its approved flagship pool; a live hook swap is still a separate evidence task.

The CRE tenant's authenticated supported-chains lookup confirmed simulation forwarder `0x15fC6ae953E024d975e77382eEeC56A9101f9F88` immediately before signing. Receiver state confirms the same forwarder and factory, simulation mode true, report encoding v2 and maximum age 900 seconds. This does not claim production workflow-identity authentication. No CRE report has run: the receiver nonce and vault rebalance count are zero.

The registry points to these real Chainlink Sepolia feeds; all per-feed mock exceptions are false:

| Pair | Real feed | Unchanged maximum age |
| --- | --- | --- |
| USDC/USD | `0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E` | 108,000 seconds |
| ETH/USD | `0x694AA1769357215DE4FAC081bf1f309aDC325306` | 4,500 seconds |
| BTC/USD | `0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43` | 4,500 seconds |
| LINK/USD | `0xc59E3633BAAC79493d908e63626716e204A45EdF` | 4,500 seconds |

Observed state confirms owner/treasury, factory/registry/adapter wiring, the registered flagship and its target weights, healthy positive NAV, token supplies and hourly faucet cooldowns, approved pool key, receiver configuration, and pool storage. Maximum weight remains 50%, turnover 20%, slippage/NAV-loss guard 1%, weight timelock ten minutes, rebalance interval five minutes and withdrawal fee 10 bps. Healthy-feed exits crystallize creator fees; stale-feed in-kind exits remain immediate and pro-rata after the withdrawal fee, with no withheld reserve. Stale exits can avoid uncrystallized creator fees, as disclosed in the README.

Anon-RPC's immutable Nox 0.4.0 pin is unchanged. No full browser privacy measurement was performed. On-chain holdings stay public; Anon-RPC only reduces exposure to the RPC provider. Machine receipt checks here are outside the browser meter.

## Preserved failures and recovery

1. The original nonce-0 transaction [0x5eb42ec1…18765f](https://sepolia.etherscan.io/tx/0x5eb42ec1baaeb837ca64021bd561ca05bb3596ff42ceb9b42eca3e621d18765f) reverted using its complete 706,678-gas allowance. Foundry 1.7.1's old runtime estimate did not cover current state-creation costs. The recovered first creation used 3,513,331 gas successfully. Its original record and logs remain unchanged.
2. The fresh nonce-1 execution completed nonces 1–19, then stopped before nonce 20 because the RPC nonce response lagged the mined receipts. [Foundry 1.9.0's actual guard](https://github.com/foundry-rs/foundry/blob/v1.9.0/crates/script/src/broadcast.rs#L120) allows five one-second attempts. The underlying provider/backend cause is not established. All 19 receipts and partial state were verified before further signing.
3. A separate fresh nonce-20 plan preserved those contracts and all 23 remaining targets/calldata. It passed a new full dry run and strict localhost fork execution, then submitted with three confirmations rather than one, retaining the nonce guard. No old helper, --resume, nonce reset, safety-bound reduction or repeated prefix transaction was used. One HTTP 520 polling error recovered within that run. The public log masks the client IP from the provider's error HTML; the original is retained privately in ignored cache.
4. An early read-only partial-state probe mishandled absent code, and the first full verifier expected the owner instead of the factory as seed-deposit payer. Both failed observations are retained. The corrected verifier checks the factory payer and owner recipient separately, has a red/green regression, and completed the full live recheck. Neither verifier issue was a contract revert.

5. The initial explorer helper treated source availability as verification and accepted three token SimilarMatch associations. A separate constructor check caught them. The stricter helper rejects SimilarMatch, proxy flags and mismatched constructors; individual mWETH/mWBTC/mLINK verification then completed. The CLI’s existing-verification shortcut was skipped only to submit those exact source requests; explorer validation was retained. Original availability observations and red/green regression logs are preserved. No chain transaction was sent for this correction.

The complete remote eth_simulateV1 batch **remains incomplete**. Its earlier errors are retained and are not relabeled as passes. The actual 42 live receipt checks and local strict execution are separate evidence.

[Nonce-1 execution](sepolia-recovery-2026-11-06T13-47-51-397Z/), [nonce-20 preparation and execution](sepolia-continuation-nonce20-2026-11-06T14-18-21-841Z/), [local prebroadcast checks](sepolia-prebroadcast-20261106T134732Z/). Local, mock and dry-run artifacts retain those labels.

## All 42 real transactions

All statuses below are successful and corroborated; the proof stores both providers' raw receipts and exact transaction comparisons. The seed deposit is internal to createBasket and is not relabeled as a direct user deposit or a completed $100 browser flow.

| Sender nonce | Action | Real transaction hash | Block | Actual gas used |
| --- | --- | --- | --- | --- |
| 1 | DemoToken | [0xd4edc8dbcca9761b87d5c4eafb89a0df235bb73320b44bb6aed32bddf976fb3c](https://sepolia.etherscan.io/tx/0xd4edc8dbcca9761b87d5c4eafb89a0df235bb73320b44bb6aed32bddf976fb3c) | 12076977 | 3513331 |
| 2 | DemoToken | [0x5234c897226abb53b57624f73e93a2c6fa6f0b01c4a9664b7a819ca6a72deda5](https://sepolia.etherscan.io/tx/0x5234c897226abb53b57624f73e93a2c6fa6f0b01c4a9664b7a819ca6a72deda5) | 12076978 | 3513343 |
| 3 | DemoToken | [0xf133c85ade8df32aa22c7c06be2aa574b16b0cca501e632b7e2df1284fdb36de](https://sepolia.etherscan.io/tx/0xf133c85ade8df32aa22c7c06be2aa574b16b0cca501e632b7e2df1284fdb36de) | 12076979 | 3513319 |
| 4 | DemoToken | [0x73993772c2698a5925b0b457980ab538a5a7b9709a8e141611873ae1e5898bac](https://sepolia.etherscan.io/tx/0x73993772c2698a5925b0b457980ab538a5a7b9709a8e141611873ae1e5898bac) | 12076980 | 3513355 |
| 5 | AssetRegistry | [0xa3f11d7a536830f308d2cb7700d62acef8e6fdba4d340c0548046649787c39bc](https://sepolia.etherscan.io/tx/0xa3f11d7a536830f308d2cb7700d62acef8e6fdba4d340c0548046649787c39bc) | 12076981 | 4205201 |
| 6 | setAsset(address,address,uint32,int256,int256,bool) | [0x27974775e3e883ffbdc05111b28dd46b79ebc857bede8a4690f9f8ff59d56ad2](https://sepolia.etherscan.io/tx/0x27974775e3e883ffbdc05111b28dd46b79ebc857bede8a4690f9f8ff59d56ad2) | 12076982 | 475541 |
| 7 | setAsset(address,address,uint32,int256,int256,bool) | [0xcf7e089389800a540c140fee4e42c32e436953e8f72c800103fc51e3352a95d8](https://sepolia.etherscan.io/tx/0xcf7e089389800a540c140fee4e42c32e436953e8f72c800103fc51e3352a95d8) | 12076983 | 475529 |
| 8 | setAsset(address,address,uint32,int256,int256,bool) | [0x4bd3803bfa6e709bf4a8d0eb0790f4a8a7528cc592172ea302b1a09b471874d5](https://sepolia.etherscan.io/tx/0x4bd3803bfa6e709bf4a8d0eb0790f4a8a7528cc592172ea302b1a09b471874d5) | 12076984 | 475529 |
| 9 | setAsset(address,address,uint32,int256,int256,bool) | [0xf861bc679a015abfa968a2675f4257b7647d6f79600672648d740d0c9ed1704f](https://sepolia.etherscan.io/tx/0xf861bc679a015abfa968a2675f4257b7647d6f79600672648d740d0c9ed1704f) | 12076985 | 475529 |
| 10 | WaveSwapAdapter | [0xcb6e20d2d712513cfe6c17cb6d0eb6406b4e9b7a4149ae4043ed3a25dabb44ea](https://sepolia.etherscan.io/tx/0xcb6e20d2d712513cfe6c17cb6d0eb6406b4e9b7a4149ae4043ed3a25dabb44ea) | 12076986 | 6845683 |
| 11 | DemoLiquiditySeeder | [0x2250ced9dbf5dc0843614f246915f365a4177960b0acfa51fb31a5903d04a274](https://sepolia.etherscan.io/tx/0x2250ced9dbf5dc0843614f246915f365a4177960b0acfa51fb31a5903d04a274) | 12076987 | 4174567 |
| 12 | faucet() | [0x4aebe70083451046c71e402b8e586756ad9cab846538327e4e4e220b6e780335](https://sepolia.etherscan.io/tx/0x4aebe70083451046c71e402b8e586756ad9cab846538327e4e4e220b6e780335) | 12076988 | 347887 |
| 13 | faucet() | [0xe3ae0e930c8a297737d724b6749a5fa8ab35861ecc7a6e42588eb23721ff1898](https://sepolia.etherscan.io/tx/0xe3ae0e930c8a297737d724b6749a5fa8ab35861ecc7a6e42588eb23721ff1898) | 12076989 | 347887 |
| 14 | faucet() | [0xa30fda9e2494ef7074af38985bed39d2b75c8f758c54a6cde900e8674fc19406](https://sepolia.etherscan.io/tx/0xa30fda9e2494ef7074af38985bed39d2b75c8f758c54a6cde900e8674fc19406) | 12076990 | 347887 |
| 15 | faucet() | [0xbc07eb0715c49118590d902c6dce1c7133a2c0c7a2737fd4545f64dce1206cc7](https://sepolia.etherscan.io/tx/0xbc07eb0715c49118590d902c6dce1c7133a2c0c7a2737fd4545f64dce1206cc7) | 12076991 | 347887 |
| 16 | initialize((address,address,uint24,int24,address),uint160) | [0x364e17e9340d46d4644b9ef85db26508a2ab61ab90cb8ba6e15f1e9e92bf5b2c](https://sepolia.etherscan.io/tx/0x364e17e9340d46d4644b9ef85db26508a2ab61ab90cb8ba6e15f1e9e92bf5b2c) | 12076992 | 133904 |
| 17 | setPool((address,address,uint24,int24,address)) | [0x6dfdb74e70bbb37e976a3ad7e34185d1d0d633ad700ee124ca5441fdab0bd1a9](https://sepolia.etherscan.io/tx/0x6dfdb74e70bbb37e976a3ad7e34185d1d0d633ad700ee124ca5441fdab0bd1a9) | 12076994 | 244706 |
| 18 | approve(address,uint256) | [0xf3b1af6be5e68a31f07889c4ec97fd026d5d2cf6d8814766f0a887ed84f95011](https://sepolia.etherscan.io/tx/0xf3b1af6be5e68a31f07889c4ec97fd026d5d2cf6d8814766f0a887ed84f95011) | 12076995 | 128189 |
| 19 | approve(address,uint256) | [0x88d343a8be2863f54af3669bfd74f8f474e816bb27704d171aea7c207d6fcfcc](https://sepolia.etherscan.io/tx/0x88d343a8be2863f54af3669bfd74f8f474e816bb27704d171aea7c207d6fcfcc) | 12076996 | 128189 |
| 20 | seed((address,address,uint24,int24,address),int256) | [0xa76f325086ec0945e311848c32b2072152f2e83ada4115cea544b3f59f78524d](https://sepolia.etherscan.io/tx/0xa76f325086ec0945e311848c32b2072152f2e83ada4115cea544b3f59f78524d) | 12077143 | 994075 |
| 21 | initialize((address,address,uint24,int24,address),uint160) | [0x25616478d76591d87bf04ef7b85f43bcd23762c4c70565a126e0e7050aaf9560](https://sepolia.etherscan.io/tx/0x25616478d76591d87bf04ef7b85f43bcd23762c4c70565a126e0e7050aaf9560) | 12077146 | 133843 |
| 22 | setPool((address,address,uint24,int24,address)) | [0x4ad4004fa9e288cc3d75d0405b8719cf44629fb103aa1add086522c2b3207571](https://sepolia.etherscan.io/tx/0x4ad4004fa9e288cc3d75d0405b8719cf44629fb103aa1add086522c2b3207571) | 12077149 | 244706 |
| 23 | approve(address,uint256) | [0x9f00b3d6282de115f559ab662bf10371f127a5b5a0b5e9f906cc3b3d17426f59](https://sepolia.etherscan.io/tx/0x9f00b3d6282de115f559ab662bf10371f127a5b5a0b5e9f906cc3b3d17426f59) | 12077153 | 20269 |
| 24 | approve(address,uint256) | [0x3860ffe2f2651d1c6bbbbeafb7f146402088c12b595a640235247ba83f72ec19](https://sepolia.etherscan.io/tx/0x3860ffe2f2651d1c6bbbbeafb7f146402088c12b595a640235247ba83f72ec19) | 12077156 | 128189 |
| 25 | seed((address,address,uint24,int24,address),int256) | [0x26dfae62622dd1e93123dbd858fde8487fcc39d6dc7f401c99b27fe8531da0cd](https://sepolia.etherscan.io/tx/0x26dfae62622dd1e93123dbd858fde8487fcc39d6dc7f401c99b27fe8531da0cd) | 12077161 | 896131 |
| 26 | initialize((address,address,uint24,int24,address),uint160) | [0xd56898ddf0a65440351e563911e38e4ee9fa7714c201d5cc9d8edf040d1c7041](https://sepolia.etherscan.io/tx/0xd56898ddf0a65440351e563911e38e4ee9fa7714c201d5cc9d8edf040d1c7041) | 12077165 | 133984 |
| 27 | setPool((address,address,uint24,int24,address)) | [0x658b46e9cf402f292ef11171db444e819f703cca0aed366a73c7007e15c4b3c1](https://sepolia.etherscan.io/tx/0x658b46e9cf402f292ef11171db444e819f703cca0aed366a73c7007e15c4b3c1) | 12077168 | 244706 |
| 28 | approve(address,uint256) | [0x2ec955f26c8a408acc464bb9c72c40bb68d46e672a485c76cccd6cf1cc339371](https://sepolia.etherscan.io/tx/0x2ec955f26c8a408acc464bb9c72c40bb68d46e672a485c76cccd6cf1cc339371) | 12077171 | 20269 |
| 29 | approve(address,uint256) | [0x6b1ed690ffeb0ddb55cd0c40d3ec7a94caa88d1d9839420476ae84eeb90f3b8e](https://sepolia.etherscan.io/tx/0x6b1ed690ffeb0ddb55cd0c40d3ec7a94caa88d1d9839420476ae84eeb90f3b8e) | 12077174 | 128189 |
| 30 | seed((address,address,uint24,int24,address),int256) | [0x73b2e9fbcf5f716165d4ac48f14ebdd642185a92f109298331335d4a58aab081](https://sepolia.etherscan.io/tx/0x73b2e9fbcf5f716165d4ac48f14ebdd642185a92f109298331335d4a58aab081) | 12077177 | 896167 |
| 31 | WaveFactory | [0x360446fcb53ab90c76cc08de0c13dc0831c3f7a20e1c32f5e956b54ed7dd2d0e](https://sepolia.etherscan.io/tx/0x360446fcb53ab90c76cc08de0c13dc0831c3f7a20e1c32f5e956b54ed7dd2d0e) | 12077180 | 43513011 |
| 32 | approve(address,uint256) | [0x879ee5acff3f613878b870b7c9df935ba72a853c65c3562695c9c0ac414a112b](https://sepolia.etherscan.io/tx/0x879ee5acff3f613878b870b7c9df935ba72a853c65c3562695c9c0ac414a112b) | 12077183 | 127853 |
| 33 | createBasket(string,string,address[],uint16[],uint16,uint256) | [0xbca179a2c9327f5e46219e74c30db1bbb5f037d68e2d5f7418ca8455aa62a971](https://sepolia.etherscan.io/tx/0xbca179a2c9327f5e46219e74c30db1bbb5f037d68e2d5f7418ca8455aa62a971) | 12077187 | 34290455 |
| 34 | NavGuardHook | [0xfd9b5e2b00b7188a0464012ef4cdf7bf9f5e99c3c38022f101c58a465253440e](https://sepolia.etherscan.io/tx/0xfd9b5e2b00b7188a0464012ef4cdf7bf9f5e99c3c38022f101c58a465253440e) | 12077190 | 9042138 |
| 35 | registerPool((address,address,uint24,int24,address),address) | [0x4c9e1b3079c8d42001179a6758d0ea5c753e4cc0ac5c7d02d9fbcdb506f54954](https://sepolia.etherscan.io/tx/0x4c9e1b3079c8d42001179a6758d0ea5c753e4cc0ac5c7d02d9fbcdb506f54954) | 12077194 | 688454 |
| 36 | initialize((address,address,uint24,int24,address),uint160) | [0xb3bddc17979d6a3368d421c4dcf199c1ca7b3a39defb48e7781ece3f9bc19766](https://sepolia.etherscan.io/tx/0xb3bddc17979d6a3368d421c4dcf199c1ca7b3a39defb48e7781ece3f9bc19766) | 12077197 | 141188 |
| 37 | setPool((address,address,uint24,int24,address)) | [0x301ac8610df2994329d9bf22ac3d51badbb8671dc9f281a53c57570ffadce16b](https://sepolia.etherscan.io/tx/0x301ac8610df2994329d9bf22ac3d51badbb8671dc9f281a53c57570ffadce16b) | 12077202 | 352854 |
| 38 | approve(address,uint256) | [0x1a423e45084a04d9e52bf9a9e1909e9870ca2cfeda2eb85980f85367523ac231](https://sepolia.etherscan.io/tx/0x1a423e45084a04d9e52bf9a9e1909e9870ca2cfeda2eb85980f85367523ac231) | 12077205 | 128277 |
| 39 | approve(address,uint256) | [0x708fc89b35e5e665c3d67e4adc451be153fcaf7fb8827f2611ba967d703e4da3](https://sepolia.etherscan.io/tx/0x708fc89b35e5e665c3d67e4adc451be153fcaf7fb8827f2611ba967d703e4da3) | 12077208 | 20269 |
| 40 | seed((address,address,uint24,int24,address),int256) | [0xccc07c44d2c781640676ae086b2ce9da47ab38752bb3388a0115e6b3db87d071](https://sepolia.etherscan.io/tx/0xccc07c44d2c781640676ae086b2ce9da47ab38752bb3388a0115e6b3db87d071) | 12077211 | 897229 |
| 41 | WaveRebalanceReceiver | [0x5ffaafd3101b7e32abd12e0a306d1bcc651f5beee4c71247b0955ff782864be5](https://sepolia.etherscan.io/tx/0x5ffaafd3101b7e32abd12e0a306d1bcc651f5beee4c71247b0955ff782864be5) | 12077214 | 4168376 |
| 42 | setRebalancer(address) | [0xef469ba5a517020c83b441db2b280133256f09d6c505ffeeb439c6d984b46f16](https://sepolia.etherscan.io/tx/0xef469ba5a517020c83b441db2b280133256f09d6c505ffeeb439c6d984b46f16) | 12077217 | 132323 |

## Remaining work — Phase 2 paused

Real CRE simulation/broadcast logs, a full fail-closed Anon-RPC browser session, both exit paths and hooked swaps through the live user flow, eligibility/security evidence, demo video and submission remain incomplete. The evidence checker must continue failing for missing required artifacts. The known SDK/Zod high-severity advisory is still open; no audit, privacy target, submission eligibility or production safety is asserted.

The current factory/registry/core interfaces remain compatible with later basket instances; their creation is not replacement of an existing core instance. Reserve-backed Yield economics are not implemented or proven. The hook remains flagship-only and CRE's existing first-three-basket coverage remains unchanged. No Phase 2 work has started.

The final submission-evidence check remains nonzero for the missing external lifecycle, CRE, privacy and readiness gates. Its API-based repository check also hit GitHub’s anonymous HTTP 403 rate limit (remaining quota zero); the public repository HTML returned HTTP 200 and all six immutable source-line checks passed. This API check was not waived or weakened. See [actual checker output](sepolia-live-verification-2026-11-06T14-43-34-553Z/submission-evidence-check.log) and [availability diagnostic](sepolia-live-verification-2026-11-06T14-43-34-553Z/public-repository-diagnostic.json).
