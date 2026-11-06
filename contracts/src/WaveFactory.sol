// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AssetRegistry} from "./AssetRegistry.sol";
import {IWaveSwapAdapter} from "./IWaveSwapAdapter.sol";
import {WaveVault} from "./WaveVault.sol";

contract WaveVaultDeployer {
    address private immutable factory;

    constructor() {
        factory = msg.sender;
    }

    function deploy(
        string memory name,
        string memory symbol,
        address[] memory assets,
        uint16[] memory targets,
        WaveVault.Config memory config
    ) external returns (WaveVault) {
        if (msg.sender != factory) revert();
        return new WaveVault(name, symbol, assets, targets, config);
    }
}

contract WaveFactory is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;
    AssetRegistry public immutable registry;
    IWaveSwapAdapter public immutable adapter;
    IERC20 public immutable usdc;
    address public immutable treasury;
    address public rebalancer;
    WaveVaultDeployer private immutable deployer;
    address[] public baskets;
    mapping(address => bool) public isBasket;
    event BasketCreated(
        address indexed vault, address indexed creator, address[] assets, uint16[] targetBps, uint16 perfFeeBps
    );
    event RebalancerSet(address indexed receiver);
    error InvalidConfiguration();

    constructor(AssetRegistry r, IWaveSwapAdapter a, IERC20 settlement, address treasury_, address admin)
        Ownable(admin)
    {
        if (
            address(r).code.length == 0 || address(a).code.length == 0 || address(settlement).code.length == 0
                || treasury_ == address(0)
        ) revert InvalidConfiguration();
        deployer = new WaveVaultDeployer();
        registry = r;
        adapter = a;
        usdc = settlement;
        treasury = treasury_;
    }

    function setRebalancer(address receiver) external onlyOwner {
        if (receiver.code.length == 0) revert InvalidConfiguration();
        rebalancer = receiver;
        emit RebalancerSet(receiver);
    }

    function basketsLength() external view returns (uint256) {
        return baskets.length;
    }

    function createBasket(
        string calldata name,
        string calldata symbol,
        address[] calldata assets,
        uint16[] calldata targetBps,
        uint16 fee,
        uint256 seed
    ) external nonReentrant returns (address) {
        if (
            bytes(name).length == 0 || bytes(name).length > 64 || bytes(symbol).length == 0 || bytes(symbol).length > 12
                || fee > 2_000 || seed < 10e6
        ) revert InvalidConfiguration();
        WaveVault vault = deployer.deploy(
            name,
            symbol,
            assets,
            targetBps,
            WaveVault.Config(address(this), msg.sender, registry, adapter, usdc, treasury, fee)
        );
        uint256 beforeBalance = usdc.balanceOf(address(this));
        usdc.safeTransferFrom(msg.sender, address(this), seed);
        uint256 received = usdc.balanceOf(address(this)) - beforeBalance;
        usdc.forceApprove(address(vault), received);
        vault.deposit(received, 0, msg.sender);
        usdc.forceApprove(address(vault), 0);
        isBasket[address(vault)] = true;
        baskets.push(address(vault));
        emit BasketCreated(address(vault), msg.sender, assets, targetBps, fee);
        return address(vault);
    }
}
