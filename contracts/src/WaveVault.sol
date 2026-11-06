// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {AssetRegistry} from "./AssetRegistry.sol";
import {IWaveSwapAdapter} from "./IWaveSwapAdapter.sol";

interface IWaveFactory {
    function rebalancer() external view returns (address);
}

contract WaveVault is ERC20, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;
    uint16 public constant MAX_WEIGHT_BPS = 5_000;
    uint16 public constant MAX_SLIPPAGE_BPS = 100;
    uint16 public constant WITHDRAWAL_FEE_BPS = 10;
    uint16 public constant MAX_TURNOVER_BPS = 2_000;
    uint256 public constant WEIGHT_TIMELOCK = 10 minutes;
    uint256 public constant MIN_INTERVAL = 5 minutes;
    uint256 public constant DEAD_SHARES = 1_000;
    address public constant DEAD = address(0xdEaD);
    AssetRegistry public immutable registry;
    IWaveSwapAdapter public immutable adapter;
    IERC20 public immutable usdc;
    address public immutable treasury;
    address public immutable factory;
    uint16 public immutable perfFeeBps;
    address[] private tokens;
    uint16[] private targets;
    uint16[] private proposed;
    uint256 public weightsEta;
    uint256 public hwm = 1e18;
    uint256 public performanceFeeSharesMinted;
    uint256 public lastRebalance;
    uint256 public rebalanceCount;

    struct RebalanceRecord {
        uint256 id;
        uint64 timestamp;
        uint16[] oldBps;
        uint16[] newBps;
        uint256 navBefore;
        uint256 navAfter;
        uint256 turnoverBps;
        bytes32 reasonHash;
    }
    mapping(uint256 => RebalanceRecord) private records;
    error InvalidAllocation();
    error UnhealthyOracle();
    error Slippage();
    error Unauthorized();
    error InvalidOperation();
    error Timelocked();
    error TurnoverExceeded();
    error Interval();
    error ExpiredRecord();
    event Deposited(
        address indexed user, address indexed receiver, uint256 usdcIn, uint256 valueAdded6, uint256 shares
    );
    event Redeemed(
        address indexed user, address indexed receiver, uint256 shares, uint256 usdcOut, uint256 protocolFee
    );
    event RedeemedInKind(
        address indexed user, address indexed receiver, uint256 shares, uint256[] amounts, uint256 protocolFeeShares
    );
    event PerformanceFeeAccrued(uint256 feeShares, uint256 oldHwm, uint256 newHwm);
    event WeightsProposed(uint16[] bps, uint256 eta);
    event WeightsExecuted(uint16[] bps);
    event WeightsCancelled();
    event Rebalanced(
        uint256 indexed id,
        uint16[] oldBps,
        uint16[] newBps,
        uint256 navBefore,
        uint256 navAfter,
        uint256 turnoverBps,
        bytes32 reasonHash
    );

    struct Config {
        address factory;
        address creator;
        AssetRegistry registry;
        IWaveSwapAdapter adapter;
        IERC20 usdc;
        address treasury;
        uint16 perfFeeBps;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        address[] memory assets_,
        uint16[] memory targetBps_,
        Config memory c
    ) ERC20(name_, symbol_) Ownable(c.creator) {
        registry = c.registry;
        adapter = c.adapter;
        usdc = c.usdc;
        treasury = c.treasury;
        factory = c.factory;
        perfFeeBps = c.perfFeeBps;
        tokens = assets_;
        _validate(targetBps_);
        targets = targetBps_;
    }

    function assetList() external view returns (address[] memory) {
        return tokens;
    }

    function targetWeights() external view returns (uint16[] memory) {
        return targets;
    }

    function pendingWeights() external view returns (uint16[] memory, uint256) {
        return (proposed, weightsEta);
    }

    function _validate(uint16[] memory bps) internal view {
        if (bps.length != tokens.length || bps.length < 2 || bps.length > 4) revert InvalidAllocation();
        uint256 sum;
        for (uint256 i; i < bps.length; i++) {
            if (bps[i] == 0 || bps[i] > MAX_WEIGHT_BPS || !registry.allowed(tokens[i])) revert InvalidAllocation();
            for (uint256 j; j < i; j++) {
                if (tokens[j] == tokens[i]) revert InvalidAllocation();
            }
            sum += bps[i];
        }
        if (sum != 10_000) revert InvalidAllocation();
    }

    function _value(address token, uint256 amount) internal view returns (uint256) {
        (uint256 usd18, bool healthy) = registry.valueUsd(token, amount);
        (uint256 settlementPrice, bool settlementHealthy) = registry.priceUsd(address(usdc));
        if (!healthy || !settlementHealthy) revert UnhealthyOracle();
        return Math.mulDiv(usd18, 1e6, settlementPrice);
    }

    function navUsdc() public view returns (uint256 nav6, bool healthy) {
        (uint256 settlementPrice, bool ok) = registry.priceUsd(address(usdc));
        if (!ok) return (0, false);
        bool hasUsdc;
        for (uint256 i; i < tokens.length; i++) {
            (uint256 value, bool good) = registry.valueUsd(tokens[i], IERC20(tokens[i]).balanceOf(address(this)));
            if (!good) return (0, false);
            nav6 += Math.mulDiv(value, 1e6, settlementPrice);
            if (tokens[i] == address(usdc)) hasUsdc = true;
        }
        if (!hasUsdc) nav6 += usdc.balanceOf(address(this));
        return (nav6, true);
    }

    function navPerShare() public view returns (uint256) {
        (uint256 nav, bool healthy) = navUsdc();
        if (!healthy) revert UnhealthyOracle();
        return totalSupply() == 0 ? 1e18 : Math.mulDiv(nav, 1e30, totalSupply());
    }

    function holdings()
        external
        view
        returns (
            address[] memory assets_,
            uint256[] memory bal,
            uint256[] memory usd18,
            uint16[] memory actualBps,
            uint16[] memory targetBps
        )
    {
        assets_ = tokens;
        targetBps = targets;
        bal = new uint256[](tokens.length);
        usd18 = new uint256[](tokens.length);
        actualBps = new uint16[](tokens.length);
        (uint256 nav, bool healthy) = navUsdc();
        for (uint256 i; i < tokens.length; i++) {
            bal[i] = IERC20(tokens[i]).balanceOf(address(this));
            (usd18[i],) = registry.valueUsd(tokens[i], bal[i]);
            if (healthy && nav > 0) actualBps[i] = uint16(Math.mulDiv(_value(tokens[i], bal[i]), 10_000, nav));
        }
    }

    function _healthyNav() internal view returns (uint256 nav) {
        bool ok;
        (nav, ok) = navUsdc();
        if (!ok) revert UnhealthyOracle();
    }

    function _swap(address a, address b, uint256 amount, uint16 slippage) internal returns (uint256) {
        if (amount == 0 || a == b) return amount;
        (uint256 usd, bool healthy) = registry.valueUsd(a, amount);
        (uint256 p, bool ok) = registry.priceUsd(b);
        (,, uint8 decimals_,,,,) = registry.assets(b);
        if (!healthy || !ok) revert UnhealthyOracle();
        uint256 quote = Math.mulDiv(usd, 10 ** decimals_, p);
        if (quote == 0) revert Slippage();
        IERC20(a).forceApprove(address(adapter), amount);
        uint256 result = adapter.swap(a, b, amount, Math.mulDiv(quote, 10_000 - slippage, 10_000), address(this));
        IERC20(a).forceApprove(address(adapter), 0);
        return result;
    }

    function deposit(uint256 amount, uint256 minShares, address receiver)
        external
        nonReentrant
        returns (uint256 shares)
    {
        if (amount == 0 || receiver == address(0) || receiver == DEAD) {
            revert InvalidOperation();
        }
        _crystallize();
        uint256 navBefore = _healthyNav();
        uint256 supply = totalSupply();
        if (supply > 0 && navBefore == 0) revert InvalidOperation();
        uint256 beforeBalance = usdc.balanceOf(address(this));
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = usdc.balanceOf(address(this)) - beforeBalance;
        if (supply == 0 && received < 10e6) revert InvalidOperation();
        for (uint256 i; i < tokens.length; i++) {
            _swap(address(usdc), tokens[i], Math.mulDiv(received, targets[i], 10_000), MAX_SLIPPAGE_BPS);
        }
        uint256 navAfter = _healthyNav();
        if (navAfter <= navBefore) revert Slippage();
        uint256 added = navAfter - navBefore;
        if (added < Math.mulDiv(received, 10_000 - MAX_SLIPPAGE_BPS, 10_000)) revert Slippage();
        shares = supply == 0 ? added * 1e12 : Math.mulDiv(added, supply, navBefore);
        if (supply == 0) {
            if (shares <= DEAD_SHARES) revert InvalidOperation();
            _mint(DEAD, DEAD_SHARES);
            shares -= DEAD_SHARES;
        }
        if (shares == 0 || shares < minShares) revert Slippage();
        _mint(receiver, shares);
        emit Deposited(msg.sender, receiver, received, added, shares);
    }

    function redeem(uint256 shares, uint256 minOut, address receiver) external nonReentrant returns (uint256 output) {
        _checkExit(shares, receiver);
        _crystallize();
        uint256 supply = totalSupply();
        _healthyNav();
        uint256 settlementSlice = Math.mulDiv(usdc.balanceOf(address(this)), shares, supply);
        uint256 beforeSettlement = usdc.balanceOf(address(this));
        _burn(msg.sender, shares);
        for (uint256 i; i < tokens.length; i++) {
            if (tokens[i] != address(usdc)) {
                _swap(
                    tokens[i],
                    address(usdc),
                    Math.mulDiv(IERC20(tokens[i]).balanceOf(address(this)), shares, supply),
                    MAX_SLIPPAGE_BPS
                );
            }
        }
        uint256 gross = settlementSlice + usdc.balanceOf(address(this)) - beforeSettlement;
        uint256 fee = Math.mulDiv(gross, WITHDRAWAL_FEE_BPS, 10_000);
        output = gross - fee;
        if (output < minOut || output == 0) revert Slippage();
        usdc.safeTransfer(treasury, fee);
        usdc.safeTransfer(receiver, output);
        emit Redeemed(msg.sender, receiver, shares, output, fee);
    }

    function redeemInKind(uint256 shares, address receiver) external nonReentrant returns (uint256[] memory amounts) {
        _checkExit(shares, receiver);
        // Healthy exits share the settlement path's fee accounting. Unhealthy feeds
        // leave the full net pro-rata exit available: no reserve or deferred claim.
        (, bool healthy) = navUsdc();
        if (healthy) _crystallize();
        uint256 supply = totalSupply();
        uint256 feeShares = Math.mulDiv(shares, WITHDRAWAL_FEE_BPS, 10_000);
        _transfer(msg.sender, treasury, feeShares);
        uint256 burnShares = shares - feeShares;
        _burn(msg.sender, burnShares);
        bool includesUsdc;
        amounts = new uint256[](tokens.length + 1);
        for (uint256 i; i < tokens.length; i++) {
            amounts[i] = Math.mulDiv(IERC20(tokens[i]).balanceOf(address(this)), burnShares, supply);
            IERC20(tokens[i]).safeTransfer(receiver, amounts[i]);
            if (tokens[i] == address(usdc)) includesUsdc = true;
        }
        if (!includesUsdc) {
            amounts[tokens.length] = Math.mulDiv(usdc.balanceOf(address(this)), burnShares, supply);
            usdc.safeTransfer(receiver, amounts[tokens.length]);
        }
        emit RedeemedInKind(msg.sender, receiver, shares, amounts, feeShares);
    }

    function _checkExit(uint256 shares, address receiver) internal view {
        if (
            shares == 0 || receiver == address(0) || receiver == address(this) || receiver == DEAD
                || shares > balanceOf(msg.sender)
        ) revert InvalidOperation();
    }

    function crystallizeFees() external nonReentrant {
        _crystallize();
    }

    /// @notice Oracle-valued settlement entitlement after pending creator dilution and withdrawal fee.
    /// Swap slippage is excluded; callers must apply their own execution tolerance.
    function previewRedeem(uint256 shares) external view returns (uint256 netUsdc, uint256 pendingFeeShares) {
        uint256 nav = _healthyNav();
        uint256 supply = totalSupply();
        if (supply == 0) return (0, 0);
        pendingFeeShares = _pendingFeeShares(nav, supply);
        uint256 gross = Math.mulDiv(nav, shares, supply + pendingFeeShares);
        netUsdc = gross - Math.mulDiv(gross, WITHDRAWAL_FEE_BPS, 10_000);
    }

    function _pendingFeeShares(uint256 nav, uint256 supply) internal view returns (uint256) {
        uint256 price = Math.mulDiv(nav, 1e30, supply);
        if (price <= hwm) return 0;
        uint256 gainValue = Math.mulDiv(price - hwm, supply, 1e30);
        uint256 feeValue = Math.mulDiv(gainValue, perfFeeBps, 10_000);
        return feeValue == 0 ? 0 : Math.mulDiv(feeValue, supply, nav - feeValue);
    }

    function _crystallize() internal {
        if (totalSupply() == 0) return;
        uint256 nav = _healthyNav();
        uint256 supply = totalSupply();
        uint256 price = Math.mulDiv(nav, 1e30, supply);
        if (price <= hwm) return;
        uint256 feeShares = _pendingFeeShares(nav, supply);
        uint256 old = hwm;
        if (feeShares > 0) {
            performanceFeeSharesMinted += feeShares;
            _mint(owner(), feeShares);
        }
        hwm = Math.mulDiv(nav, 1e30, totalSupply());
        emit PerformanceFeeAccrued(feeShares, old, hwm);
    }

    function proposeWeights(uint16[] calldata bps) external onlyOwner {
        _validate(bps);
        proposed = bps;
        weightsEta = block.timestamp + WEIGHT_TIMELOCK;
        emit WeightsProposed(bps, weightsEta);
    }

    function cancelWeights() external onlyOwner {
        delete proposed;
        weightsEta = 0;
        emit WeightsCancelled();
    }

    function executeWeights() external {
        if (weightsEta == 0 || block.timestamp < weightsEta) revert Timelocked();
        _validate(proposed);
        targets = proposed;
        delete proposed;
        weightsEta = 0;
        lastRebalance = block.timestamp;
        emit WeightsExecuted(targets);
    }

    function applyRebalance(uint16[] calldata bps, uint16 slippage, bytes32 reason) external nonReentrant {
        if (msg.sender != IWaveFactory(factory).rebalancer()) revert Unauthorized();
        if (weightsEta != 0) revert Timelocked();
        if (lastRebalance != 0 && block.timestamp < lastRebalance + MIN_INTERVAL) revert Interval();
        _validate(bps);
        if (slippage > MAX_SLIPPAGE_BPS) revert Slippage();
        _crystallize();
        uint256 nav = _healthyNav();
        if (nav == 0) revert InvalidOperation();
        uint256 distance;
        uint256[] memory values = new uint256[](tokens.length);
        bool hasSettlement;
        for (uint256 i; i < tokens.length; i++) {
            values[i] = _value(tokens[i], IERC20(tokens[i]).balanceOf(address(this)));
            uint256 actual = Math.mulDiv(values[i], 10_000, nav);
            distance += actual > bps[i] ? actual - bps[i] : bps[i] - actual;
            if (tokens[i] == address(usdc)) hasSettlement = true;
        }
        if (!hasSettlement) distance += Math.mulDiv(usdc.balanceOf(address(this)), 10_000, nav);
        uint256 turnover = (distance + 1) / 2;
        if (turnover > MAX_TURNOVER_BPS) revert TurnoverExceeded();
        for (uint256 i; i < tokens.length; i++) {
            uint256 wanted = Math.mulDiv(nav, bps[i], 10_000);
            if (tokens[i] != address(usdc) && values[i] > wanted) {
                uint256 amount = Math.mulDiv(IERC20(tokens[i]).balanceOf(address(this)), values[i] - wanted, values[i]);
                _swap(tokens[i], address(usdc), amount, slippage);
            }
        }
        uint256 budget = usdc.balanceOf(address(this));
        for (uint256 i; i < tokens.length; i++) {
            if (tokens[i] == address(usdc)) {
                uint256 reserve = Math.mulDiv(nav, bps[i], 10_000);
                budget = budget > reserve ? budget - reserve : 0;
            }
        }
        uint256 totalDeficit;
        for (uint256 i; i < tokens.length; i++) {
            if (tokens[i] != address(usdc)) {
                uint256 wanted = Math.mulDiv(nav, bps[i], 10_000);
                if (wanted > values[i]) totalDeficit += wanted - values[i];
            }
        }
        for (uint256 i; i < tokens.length; i++) {
            if (tokens[i] != address(usdc)) {
                uint256 wanted = Math.mulDiv(nav, bps[i], 10_000);
                if (wanted > values[i] && totalDeficit > 0) {
                    _swap(
                        address(usdc),
                        tokens[i],
                        Math.mulDiv(Math.min(budget, totalDeficit), wanted - values[i], totalDeficit),
                        slippage
                    );
                }
            }
        }
        uint256 afterNav = _healthyNav();
        if (afterNav < Math.mulDiv(nav, 10_000 - slippage, 10_000)) revert Slippage();
        uint16[] memory old = targets;
        targets = bps;
        lastRebalance = block.timestamp;
        uint256 id = rebalanceCount++;
        records[id % 32] = RebalanceRecord(id, uint64(block.timestamp), old, bps, nav, afterNav, turnover, reason);
        emit Rebalanced(id, old, bps, nav, afterNav, turnover, reason);
    }

    function rebalanceAt(uint256 id) external view returns (RebalanceRecord memory) {
        if (id >= rebalanceCount || rebalanceCount - id > 32) revert ExpiredRecord();
        return records[id % 32];
    }
}
