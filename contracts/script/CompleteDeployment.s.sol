// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {Script} from "forge-std/Script.sol";

/// @notice Operational continuation only. No production contract code is changed.
/// Inputs are the exact unsubmitted nonce-20..42 operations from the preserved plan.
contract CompleteDeployment is Script {
    error OperationFailed(uint256 nonce, bytes reason);
    error CreationFailed(uint256 nonce);

    function run() external {
        address admin = vm.envAddress("DEPLOYER_ADDRESS");
        require(block.chainid == 11155111, "Sepolia only");
        require(admin == address(0xDe25D83481c0c2A711397c44eE3317dD826952D5), "Wrong sender");
        string memory input = vm.readFile("../deployments/nonce20-operations-NOT-DEPLOYED.json");
        require(vm.parseJsonUint(input, ".chainId") == block.chainid, "Wrong input chain");
        require(vm.parseJsonUint(input, ".startNonce") == 20 && vm.parseJsonUint(input, ".count") == 23, "Wrong range");
        vm.startBroadcast(admin);
        for (uint256 nonce = 20; nonce <= 42; nonce++) {
            string memory path = string.concat(".op", vm.toString(nonce));
            bytes memory data = vm.parseJsonBytes(input, string.concat(path, ".input"));
            if (vm.parseJsonBool(input, string.concat(path, ".create"))) {
                address created;
                assembly ("memory-safe") {
                    created := create(0, add(data, 32), mload(data))
                }
                if (created == address(0)) revert CreationFailed(nonce);
                require(created == vm.parseJsonAddress(input, string.concat(path, ".predicted")), "Creation mismatch");
            } else {
                address target = vm.parseJsonAddress(input, string.concat(path, ".target"));
                require(target != address(0), "Missing target");
                (bool ok, bytes memory result) = target.call(data);
                if (!ok) revert OperationFailed(nonce, result);
            }
        }
        vm.stopBroadcast();
        address factory = vm.parseJsonAddress(input, ".factory");
        address flagship = vm.parseJsonAddress(input, ".flagship");
        address receiver = vm.parseJsonAddress(input, ".receiver");
        require(factory.code.length > 0 && flagship.code.length > 0 && receiver.code.length > 0, "Missing core code");
        (bool basketOk, bytes memory basket) = factory.staticcall(abi.encodeWithSignature("baskets(uint256)", 0));
        require(basketOk && abi.decode(basket, (address)) == flagship, "Wrong flagship");
        (bool receiverOk, bytes memory actualReceiver) = factory.staticcall(abi.encodeWithSignature("rebalancer()"));
        require(receiverOk && abi.decode(actualReceiver, (address)) == receiver, "Wrong receiver");
    }
}
