# Reviewed Sepolia recovery — ready for owner execution, not broadcast

Status: **full Forge dry run passed; all 42 exact planned operations passed strict unsigned execution on a disposable local fork**. No Sepolia transaction was sent, no real wallet was unlocked, and no live Wave address is claimed. Phase 2 remains paused.

## Root cause and exact changes

The failed creation transaction exhausted its 706,678-gas allowance. It created no code. Both approved providers confirm the reverted canonical receipt at block 12,076,125. Replaying its exact creation input at the original allowance fails; a larger allowance succeeds. The old Foundry 1.7.1 run used Cancun-era simulation while Sepolia had moved to Amsterdam/Glamsterdam state-creation accounting. This was an inadequate transaction gas allowance, not insufficient wallet funding.

[The Ethereum Foundation's upgrade notice](https://blog.ethereum.org/2026/09/17/glamsterdam-testnet-announcement) describes the state-cost changes. Recovery requires a current runtime model, not an arbitrary multiplied old estimate or skipped simulation.

| Setting | Failed attempt | Reviewed recovery |
| --- | --- | --- |
| Native Foundry | 1.7.1 | **1.9.0**, official release, verified download attestations |
| Intermediate diagnostic version | — | 1.8.3 was tested and rejected for this recovery: strict Anvil admission incorrectly applied the older total-gas cap to a large Amsterdam creation |
| Compiler | Solidity 0.8.26, Cancun target, optimizer 200, via IR | Unchanged |
| Simulation runtime | Cancun default | Explicit Amsterdam; isolated script calls |
| Deployer starting nonce | 0, now consumed | Explicit **1**, corroborated latest/pending/fork nonces on both providers |
| First creation gas allowance | 706,678 | **4,567,330**, above both providers' fresh estimate of 3,542,382 |
| Total gas allowance | 27,794,694 from the obsolete estimate | **175,152,507**, default 130% multiplier retained |
| RPC for fork reads and later owner submission | PublicNode | Same accountless PublicNode URL |
| Second provider | Tenderly, read-only | Same accountless Tenderly URL, read-only |
| Fork block | Earlier fixed common block | Fresh common block minus three heads; both providers must agree on its hash |
| Broadcast/cache files | Initial attempt paths | Separate recovery directories for every run; failed record remains intact, sensitive cache copied locally without inspection/publication |
| Signing | Encrypted wave-sepolia keystore | Same alias and expected sender; only explicit owner mode can unlock it |
| Simulation receiver / real feeds | Configured | Rechecked and unchanged |
| Contract logic / bounds | Existing implementation | No production Solidity or Solidity deployment routine changed; no portfolio bound lowered |

The [official 1.9.0 release](https://github.com/foundry-rs/foundry/releases/tag/v1.9.0) and its [Anvil admission code](https://github.com/foundry-rs/foundry/blob/v1.9.0/crates/anvil/src/eth/backend/mem/mod.rs#L1920) handle the EIP-8037 distinction: the 16.7M cap bounds execution gas, while additional gas can fund state creation. The recovery keeps transaction-limit checks enabled in the actual local transaction path. The older 1.8.3 rejection and all attempted checks are retained; none are relabeled as passes.

The Forge **script harness** is not itself an onchain transaction. Applying the transaction cap to that entire harness failed after four creates, even with isolation. Accordingly, Forge generates/simulates the complete plan under Amsterdam, and the runner additionally submits each **unsigned** operation only to the self-owned localhost fork using Anvil's documented local method. That node has zero generated accounts, no signer, no public listening interface, and strict transaction gas checks. It validates funding, nonces, gas, deployed code and execution. Signatures alone are bypassed locally. No balance/nonce/code overrides, relaxed block limits or relaxed portfolio limits are used. Its block gas limit exactly matches the corroborated fork block.

`eth_simulateV1` could not validate this entire batch: Anvil 1.8.3 [hard-codes a 50M aggregate simulation budget](https://github.com/foundry-rs/foundry/blob/v1.8.3/crates/anvil/src/eth/backend/mem/mod.rs#L524) and [forwards fork-boundary simulation calls upstream](https://github.com/foundry-rs/foundry/blob/v1.8.3/crates/anvil/src/eth/api.rs#L3330). An empty local block avoided forwarding but not that cap. A short local initialization timeout was also retained and corrected. None of these failed diagnostic probes count as completed validation. The final per-transaction localhost check avoids the RPC batch budget while preserving the real protocol checks.

## Fresh configuration and state immediately before the reviewed dry run

[Preflight capture](sepolia-recovery-2026-11-06T12-41-55-341Z/preflight.json), completed **2026-11-06T12:42:47.238Z**, block **12076628**, hash `0x7c05e254e96522f45130c5a2b8224879090eef949728bc59ca88fe6013aa4dde`. Both providers agreed. The owner command repeats preflight before its own dry run and again before owner signing.

- Deployer and treasury: `0xDe25D83481c0c2A711397c44eE3317dD826952D5`.
- Balance: **0.199039970082895696 Sepolia ETH**. Latest, pending and fixed-block nonce: **1**.
- PublicNode: `https://ethereum-sepolia-rpc.publicnode.com`; Tenderly: `https://sepolia.gateway.tenderly.co`. Provider diversity does not prove fully independent infrastructure.
- Existing official PoolManager: `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`; existing canonical CREATE2 deployer: `0x4e59b44847b379578588920cA78FbF26c0B4956C`. Both have matching code across providers.
- Fresh authenticated CRE tenant lookup selected **mockAddress** `0x15fC6ae953E024d975e77382eEeC56A9101f9F88`, selector `16015286601757825753`. Its deployed code hash matches the reviewed pin. This is not merely copied from documentation.
- `CRE_SIMULATION=true`; receiver mode **simulation**, report version **2**, maximum report age **900 seconds**. This authenticates the forwarder but does not claim production workflow-identity authentication. Fixture ID is 1, author is the owner, name is padded `wave`; identity fields are intentionally not authenticated in this mode.
- `USE_CHAINLINK_FEEDS=true`; all four per-feed mock exceptions are explicitly false. The tokens are mocks; the feeds below are real. No DemoFeed or replacement forwarder is created.

| Feed | Configured address | Age / unchanged maximum (seconds) | Result |
| --- | --- | --- | --- |
| USDC/USD | `0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E` | 12600 / 108000 | Healthy, real Chainlink feed |
| ETH/USD | `0x694AA1769357215DE4FAC081bf1f309aDC325306` | 1800 / 4500 | Healthy, real Chainlink feed |
| BTC/USD | `0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43` | 3000 / 4500 | Healthy, real Chainlink feed |
| LINK/USD | `0xc59E3633BAAC79493d908e63626716e204A45EdF` | 1068 / 4500 | Healthy, real Chainlink feed |

All four feeds passed decimals, answer-range, positive/nonfuture timestamp, staleness and answered-round checks. Required public settings are compared with the reviewed values before use. Private explorer credentials are only checked for presence in the owner's terminal; keystore signability and explorer verification remain unverified until the owner run.

## Full result and fee quote

[Successful capture](sepolia-recovery-2026-11-06T12-41-55-341Z/capture.json), [Forge log](sepolia-recovery-2026-11-06T12-41-55-341Z/dry-run.log), [strict local transaction results](sepolia-recovery-2026-11-06T12-41-55-341Z/local-transaction-validation.json), and [bytecode comparison](sepolia-recovery-2026-11-06T12-41-55-341Z/bytecode-comparison.json).

- Native Forge: **forge Version: 1.9.0**; native Anvil: the same reviewed release.
- All **42** planned transactions, sender nonces **1–42**, completed in the fork checks. The private fork ends at nonce 43; this is **not** the public account nonce or live transaction evidence.
- Gas allowance including the unchanged 130% multiplier: **175,152,507**.
- Explicit EIP-1559 max-fee setting: **40 wei/gas**; priority setting: **2 wei/gas**. The conservative cost quote budgets **42 wei/gas** (extra tip-sized headroom; not a claim that tips are added outside the EIP-1559 max fee).
- Estimated conservative deployment budget: **0.000000007356405294 Sepolia ETH**. This is a fresh fork/fee quote, not a paid fee or a permanent price. At a hypothetical 1 gwei the same allowance costs **0.175152507 ETH**. The current balance covers the observed deployment quote; later lifecycle/CRE costs are not included.
- Production bytecodes all remain below the conservative 24,576-byte bound; largest is WaveVaultDeployer at **24186 bytes**. No size limit was raised for a deployable contract.
- All seven unique application creation bytecodes have identical instruction bytes to the original plan after normalizing only embedded Solidity IPFS metadata hashes, including the embedded vault/deployer code. Metadata affects hashes and CREATE2 predictions; never reuse the obsolete predictions.
- Original failed broadcast SHA-256 unchanged: `33d6b702ab91e1a77047346fc17a04973e04f25d52aefbadf226efa0bea36b49`. The original failed transaction and historic logs remain retained, and the sensitive original cache has a private ignored backup. No sensitive cache contents were inspected or published.
- The generated canonical-manifest path was immediately quarantined. It remains absent until real receipts are verified.

## Every planned contract creation — predictions only

There are **10 top-level creations plus 2 internal creations**. These addresses are not live claims. Existing feeds, PoolManager, mock forwarder and canonical CREATE2 deployer are reused rather than created.

| Contract | Sender nonce | Predicted address, NOT deployed | Transaction gas allowance |
| --- | --- | --- | --- |
| Mock USDC (mUSDC) | 1 | `0x33297104581Dd29347d9Ed37936e4F16621D59aE` | 4,567,330 |
| Mock WETH (mWETH) | 2 | `0x7B178cB5e0776E769BE44919889D5A57D8BB1742` | 4,567,345 |
| Mock WBTC (mWBTC) | 3 | `0xBe28019380A99649579B7E9fa7F1979e6f203F79` | 4,567,314 |
| Mock LINK (mLINK) | 4 | `0xDd71a1BF041dcdb68AD70A6e0766996557759525` | 4,567,361 |
| AssetRegistry | 5 | `0x97946eFDC076af3069C624dB65859Ba775aADbB4` | 5,466,761 |
| WaveSwapAdapter | 10 | `0x7cbe10AA965Edc8414ad0a4C68192f8ef117f21D` | 8,899,387 |
| DemoLiquiditySeeder | 11 | `0x2A9aD8D9406d768ebBF19Eb45Ae023E5664EE02f` | 5,426,937 |
| WaveFactory | 31 | `0x6871Eb32a280498c8668139f812f41c8389f5999` | 56,566,914 |
| NavGuardHook | 34 | `0x536a446ca6462522c5668A20a62f1503ca4d2080` | 13,224,126 |
| WaveRebalanceReceiver | 41 | `0xF9abD7a62311bA1BF1259ea3b1ADeF4d3456372F` | 5,418,888 |
| WaveVaultDeployer | internal | `0x55fd77c9B780e5B9c8c806f926B2386840d6b860` | included in nonce 31 |
| WaveVault (flagship) | internal | `0x237eFeB9Db74341ebb3Ba207e991D8aeAc536b91` | included in nonce 33 |

The factory's nonce-31 creation includes its internal deployer. Sender nonce 33 calls createBasket and includes the internal flagship vault creation. Nonce 34 calls the existing canonical CREATE2 deployer. The capture contains every one of the 42 operations and gas limits, including non-creation calls.

## Future Growth, Balanced and Yield compatibility — no Phase 2 execution

**The existing core interfaces support the extension without replacing any existing core instance or changing the frozen vault/deployer logic.** The [local compatibility test](../../contracts/test/RecoveryCompatibility.t.sol) creates three basket configurations through one factory, registers a new ordinary standard asset/feed, adds its real-local-v4 pool, and executes bounded reports for all three through one receiver while preserving the factory, registry and adapter addresses. It is a local interface test; it is not a funded Yield implementation or live basket evidence.

Necessary distinctions before approving this deployment:

- Each basket needs its own share-token/vault instance, created normally by the existing factory. No existing vault is replaced. Its asset list is immutable after creation; registering a new asset does not insert it into an old basket.
- The initial flagship already has a Growth-style risk-asset mix. Reusing that instance or adding other instances does not require a factory/registry/hook replacement.
- Balanced can include the settlement token; the tested core handles that cash leg without self-swapping.
- Yield still needs a separately implemented and funded reserve-backed token/valuation adapter, registry admission and liquidity. Its reserve economics, accrual, depletion and redemption are **not yet implemented or proven**. The generic ERC-20/feed route is compatible; no unavoidable core modification was found. If a proposed design needs a frozen-core change, stop before that design is deployed.
- **The hook stays attached to exactly its approved flagship pool.** It cannot protect all new share-token pools or be retargeted to a different basket without a new hook design/deployment. This recovery does not promise that. All basket asset swaps can still use the existing v4 adapter.
- The current CRE workflow inspects at most the first three factory entries. The three intended baskets must fit that coverage or later offchain selection must change; no core redeployment is required. No workflow or Phase 2 change has been made here.
- The initial no-op report test correctly reverted on a sub-unit swap quote; it was an unsuitable probe of a strategy that skips negligible drift. The retained passing probe uses nontrivial valid bounded proposals. Dust/slippage/liquidity rejection remains possible and unchanged; no safety check was weakened to pass the test.

## Owner command — only the owner runs this

Use the terminal where ETHERSCAN_API_KEY is already privately configured. Do not share that value or your keystore password. The runner defaults to dry run, refuses noninteractive broadcast, and requires this successful reviewed capture. It rechecks sources/creation predictions, both providers' nonce/state/feeds, tenant forwarder and mode; reruns the complete checks; checks fresh state again; and only then invokes the encrypted account in the owner's terminal. It uses new directories, never the old helper or a resume/start-fresh path.

```bash
cd '/Users/hano/Projects/Wave Eth'
node scripts/recover-sepolia.mjs --broadcast \
  --reviewed-run docs/readiness/sepolia-recovery-2026-11-06T12-41-55-341Z/capture.json
```

Enter the password locally when Forge prompts. Real Sepolia submission uses PublicNode only. Tenderly remains read-only. Source verification is requested for direct and external-factory creations. The command quarantines even broadcast-generated predictions as NOT VERIFIED rather than installing an unverified live manifest.

**If anything fails, stop and send the output; do not rerun or resume.** The original nonce-1 guard will stop on a changed public nonce. After the owner sends output, verify every real receipt, canonical block, log, code and required state on PublicNode and Tenderly, then update EVIDENCE and install the verified manifest/live address table. Only then supply the Phase 2 plan; do not execute it without “continue.”

## Remaining unverified and local checks

The complete **remote** RPC batch remains incomplete: PublicNode returned an intrinsic-gas/batch error and Tenderly rate-limited it. The provider's exact simulation/admission cap is not established. Local strict execution is not independent-client consensus proof or proof of PublicNode accepting the future signed batch. No live success, real receipt, explorer verification, CRE execution or full Anon-RPC session is claimed.

[Check records](recovery-checks-20261106/) retain the runner guard tests, all existing contract regressions plus the local compatibility check, workspace tests/typecheck/builds and bytecode-size check. The evidence checker still fails for missing live proof. Production dependency audit reports the existing SDK/Zod high-severity advisory (two affected package entries). No dependency upgrade or evidence waiver was performed. The web build's existing chunk-size warning remains. Newly captured log copies have trailing whitespace normalized for repository formatting; the original failed broadcast and historic logs were not changed. The local UI demo was restored after the native tool update with identical head hash and account state.
