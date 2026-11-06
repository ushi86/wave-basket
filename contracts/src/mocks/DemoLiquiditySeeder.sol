// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Demo-only full-range liquidity. Positions stay owned by this seeder; no withdrawal UI.
contract DemoLiquiditySeeder is IUnlockCallback, Ownable {
    using BalanceDeltaLibrary for BalanceDelta;
    using SafeERC20 for IERC20;
    IPoolManager public immutable manager;
    bool private active;

    constructor(IPoolManager m, address admin) Ownable(admin) {
        manager = m;
    }

    function seed(PoolKey calldata key, int256 liquidity) external onlyOwner {
        require(liquidity > 0 && !active, "invalid liquidity");
        active = true;
        manager.unlock(abi.encode(key, liquidity));
        active = false;
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(manager) && active, "unauthorized callback");
        (PoolKey memory key, int256 liquidity) = abi.decode(data, (PoolKey, int256));
        (BalanceDelta delta,) =
            manager.modifyLiquidity(key, ModifyLiquidityParams(-887220, 887220, liquidity, bytes32(0)), "");
        _settle(key.currency0, delta.amount0());
        _settle(key.currency1, delta.amount1());
        return "";
    }

    function _settle(Currency currency, int128 delta) internal {
        if (delta < 0) {
            manager.sync(currency);
            IERC20(Currency.unwrap(currency)).safeTransferFrom(owner(), address(manager), uint256(uint128(-delta)));
            manager.settle();
        } else if (delta > 0) {
            manager.take(currency, owner(), uint256(uint128(delta)));
        }
    }
}
