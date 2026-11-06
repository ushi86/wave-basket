import {
  decodeEventLog,
  encodeFunctionData,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import type { EvidenceIO } from "./evidence";
export const SEPOLIA_MANAGER = "0xe03a1074c86cfedd5c142c4f04f1a1536e203543";
const RPCS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.drpc.org",
];
export const receiptAbi = parseAbi([
  "event BasketCreated(address indexed vault,address indexed creator,address[] assets,uint16[] targetBps,uint16 perfFeeBps)",
  "event Deposited(address indexed user,address indexed receiver,uint256 usdcIn,uint256 valueAdded6,uint256 shares)",
  "event Redeemed(address indexed user,address indexed receiver,uint256 shares,uint256 usdcOut,uint256 protocolFee)",
  "event RedeemedInKind(address indexed user,address indexed receiver,uint256 shares,uint256[] amounts,uint256 protocolFeeShares)",
  "event Rebalanced(uint256 indexed id,uint16[] oldBps,uint16[] newBps,uint256 navBefore,uint256 navAfter,uint256 turnoverBps,bytes32 reasonHash)",
  "event ReportAccepted(address indexed vault,uint64 nonce,uint64 observedAt,bytes32 reasonHash)",
  "event HookFeeApplied(bytes32 indexed id,uint256 spot18,uint256 nav18,bool sellingFund,uint24 fee)",
  "event Swap(bytes32 indexed id,address indexed sender,int128 amount0,int128 amount1,uint160 sqrtPriceX96,uint128 liquidity,int24 tick,uint24 fee)",
]);
export type Deployment = {
  chainId: number;
  factory: Address;
  flagship: Address;
  receiver: Address;
  forwarder: Address;
  adapter: Address;
  hook: Address;
  poolManager: Address;
  oracleMode: string;
};
type Log = { address: string; topics: Hex[]; data: Hex };
type Receipt = {
  transactionHash: string;
  status: string;
  blockHash: string;
  blockNumber: string;
  to: string;
  logs: Log[];
};
export class CanonicalSepolia {
  private id = 0;
  private chainCheck: Promise<void> | undefined;
  constructor(private io: EvidenceIO) {}
  async rpc(
    endpoint: string,
    method: string,
    params: unknown[],
  ): Promise<unknown> {
    const response = await this.io.fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++this.id, method, params }),
    });
    if (!response.ok)
      throw new Error(`Canonical Sepolia RPC HTTP ${response.status}`);
    const payload = await response.json();
    if (payload.error || !Object.hasOwn(payload, "result"))
      throw new Error(`Canonical Sepolia RPC failed: ${method}`);
    return payload.result;
  }
  private async requireChain() {
    this.chainCheck ??= Promise.all(
      RPCS.map((endpoint) => this.rpc(endpoint, "eth_chainId", [])),
    ).then((ids) => {
      if (ids.some((id) => id !== "0xaa36a7"))
        throw new Error(
          "Independent RPCs did not confirm Sepolia chain 11155111",
        );
    });
    return this.chainCheck;
  }
  async receipt(hash: string): Promise<Receipt> {
    await this.requireChain();
    const results = (await Promise.all(
      RPCS.map((endpoint) =>
        this.rpc(endpoint, "eth_getTransactionReceipt", [hash]),
      ),
    )) as Array<Receipt | null>;
    const [a, b] = results;
    if (
      !a ||
      !b ||
      a.transactionHash.toLowerCase() !== hash.toLowerCase() ||
      b.transactionHash.toLowerCase() !== hash.toLowerCase() ||
      a.status !== "0x1" ||
      b.status !== "0x1" ||
      !/^0x[0-9a-f]{64}$/i.test(a.blockHash) ||
      a.blockHash !== b.blockHash ||
      a.blockNumber !== b.blockNumber
    )
      throw new Error(
        "Sepolia transaction is missing, reverted, or disagrees across independent RPCs",
      );
    const normalizedLogs = (receipt: Receipt) =>
      (receipt.logs || []).map((log) => ({
        address: log.address.toLowerCase(),
        topics: log.topics.map((topic) => topic.toLowerCase()),
        data: log.data.toLowerCase(),
      }));
    if (
      a.to?.toLowerCase() !== b.to?.toLowerCase() ||
      JSON.stringify(normalizedLogs(a)) !== JSON.stringify(normalizedLogs(b))
    )
      throw new Error(
        "Independent Sepolia sources disagree on transaction target or logs",
      );
    const blocks = (await Promise.all(
      RPCS.map((endpoint) =>
        this.rpc(endpoint, "eth_getBlockByNumber", [a.blockNumber, false]),
      ),
    )) as Array<{ hash?: string } | null>;
    if (blocks.some((block) => block?.hash !== a.blockHash))
      throw new Error(
        "Receipt is not on the independently observed canonical Sepolia block",
      );
    return a;
  }
  event(receipt: Receipt, name: string, emitter: string) {
    for (const log of receipt.logs || []) {
      if (log.address.toLowerCase() !== emitter.toLowerCase()) continue;
      try {
        const [signature, ...rest] = log.topics;
        if (!signature) continue;
        const decoded = decodeEventLog({
          abi: receiptAbi,
          topics: [signature, ...rest],
          data: log.data,
        });
        if (decoded.eventName === name) return decoded;
      } catch {
        /* unrelated log */
      }
    }
    throw new Error(`Missing ${name} event from the expected contract`);
  }
  async lifecycle(kind: string, hash: string, deployment: Deployment) {
    const receipt = await this.receipt(hash);
    const requirements: Record<string, [string, string, string]> = {
      createBasket: [deployment.factory, "BasketCreated", deployment.factory],
      deposit: [deployment.flagship, "Deposited", deployment.flagship],
      redeemUsdc: [deployment.flagship, "Redeemed", deployment.flagship],
      redeemInKind: [
        deployment.flagship,
        "RedeemedInKind",
        deployment.flagship,
      ],
      rebalance: [deployment.forwarder, "Rebalanced", deployment.flagship],
      hookToward: [deployment.adapter, "Swap", deployment.poolManager],
      hookAway: [deployment.adapter, "Swap", deployment.poolManager],
    };
    const requirement = requirements[kind];
    if (!requirement) throw new Error("Unknown lifecycle evidence kind");
    const [target, event, emitter] = requirement;
    if (receipt.to?.toLowerCase() !== target.toLowerCase())
      throw new Error(`Unexpected transaction target for ${kind}`);
    const decoded = this.event(receipt, event, emitter);
    if (kind === "hookToward" || kind === "hookAway") {
      if (
        decoded.eventName !== "Swap" ||
        decoded.args.fee !== (kind === "hookToward" ? 500 : 10000)
      )
        throw new Error(
          "Hook receipt does not demonstrate the required effective fee",
        );
      const call = encodeFunctionData({
        abi: parseAbi(["function approvedPoolId() view returns(bytes32)"]),
        functionName: "approvedPoolId",
      });
      const id = await this.rpc(RPCS[0], "eth_call", [
        { to: deployment.hook, data: call },
        receipt.blockNumber,
      ]);
      if (decoded.args.id !== id)
        throw new Error("Swap is not in the approved flagship hook pool");
      const applied = this.event(receipt, "HookFeeApplied", deployment.hook);
      if (
        applied.eventName !== "HookFeeApplied" ||
        applied.args.id !== id ||
        applied.args.fee !== decoded.args.fee ||
        applied.args.nav18 <= 0n ||
        applied.args.spot18 <= 0n
      )
        throw new Error(
          "Hook fee evidence is missing its pre-swap NAV context",
        );
      const toward =
        applied.args.spot18 > applied.args.nav18
          ? applied.args.sellingFund
          : applied.args.spot18 < applied.args.nav18
            ? !applied.args.sellingFund
            : false;
      if ((kind === "hookToward" && !toward) || (kind === "hookAway" && toward))
        throw new Error(
          "Hook trade direction does not match its evidence label",
        );
      if (
        kind === "hookAway" &&
        (applied.args.spot18 > applied.args.nav18
          ? applied.args.spot18 - applied.args.nav18
          : applied.args.nav18 - applied.args.spot18) <=
          applied.args.nav18 / 100n
      )
        throw new Error("Away trade is not outside the configured NAV band");
    }
    if (kind === "rebalance") {
      const accepted = this.event(
        receipt,
        "ReportAccepted",
        deployment.receiver,
      );
      if (
        accepted.eventName !== "ReportAccepted" ||
        accepted.args.vault.toLowerCase() !==
          deployment.flagship.toLowerCase() ||
        accepted.args.nonce <= 0n
      )
        throw new Error(
          "CRE receiver did not accept a nonce for the flagship vault",
        );
    }
    return receipt;
  }
}
