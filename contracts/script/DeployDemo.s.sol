// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {Script} from "forge-std/Script.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {WaveFactory} from "../src/WaveFactory.sol";
import {WaveVault} from "../src/WaveVault.sol";
import {WaveSwapAdapter} from "../src/WaveSwapAdapter.sol";
import {WaveRebalanceReceiver} from "../src/WaveRebalanceReceiver.sol";
import {NavGuardHook} from "../src/NavGuardHook.sol";
import {DemoToken, DemoFeed} from "../src/mocks/DemoAssets.sol";
import {DemoLiquiditySeeder} from "../src/mocks/DemoLiquiditySeeder.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @notice Testnet/demo deployment only. No production deployment is implied.
contract DemoForwarder {
    function forward(address receiver, bytes calldata metadata, bytes calldata report) external {
        WaveRebalanceReceiver(receiver).onReport(metadata, report);
    }
}

contract DeployDemo is Script {
    AssetRegistry registry;
    WaveSwapAdapter adapter;
    DemoLiquiditySeeder seeder;
    IPoolManager manager;
    address admin;
    DemoToken usdc;
    DemoToken eth;
    DemoToken btc;
    DemoToken link;

    function _pair(address a, address b, address hook, uint24 fee) internal pure returns (PoolKey memory) {
        return a < b
            ? PoolKey(Currency.wrap(a), Currency.wrap(b), fee, 60, IHooks(hook))
            : PoolKey(Currency.wrap(b), Currency.wrap(a), fee, 60, IHooks(hook));
    }

    function _seed(PoolKey memory key, uint256 p0, uint256 p1, uint256 settlementAmount) internal {
        address a = Currency.unwrap(key.currency0);
        address b = Currency.unwrap(key.currency1);
        uint160 sqrtP = uint160(
            Math.sqrt(
                Math.mulDiv(p0 * 10 ** IERC20Metadata(b).decimals(), 1 << 128, p1 * 10 ** IERC20Metadata(a).decimals())
            ) << 32
        );
        manager.initialize(key, sqrtP);
        adapter.setPool(key);
        IERC20(a).approve(address(seeder), type(uint256).max);
        IERC20(b).approve(address(seeder), type(uint256).max);
        uint256 liq = a == address(usdc)
            ? Math.mulDiv(settlementAmount, sqrtP, 1 << 96)
            : Math.mulDiv(settlementAmount, 1 << 96, sqrtP);
        seeder.seed(key, int256(liq));
    }

    function run() external {
        require(block.chainid == 31337 || block.chainid == 11155111, "Sepolia or local only");
        if (block.chainid == 31337) {
            uint256 key = vm.envUint("DEPLOYER_PRIVATE_KEY");
            admin = vm.addr(key);
            vm.startBroadcast(key);
        } else {
            admin = vm.envAddress("DEPLOYER_ADDRESS");
            vm.startBroadcast(admin);
        }
        usdc = new DemoToken("Wave Test USDC", "mUSDC", 6, 1_000_000_000e6);
        eth = new DemoToken("Wave Test WETH", "mWETH", 18, 1_000_000e18);
        btc = new DemoToken("Wave Test WBTC", "mWBTC", 8, 1_000_000e8);
        link = new DemoToken("Wave Test LINK", "mLINK", 18, 100_000_000e18);
        registry = new AssetRegistry(admin);
        address[] memory feeds = new address[](4);
        bool realFeeds = block.chainid == 11155111 && vm.envOr("USE_CHAINLINK_FEEDS", false);
        if (realFeeds) {
            feeds[0] = vm.envAddress("USDC_FEED");
            feeds[1] = vm.envAddress("ETH_FEED");
            feeds[2] = vm.envAddress("BTC_FEED");
            feeds[3] = vm.envAddress("LINK_FEED");
        } else {
            feeds[0] = address(new DemoFeed(1e8, admin));
            feeds[1] = address(new DemoFeed(2000e8, admin));
            feeds[2] = address(new DemoFeed(50000e8, admin));
            feeds[3] = address(new DemoFeed(10e8, admin));
        }
        address[] memory all = new address[](4);
        all[0] = address(usdc);
        all[1] = address(eth);
        all[2] = address(btc);
        all[3] = address(link);
        for (uint256 i; i < 4; i++) {
            registry.setAsset(all[i], feeds[i], i == 0 ? 108000 : 4500, 1, 1_000_000e8, true);
        }
        manager = block.chainid == 31337
            ? IPoolManager(address(new PoolManager(admin)))
            : IPoolManager(vm.envAddress("POOL_MANAGER"));
        adapter = new WaveSwapAdapter(manager, admin);
        seeder = new DemoLiquiditySeeder(manager, admin);
        usdc.faucet();
        eth.faucet();
        btc.faucet();
        link.faucet();
        for (uint256 i = 1; i < 4; i++) {
            PoolKey memory p = _pair(all[i], address(usdc), address(0), 3000);
            (uint256 p0, bool ok0) = registry.priceUsd(Currency.unwrap(p.currency0));
            (uint256 p1, bool ok1) = registry.priceUsd(Currency.unwrap(p.currency1));
            require(ok0 && ok1, "unhealthy feed");
            _seed(p, p0, p1, 100_000_000e6);
        }
        WaveFactory factory =
            new WaveFactory(registry, adapter, IERC20(address(usdc)), vm.envOr("TREASURY", admin), admin);
        address[] memory assets = new address[](3);
        assets[0] = address(eth);
        assets[1] = address(btc);
        assets[2] = address(link);
        uint16[] memory weights = new uint16[](3);
        weights[0] = 4000;
        weights[1] = 3500;
        weights[2] = 2500;
        usdc.approve(address(factory), 100_000e6);
        WaveVault vault = WaveVault(factory.createBasket("Wave Blue Chip", "FUND", assets, weights, 1000, 100_000e6));
        // Forge broadcasts salted creates through its canonical CREATE2 deployer.
        bytes32 initHash = keccak256(abi.encodePacked(type(NavGuardHook).creationCode, abi.encode(manager, admin)));
        bytes32 salt;
        address predicted;
        for (uint256 i;; i++) {
            salt = bytes32(i);
            predicted = address(
                uint160(
                    uint256(
                        keccak256(
                            abi.encodePacked(
                                bytes1(0xff), address(0x4e59b44847b379578588920cA78FbF26c0B4956C), salt, initHash
                            )
                        )
                    )
                )
            );
            if (uint160(predicted) & 0x3fff == 0x2080) break;
        }
        NavGuardHook hook = new NavGuardHook{salt: salt}(manager, admin);
        require(address(hook) == predicted, "CREATE2 deployer mismatch");
        PoolKey memory fundKey = _pair(address(vault), address(usdc), address(hook), 0x800000);
        hook.registerPool(fundKey, vault);
        uint256 shareUsd = vault.navPerShare();
        (uint256 usdcPrice,) = registry.priceUsd(address(usdc));
        shareUsd = Math.mulDiv(shareUsd, usdcPrice, 1e18);
        _seed(
            fundKey,
            Currency.unwrap(fundKey.currency0) == address(vault) ? shareUsd : usdcPrice,
            Currency.unwrap(fundKey.currency1) == address(vault) ? shareUsd : usdcPrice,
            25_000e6
        );
        address forwarder = block.chainid == 31337 ? address(new DemoForwarder()) : vm.envAddress("CRE_FORWARDER");
        bool simulation = block.chainid == 11155111 && vm.envOr("CRE_SIMULATION", true);
        bool fixtureIdentity = block.chainid == 31337 || simulation;
        bytes32 workflowId =
            fixtureIdentity ? vm.envOr("WORKFLOW_ID", bytes32(uint256(1))) : vm.envBytes32("WORKFLOW_ID");
        address author = fixtureIdentity ? vm.envOr("WORKFLOW_AUTHOR", admin) : vm.envAddress("WORKFLOW_AUTHOR");
        bytes10 workflowName = bytes10(
            fixtureIdentity ? vm.envOr("WORKFLOW_NAME", bytes32(bytes10("wave"))) : vm.envBytes32("WORKFLOW_NAME")
        );
        WaveRebalanceReceiver receiver =
            new WaveRebalanceReceiver(forwarder, factory, simulation, workflowId, author, workflowName);
        factory.setRebalancer(address(receiver));
        vm.stopBroadcast();
        string memory obj = "deployment";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeString(obj, "name", block.chainid == 31337 ? "Local demo" : "Ethereum Sepolia");
        vm.serializeString(obj, "oracleMode", realFeeds ? "chainlink" : "demo");
        vm.serializeString(obj, "deployBlock", vm.toString(block.number));
        vm.serializeAddress(obj, "factory", address(factory));
        vm.serializeAddress(obj, "flagship", address(vault));
        vm.serializeAddress(obj, "adapter", address(adapter));
        vm.serializeAddress(obj, "hook", address(hook));
        vm.serializeAddress(obj, "receiver", address(receiver));
        vm.serializeAddress(obj, "registry", address(registry));
        vm.serializeAddress(obj, "forwarder", forwarder);
        vm.serializeAddress(obj, "poolManager", address(manager));
        vm.serializeAddress(obj, "usdc", address(usdc));
        vm.serializeAddress(obj, "eth", address(eth));
        vm.serializeAddress(obj, "btc", address(btc));
        vm.serializeAddress(obj, "link", address(link));
        vm.serializeAddress(obj, "seeder", address(seeder));
        vm.serializeAddress(obj, "usdcFeed", feeds[0]);
        vm.serializeAddress(obj, "ethFeed", feeds[1]);
        vm.serializeAddress(obj, "btcFeed", feeds[2]);
        string memory json = vm.serializeAddress(obj, "linkFeed", feeds[3]);
        vm.writeJson(json, "../deployments/demo.json");
    }
}
