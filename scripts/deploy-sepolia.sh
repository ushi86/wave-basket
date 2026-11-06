#!/usr/bin/env bash
# Initial Wave Sepolia deployment. Default is read-only simulation.
set -euo pipefail
export PATH="$HOME/.foundry/bin:$PATH"
wave_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
wave_mode="${1:---dry-run}"
if [[ "$wave_mode" != '--dry-run' && "$wave_mode" != '--broadcast' ]] || [[ $# -gt 1 ]]; then
  echo 'Usage: bash scripts/deploy-sepolia.sh [--dry-run|--broadcast]' >&2
  exit 2
fi
if [[ "$wave_mode" == '--broadcast' ]]; then
  if [[ ! -t 0 ]]; then
    echo 'Broadcast requires the owner to run this in an interactive terminal.' >&2
    exit 2
  fi
  if [[ -z "${ETHERSCAN_API_KEY:-}" ]]; then
    echo 'Configure ETHERSCAN_API_KEY privately in this terminal first.' >&2
    exit 2
  fi
fi
command -v cast >/dev/null
command -v forge >/dev/null
if [[ ! -f "$wave_root/contracts/.env" ]]; then
  echo 'Missing prepared contracts/.env configuration. Stop for setup review.' >&2
  exit 1
fi
if [[ -f "$wave_root/contracts/broadcast/DeployDemo.s.sol/11155111/run-latest.json" || -f "$wave_root/deployments/sepolia.json" ]]; then
  echo 'A Sepolia broadcast record or manifest already exists. Stop for receipt/nonce review; do not redeploy.' >&2
  exit 1
fi
wave_primary='https://ethereum-sepolia-rpc.publicnode.com'
wave_secondary='https://sepolia.gateway.tenderly.co'
wave_sender='0xDe25D83481c0c2A711397c44eE3317dD826952D5'
for wave_endpoint in "$wave_primary" "$wave_secondary"; do
  if [[ "$(cast chain-id --rpc-url "$wave_endpoint")" != '11155111' ]]; then
    echo 'Provider did not confirm Sepolia. Stop.' >&2
    exit 1
  fi
  if [[ "$(cast nonce "$wave_sender" --rpc-url "$wave_endpoint")" != '0' ]]; then
    echo 'Deployer nonce changed from the initial deployment plan. Stop for review.' >&2
    exit 1
  fi
  sleep 1
done
wave_head_primary="$(cast block-number --rpc-url "$wave_primary")"
wave_head_secondary="$(cast block-number --rpc-url "$wave_secondary")"
if [[ ! "$wave_head_primary" =~ ^[0-9]+$ || ! "$wave_head_secondary" =~ ^[0-9]+$ ]]; then
  echo 'Provider returned an invalid block number. Stop.' >&2
  exit 1
fi
wave_block=$(( (wave_head_primary < wave_head_secondary ? wave_head_primary : wave_head_secondary) - 3 ))
wave_hash_primary="$(cast block "$wave_block" --field hash --rpc-url "$wave_primary")"
wave_hash_secondary="$(cast block "$wave_block" --field hash --rpc-url "$wave_secondary")"
if [[ "$wave_hash_primary" != "$wave_hash_secondary" || ! "$wave_hash_primary" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
  echo 'Providers disagree on the simulation block. Stop.' >&2
  exit 1
fi
printf 'Mode: %s\nSepolia simulation block: %s\nBlock hash: %s\n' "$wave_mode" "$wave_block" "$wave_hash_primary"
echo 'PublicNode submits transactions only in explicit broadcast mode. Tenderly is read-only.'
echo 'Provider diversity does not prove fully independent infrastructure.'
wave_stamp="$(date -u +%Y%m%dT%H%M%SZ)"
wave_run="$wave_root/docs/readiness/owner-deploy-$wave_stamp"
mkdir -p "$wave_run"
printf 'mode=%s\nblock=%s\nblockHash=%s\n' "$wave_mode" "$wave_block" "$wave_hash_primary" > "$wave_run/context.txt"
wave_args=(script script/DeployDemo.s.sol:DeployDemo --rpc-url "$wave_primary" --sender "$wave_sender" --fork-block-number "$wave_block" --slow)
if [[ "$wave_mode" == '--broadcast' ]]; then
  wave_args+=(--account wave-sepolia --broadcast --verify)
  echo 'This run broadcasts real Sepolia transactions. Enter the keystore password locally when prompted.'
else
  wave_args+=(--non-interactive)
  echo 'Dry run only: no account unlock or broadcast.'
fi
cd "$wave_root/contracts"
set +e
forge "${wave_args[@]}" 2>&1 | tee "$wave_run/forge.log"
wave_exit=${PIPESTATUS[0]}
set -e
if [[ "$wave_mode" == '--dry-run' && -f "$wave_root/deployments/sepolia.json" ]]; then
  mv "$wave_root/deployments/sepolia.json" "$wave_run/predicted-NOT-DEPLOYED.json"
fi
printf 'exitCode=%s\n' "$wave_exit" >> "$wave_run/context.txt"
if [[ "$wave_exit" != '0' ]]; then
  echo "Run failed; see $wave_run/forge.log. Stop and inspect before retrying." >&2
  exit "$wave_exit"
fi
if [[ "$wave_mode" == '--dry-run' ]]; then
  echo "Dry run passed. Predictions in $wave_run are NOT deployed contracts."
else
  echo 'Broadcast command completed. Verify every receipt and explorer result separately.'
fi
