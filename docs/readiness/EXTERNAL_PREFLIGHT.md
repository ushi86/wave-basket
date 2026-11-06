# External evidence preparation — 6 November 2026

Feature work is frozen. This phase added operational instructions and authentic check records. It corrected only the typing of the existing creation-mismatch test fixture; no contract, strategy, dashboard or privacy behavior changed.

Initial run `external-preflight-20261106T090221Z/report.json` found a readiness-test TypeScript error (unknown log shape, then the string/Hex assignment exposed by fixing that shape). The mismatch regression had been added after the prior full typecheck. The initial failed record is preserved. `external-preflight-recheck-20261106T090905Z/report.json` records the successful rerun: 27 Foundry tests, 35 TypeScript tests (2 web, 3 strategy, 30 readiness), all workspace typechecks, dashboard build, CRE WASM compilation, contract sizes and verbose Foundry checks. Final WaveVaultDeployer runtime is 24,186 bytes, leaving 390 bytes under EIP-170.

Extra actual results in `external-preflight-extras/`:

- Foundry suite with 256 fuzz runs: 27 tests pass, zero failures/skips. These remain local deterministic fixtures, not Sepolia/fork acceptance.
- Solidity formatting and scoped Prettier checks: passed. The initial temporary test formatting issue was corrected before final checks.
- Secret heuristic: no findings in working source/reachable committed text. This is not a credential/security audit.
- npm audit (production and all dependencies): exit 1, two high-severity affected packages (CRE SDK via Zod), no critical findings. The underlying recorded advisory remains unresolved. No forced dependency upgrade.
- Submission evidence check: exit 1, honestly incomplete; no artifacts created by the checker. Required public source, Wave Sepolia deployment/lifecycle, actual CRE CLI log, full-session privacy evidence and reviewed readiness gate records remain absent.
- Slither/gitleaks not installed and not run. Standalone Forge/Cast/CRE/GitHub CLI were absent from PATH; repository-local npm Foundry tools ran the checks. No account creation, login, deployment, push or privacy session was attempted.

## Read-only public infrastructure observation

`external-infrastructure-preflight.json` records actual calls at **14:34:09 IST**. PublicNode identified chain 11155111, block **12,075,560**, hash `0xaddf67e9efe277d9c86e6de25cc79c8f07b9e4ca8dc12b59f44f59845d2e0b5a`, and 24,009 bytes of code at the expected official PoolManager `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`. This is not a Wave deployment receipt or two-provider consensus.

At that block the candidate real USD feeds were healthy under the existing policy:

| Feed | Address | Observed age / maximum seconds |
| --- | --- | --- |
| USDC | `0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E` | 86,004 / 108,000 |
| ETH | `0x694AA1769357215DE4FAC081bf1f309aDC325306` | 3,288 / 4,500 |
| BTC | `0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43` | 852 / 4,500 |
| LINK | `0xc59E3633BAAC79493d908e63626716e204A45EdF` | 2,556 / 4,500 |

Freshness must be rechecked immediately before later deployment or trades. These are feed candidates observed on canonical Sepolia, not deployment completion or a promise of future feed availability.

The checker's independent `https://sepolia.drpc.org` source returned JSON-RPC **code 35**, “chain is not available on free plan, please upgrade to paid plan.” The actual diagnostic is retained as `external-preflight-extras/secondary-rpc-diagnostic.json`. Two-source verification is currently blocked; no replacement, bypass or paid subscription was silently introduced. A working independent source must be established explicitly before treating receipts as independently corroborated.

## Next stages

Follow `../EXTERNAL_EVIDENCE_RUNBOOK.md`. The owner handles keystores, funding, logins and wallet signatures. Once the owner supplies the public repository URL and Git authentication is ready, the agent is explicitly authorized to add the remote and push existing history normally, without rewriting or force. Actual receipts will then be checked and recorded with addresses, complete hashes, canonical block data and component modes. CRE and full browser measurements wait for confirmed owner readiness. Missing kickoff/track information remains an eligibility/submission blocker, not a reason to infer eligibility from successful local checks.
