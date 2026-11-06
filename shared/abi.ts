import { parseAbi } from "viem";
export const factoryAbi = parseAbi([
  "function basketsLength() view returns (uint256)",
  "function baskets(uint256) view returns (address)",
  "function isBasket(address) view returns (bool)",
  "function createBasket(string name,string symbol,address[] assets,uint16[] targetBps,uint16 fee,uint256 seed) returns (address)",
  "event BasketCreated(address indexed vault,address indexed creator,address[] assets,uint16[] targetBps,uint16 perfFeeBps)",
]);
export const vaultAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function owner() view returns (address)",
  "function hwm() view returns (uint256)",
  "function treasury() view returns (address)",
  "function performanceFeeSharesMinted() view returns (uint256)",
  "function previewRedeem(uint256 shares) view returns (uint256 netUsdc,uint256 pendingFeeShares)",
  "function perfFeeBps() view returns (uint16)",
  "function lastRebalance() view returns (uint256)",
  "function navUsdc() view returns (uint256 nav6,bool healthy)",
  "function navPerShare() view returns (uint256)",
  "function holdings() view returns (address[] assets,uint256[] bal,uint256[] usd18,uint16[] actualBps,uint16[] targetBps)",
  "function assetList() view returns (address[])",
  "function targetWeights() view returns (uint16[])",
  "function pendingWeights() view returns (uint16[],uint256)",
  "function deposit(uint256 amount,uint256 minShares,address receiver) returns (uint256)",
  "function redeem(uint256 shares,uint256 minOut,address receiver) returns (uint256)",
  "function redeemInKind(uint256 shares,address receiver) returns (uint256[])",
  "function proposeWeights(uint16[] bps)",
  "function executeWeights()",
  "function cancelWeights()",
  "function crystallizeFees()",
  "function rebalanceCount() view returns (uint256)",
  "function rebalanceAt(uint256 id) view returns ((uint256 id,uint64 timestamp,uint16[] oldBps,uint16[] newBps,uint256 navBefore,uint256 navAfter,uint256 turnoverBps,bytes32 reasonHash))",
  "event Rebalanced(uint256 indexed id,uint16[] oldBps,uint16[] newBps,uint256 navBefore,uint256 navAfter,uint256 turnoverBps,bytes32 reasonHash)",
]);
export const tokenAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function faucet()",
]);
export const receiverAbi = parseAbi([
  "function onReport(bytes metadata,bytes report)",
  "function lastObservation(address vault) view returns (uint64)",
  "function lastNonce(address vault) view returns (uint64)",
  "function maxReportAge() view returns (uint64)",
]);
export const adapterAbi = parseAbi([
  "function swap(address a,address b,uint256 amount,uint256 minOut,address recipient) returns(uint256)",
]);
export const hookAbi = parseAbi([
  "function poolSnapshot() view returns(uint256 spot18,uint256 nav18,bool healthy,uint24 sellFee,uint24 buyFee)",
  "function approvedPoolId() view returns(bytes32)",
  "event HookFeeApplied(bytes32 indexed id,uint256 spot18,uint256 nav18,bool sellingFund,uint24 fee)",
]);
