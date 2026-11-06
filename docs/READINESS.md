# Submission readiness

Status: **Partial; submission gate failing**. This record concerns the increment from `c94529f`, not a production release. Raw command results in `docs/readiness/` are local checks only. `baseline.json` records the untouched baseline; timestamped phase folders contain actual argv, timestamps, exit codes and log digests.

| Phase | Status | Evidence / blocker |
| --- | --- | --- |
| A0 baseline and eligibility | Partial | Baseline checks captured. Authentic history below. Official kickoff timestamp and owner track/disclosure decision remain unavailable. |
| A1 public source | Not done | No public remote supplied, no publication claimed. Preserve history without force/squash/backdating. |
| A2 Wave naming | Proven | Product source uses Wave Protocol. Historical source-plan title is retained only as provenance. |
| A3 contracts | Partial | Healthy exit accounting, approved hook key, nonce/freshness receiver and rollback regressions implemented. Stale-fee conservation is explicitly blocked; no reserve. |
| A4 Sepolia | Partial | Funded deployer; 19 real successful recovery receipts corroborated on PublicNode and Tenderly. Seven contracts created; full core deployment remains incomplete after the nonce synchronization guard stopped before nonce 20. See EVIDENCE.md. No complete live manifest or lifecycle acceptance claimed. |
| A5 CRE CLI broadcast | Not done | WASM compilation and local fixtures do not establish CRE execution. No installed/logged-in CLI or actual broadcast evidence. |
| A6 privacy session | Partial | Fail-closed transport tests and session export/control implemented. Historical worker-only probe is not a full Sepolia measurement. |
| A7 dashboard | Partial | Mode labels, live hook snapshot, history references and measurement controls implemented; browser recheck recorded in `VERIFICATION.md`. |
| A8 documentation | Partial | Claim matrix, submission kit, privacy procedure, attribution and feedback prepared. Immutable public links unavailable. |
| A9 security | Partial | Dependency audit, secret heuristic, bounded fuzz and rollback tests recorded. Slither/gitleaks/professional audit not performed. |
| A10 owner submission | Not done | No video, partner selection, feedback-form confirmation or event submission confirmation. |

## Authentic history and eligibility

Original commits, with author and committer timestamps equal:

- `3288a94`: 2026-11-06 10:35:49 +05:30 — initial spec/setup.
- `fa457b6`: 2026-11-06 11:11:52 +05:30 — large implementation commit.
- `c94529f`: 2026-11-06 11:27:08 +05:30 — reviewed implementation fixes.
- `8f878dd`: 2026-11-06 12:04:33 +05:30 — readiness baseline/spec.

The large implementation commit is disclosed. No history has been rewritten. These dates alone do not establish eligibility. [Official rules](https://ethglobal.com/rules) distinguish Classic kickoff work from disclosed pre-existing Continuity work and discuss large commits. The [official Mumbai start page](https://ethglobal.com/events/mumbai/info/start) lists a 7 November 2026 09:00 IST deadline. Kickoff and applicable track still need owner confirmation; no eligible-track claim is made. Publication/submission work depending on that determination stays pending.

## Security and fee limitations

A holder exiting during stale feeds can avoid uncrystallized creator fees. Full immediate pro-rata asset payout after the unchanged withdrawal fee is preserved by explicit owner instruction. Healthy-feed paths crystallize fees consistently. No unbacked debt or withheld reserve was introduced. Any future reserve requires an enforceable expiry: see `STALE_EXIT_DESIGN.md`.

`AUDIT_NPM.txt` is actual npm output, including the SDK/Zod high-severity advisory. No forced incompatible override was applied. `readiness/secret-scan.json` is a location-only heuristic scan of working and reachable committed text; binary/ignored/large files and unknown secret formats are outside its scope. Foundry compiler lints remain visible in logs. No Slither run, invariant campaign, Sepolia fork acceptance or independent professional security audit is claimed. Bounded fuzz regressions are not a substitute for those activities.

## Evidence checker trust limits

`npm run check:evidence` has read/fetch capabilities only and exits nonzero for missing evidence. It verifies unauthenticated GitHub availability, immutable function anchors, canonical Sepolia receipts/logs from two fixed RPC services, CLI capture consistency, browser metric reconciliation, and required gates. Proven records require structured subject/release-bound review JSON and digest-matched supporting checks; eligibility also requires an owner decision and official kickoff/rules, while security requires dependency, secret, static-analysis and fuzz records. Privacy records must identify a clean release/browser, valid session dates and observations, and canonical block timestamps inside that session. It neither creates evidence nor certifies eligibility or authenticity of a human-supplied screenshot/log. Reviewers must inspect those artifacts and provenance; a local file with a self-declared Proven status is not cryptographic attestation. Synthetic test fixtures exist only under `tools/src/` and are never submission artifacts.

## Freeze and follow-up

Internal freeze: 7 November 06:30 IST; target owner submission 07:30 IST; verify external deadline before relying on it. Cut optional polish before evidence/safety work. Never lower guardrails to force a demonstration. Missing external evidence keeps readiness failing. Phase B remains gated on confirmed submission; the spec records its threat-model, economic, oracle, governance, audit, monitoring, supply-chain, Base and legal-review backlog.

## Supporting-review record format

A Proven claim artifact is JSON with `schemaVersion:1`, `subject` equal to its claim ID or gate name, `status:"Proven"`, `releaseCommit` equal to the submitted full commit, `environment:"reviewed-local-and-sepolia"`, and nonempty `checks`. Every check names `path`, exact file `sha256`, actual `command`, and `result:"passed"`. This environment means a combined scoped review; individual supporting logs must retain their true execution environment. Eligibility additionally records `ownerDecision:"approved"`, `officialRules` on ethglobal.com and a valid `kickoffAt`. Security records `tools` including `dependency-audit`, `secret-scan`, `static-analysis`, `fuzz`, and `findingsReviewed:true`. Never mark a failed tool run as passed; reviewed unresolved findings remain disclosed and may keep that gate Partial. These records are reviewed attestations, not generated proof.

Lifecycle receipts default to the deployment's flagship. If the separately created basket differs from the pre-existing hooked flagship, declare its actual address as `createdBasket` in the evidence deployment record. The creation event must match that declared basket; the hooked flagship's other actions remain independently verified.
