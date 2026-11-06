# Stale-oracle exit fee design gate

Status: post-event option only. The user explicitly rejected a deferred reserve for this submission. Healthy in-kind fee crystallization is implemented separately; stale exits must remain immediate, full and pro-rata after the unchanged withdrawal fee.

The baseline vault let holders exit in kind without any price read and waived uncrystallized performance fees on that exit. The current healthy-feed path crystallizes those fees; the stale-feed path still waives them. The readiness spec asks for both a stale-feed exit and no fee avoidance; a healthy-only fee fix cannot satisfy that requirement.

A missing current valuation prevents us from determining the exact fee at exit. Charging from stale prices, forgiving the fee, or recording an unbacked debt would not satisfy the spec. Charging other holders later would transfer the liability incorrectly.

A concrete candidate is a separate, backed deferred reserve:

- With healthy feeds, crystallize the existing fund-level fee formula before either exit path.
- With stale feeds, burn the holder's net exit shares and separate their entire pro-rata raw-token slice from the vault without a price read. Preserve the existing withdrawal-fee rule.
- Release the unreserved portion immediately. For each underlying asset, retain up to the basket's configured performance-fee percentage of that slice, rounded up to a token unit, as a separately accounted claim. This is a worst-case backing bound, not a new fee rate: a profit-only fee cannot exceed that percentage of the entire slice's value when its high-water-mark basis is nonnegative.
- Snapshot the departing holder's original slice quantities, high-water-mark basis, fee rate, creator, and payout recipient. Back each claim with segregated tokens; never use the remaining vault's assets or another claimant's reserve.
- Once healthy prices return, permit anyone to settle the fixed claim. Value the original slice at the settlement price round, apply its snapshotted high-water-mark basis and fee rate, pay the creator in underlying assets, and release all unused reserve to the recipient. Failed settlement leaves the reserve untouched.
- Expose the reserve and valuation convention in previews, UI, events, and documentation. Test path-equivalent creator economic entitlement at the same valuation, no double charge, no cross-holder subsidy, stale availability, and complete reserve backing.

This changes user-visible semantics: a basket with a 20% performance fee would immediately release at least roughly 80% of the net raw-token slice, with the balance remaining in a backed claim until healthy settlement. An indefinite reserve is not acceptable: any future reserve must have a specified, enforceable expiry and deterministic payout/release rule even if feeds never recover. The candidate above does not yet define that rule and must not be implemented as written. Valuation at recovery is also different from valuation at the unknowable stale exit instant. These tradeoffs require an explicit product choice and a reviewed accounting design; they must not be disguised as the original full immediate in-kind exit.

Without agreement to that tradeoff (or another provably collectible design), the implementation should retain the existing behavior, demonstrate the fee-avoidance limitation in a requirement check, and keep A3/readiness failing. Passing local lifecycle tests must not override this unresolved requirement.

User decision: disclose that stale-feed exits may avoid uncrystallized creator fees; keep that fee-conservation change blocked. Any future design requires an expiry, a reviewed valuation/collection policy, and proof that funds cannot remain locked forever.
