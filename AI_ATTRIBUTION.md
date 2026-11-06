# AI attribution

Codex synthesized the Wave Protocol specification from the user-supplied build plan and drafted the application contracts, tests, CRE workflow, dashboard, scripts, and documentation in this repository. It also ran compiler/type checks, automated tests, and browser interactions against a disposable local Anvil chain.

No human review, audit, real CRE broadcast, Sepolia deployment, or external submission is implied by these checks. Human review remains necessary before handling real assets. The product does not use an LLM; its strategy is deterministic and uses external market data.

Dependencies retain their upstream attribution and licenses. Uniswap v4 core/periphery, OpenZeppelin, Foundry's bundled test tooling, the CRE SDK, and Anon-RPC harness are imported dependencies. This project was assembled as an npm workspace rather than copied wholesale from a v4 or CRE template.
