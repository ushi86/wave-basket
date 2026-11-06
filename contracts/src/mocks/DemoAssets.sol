// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract DemoToken is ERC20 {
    uint8 private immutable precision;
    mapping(address => uint256) public nextClaim;
    uint256 public immutable claimAmount;

    constructor(string memory n, string memory s, uint8 d, uint256 amount) ERC20(n, s) {
        precision = d;
        claimAmount = amount;
    }

    function decimals() public view override returns (uint8) {
        return precision;
    }

    function faucet() external {
        require(block.timestamp >= nextClaim[msg.sender], "Faucet: wait one hour");
        nextClaim[msg.sender] = block.timestamp + 1 hours;
        _mint(msg.sender, claimAmount);
    }
}

contract DemoFeed is Ownable {
    uint8 public constant decimals = 8;
    int256 public answer;
    uint256 public updatedAt;
    uint80 public round = 1;

    constructor(int256 p, address admin) Ownable(admin) {
        answer = p;
        updatedAt = block.timestamp;
    }

    function setAnswer(int256 p) external onlyOwner {
        answer = p;
        updatedAt = block.timestamp;
        round++;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (round, answer, updatedAt, updatedAt, round);
    }
}
