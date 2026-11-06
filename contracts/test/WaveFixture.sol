// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {Test} from "forge-std/Test.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {WaveVault} from "../src/WaveVault.sol";
import {WaveFactory} from "../src/WaveFactory.sol";
import {IWaveSwapAdapter} from "../src/IWaveSwapAdapter.sol";
import {DemoToken, DemoFeed} from "../src/mocks/DemoAssets.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// External exchange boundary for deterministic accounting tests. Real PoolManager integration has its own fixture.
contract OracleExchange is IWaveSwapAdapter {
    AssetRegistry public registry;

    constructor(AssetRegistry r) {
        registry = r;
    }

    function swap(address a, address b, uint256 amount, uint256 minOut, address recipient)
        external
        returns (uint256 out)
    {
        (uint256 usd, bool healthy) = registry.valueUsd(a, amount);
        (uint256 p, bool ok) = registry.priceUsd(b);
        require(healthy && ok, "oracle");
        (,, uint8 d,,,,) = registry.assets(b);
        out = usd * 10 ** d / p;
        require(out >= minOut, "min out");
        IERC20(a).transferFrom(msg.sender, address(this), amount);
        IERC20(b).transfer(recipient, out);
    }
}

abstract contract WaveFixture is Test {
    DemoToken usdc;
    DemoToken eth;
    DemoToken btc;
    DemoToken link;
    DemoFeed ethFeed;
    DemoFeed btcFeed;
    DemoFeed linkFeed;
    DemoFeed usdcFeed;
    AssetRegistry registry;
    OracleExchange exchange;
    WaveFactory factory;
    address treasury = address(0x777);

    function setUp() public virtual {
        vm.warp(1_800_000_000);
        usdc = new DemoToken("Wave Test USDC", "mUSDC", 6, 100_000_000e6);
        eth = new DemoToken("Wave Test WETH", "mWETH", 18, 1_000_000e18);
        btc = new DemoToken("Wave Test WBTC", "mWBTC", 8, 1_000_000e8);
        link = new DemoToken("Wave Test LINK", "mLINK", 18, 100_000_000e18);
        usdcFeed = new DemoFeed(1e8, address(this));
        ethFeed = new DemoFeed(2_000e8, address(this));
        btcFeed = new DemoFeed(50_000e8, address(this));
        linkFeed = new DemoFeed(10e8, address(this));
        registry = new AssetRegistry(address(this));
        registry.setAsset(address(usdc), address(usdcFeed), 1 days, 1, 1_000_000e8, true);
        registry.setAsset(address(eth), address(ethFeed), 1 days, 1, 1_000_000e8, true);
        registry.setAsset(address(btc), address(btcFeed), 1 days, 1, 1_000_000e8, true);
        registry.setAsset(address(link), address(linkFeed), 1 days, 1, 1_000_000e8, true);
        exchange = new OracleExchange(registry);
        usdc.faucet();
        eth.faucet();
        btc.faucet();
        link.faucet();
        usdc.transfer(address(exchange), 10_000_000e6);
        eth.transfer(address(exchange), 500_000e18);
        btc.transfer(address(exchange), 500_000e8);
        link.transfer(address(exchange), 50_000_000e18);
        factory = new WaveFactory(registry, exchange, IERC20(address(usdc)), treasury, address(this));
    }

    function createBasket() internal returns (WaveVault) {
        address[] memory assets = new address[](3);
        assets[0] = address(eth);
        assets[1] = address(btc);
        assets[2] = address(link);
        uint16[] memory weights = new uint16[](3);
        weights[0] = 4000;
        weights[1] = 3500;
        weights[2] = 2500;
        usdc.approve(address(factory), 10e6);
        return WaveVault(factory.createBasket("Wave Blue Chip", "FUND", assets, weights, 1_000, 10e6));
    }
}
