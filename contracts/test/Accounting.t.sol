// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {WaveFixture} from "./WaveFixture.sol";
import {WaveVault} from "../src/WaveVault.sol";

contract AccountingTest is WaveFixture {
    function testStalePricesBlockDepositButNeverInKindExit() public {
        WaveVault v = createBasket();
        uint256 shares = v.balanceOf(address(this));
        vm.warp(block.timestamp + 2 days);
        usdc.approve(address(v), 100e6);
        vm.expectRevert(WaveVault.UnhealthyOracle.selector);
        v.deposit(100e6, 0, address(this));
        uint256 beforeEth = eth.balanceOf(address(this));
        v.redeemInKind(shares, address(this));
        assertGt(eth.balanceOf(address(this)), beforeEth);
        assertEq(v.balanceOf(treasury), shares / 1000);
    }

    function testProfitFeeDilutesCreatorOnceAndNotBelowHighWaterMark() public {
        WaveVault v = createBasket();
        uint256 beforeSupply = v.totalSupply();
        v.crystallizeFees();
        assertEq(v.totalSupply(), beforeSupply);
        ethFeed.setAnswer(4_000e8);
        v.crystallizeFees();
        assertGt(v.totalSupply(), beforeSupply);
        uint256 chargedSupply = v.totalSupply();
        // $4 gain on $10 seed, 10% fee: $0.40 / $13.60 of post-fee NAV.
        assertApproxEqAbs(chargedSupply - beforeSupply, 294117647058823529, 2);
        assertApproxEqAbs(v.hwm(), 1.36e18, 2);
        v.crystallizeFees();
        assertEq(v.totalSupply(), chargedSupply);
        ethFeed.setAnswer(2_000e8);
        v.crystallizeFees();
        assertEq(v.totalSupply(), chargedSupply);
    }

    function testRedeemPaysNetMinimumAndTreasuryFee() public {
        WaveVault v = createBasket();
        usdc.approve(address(v), 1_000e6);
        uint256 minted = v.deposit(1_000e6, 0, address(this));
        uint256 beforeTreasury = usdc.balanceOf(treasury);
        uint256 out = v.redeem(minted / 2, 499e6, address(this));
        assertApproxEqAbs(out, 499_500_000, 3);
        assertApproxEqAbs(usdc.balanceOf(treasury) - beforeTreasury, 500_000, 2);
    }

    function testTimelockDoesNotExecuteEarlyAndCanBeCancelled() public {
        WaveVault v = createBasket();
        uint16[] memory bps = new uint16[](3);
        bps[0] = 4500;
        bps[1] = 3000;
        bps[2] = 2500;
        v.proposeWeights(bps);
        vm.expectRevert(WaveVault.Timelocked.selector);
        v.executeWeights();
        vm.warp(block.timestamp + 10 minutes);
        vm.prank(address(0x123));
        v.executeWeights();
        assertEq(v.targetWeights()[0], 4500);
        v.proposeWeights(bps);
        v.cancelWeights();
        vm.warp(block.timestamp + 10 minutes);
        vm.expectRevert();
        v.executeWeights();
    }

    function testFuzzInKindExitNeverExceedsProRata(uint96 raw) public {
        WaveVault v = createBasket();
        uint256 shares = bound(uint256(raw), 1e12, v.balanceOf(address(this)));
        uint256 held = eth.balanceOf(address(v));
        uint256 supply = v.totalSupply();
        uint256 before = eth.balanceOf(address(this));
        v.redeemInKind(shares, address(this));
        assertLe(eth.balanceOf(address(this)) - before, held * shares / supply);
    }

    function testRedemptionPreviewIncludesUncrystallizedFeeDilution() public {
        WaveVault v = createBasket();
        ethFeed.setAnswer(4000e8);
        uint256 shares = v.balanceOf(address(this));
        (uint256 netQuote, uint256 pendingShares) = v.previewRedeem(shares);
        assertApproxEqAbs(pendingShares, 294117647058823529, 2);
        assertApproxEqAbs(netQuote, 13_586_400, 3);
        uint256 received = v.redeem(shares, netQuote * 99 / 100, address(this));
        // One WBTC base unit is 500 micro-USDC at this fixture price.
        assertApproxEqAbs(received, netQuote, 1000);
        assertEq(v.performanceFeeSharesMinted(), pendingShares);
    }

    function testHealthyInKindCannotAvoidCreatorPerformanceFees() public {
        WaveVault v = createBasket();
        address holder = address(0xABC);
        v.transfer(holder, 4e18);
        ethFeed.setAnswer(4000e8);
        uint256 snapshot = vm.snapshotState();
        vm.prank(holder);
        v.redeem(4e18, 0, holder);
        uint256 expectedCreatorShares = v.balanceOf(address(this));
        assertApproxEqAbs(v.performanceFeeSharesMinted(), 294117647058823529, 2);
        vm.revertToState(snapshot);
        vm.prank(holder);
        v.redeemInKind(4e18, holder);
        assertEq(v.balanceOf(address(this)), expectedCreatorShares);
        assertApproxEqAbs(v.performanceFeeSharesMinted(), 294117647058823529, 2);
    }

    function testStaleInKindPaysFullNetProRataWithoutAReserve() public {
        WaveVault v = createBasket();
        address holder = address(0xABC);
        v.transfer(holder, 4e18);
        uint256 ethHeld = eth.balanceOf(address(v));
        uint256 btcHeld = btc.balanceOf(address(v));
        uint256 linkHeld = link.balanceOf(address(v));
        uint256 supply = v.totalSupply();
        // Four shares, less the unchanged 0.1% withdrawal fee: 3.996 shares leave the vault.
        uint256 netShares = 3_996_000_000_000_000_000;
        vm.warp(block.timestamp + 2 days);
        vm.prank(holder);
        v.redeemInKind(4e18, holder);
        assertEq(eth.balanceOf(holder), ethHeld * netShares / supply);
        assertEq(btc.balanceOf(holder), btcHeld * netShares / supply);
        assertEq(link.balanceOf(holder), linkHeld * netShares / supply);
        assertEq(v.balanceOf(holder), 0);
        assertEq(v.balanceOf(treasury), 4e15);
        assertEq(v.performanceFeeSharesMinted(), 0);
    }

    function testFuzzHealthyExitChoiceDoesNotReduceCreatorFee(uint96 rawShares) public {
        WaveVault v = createBasket();
        address holder = address(0xABC);
        uint256 shares = bound(uint256(rawShares), 1e15, 9e18);
        v.transfer(holder, shares);
        ethFeed.setAnswer(4000e8);
        uint256 snapshot = vm.snapshotState();
        vm.prank(holder);
        v.redeem(shares, 0, holder);
        uint256 creatorShares = v.balanceOf(address(this));
        uint256 fee = v.performanceFeeSharesMinted();
        vm.revertToState(snapshot);
        vm.prank(holder);
        v.redeemInKind(shares, holder);
        assertEq(v.balanceOf(address(this)), creatorShares);
        assertEq(v.performanceFeeSharesMinted(), fee);
    }
}
