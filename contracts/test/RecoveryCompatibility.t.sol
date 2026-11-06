// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {V4IntegrationTest} from "./V4Integration.t.sol";
import {DemoToken, DemoFeed} from "../src/mocks/DemoAssets.sol";
import {WaveVault} from "../src/WaveVault.sol";
import {WaveRebalanceReceiver} from "../src/WaveRebalanceReceiver.sol";

/// @notice Recovery architecture check only. The extra asset is an ordinary fixture,
/// not a Yield implementation, funded yield proof, live deployment or Phase 2 feature.
contract RecoveryCompatibilityTest is V4IntegrationTest {
    function _basket(string memory name, address a, address b, address c, uint16 w0, uint16 w1, uint16 w2)
        internal
        returns (WaveVault v)
    {
        address[] memory assets = new address[](3);
        assets[0] = a;
        assets[1] = b;
        assets[2] = c;
        uint16[] memory weights = new uint16[](3);
        weights[0] = w0;
        weights[1] = w1;
        weights[2] = w2;
        usdc.approve(address(factory), 100e6);
        v = WaveVault(factory.createBasket(name, "PROBE", assets, weights, 1000, 100e6));
    }

    function testAdditionalBasketsAndExternalAssetReuseCoreAndReceiver() public {
        address originalFactory = address(factory);
        address originalRegistry = address(registry);
        address originalAdapter = address(adapter);
        DemoToken extra = new DemoToken("Interface fixture only", "FIXTURE", 18, 100_000_000e18);
        DemoFeed feed = new DemoFeed(1e8, address(this));
        registry.setAsset(address(extra), address(feed), 1 days, 1, 1_000_000e8, true);
        extra.faucet();
        _pool(address(extra));
        WaveVault[3] memory probes = [
            _basket("Risk asset probe", address(eth), address(btc), address(link), 4000, 3500, 2500),
            _basket("Settlement mix probe", address(usdc), address(eth), address(btc), 5000, 3000, 2000),
            _basket("New asset interface probe", address(usdc), address(extra), address(eth), 4000, 4000, 2000)
        ];
        WaveRebalanceReceiver receiver = new WaveRebalanceReceiver(
            address(this), factory, false, bytes32(uint256(1)), address(this), bytes10("probe"), 900
        );
        factory.setRebalancer(address(receiver));
        bytes memory metadata = abi.encodePacked(bytes32(uint256(1)), bytes10("probe"), address(this));
        for (uint256 i; i < 3; i++) {
            assertTrue(factory.isBasket(address(probes[i])));
            assertEq(probes[i].factory(), originalFactory);
            assertEq(address(probes[i].registry()), originalRegistry);
            assertEq(address(probes[i].adapter()), originalAdapter);
            (, bool healthy) = probes[i].navUsdc();
            assertTrue(healthy);
            uint16[] memory proposed = new uint16[](3);
            proposed[0] = i == 2 ? 3500 : 4500;
            proposed[1] = i == 0 ? 3200 : i == 1 ? 3300 : 4200;
            proposed[2] = i == 0 ? 2300 : i == 1 ? 2200 : 2300;
            receiver.onReport(
                metadata, abi.encode(address(probes[i]), uint64(1), proposed, uint64(block.timestamp), bytes32(i + 1))
            );
            assertEq(receiver.lastNonce(address(probes[i])), 1);
        }
        assertEq(factory.basketsLength(), 3);
        assertEq(address(factory), originalFactory);
        assertEq(address(registry), originalRegistry);
        assertEq(address(adapter), originalAdapter);
    }
}
