# Wave Protocol code review

Baseline approved by the user: `3288a94daefb5934deb7f9b20ef4d99dbccda7ed`. Initial implementation reviewed: `fa457b6`. Two independent read-only reviewers assessed standards and specification fidelity. Both later inspected the fixes and found no remaining substantive defect in the reviewed changes. This is a code review, not a security audit.

## Standards

No documented-standard violations were found. There was no repository coding-standard file at the baseline. The reviewer reported two judgment-call smells:

1. **P2 — Divergent Change.** The original App owned session lifecycle, wallet listeners, polling, transaction orchestration, calculations, history loading, and five pages. “Changes to privacy startup, trading behavior, or page presentation all require editing the same large component.”
2. **P3 — Data Clumps.** The manifest generator coupled four positional token-metadata arrays. “A single misalignment can silently assign another asset’s decimals or market ID to its address.”

Resolution: App now composes navigation/chrome and focused pages; protocol lifecycle and transaction orchestration live in a dedicated hook; controls and formatting are separate modules. The manifest maps token-definition objects instead of parallel arrays. The standards reviewer verified both fixes and found no meaningful refactor-induced issue.

## Spec

The reviewer found three correctness issues and two presentation gaps, with no substantive scope creep:

1. **P1 — Redemption after fee dilution.** The dashboard calculated minimum output from pre-crystallization NAV per share, but settlement redemption crystallized fees first. Accrued gains could reduce entitlement beyond the execution tolerance and block otherwise valid exits. Spec: “Crystallize fees … enforce … the user's net minimum output.”
2. **P2 — Public pending allocations.** Creator-only rendering hid pending weights/ETA from holders and visitors and omitted the permissionless execution UI. Spec: “Make the pending weights and ETA readable” and “execution becomes permissionless.”
3. **P2 — Hook band rounding.** Flooring deviation to basis points treated a 1.005% deviation as inside the 1% band. Spec: “higher fees … away from NAV outside the configured band” and “explicit boundary tests required.”
4. **Presentation — History.** The model loaded old/new weights and both NAVs, but the dashboard did not display allocation changes or NAV impact.
5. **Presentation — Fees.** Withdrawal treasury information and minted/pending creator-fee dilution were missing from the dashboard.

Resolution: `previewRedeem` uses the same pending-fee formula as crystallization; the dashboard reads a fresh post-fee quote before applying 1% execution tolerance. A worked-value regression verifies accrued-gain redemption. Pending allocations are public and execution is available to connected users after the delay; the contract regression executes as another address. The hook compares integer deviation against NAV/100 exactly and has a fractional-basis-point regression. History displays old/new allocations and NAV impact, including the older-event presentation. Fee disclosures include the treasury, minted and pending fee shares, and pending dilution.

The spec reviewer verified the fixes. A minor older-history presentation limitation noted in that recheck was subsequently removed: archived events now display allocation changes, turnover, both NAVs, NAV impact, block number, and transaction reference. Archived event times are identified by block number rather than a separately fetched timestamp.

External acceptance gaps remain disclosed in the verification report: funded Sepolia deployment, live fork evidence, real CRE CLI broadcast, and full-session private coverage. They are not represented as passed checks.

Standards: 2 findings, worst P2, resolved. Spec: 5 findings, worst P1, resolved.
