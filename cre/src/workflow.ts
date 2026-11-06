import {
  cre,
  Runner,
  consensusMedianAggregation,
  encodeCallMsg,
  bytesToHex,
  hexToBase64,
  prepareReportRequest,
  LATEST_BLOCK_NUMBER,
  type Runtime,
  type NodeRuntime,
} from "@chainlink/cre-sdk";
import {
  encodeFunctionData,
  decodeFunctionResult,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
  stringToHex,
  zeroAddress,
  type Address,
  type Abi,
  type Hex,
} from "viem";
import { EVM_PB } from "@chainlink/cre-sdk/pb";
import { factoryAbi, vaultAbi, receiverAbi } from "../../shared/abi";
import { proposeWeights } from "./strategy";
export type Config = {
  schedule: string;
  chainSelector: string;
  factory: Address;
  receiver: Address;
  maxBaskets: number;
  driftThresholdBps: number;
  marketApiUrl: string;
  assetIds: Record<string, string>;
};

export function runRebalance(runtime: Runtime<Config>): string {
  const config = runtime.config;
  if (
    !/^\d+$/.test(config.chainSelector) ||
    !Number.isInteger(config.maxBaskets) ||
    config.maxBaskets < 1 ||
    config.maxBaskets > 3
  )
    throw new Error("Invalid workflow configuration");
  const evm = new cre.capabilities.EVMClient(BigInt(config.chainSelector));
  const read = (
    address: Address,
    abi: Abi,
    functionName: string,
    args: readonly unknown[] = [],
  ) => {
    const response = evm
      .callContract(runtime, {
        call: encodeCallMsg({
          from: zeroAddress,
          to: address,
          data: encodeFunctionData({ abi, functionName, args }),
        }),
        blockNumber: LATEST_BLOCK_NUMBER,
      })
      .result();
    return decodeFunctionResult({
      abi,
      functionName,
      data: bytesToHex(response.data),
    });
  };
  const count = Number(read(config.factory, factoryAbi, "basketsLength"));
  let written = 0;
  const asOf = Math.floor(runtime.now().getTime() / 1000);
  for (let index = 0; index < Math.min(count, config.maxBaskets); index++) {
    const vault = read(config.factory, factoryAbi, "baskets", [
      BigInt(index),
    ]) as Address;
    const [assets, , , actual, target] = read(vault, vaultAbi, "holdings") as [
      Address[],
      bigint[],
      bigint[],
      number[],
      number[],
    ];
    const [, healthy] = read(vault, vaultAbi, "navUsdc") as [bigint, boolean];
    const last = Number(read(vault, vaultAbi, "lastRebalance"));
    const [, eta] = read(vault, vaultAbi, "pendingWeights") as [
      number[],
      bigint,
    ];
    const lastObservation = Number(
      read(config.receiver, receiverAbi, "lastObservation", [vault]),
    );
    if (
      !healthy ||
      eta !== 0n ||
      (last > 0 && asOf < last + 300) ||
      asOf <= lastObservation
    ) {
      runtime.log(`Skip ${vault}: unhealthy, pending, or interval`);
      continue;
    }
    const changes = assets.map((asset) => {
      const id = config.assetIds[asset.toLowerCase()];
      if (!id) throw new Error(`Missing external market ID for ${asset}`);
      if (id === "usd-coin") return 0;
      return runtime
        .runInNodeMode((node: NodeRuntime<Config>) => {
          const response = new cre.capabilities.HTTPClient()
            .sendRequest(node, {
              url: `${config.marketApiUrl}?ids=${encodeURIComponent(id)}&vs_currencies=usd&include_24hr_change=true`,
              method: "GET",
            })
            .result();
          if (response.statusCode !== 200)
            throw new Error(`Market API HTTP ${response.statusCode}`);
          const data = JSON.parse(
            new TextDecoder().decode(response.body),
          ) as Record<string, { usd_24h_change?: number }>;
          const change = data[id]?.usd_24h_change;
          if (typeof change !== "number" || !Number.isFinite(change))
            throw new Error(`Invalid market response for ${id}`);
          return change;
        }, consensusMedianAggregation<number>())()
        .result();
    });
    const proposed = proposeWeights(
      actual,
      target,
      changes,
      config.driftThresholdBps,
    );
    if (!proposed) {
      runtime.log(
        `Skip ${vault}: drift below threshold or bounds prevent trade`,
      );
      continue;
    }
    const reason = keccak256(
      stringToHex(
        JSON.stringify({ strategy: "momentum-24h-v1", changes, asOf }),
      ),
    );
    const payload = encodeAbiParameters(
      parseAbiParameters(
        "address vault,uint16[] weights,uint64 asOf,bytes32 reasonHash",
      ),
      [vault, proposed, BigInt(asOf), reason],
    );
    const report = runtime.report(prepareReportRequest(payload)).result();
    const result = evm
      .writeReport(runtime, {
        receiver: hexToBase64(config.receiver),
        report,
        gasConfig: { gasLimit: "2000000" },
      })
      .result();
    const hash = result.txHash ? bytesToHex(result.txHash) : ("0x" as Hex);
    runtime.log(
      `Rebalance ${vault}: status ${result.txStatus}; transaction ${hash}`,
    );
    if (
      result.txStatus !== EVM_PB.TxStatus.SUCCESS ||
      result.receiverContractExecutionStatus ===
        EVM_PB.ReceiverContractExecutionStatus.REVERTED
    )
      throw new Error(
        `Rebalance report failed for ${vault}: ${result.txStatus}`,
      );
    if (hash === "0x" || /^0x0+$/.test(hash))
      runtime.log(
        "No broadcast transaction; this is not live on-chain evidence",
      );
    written++;
  }
  return `Wave Protocol: submitted ${written} rebalance report(s)`;
}
export const initWorkflow = (config: Config) => [
  cre.handler(
    new cre.capabilities.CronCapability().trigger({
      schedule: config.schedule,
    }),
    runRebalance,
  ),
];
export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
