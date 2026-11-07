# Wave UI refinement — 7 November 2026

Owner requested a visual pass using ui-taste during submission preparation. This pass changes presentation only. The latest owner target remains 07:45 IST for submission before the stated 09:00 close; the earlier 02:00 target is historical. Deposit → CRE → Anon-RPC → verified docs/submission remains pending, one owner wallet/terminal action at a time. Balanced, Yield, AI Decision Card, Crash Replay and animation work are cut. The Planned Collections teaser was removed from Explore.

## Direction and research

Inspected the running Wave landing, Growth, portfolio and supporting pages before implementation. Deficits: weak type hierarchy/tiny support labels; too many competing panel boundaries; a 68px mobile rail consuming the content width. Preserve the forest-green/cream identity and the existing licensed DM Sans/Manrope fonts and Lucide icon family. Use 18px surfaces, 10px controls, pill badges, stronger forest-green primary regions, readable neutral support text and consistent focus. Decorative contour lines are authored SVG, not data or charts. No new dependencies or services.

Inspected the public [Uniswap swap screen](https://app.uniswap.org/swap): large amount fields, restrained transaction grouping and a clear primary action informed the existing Wave action panel. No Uniswap branding, customer claims or private information was copied. Optional paid Uizze retrieval was not used. The generated target is an illustrative design reference only, saved at its actual 1504×1046 dimensions. Compare its composition with the separately captured real app; no pixel-perfect claim is made. Inaccurate generated labels were replaced with the existing truthful feed/receiver disclosures, and actual live values replace illustrative dashes.

## What changed

Forest-green landing hero and portfolio summary; quieter partner explanations with dividers; larger text/controls across Growth, deposit/exit, holdings, forms, privacy and setup; consistent surfaces and readable disclosures. The mobile app uses a branded header, full content width and fixed bottom navigation. Navigation exposes aria-current and titles. The single Growth overview’s on-chain provenance now has an explicit grid position. No contract, ABI, wallet transaction handler, routing transport, privacy policy, safety limit or worker pin changed. No new basket/product capability was built.

## Verification and limits

35 TypeScript tests and 33 unchanged Foundry regressions passed, including accounting/stale exits, fee paths, hook, receiver, guards and real-v4 local integration. Workspace typecheck and dashboard build passed. The existing large-chunk warning remains; its bound was not changed. Secret scanning across the working tree and reachable history found no heuristic matches. These are local checks, not Sepolia execution evidence.

The actual browser captures cover desktop, mobile and intermediate layouts. Measured document widths match 390, 820, 1440 and 1504px without page-wide overflow in observed states; fonts were loaded in the recorded main/mobile checks. Used a temporary same-origin iframe harness because the browser viewport capability did not resize existing tabs; copies are retained here and product copies were removed. Keyboard Enter exercised mobile navigation where iframe bottom controls were outside the parent viewport. A locator deadline during scrolling was followed by direct DOM confirmation that the $100 preparation succeeded, then the in-kind tab worked. No physical touch or wallet-signing claim is made. Form field focus/long text were checked; wallet-gated validation/submission was not exercised.

One mobile HMR preview showed “HTTP request failed”; the real error capture is retained. A single reload recovered with immutable Nox 0.4.0 unchanged. MetaMask content-script liveness/listener warnings were also observed and retained. No silent public route was added. Page counters/startup times in screenshots describe partial UI-check sessions, not the required full Anon-RPC measurement. No testnet transaction or submission gate was added by this visual work.

See [visual-evidence.json](visual-evidence.json) for source/capture hashes, actual dimensions, scoped checks and limitations; [browser-observations.json](browser-observations.json) for observations. The generated target and real captures are distinct artifacts.
