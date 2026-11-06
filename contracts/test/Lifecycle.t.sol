// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {WaveFixture} from "./WaveFixture.sol";
import {WaveVault} from "../src/WaveVault.sol";

contract LifecycleTest is WaveFixture {
    function testCreateDepositAndExitInKind() public {
        WaveVault vault = createBasket();
        usdc.approve(address(vault), 1_000e6);
        uint256 shares = vault.deposit(1_000e6, 990e18, address(this));
        require(shares > 990e18, "deposit should mint fair shares");
        (uint256 nav, bool healthy) = vault.navUsdc();
        require(healthy && nav == 1_010e6, "seed plus deposit NAV");
        uint256 beforeEth = eth.balanceOf(address(this));
        vault.redeemInKind(shares, address(this));
        require(eth.balanceOf(address(this)) > beforeEth, "holder receives underlying assets");
        require(vault.balanceOf(address(this)) < 11e18, "only creator seed remains");
    }
}
