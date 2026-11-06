// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {WaveFixture} from "./WaveFixture.sol";
import {WaveVault} from "../src/WaveVault.sol";
import {NavGuardHook} from "../src/NavGuardHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";

contract TestHook is NavGuardHook {
    constructor() NavGuardHook(IPoolManager(address(0x123)), msg.sender) {}
    function validateHookAddress(BaseHook) internal pure override {}
}

contract HookTest is WaveFixture {
    function testFeeEncouragesConvergenceOutsideBand() public {
        TestHook hook = new TestHook();
        assertEq(hook.quoteFee(102e16, 1e18, true), 500);
        assertEq(hook.quoteFee(102e16, 1e18, false), 10000);
        assertEq(hook.quoteFee(98e16, 1e18, false), 500);
        assertEq(hook.quoteFee(98e16, 1e18, true), 10000);
        assertEq(hook.quoteFee(101e16, 1e18, false), 500);
        assertEq(hook.quoteFee(99e16, 1e18, true), 500);
        assertEq(hook.quoteFee(1.01005e18, 1e18, false), 10000);
    }

    function testOnlyOneApprovedPoolKeyCanUseHook() public {
        WaveVault vault = createBasket();
        TestHook hook = new TestHook();
        address a = address(vault) < address(usdc) ? address(vault) : address(usdc);
        address b = address(vault) < address(usdc) ? address(usdc) : address(vault);
        PoolKey memory key = PoolKey(Currency.wrap(a), Currency.wrap(b), 0x800000, 60, IHooks(address(hook)));
        hook.registerPool(key, vault);
        PoolKey memory another = key;
        another.tickSpacing = 120;
        vm.expectRevert(NavGuardHook.InvalidPool.selector);
        hook.registerPool(another, vault);
        vm.prank(address(0x123));
        vm.expectRevert(NavGuardHook.InvalidPool.selector);
        hook.beforeInitialize(address(this), another, uint160(1 << 96));
        vm.expectRevert();
        hook.beforeInitialize(address(this), key, uint160(1 << 96));
    }
}
