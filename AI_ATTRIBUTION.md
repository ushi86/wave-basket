# AI attribution

Codex synthesized the Wave Protocol specification from the user-supplied build plan and drafted the application contracts, tests, CRE workflow, dashboard, scripts, and documentation in this repository. It also ran compiler/type checks, automated tests, and browser interactions against a disposable local Anvil chain.

No human review, audit, real CRE broadcast, Sepolia deployment, or external submission is implied by these checks. Human review remains necessary before handling real assets. The product does not use an LLM; its strategy is deterministic and uses external market data.

Dependencies retain their upstream attribution and licenses. Uniswap v4 core/periphery, OpenZeppelin, Foundry's bundled test tooling, the CRE SDK, and Anon-RPC harness are imported dependencies. This project was assembled as an npm workspace rather than copied wholesale from a v4 or CRE template.

## Readiness increment provenance

The owner supplied a second engineering brief (archived verbatim in `docs/provenance/READINESS_BRIEF.txt`) and requested `$to-spec`, then `$implement specs/WAVE_SUBMISSION_READINESS_SPEC.md`. The readiness spec records the accepted plan and testing boundaries. The owner approved comparison baseline `c94529f`, required strict separation of real and mock evidence, and explicitly rejected a deferred stale-exit reserve for this submission. Healthy-feed fees were implemented separately; stale fee avoidance remains disclosed.

Codex drafted the readiness contract changes, tests, browser measurement controls, evidence validator and documentation, and ran actual local checks. Synthetic validator fixtures are clearly labeled test-only. No Sepolia deployment, CRE CLI broadcast, external publication, eligibility decision or event submission is attributed to these local checks. The original build-plan title contains historical CoinHarbour branding; the shipped product is Wave Protocol.
