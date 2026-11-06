// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {WaveFactory} from "./WaveFactory.sol";
import {WaveVault} from "./WaveVault.sol";

interface IReceiver is IERC165 {
    function onReport(bytes calldata metadata, bytes calldata report) external;
}

/// @notice Disposable simulation deployments must not be represented as production-authenticated workflows.
contract WaveRebalanceReceiver is ERC165, IReceiver {
    address public immutable forwarder;
    bool public immutable simulationMode;
    WaveFactory public immutable factory;
    bytes32 public immutable expectedWorkflowId;
    address public immutable expectedAuthor;
    bytes10 public immutable expectedWorkflowName;
    uint64 public immutable maxReportAge;
    mapping(address => uint64) public lastObservation;
    mapping(address => uint64) public lastNonce;
    mapping(bytes32 => bool) public consumed;
    error InvalidReport();
    event ReportAccepted(address indexed vault, uint64 nonce, uint64 observedAt, bytes32 reasonHash);

    constructor(
        address forwarder_,
        WaveFactory factory_,
        bool simulation_,
        bytes32 workflowId,
        address author,
        bytes10 workflowName,
        uint64 maxReportAge_
    ) {
        if (
            forwarder_ == address(0) || maxReportAge_ == 0 || maxReportAge_ > 15 minutes
                || (simulation_ && block.chainid != 31337 && block.chainid != 11155111)
                || (!simulation_ && (workflowId == bytes32(0) || author == address(0) || workflowName == bytes10(0)))
        ) revert InvalidReport();
        simulationMode = simulation_;
        forwarder = forwarder_;
        factory = factory_;
        expectedWorkflowId = workflowId;
        expectedAuthor = author;
        expectedWorkflowName = workflowName;
        maxReportAge = maxReportAge_;
    }

    function supportsInterface(bytes4 id) public view override(ERC165, IERC165) returns (bool) {
        return id == type(IReceiver).interfaceId || super.supportsInterface(id);
    }

    function onReport(bytes calldata metadata, bytes calldata report) external {
        if (msg.sender != forwarder) revert InvalidReport();
        if (!simulationMode) {
            if (
                (metadata.length != 62 && metadata.length != 64) || bytes32(metadata[:32]) != expectedWorkflowId
                    || bytes10(metadata[32:42]) != expectedWorkflowName
                    || address(bytes20(metadata[42:62])) != expectedAuthor
            ) revert InvalidReport();
        }
        // Current CRE simulation forwarders omit identity metadata. This immutable mode is testnet-only.
        (address vault, uint64 nonce, uint16[] memory bps, uint64 asOf, bytes32 reason) =
            abi.decode(report, (address, uint64, uint16[], uint64, bytes32));
        bytes32 reportHash = keccak256(report);
        if (
            !factory.isBasket(vault) || nonce != lastNonce[vault] + 1 || asOf > block.timestamp
                || block.timestamp - asOf > maxReportAge || asOf <= lastObservation[vault] || consumed[reportHash]
        ) revert InvalidReport();
        // Effects roll back if the vault rejects execution, so failed reports remain retryable.
        lastObservation[vault] = asOf;
        lastNonce[vault] = nonce;
        consumed[reportHash] = true;
        WaveVault(vault).applyRebalance(bps, 100, reason);
        emit ReportAccepted(vault, nonce, asOf, reason);
    }
}
