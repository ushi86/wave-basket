# External evidence runbook

Feature work is frozen. Commands below are prepared instructions, not records that deployments or broadcasts happened. Run them step by step in your own terminal; you control all private keys, passwords, logins and wallet signatures. Stop at a failed command and retain its actual output. No freshness, fee, allocation, turnover, slippage or authentication bounds may be relaxed to obtain a passing demonstration.

The current deployer creates **mock test tokens on canonical Sepolia**, uses real Chainlink feeds when configured below, and uses the CRE CLI's **simulation mock forwarder** with the explicitly labeled simulation receiver. Evidence must say exactly that. Neither token/feed mocks nor local Anvil execution become production evidence.

## 1. Owner: install tools and create the encrypted keystore

The repo supplies npm Forge/Anvil binaries for local checks. Standalone `forge`, `cast`, `cre`, `gh`, `slither` and `gitleaks` were not on the agent's PATH at preflight. In your terminal, use the [official Foundry installation](https://getfoundry.sh/introduction/installation/) and [official CRE installation](https://docs.chain.link/cre/getting-started/cli-installation/macos-linux). The Foundry commands below match the [v1.7.1 wallet CLI source](https://github.com/foundry-rs/foundry/blob/v1.7.1/crates/cast/src/cmd/wallet/mod.rs).

```bash
curl -L https://foundry.paradigm.xyz | bash
export PATH="$HOME/.foundry/bin:$PATH"
foundryup --install v1.7.1
forge --version
cast --version

mkdir -p "$HOME/.foundry/keystores"
chmod 700 "$HOME/.foundry/keystores"
cast wallet new "$HOME/.foundry/keystores" wave-sepolia
chmod 600 "$HOME/.foundry/keystores/wave-sepolia"
cast wallet address --account wave-sepolia
```

The path and alias make `wallet new` save an encrypted file and prompt for its password. Do not run a bare `cast wallet new` without a keystore path: that mode prints a private key. If you already have a dedicated test wallet, use **this alternative instead of creating another**:

```bash
cast wallet import wave-sepolia --interactive
cast wallet address --account wave-sepolia
```

Fund the displayed public address with Sepolia ETH yourself. Gas needs depend on the live estimate; deployment is many transactions, followed by lifecycle and CRE transactions. Do not assume a fixed ETH estimate or use a mainnet wallet. Connect/import the chosen test wallet into your browser yourself if using the same address for the privacy session; do not export it into chat or logs. A separate browser test wallet needs its own Sepolia gas and mock-token faucet claim.

## 2. Owner: CRE login and tenant forwarder, before deployment

```bash
curl -sSL https://app.chain.link/cre/install.sh | bash
export PATH="$HOME/.cre:$PATH"
cre version
cre login
cre whoami
cd '/Users/hano/Projects/Wave Eth'
mkdir -p docs/cre
cre workflow supported-chains --output json > docs/cre/supported-chains.json
```

