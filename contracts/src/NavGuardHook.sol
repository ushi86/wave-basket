// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {WaveVault} from "./WaveVault.sol";

contract NavGuardHook is BaseHook, Ownable2Step {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;
    mapping(PoolId => address) public vaults;
    error InvalidPool();
    event PoolRegistered(PoolId indexed id, address indexed vault);
    constructor(IPoolManager manager, address admin) BaseHook(manager) Ownable(admin) {}

    function getHookPermissions() public pure override returns (Hooks.Permissions memory p) {
        p.beforeInitialize = true;
        p.beforeSwap = true;
    }

    function registerPool(PoolKey calldata key, WaveVault vault) external onlyOwner {
        address a = Currency.unwrap(key.currency0);
        address b = Currency.unwrap(key.currency1);
        if (
            key.fee != LPFeeLibrary.DYNAMIC_FEE_FLAG || address(key.hooks) != address(this)
                || !((a == address(vault) && b == address(vault.usdc()))
                    || (b == address(vault) && a == address(vault.usdc())))
        ) revert InvalidPool();
        vaults[key.toId()] = address(vault);
        emit PoolRegistered(key.toId(), address(vault));
    }

    function _beforeInitialize(address, PoolKey calldata key, uint160) internal view override returns (bytes4) {
        if (vaults[key.toId()] == address(0)) revert InvalidPool();
        return BaseHook.beforeInitialize.selector;
    }

    function quoteFee(uint256 spot, uint256 nav, bool sellingFund) public pure returns (uint24) {
        if (nav == 0 || spot == 0) revert InvalidPool();
        uint256 deviation = spot > nav ? spot - nav : nav - spot;
        if (Math.mulDiv(deviation, 10_000, nav) <= 100) return 500;
        bool toward = spot > nav ? sellingFund : !sellingFund;
        return toward ? 500 : 10_000;
    }

    function _beforeSwap(address, PoolKey calldata key, SwapParams calldata params, bytes calldata)
        internal
        view
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        address vaultAddress = vaults[key.toId()];
        if (vaultAddress == address(0)) revert InvalidPool();
        WaveVault vault = WaveVault(vaultAddress);
        uint256 nav = vault.navPerShare();
        (uint160 sqrtP,,,) = poolManager.getSlot0(key.toId());
        bool fund0 = Currency.unwrap(key.currency0) == vaultAddress;
        uint256 quote;
        if (sqrtP <= type(uint128).max) {
            uint256 ratio = uint256(sqrtP) * sqrtP;
            quote = fund0 ? Math.mulDiv(ratio, 1e18, 1 << 192) : Math.mulDiv(1 << 192, 1e18, ratio);
        } else {
            uint256 ratio = Math.mulDiv(sqrtP, sqrtP, 1 << 64);
            quote = fund0 ? Math.mulDiv(ratio, 1e18, 1 << 128) : Math.mulDiv(1 << 128, 1e18, ratio);
        }
        uint24 fee = quoteFee(quote * 1e12, nav, params.zeroForOne == fund0);
        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, fee | LPFeeLibrary.OVERRIDE_FEE_FLAG);
    }
}
