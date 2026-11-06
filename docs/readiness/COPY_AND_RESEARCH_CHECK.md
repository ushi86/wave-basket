# Copy and setup research check

The approved copy increment updates the landing page, Privacy page, README opening, submission narrative and recording script around fair value, target allocation and private visibility. On-chain holdings remain explicitly public. Testnet/mock/simulation/unaudited status, direct local reads, separate wallet RPC, stale-exit fee avoidance and no-reserve disclosures remain in place.

Validation: web typecheck and production build passed. The existing Vite bundle-size notice remains. The landing copy was inspected in the browser against the local-mode manifest with the local chain stopped: the expected offline RPC notice was observed and dismissed for a static copy preview. No wallet was connected, no transaction was sent, and no Anon-RPC worker was started or measured. `wave-copy-preview.png` is a copy/layout preview, not integration evidence. The temporary Vite server was stopped afterwards.

The README claim inventory was refreshed without promoting claims to Proven. The evidence checker still fails for missing submitted revision, immutable source anchors, Sepolia deployment/lifecycle, real CRE broadcast, full privacy measurement and reviewed gate records. It reports no missing README claim mapping. Public repo metadata was corrected to the already verified GitHub URL; no deployment or submission was inferred.

Research findings: `NOX_SPECIFIER_REVIEW.md` compares the current immutable worker 0.4.0 with the officially listed, owner-updatable 0.4.1 specifier, verified bundle bytes and source differences. No pin changed or worker executed. `RPC_SOURCE_REVIEW.md` proposes credential-free Tenderly reads as a second provider and records the actual limited probe. No account or paid service was used; the checker provider list was not modified.

Only presentation text, documentation and claim-inventory metadata changed. No contracts, strategy, ABI, wallet/read transport, dependencies or safety bounds changed. The owner handles the named encrypted keystore and all signing/password/funding steps; the agent received only a public address.
