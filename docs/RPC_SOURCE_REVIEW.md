# Independent RPC proposal

Recommendation: use the accountless public endpoint `https://sepolia.gateway.tenderly.co` as the proposed second provider alongside PublicNode. Do not use a Tenderly Virtual TestNet or a token-bearing project endpoint. The public URL appears in [Tenderly's own Sepolia example](https://tenderly.co/blog/how-to-run-safe-simulations-on-tenderly/). This is a separate provider hostname from PublicNode, not a second alias for the same PublicNode service. This is a provider-diversity check, not proof that operators share no downstream infrastructure.

The actual read-only [probe](readiness/tenderly-public-rpc-probe.json), 6 November 2026 at 15:03:27 IST, used no account, API key, subscription or payment. It confirmed chain ID 11155111 and matched PublicNode's finalized block 12,075,629, block hash, official PoolManager bytecode hash and a historical Chainlink ETH/USD call. An existing **non-Wave** transaction receipt also matched successful status, block hash and normalized consensus log fields (address, topics, data).

Raw serialized log objects initially compared unequal. The follow-up compared the same normalized consensus fields used by the evidence checker and found a match; no first-log field value differed. The raw comparison failure is retained in the probe, not silently deleted. No Wave transaction was sent, and this is not Wave lifecycle or browser privacy evidence.

The URL currently accepts credential-free reads. No guaranteed free quota, archival retention, SLA or future availability is asserted. Recheck receipt/state support before live verification; if access later requires an account, API key or paid plan, stop and ask the owner first. [Tenderly's current product pricing](https://tenderly.co/pricing) is not evidence that an account-backed service is authorized.

Other probes: the current dRPC endpoint rejected Sepolia on its free plan (code 35); the public BlockPI URL rejected the read; rpc.sepolia.org timed out. None was replaced with an account or paid endpoint.

Status: **proposed only**. The evidence checker still uses its existing fixed PublicNode/dRPC pair and will fail closed while dRPC is unavailable. No RPC configuration, transport, worker pin or contract behavior was changed in this copy/research increment. A later operational change must retain chain, canonical-block, receipt/log and state checks against both selected providers.
