// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {IWaveSwapAdapter} from "./IWaveSwapAdapter.sol";

contract WaveSwapAdapter is IWaveSwapAdapter, IUnlockCallback, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using BalanceDeltaLibrary for BalanceDelta;
    IPoolManager public immutable manager;
    mapping(bytes32 => PoolKey) private pools;
    bool private active;
    error InvalidSwap();
    event PoolConfigured(address indexed token0, address indexed token1, uint24 fee, address hook);

    constructor(IPoolManager m, address admin) Ownable(admin) {
        manager = m;
    }

    function pairId(address a, address b) public pure returns (bytes32) {
        return a < b ? keccak256(abi.encode(a, b)) : keccak256(abi.encode(b, a));
    }

    function setPool(PoolKey calldata key) external onlyOwner {
        address a = Currency.unwrap(key.currency0);
        address b = Currency.unwrap(key.currency1);
        if (a == address(0) || a >= b) revert InvalidSwap();
        pools[pairId(a, b)] = key;
        emit PoolConfigured(a, b, key.fee, address(key.hooks));
    }

    function poolFor(address a, address b) external view returns (PoolKey memory) {
        return pools[pairId(a, b)];
    }

    function swap(address a, address b, uint256 amount, uint256 minOut, address recipient)
        external
        nonReentrant
        returns (uint256 output)
    {
        PoolKey memory key = pools[pairId(a, b)];
        if (
            a == b || recipient == address(0) || amount == 0 || amount > uint256(type(int256).max)
                || Currency.unwrap(key.currency0) == address(0)
        ) revert InvalidSwap();
        uint256 beforeBalance = IERC20(a).balanceOf(address(this));
        IERC20(a).safeTransferFrom(msg.sender, address(this), amount);
        if (IERC20(a).balanceOf(address(this)) - beforeBalance != amount) revert InvalidSwap();
        active = true;
        output = abi.decode(manager.unlock(abi.encode(key, a, amount, minOut, recipient)), (uint256));
        active = false;
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != address(manager) || !active) revert InvalidSwap();
        (PoolKey memory key, address tokenIn, uint256 amount, uint256 minOut, address recipient) =
            abi.decode(data, (PoolKey, address, uint256, uint256, address));
        bool zeroForOne = tokenIn == Currency.unwrap(key.currency0);
        BalanceDelta delta = manager.swap(
            key,
            SwapParams(
                zeroForOne, -int256(amount), zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
            ),
            ""
        );
        int128 input = zeroForOne ? delta.amount0() : delta.amount1();
        int128 output = zeroForOne ? delta.amount1() : delta.amount0();
        if (input >= 0 || output <= 0 || uint256(uint128(-input)) != amount || uint256(uint128(output)) < minOut) {
            revert InvalidSwap();
        }
        Currency inCurrency = zeroForOne ? key.currency0 : key.currency1;
        Currency outCurrency = zeroForOne ? key.currency1 : key.currency0;
        manager.sync(inCurrency);
        IERC20(tokenIn).safeTransfer(address(manager), amount);
        manager.settle();
        manager.take(outCurrency, recipient, uint256(uint128(output)));
        return abi.encode(uint256(uint128(output)));
    }
}
