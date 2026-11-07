# Uniswap v4 feedback — Wave Protocol

## Integration

Wave vaults acquire and sell underlying mock assets through a small exact-input adapter using PoolManager unlock, swap, sync, settle, and take. A separate flagship FUND/mUSDC pool uses NavGuardHook to compare its spot price with underlying oracle NAV and return directional dynamic-fee overrides.

## What worked

- The published v4 core/periphery packages compile with Solidity 0.8.26 targeting Cancun.
- A real local PoolManager fixture exercises deposits and both exit modes.
- Hook deployment mines the beforeInitialize + beforeSwap permission bits, registers the key before initialization, and seeds a dynamic-fee pool.
- Browser tests confirmed both directions of flagship pool swaps on the disposable local chain.

## Friction and reproduction notes

- Fee overrides need both a dynamic-fee pool at initialization and the override flag on each swap. The pool's stored default LP fee is not the same as the hook's per-swap override.
- Address mining is coupled to the CREATE2 deployer used by the broadcast tool. Computing against another deployer produces a different address and invalid permission bits.
- An apparently deep demo pool can still drift outside a strict oracle minOut after a large launch seed. With a 10,000 mUSDC basket seed against pools with 1,000,000 mUSDC depth, a subsequent 1,000 mUSDC deposit hit the 1% oracle slippage guard. The regression fixture now uses deeper pools rather than weakening the guard.
- Currency sorting and different token decimals affect both initial sqrtPriceX96 and FUND/NAV comparisons; examples using identical-decimal tokens do not cover this integration.
- A factory embedding the entire vault creation bytecode exceeded EIP-170. A dedicated factory-only deployer keeps the plain-contract deployment model within the limit.

## Documentation suggestion

A compact end-to-end example combining multi-decimal ERC-20 settlement, oracle-derived minimum output, mined hook deployment, and directional dynamic-fee assertions would shorten the path to an executable integration.

No upstream bug is claimed. Time to first hook deployment was not tracked separately. This feedback was drafted during AI-assisted implementation and has not been submitted through the Uniswap feedback form.


## Demo recording status — 7 November

The edited captioned video shows the actual v4/PoolManager/hook UI and discloses missing live directional receipts. It is not new swap-execution evidence. The official Uniswap feedback form remains an owner action; no form confirmation or submission has been recorded.
