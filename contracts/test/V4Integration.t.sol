// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {WaveFixture} from "./WaveFixture.sol";
import {WaveFactory} from "../src/WaveFactory.sol";
import {WaveVault} from "../src/WaveVault.sol";
import {WaveSwapAdapter} from "../src/WaveSwapAdapter.sol";
import {DemoLiquiditySeeder} from "../src/mocks/DemoLiquiditySeeder.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

contract V4IntegrationTest is WaveFixture {
    PoolManager manager;
    WaveSwapAdapter adapter;
    DemoLiquiditySeeder seeder;

    function setUp() public override {
        super.setUp();
        manager = new PoolManager(address(this));
        adapter = new WaveSwapAdapter(manager, address(this));
        seeder = new DemoLiquiditySeeder(manager, address(this));
        _pool(address(eth));
        _pool(address(btc));
        _pool(address(link));
        factory = new WaveFactory(registry, adapter, IERC20(address(usdc)), treasury, address(this));
    }

    function _pool(address asset) internal {
        address a = asset < address(usdc) ? asset : address(usdc);
        address b = asset < address(usdc) ? address(usdc) : asset;
        PoolKey memory key = PoolKey(Currency.wrap(a), Currency.wrap(b), 3000, 60, IHooks(address(0)));
        (uint256 pa,) = registry.priceUsd(a);
        (uint256 pb,) = registry.priceUsd(b);
        uint160 sqrtP = uint160(
            Math.sqrt(
                Math.mulDiv(pa * 10 ** IERC20Metadata(b).decimals(), 1 << 128, pb * 10 ** IERC20Metadata(a).decimals())
            ) << 32
        );
        manager.initialize(key, sqrtP);
        adapter.setPool(key);
        IERC20(a).approve(address(seeder), type(uint256).max);
        IERC20(b).approve(address(seeder), type(uint256).max);
        uint256 liq =
            a == address(usdc) ? Math.mulDiv(10_000_000e6, sqrtP, 1 << 96) : Math.mulDiv(10_000_000e6, 1 << 96, sqrtP);
        seeder.seed(key, int256(liq));
    }

    function testDepositAndBothExitsThroughRealV4PoolManager() public {
        WaveVault vault = createBasket();
        usdc.approve(address(vault), 1000e6);
        uint256 shares = vault.deposit(1000e6, 990e18, address(this));
        (uint256 nav, bool ok) = vault.navUsdc();
        assertTrue(ok);
        assertGt(nav, 1000e6);
        assertLt(nav, 1010e6);
        uint256 out = vault.redeem(shares / 2, 490e6, address(this));
        assertGt(out, 490e6);
        uint256 beforeEth = eth.balanceOf(address(this));
        vault.redeemInKind(shares - shares / 2, address(this));
        assertGt(eth.balanceOf(address(this)), beforeEth);
    }

    function testLaunchSeedLeavesPoolsUsableForNextDepositor() public {
        address[] memory assets = new address[](3);
        assets[0] = address(eth);
        assets[1] = address(btc);
        assets[2] = address(link);
        uint16[] memory weights = new uint16[](3);
        weights[0] = 4000;
        weights[1] = 3500;
        weights[2] = 2500;
        usdc.approve(address(factory), 10_000e6);
        WaveVault vault = WaveVault(factory.createBasket("Launch basket", "LAUNCH", assets, weights, 1000, 10_000e6));
        usdc.approve(address(vault), 1000e6);
        uint256 shares = vault.deposit(1000e6, 990e18, address(this));
        assertGt(shares, 990e18);
    }

    function testAdapterRejectsUnsolicitedCallbackAndImpossibleMinimum() public {
        vm.expectRevert();
        adapter.unlockCallback("");
        usdc.approve(address(adapter), 100e6);
        vm.expectRevert();
        adapter.swap(address(usdc), address(eth), 100e6, 1e18, address(this));
    }

    function testLaterRebalanceSwapFailureRollsBackEarlierTrades() public {
        WaveVault vault = createBasket();
        factory.setRebalancer(address(this));
        usdc.approve(address(adapter), 1_000_000e6);
        adapter.swap(address(usdc), address(eth), 1_000_000e6, 0, address(this));
        uint256 ethBefore = eth.balanceOf(address(vault));
        uint256 btcBefore = btc.balanceOf(address(vault));
        uint256 linkBefore = link.balanceOf(address(vault));
        uint256 cashBefore = usdc.balanceOf(address(vault));
        uint16[] memory weights = new uint16[](3);
        weights[0] = 4500;
        weights[1] = 3000;
        weights[2] = 2500;
        vm.expectRevert();
        vault.applyRebalance(weights, 100, bytes32(0));
        assertEq(eth.balanceOf(address(vault)), ethBefore);
        assertEq(btc.balanceOf(address(vault)), btcBefore);
        assertEq(link.balanceOf(address(vault)), linkBefore);
        assertEq(usdc.balanceOf(address(vault)), cashBefore);
        assertEq(vault.targetWeights()[0], 4000);
        assertEq(vault.rebalanceCount(), 0);
        assertEq(vault.lastRebalance(), 0);
    }

    function testFuzzValidRebalanceHonorsNavAndTurnoverLimits(uint16 raw) public {
        WaveVault vault = createBasket();
        factory.setRebalancer(address(this));
        uint16 delta = uint16(bound(uint256(raw), 300, 1000));
        uint16[] memory weights = new uint16[](3);
        weights[0] = 4000 + delta;
        weights[1] = 3500 - delta;
        weights[2] = 2500;
        (uint256 beforeNav,) = vault.navUsdc();
        vault.applyRebalance(weights, 100, bytes32(0));
        (uint256 afterNav, bool healthy) = vault.navUsdc();
        assertTrue(healthy);
        assertGe(afterNav, beforeNav * 99 / 100);
        assertLe(vault.rebalanceAt(0).turnoverBps, 2000);
    }
}
