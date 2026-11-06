// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {WaveFixture} from "./WaveFixture.sol";
import {WaveVault} from "../src/WaveVault.sol";
import {NavGuardHook} from "../src/NavGuardHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
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
    }
}
