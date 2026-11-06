// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {WaveFixture} from "./WaveFixture.sol";
import {WaveVault} from "../src/WaveVault.sol";
import {WaveRebalanceReceiver} from "../src/WaveRebalanceReceiver.sol";

contract ReceiverTest is WaveFixture {
    function testOnlyFreshAuthenticatedReportCanRebalanceOnce() public {
        WaveVault vault = createBasket();
        WaveRebalanceReceiver receiver = new WaveRebalanceReceiver(
            address(0xF00), factory, false, bytes32(uint256(1)), address(this), bytes10("wave"), 900
        );
        factory.setRebalancer(address(receiver));
        uint16[] memory bps = new uint16[](3);
        bps[0] = 4500;
        bps[1] = 3000;
        bps[2] = 2500;
        bytes memory report = abi.encode(address(vault), uint64(1), bps, uint64(block.timestamp), keccak256("market"));
        bytes memory metadata = abi.encodePacked(bytes32(uint256(1)), bytes10("wave"), address(this));
        vm.expectRevert();
        receiver.onReport(metadata, report);
        vm.prank(address(0xF00));
        receiver.onReport(metadata, report);
        assertEq(vault.rebalanceCount(), 1);
        vm.prank(address(0xF00));
        vm.expectRevert();
        receiver.onReport(metadata, report);
    }

    function testSimulationModeAcceptsEmptyMetadataButKeepsVaultBounds() public {
        vm.chainId(31337);
        WaveVault vault = createBasket();
        WaveRebalanceReceiver receiver =
            new WaveRebalanceReceiver(address(0xF00), factory, true, bytes32(0), address(0), bytes10(0), 900);
        factory.setRebalancer(address(receiver));
        uint16[] memory bps = new uint16[](3);
        bps[0] = 4500;
        bps[1] = 3000;
        bps[2] = 2500;
        bytes memory report =
            abi.encode(address(vault), uint64(1), bps, uint64(block.timestamp), keccak256("simulation"));
        vm.prank(address(0xF00));
        receiver.onReport("", report);
        assertEq(vault.rebalanceCount(), 1);
    }

    function testHistoryRetainsLast32AndExpiresEarlierRecords() public {
        WaveVault vault = createBasket();
        WaveRebalanceReceiver receiver = new WaveRebalanceReceiver(
            address(0xF00), factory, false, bytes32(uint256(1)), address(this), bytes10("wave"), 900
        );
        factory.setRebalancer(address(receiver));
        uint16[] memory bps = new uint16[](3);
        bytes memory metadata = abi.encodePacked(bytes32(uint256(1)), bytes10("wave"), address(this));
        uint256 timestamp = block.timestamp;
        for (uint256 i; i < 33; i++) {
            bps[0] = i % 2 == 0 ? 4500 : 4000;
            bps[1] = i % 2 == 0 ? 3000 : 3500;
            bps[2] = 2500;
            timestamp += 301;
            vm.warp(timestamp);
            bytes memory report = abi.encode(address(vault), uint64(i + 1), bps, uint64(timestamp), bytes32(i));
            vm.prank(address(0xF00));
            receiver.onReport(metadata, report);
        }
        assertEq(vault.rebalanceCount(), 33);
        vm.expectRevert(WaveVault.ExpiredRecord.selector);
        vault.rebalanceAt(0);
        assertEq(vault.rebalanceAt(1).id, 1);
        assertEq(vault.rebalanceAt(32).id, 32);
    }

    function testNonceMustBeNextAndFailedExecutionRemainsRetryable() public {
        WaveVault vault = createBasket();
        WaveRebalanceReceiver receiver = new WaveRebalanceReceiver(
            address(0xF00), factory, false, bytes32(uint256(1)), address(this), bytes10("wave"), 900
        );
        factory.setRebalancer(address(receiver));
        uint16[] memory bps = new uint16[](3);
        bps[0] = 4500;
        bps[1] = 3000;
        bps[2] = 2500;
        bytes memory metadata = abi.encodePacked(bytes32(uint256(1)), bytes10("wave"), address(this));
        bytes memory report = abi.encode(address(vault), uint64(2), bps, uint64(block.timestamp), bytes32(0));
        vm.prank(address(0xF00));
        vm.expectRevert(WaveRebalanceReceiver.InvalidReport.selector);
        receiver.onReport(metadata, report);
        assertEq(receiver.lastNonce(address(vault)), 0);
        vault.proposeWeights(bps);
        report = abi.encode(address(vault), uint64(1), bps, uint64(block.timestamp), bytes32(0));
        vm.prank(address(0xF00));
        vm.expectRevert(WaveVault.Timelocked.selector);
        receiver.onReport(metadata, report);
        assertEq(receiver.lastNonce(address(vault)), 0);
        vault.cancelWeights();
        vm.prank(address(0xF00));
        receiver.onReport(metadata, report);
        assertEq(receiver.lastNonce(address(vault)), 1);
        vm.prank(address(0xF00));
        vm.expectRevert(WaveRebalanceReceiver.InvalidReport.selector);
        receiver.onReport(metadata, report);
    }
}
