// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {WaveFixture} from "./WaveFixture.sol";
import {WaveVault} from "../src/WaveVault.sol";
import {WaveRebalanceReceiver} from "../src/WaveRebalanceReceiver.sol";

contract GuardsTest is WaveFixture {
    function testFactoryRejectsDuplicateAssetsAndConcentratedWeights() public {
        address[] memory assets = new address[](2);
        assets[0] = address(eth);
        assets[1] = address(eth);
        uint16[] memory bps = new uint16[](2);
        bps[0] = 5000;
        bps[1] = 5000;
        usdc.approve(address(factory), 10e6);
        vm.expectRevert(WaveVault.InvalidAllocation.selector);
        factory.createBasket("Invalid", "BAD", assets, bps, 1000, 10e6);
        assets[1] = address(btc);
        bps[0] = 6000;
        bps[1] = 4000;
        vm.expectRevert(WaveVault.InvalidAllocation.selector);
        factory.createBasket("Invalid", "BAD", assets, bps, 1000, 10e6);
    }

    function testNegativeAndFutureOracleAnswersFailClosed() public {
        WaveVault v = createBasket();
        ethFeed.setAnswer(-1);
        (, bool healthy) = v.navUsdc();
        assertFalse(healthy);
        usdc.approve(address(v), 100e6);
        vm.expectRevert(WaveVault.UnhealthyOracle.selector);
        v.deposit(100e6, 0, address(this));
        ethFeed.setAnswer(2000e8);
        vm.warp(block.timestamp - 1);
        (, healthy) = v.navUsdc();
        assertFalse(healthy);
    }

    function testImpossibleMinimumDoesNotMoveAssets() public {
        WaveVault v = createBasket();
        uint256 beforeBalance = usdc.balanceOf(address(this));
        usdc.approve(address(v), 100e6);
        vm.expectRevert(WaveVault.Slippage.selector);
        v.deposit(100e6, 1000e18, address(this));
        assertEq(usdc.balanceOf(address(this)), beforeBalance);
        uint256 shares = v.balanceOf(address(this));
        vm.expectRevert(WaveVault.Slippage.selector);
        v.redeem(shares, 1000e6, address(this));
        assertEq(v.balanceOf(address(this)), shares);
    }

    function testDonationCannotStealNextDepositorsPrincipal() public {
        WaveVault v = createBasket();
        eth.transfer(address(v), 100e18);
        address holder = address(0xABC);
        usdc.transfer(holder, 1000e6);
        vm.startPrank(holder);
        usdc.approve(address(v), 1000e6);
        uint256 shares = v.deposit(1000e6, 0, holder);
        uint256 out = v.redeem(shares, 990e6, holder);
        vm.stopPrank();
        assertGt(out, 990e6);
    }

    function testExcessTurnoverAndPendingManualProposalBlockReports() public {
        WaveVault v = createBasket();
        WaveRebalanceReceiver r =
            new WaveRebalanceReceiver(
            address(0xF00), factory, false, bytes32(uint256(1)), address(this), bytes10("wave")
        );
        factory.setRebalancer(address(r));
        uint16[] memory bps = new uint16[](3);
        bps[0] = 1000;
        bps[1] = 4500;
        bps[2] = 4500;
        bytes memory metadata = abi.encodePacked(bytes32(uint256(1)), bytes10("wave"), address(this));
        bytes memory report = abi.encode(address(v), bps, uint64(block.timestamp), keccak256("bounds"));
        vm.prank(address(0xF00));
        vm.expectRevert(WaveVault.TurnoverExceeded.selector);
        r.onReport(metadata, report);
        assertEq(v.rebalanceCount(), 0);
        bps[0] = 4500;
        bps[1] = 3000;
        bps[2] = 2500;
        v.proposeWeights(bps);
        report = abi.encode(address(v), bps, uint64(block.timestamp), keccak256("pending"));
        vm.prank(address(0xF00));
        vm.expectRevert(WaveVault.Timelocked.selector);
        r.onReport(metadata, report);
        assertEq(v.rebalanceCount(), 0);
    }

    function testReceiverRejectsStaleFutureAndUnknownVaultReports() public {
        WaveVault v = createBasket();
        WaveRebalanceReceiver r =
            new WaveRebalanceReceiver(
            address(0xF00), factory, false, bytes32(uint256(1)), address(this), bytes10("wave")
        );
        factory.setRebalancer(address(r));
        uint16[] memory bps = new uint16[](3);
        bps[0] = 4500;
        bps[1] = 3000;
        bps[2] = 2500;
        bytes memory metadata = abi.encodePacked(bytes32(uint256(1)), bytes10("wave"), address(this), bytes2(0));
        bytes memory report = abi.encode(address(v), bps, uint64(block.timestamp - 901), bytes32(0));
        vm.prank(address(0xF00));
        vm.expectRevert(WaveRebalanceReceiver.InvalidReport.selector);
        r.onReport(metadata, report);
        report = abi.encode(address(v), bps, uint64(block.timestamp + 1), bytes32(0));
        vm.prank(address(0xF00));
        vm.expectRevert(WaveRebalanceReceiver.InvalidReport.selector);
        r.onReport(metadata, report);
        report = abi.encode(address(0xBAD), bps, uint64(block.timestamp), bytes32(0));
        vm.prank(address(0xF00));
        vm.expectRevert(WaveRebalanceReceiver.InvalidReport.selector);
        r.onReport(metadata, report);
        report = abi.encode(address(v), bps, uint64(block.timestamp), bytes32(0));
        vm.prank(address(0xF00));
        r.onReport(metadata, report);
        assertEq(v.rebalanceCount(), 1);
    }
}
