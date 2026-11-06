// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

interface IPriceFeed {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
}

contract AssetRegistry is Ownable2Step {
    struct Asset {
        address feed;
        uint32 maxStaleness;
        uint8 tokenDecimals;
        uint8 feedDecimals;
        int256 minAnswer;
        int256 maxAnswer;
        bool allowed;
    }
    mapping(address => Asset) public assets;
    event AssetConfigured(address indexed token, address indexed feed, bool allowed);
    error InvalidAsset();
    constructor(address admin) Ownable(admin) {}

    function setAsset(
        address token,
        address feed,
        uint32 maxStaleness,
        int256 minAnswer,
        int256 maxAnswer,
        bool isAllowed
    ) external onlyOwner {
        if (
            token.code.length == 0 || feed.code.length == 0 || maxStaleness == 0 || minAnswer <= 0
                || maxAnswer < minAnswer
        ) revert InvalidAsset();
        uint8 td = IERC20Metadata(token).decimals();
        uint8 fd = IPriceFeed(feed).decimals();
        if (td > 18 || fd > 18) revert InvalidAsset();
        assets[token] = Asset(feed, maxStaleness, td, fd, minAnswer, maxAnswer, isAllowed);
        emit AssetConfigured(token, feed, isAllowed);
    }

    function allowed(address token) external view returns (bool) {
        return assets[token].allowed;
    }

    function priceUsd(address token) public view returns (uint256 price18, bool healthy) {
        Asset memory a = assets[token];
        if (!a.allowed) return (0, false);
        try IPriceFeed(a.feed).latestRoundData() returns (
            uint80 roundId, int256 answer, uint256, uint256 updatedAt, uint80 answeredInRound
        ) {
            healthy = answer > 0 && answer >= a.minAnswer && answer <= a.maxAnswer && updatedAt != 0
                && updatedAt <= block.timestamp && block.timestamp - updatedAt <= a.maxStaleness
                && answeredInRound >= roundId;
            if (healthy) price18 = uint256(answer) * 10 ** (18 - a.feedDecimals);
        } catch {
            return (0, false);
        }
    }

    function valueUsd(address token, uint256 amount) external view returns (uint256 value18, bool healthy) {
        (uint256 p, bool ok) = priceUsd(token);
        return (Math.mulDiv(amount, p, 10 ** assets[token].tokenDecimals), ok);
    }
}