Select the `ethereum-testnet-sepolia` entry, chain selector `16015286601757825753`, from **your authenticated tenant's actual output**. Its simulation forwarder becomes `CRE_FORWARDER`. Do not copy a documentation example as though it were your tenant's result. If Sepolia is absent, stop; do not use `--allow-unknown-chains`. Login is required for discovery and simulation. [Official CLI commands](https://docs.chain.link/cre/reference/cli/workflow).

Prepare the funded simulation wallet using the installed CLI's supported local secret mechanism yourself. If it requires `CRE_ETH_PRIVATE_KEY`, configure it privately in ignored local CRE environment/configuration; never log or publish it. A Foundry encrypted keystore does not automatically configure CRE. Tell me only that configuration is ready and its public address. I will not run CRE simulation until you confirm login and wallet readiness.

## 3. Owner: public Sepolia configuration

In Bash, from the repo root (launch `bash` first if you want these shell blocks to share one explicit shell):

```bash
cd '/Users/hano/Projects/Wave Eth'
export SEPOLIA_RPC_URL='https://ethereum-sepolia-rpc.publicnode.com'
export DEPLOYER_ADDRESS="$(cast wallet address --account wave-sepolia)"
export TREASURY="$DEPLOYER_ADDRESS"
read -r -p 'Paste your tenant Sepolia simulation forwarder address: ' CRE_FORWARDER
export CRE_FORWARDER
export POOL_MANAGER='0xE03A1074c86CFeDd5C142C4F04F1a1536e203543'
export USDC_FEED='0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E'
export ETH_FEED='0x694AA1769357215DE4FAC081bf1f309aDC325306'
export BTC_FEED='0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43'
export LINK_FEED='0xc59E3633BAAC79493d908e63626716e204A45EdF'
export CRE_SIMULATION=true
export USE_CHAINLINK_FEEDS=true
export USE_MOCK_USDC_FEED=false
export USE_MOCK_ETH_FEED=false
export USE_MOCK_BTC_FEED=false
export USE_MOCK_LINK_FEED=false
unset WORKFLOW_ID WORKFLOW_AUTHOR WORKFLOW_NAME
unset DEPLOYER_PRIVATE_KEY

umask 077
cat > contracts/.env <<ENV
DEPLOYER_ADDRESS=$DEPLOYER_ADDRESS
SEPOLIA_RPC_URL=$SEPOLIA_RPC_URL
TREASURY=$TREASURY
POOL_MANAGER=$POOL_MANAGER
CRE_FORWARDER=$CRE_FORWARDER
CRE_SIMULATION=true
USE_CHAINLINK_FEEDS=true
USDC_FEED=$USDC_FEED
ETH_FEED=$ETH_FEED
BTC_FEED=$BTC_FEED
LINK_FEED=$LINK_FEED
USE_MOCK_USDC_FEED=false
USE_MOCK_ETH_FEED=false
USE_MOCK_BTC_FEED=false
USE_MOCK_LINK_FEED=false
ENV

cast chain-id --rpc-url "$SEPOLIA_RPC_URL"
cast balance "$DEPLOYER_ADDRESS" --ether --rpc-url "$SEPOLIA_RPC_URL"
cast code "$POOL_MANAGER" --rpc-url "$SEPOLIA_RPC_URL"
cast code "$CRE_FORWARDER" --rpc-url "$SEPOLIA_RPC_URL"
for feed in "$USDC_FEED" "$ETH_FEED" "$BTC_FEED" "$LINK_FEED"; do
  cast call "$feed" 'decimals()(uint8)' --rpc-url "$SEPOLIA_RPC_URL"
  cast call "$feed" 'latestRoundData()(uint80,int256,uint256,uint256,uint80)' --rpc-url "$SEPOLIA_RPC_URL"
done
```

Require chain ID **11155111**, nonempty manager/forwarder code, positive answers, nonfuture timestamps, answered-in-round consistency and ages <=108,000s for USDC / <=4,500s for ETH/BTC/LINK. Recheck immediately before broadcasting: prior healthy observations expire. The script enforces these existing limits and never silently installs a mock feed. These addresses are candidates checked on-chain during preflight, not a freshness guarantee for a later deployment. [Official Uniswap deployment](https://developers.uniswap.org/docs/protocols/v4/deployments), [Chainlink address directory](https://docs.chain.link/data-feeds/price-feeds/addresses), [published feed metadata](https://reference-data-directory.vercel.app/feeds-ethereum-testnet-sepolia.json).

The overwritten ignored `contracts/.env` above contains only the stated public configuration. Do not source the illustrative `.env.example`: its workflow placeholders are not valid runtime identity values. Simulation mode deliberately uses its own default metadata values. Authenticated production receiver deployment is outside this evidence phase.

## 4. Publish the preserved source; pin the release

Give me the intended public GitHub repository URL after you create it and complete Git authentication. Prefer an empty repository. I will verify the URL, inspect remote refs, add `origin`, push the existing `main` history normally and confirm unauthenticated access to the release. I will never squash, amend/backdate, force-push or replace existing remote history. An initialized/divergent remote needs reconciliation preserving both histories.

Equivalent prepared commands for an empty supplied repository (I will run them when the URL arrives):

```bash
git remote add origin 'https://github.com/YOUR_OWNER/YOUR_REPOSITORY.git'
git ls-remote origin
git push --set-upstream origin main
```

The URL above is an input template, not a claimed public repo. Record the exact source commit before deployment:

```bash
git status --short
export WAVE_RELEASE_COMMIT="$(git rev-parse HEAD)"
export WAVE_RUN="$(pwd)/docs/readiness/sepolia-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$WAVE_RUN"
printf '%s\n' "$WAVE_RELEASE_COMMIT" > "$WAVE_RUN/source-commit.txt"
```

Require no uncommitted source changes. New evidence/log files are expected later; manifest provenance specifically checks source/configuration paths. Eligibility/track disclosure is still pending official kickoff information and the owner’s decision for submission readiness. Your direct instruction authorizes publishing the preserved history once you provide the public repository URL and Git authentication is ready; this is not a claim of event eligibility.

## 5. Owner: dry run, review gas, then deploy

From the repo root, with the exported variables above:

```bash
bash scripts/deploy-sepolia.sh --dry-run
```

The helper defaults to read-only simulation, pins a recent common block after checking both providers, and archives predictions outside the canonical manifest path. This avoids the reproduced PublicNode latest-block state lookup failure. It refuses noninteractive broadcast, missing API-key configuration, changed initial nonce, or existing broadcast records. Logs are saved under its printed `docs/readiness/owner-deploy-*` path. This does not change contract behavior or oracle/execution limits.

This is **dry-run evidence only**. Inspect its exit code, full output, oracle checks and gas estimate. If it fails, stop and report it. Do not broadcast by blindly continuing. For explorer verification, set `ETHERSCAN_API_KEY` privately in your terminal; do not add it to source or provide it to me. Then run the actual deployment yourself:

```bash
bash scripts/deploy-sepolia.sh --broadcast
```

The keystore prompts for its password. No raw deployment key is passed. Retain `contracts/broadcast/DeployDemo.s.sol/11155111/run-latest.json` and its matching timestamped broadcast file. A dry run may write a predicted manifest; only successful canonical receipts make the addresses actual deployment evidence. Do not rerun an interrupted partially broadcast deployment as if it were fresh: inspect receipts/nonces and the exact saved broadcast before deciding whether a supported resume is appropriate. Do not use Anvil-only size-limit overrides on Sepolia.

After broadcast succeeds:

```bash
node scripts/manifest.mjs deployments/sepolia.json \
  web/public/deployment.sepolia.json \
  https://ethereum-sepolia-rpc.publicnode.com
```

The converter records deployment source provenance and transaction hashes, and populates the actual factory/receiver/asset IDs in `cre/config.staging.json`. Those runtime addresses change a tracked config; review and commit that public configuration before publishing the measured app release. Bind deployment-source and app/configuration revisions explicitly; do not relabel a dirty measurement as a clean release. I will reconcile this provenance when actual deployment data exists. Explorer verification success must be checked separately, including factory-created vault/deployer contracts; `--verify` intent is not proof that every nested creation was verified.

## 6. Browser lifecycle — required for full privacy measurement

After actual deployment/verification and public configuration are reviewed, start the Sepolia dashboard explicitly; this overrides the ignored local-demo Vite setting:

```bash
VITE_DEPLOYMENT_URL=/deployment.sepolia.json npm run dev -w web
```

Open the displayed URL and keep the **same page session** for the measurement. Confirm Sepolia, mock-token, real/mixed-feed, simulation-receiver and unaudited labels. Connect and sign with your test wallet yourself. Claim mock faucet tokens if this wallet did not deploy; the deployer already has mock tokens and has used its hourly claim.

Perform through the browser: create a basket (40/35/25 ETH/BTC/LINK, 10% creator fee, 100 mUSDC seed), deposit 1,000 mUSDC into the hooked flagship, trade the flagship to demonstrate both directions, wait for actual CRE history, then redeem 100 FUND to mUSDC and 100 FUND in kind. The newly created basket is separate from the pre-existing hooked flagship; record its actual `createdBasket` address for evidence. Do not replace the flagship hook mapping.

At exact NAV, both directions cost 500 fee units. A successful trade crossing NAV does not prove the 10,000-unit away fee: classification uses **pre-trade** price. A bounded initial buy of 1,000 mUSDC may move the pool above the band; read the actual snapshot afterwards. Only if price is >101% of NAV does a further buy demonstrate away and a sell demonstrate toward. Reverse directions below 99%. Retain minimum-output protection, inspect receipts' `HookFeeApplied` and PoolManager `Swap` logs, and label only what they prove. If the market never supplies the required conditions, record that gap instead of modifying feeds/NAV or fabricating receipts.

Keep the page open while I run the real CRE command in section 8 after you confirm readiness. Refresh history to observe that actual transaction. Then on Privacy, check a private block, stop the worker with **Stop worker and test fail-closed**, capture the actual failure/counters screenshot, and export the session measurement. The direct count must not increase on worker failure. Export before reloading; reload resets counters. Record browser/version and the published app release. Actual startup >=10s or coverage <95% is a failing metric, not permission to drop requests from the denominator. See `PRIVACY.md` for route exceptions and measurement trust limits.

## 7. Optional CLI lifecycle commands — transaction checks, not browser coverage

Use this path if you want command-line transaction checks in addition to the browser session. These commands spend test ETH and mock assets; execute them yourself. **Do not use CLI hashes to claim the browser performed those actions.** Keep this run distinct from the full browser measurement. All integer amounts below are raw token/share units.

Load actual deployed addresses (after canonical verification):

```bash
export FACTORY="$(node -p "require('./deployments/sepolia.json').factory")"
export FLAGSHIP="$(node -p "require('./deployments/sepolia.json').flagship")"
export ADAPTER="$(node -p "require('./deployments/sepolia.json').adapter")"
export HOOK="$(node -p "require('./deployments/sepolia.json').hook")"
export RECEIVER="$(node -p "require('./deployments/sepolia.json').receiver")"
export USDC="$(node -p "require('./deployments/sepolia.json').usdc")"
export ETH_TOKEN="$(node -p "require('./deployments/sepolia.json').eth")"
export BTC_TOKEN="$(node -p "require('./deployments/sepolia.json').btc")"
export LINK_TOKEN="$(node -p "require('./deployments/sepolia.json').link")"

wave_call() { cast call "$@" --from "$DEPLOYER_ADDRESS" --rpc-url "$SEPOLIA_RPC_URL"; }
wave_uint() { wave_call "$@" | awk 'NR==1 {print $1}'; }
wave_min99() {
  WAVE_QUOTE="$1" node -e 'const n=BigInt(process.env.WAVE_QUOTE);const m=n*99n/100n;if(m<=0n)throw Error("Invalid quote");process.stdout.write(m.toString())'
}
wave_send() {
  local label="$1"
  shift
  cast send "$@" --account wave-sepolia --rpc-url "$SEPOLIA_RPC_URL" \
    --json > "$WAVE_RUN/$label.json"
}
```

Each `wave_send` returns the CLI exit status and saves the real receipt. Stop on any failure; retain the failed output. First approve exact seed/deposit amounts and simulate the writes read-only before sending:

```bash
wave_send approve-create "$USDC" 'approve(address,uint256)' "$FACTORY" 100000000
wave_send createBasket "$FACTORY" \
  'createBasket(string,string,address[],uint16[],uint16,uint256)' \
  'Wave Evidence Basket' 'WAVE' "[$ETH_TOKEN,$BTC_TOKEN,$LINK_TOKEN]" \
  '[4000,3500,2500]' 1000 100000000

wave_send approve-deposit "$USDC" 'approve(address,uint256)' "$FLAGSHIP" 1000000000
QUOTE="$(wave_uint "$FLAGSHIP" 'deposit(uint256,uint256,address)(uint256)' 1000000000 1 "$DEPLOYER_ADDRESS")"
MIN_SHARES="$(wave_min99 "$QUOTE")"
wave_send deposit "$FLAGSHIP" 'deposit(uint256,uint256,address)' \
  1000000000 "$MIN_SHARES" "$DEPLOYER_ADDRESS"
```

The `1` in the read-only quote call is a probe floor, not a broadcast execution bound; every actual swap/deposit/settlement exit uses 99% of a fresh successful simulation. Vault oracle/turnover/NAV constraints are unchanged. Race-induced reverts must remain failures.

Prepare and execute hook swaps one at a time:

```bash
wave_swap() {
  local label="$1" input="$2" output="$3" amount="$4"
  wave_send "approve-$label" "$input" 'approve(address,uint256)' "$ADAPTER" "$amount" || return
  local quote minimum
  quote="$(wave_uint "$ADAPTER" 'swap(address,address,uint256,uint256,address)(uint256)' \
    "$input" "$output" "$amount" 1 "$DEPLOYER_ADDRESS")" || return
  minimum="$(wave_min99 "$quote")" || return
  wave_send "$label" "$ADAPTER" 'swap(address,address,uint256,uint256,address)' \
    "$input" "$output" "$amount" "$minimum" "$DEPLOYER_ADDRESS"
}
wave_call "$HOOK" 'poolSnapshot()(uint256,uint256,bool,uint24,uint24)'
wave_swap hook-setup-buy "$USDC" "$FLAGSHIP" 1000000000
wave_call "$HOOK" 'poolSnapshot()(uint256,uint256,bool,uint24,uint24)'
```

Only proceed with the following labels if the actual fresh snapshot says healthy, spot > NAV*101/100, buy fee 10,000 and sell fee 500. Otherwise stop and report the observed market state; these conditions are not guaranteed by a fixed setup amount.

```bash
wave_swap hookAway "$USDC" "$FLAGSHIP" 100000000
wave_call "$HOOK" 'poolSnapshot()(uint256,uint256,bool,uint24,uint24)'
# Require the snapshot still to show spot above NAV before the toward sell.
wave_swap hookToward "$FLAGSHIP" "$USDC" 100000000000000000000
```

Run actual CRE only after section 8's login/wallet gate; then inspect accepted nonce and history. Finally:

```bash
QUOTE="$(wave_uint "$FLAGSHIP" 'redeem(uint256,uint256,address)(uint256)' \
  100000000000000000000 1 "$DEPLOYER_ADDRESS")"
MIN_USDC="$(wave_min99 "$QUOTE")"
wave_send redeemUsdc "$FLAGSHIP" 'redeem(uint256,uint256,address)' \
  100000000000000000000 "$MIN_USDC" "$DEPLOYER_ADDRESS"
wave_send redeemInKind "$FLAGSHIP" 'redeemInKind(uint256,address)' \
  100000000000000000000 "$DEPLOYER_ADDRESS"
wave_call "$FLAGSHIP" 'holdings()(address[],uint256[],uint256[],uint16[],uint16[])'
wave_call "$FLAGSHIP" 'balanceOf(address)(uint256)' "$DEPLOYER_ADDRESS"
```

Do not deliberately stale or edit real feeds for live evidence. Existing local tests establish full immediate pro-rata stale payout; disclose that stale exits can avoid uncrystallized creator fees. No deferred reserve exists.

## 8. Real CRE simulation — after owner confirms login/wallet readiness

I will inspect the installed version/help, tenant forwarder and public deployment config first. The actual command from this repo's CRE directory is:

```bash
cd '/Users/hano/Projects/Wave Eth/cre'
cre version
cre whoami
cre workflow simulate . --target staging-settings \
  --non-interactive --trigger-index 0 --broadcast
```

Capture full real stdout/stderr and the actual exit code, start/end times, command argv, CLI version, public configuration/source revisions, log SHA256 and nonzero transaction hash. Do not enable shell tracing or dump secret environment variables. The agent will create the capture metadata only from that actual execution, inspect output for secrets before committing, and preserve failures. Compilation, dry runs, skipped proposals and `submitted 0` do not establish a broadcast rebalance. A forwarder receipt alone is insufficient: require receiver `ReportAccepted`, vault `Rebalanced`, sequential nonce and changed history at the canonical receipt block. Do not lower drift threshold or freshness/turnover/NAV bounds, replace market data, or call `rebalance:local` as a substitute.

Read-only post-run state checks, using actual addresses:

```bash
cast call "$RECEIVER" 'lastNonce(address)(uint64)' "$FLAGSHIP" --rpc-url "$SEPOLIA_RPC_URL"
cast call "$RECEIVER" 'lastObservation(address)(uint64)' "$FLAGSHIP" --rpc-url "$SEPOLIA_RPC_URL"
cast call "$FLAGSHIP" 'rebalanceCount()(uint256)' --rpc-url "$SEPOLIA_RPC_URL"
```

## 9. Receipt verification and real evidence updates

For **each actual full transaction hash**, including every deployment transaction:

```bash
read -r -p 'Full transaction hash: ' WAVE_TX_HASH
cast receipt "$WAVE_TX_HASH" --rpc-url "$SEPOLIA_RPC_URL" --json \
  > "$WAVE_RUN/receipt-$WAVE_TX_HASH.json"
cast tx "$WAVE_TX_HASH" --rpc-url "$SEPOLIA_RPC_URL" --json \
  > "$WAVE_RUN/transaction-$WAVE_TX_HASH.json"
```

I will check chain identity, successful status, expected target and emitter, canonical block hash/number/time, event arguments and state, and confirmations. The approved read-only verification providers are PublicNode and `https://sepolia.gateway.tenderly.co`. This is provider diversity, not proof of fully independent infrastructure. Both sources must agree under the existing checks. If an account, API key or payment becomes necessary, stop and ask the owner; do not silently change providers or lower verification requirements.

Only then will I update `EVIDENCE.md`, `evidence/submission.json` and deployment records with **actual addresses, complete hashes, block numbers, environment/mock labels and observation times in IST**, plus immutable public source anchors. Failed, local, dry-run, worker-only and mock-only artifacts remain separately labeled. Genuine Sepolia transactions using disclosed mock tokens/CRE simulation forwarder are labeled as such, not as all-real infrastructure.

```bash
cd '/Users/hano/Projects/Wave Eth'
npm run check:evidence
```

This command remains read-only and nonzero until all required evidence and reviewed gate records exist. A completed local preflight does not make it pass.

## Inputs needed from the owner

- Intended public repository URL and confirmation Git authentication is ready; official kickoff/track/disclosure decision for the existing history.
- Public deployer address, chosen keystore alias and treasury address; confirmation the test wallet is funded. No keys/passwords.
- CRE login ready, installed version, actual tenant Sepolia forwarder, public simulation-wallet address and confirmation its secret configuration/funding is ready.
- Locally configured explorer API credential if explorer verification is desired. Do not send the credential.
- Completed deployment output and exact broadcast file path, if you deploy before returning; then keep the browser available for owner-signed Sepolia actions.
- The owner approved accountless Tenderly as the read-only second verification provider. Stop for owner input if account/key/payment requirements appear. No provider credential should enter the public browser manifest, documentation or Git.
