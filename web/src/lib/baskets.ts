import { type Address } from "viem";
import { factoryAbi, vaultAbi } from "../../../shared/abi";
import type { ChainSession } from "./chain";
export type Basket = {
  address: Address;
  name: string;
  symbol: string;
  nav: bigint;
  healthy: boolean;
  price: bigint;
  supply: bigint;
  balance: bigint;
  creator: Address;
  fee: number;
  hwm: bigint;
  assets: readonly Address[];
  balances: readonly bigint[];
  values: readonly bigint[];
  actual: readonly number[];
  targets: readonly number[];
  pending: readonly number[];
  eta: bigint;
  history: HistoryRow[];
  historyCount: bigint;
};
export type HistoryRow = {
  id: bigint;
  timestamp: bigint;
  oldBps: readonly number[];
  newBps: readonly number[];
  navBefore: bigint;
  navAfter: bigint;
  turnoverBps: bigint;
  reasonHash: `0x${string}`;
};
export async function loadBaskets(
  session: ChainSession,
  account?: Address,
): Promise<Basket[]> {
  const { client, config } = session;
  if (!config.factory) return [];
  const count = await client.readContract({
    address: config.factory,
    abi: factoryAbi,
    functionName: "basketsLength",
  });
  const baskets: Basket[] = [];
  for (let index = 0n; index < count; index++) {
    const address = await client.readContract({
      address: config.factory,
      abi: factoryAbi,
      functionName: "baskets",
      args: [index],
    });
    const read = <
      T extends
        | "name"
        | "symbol"
        | "navUsdc"
        | "totalSupply"
        | "owner"
        | "perfFeeBps"
        | "hwm"
        | "holdings"
        | "pendingWeights"
        | "rebalanceCount",
    >(
      functionName: T,
    ) => client.readContract({ address, abi: vaultAbi, functionName });
    const [
      name,
      symbol,
      [nav, healthy],
      supply,
      creator,
      fee,
      hwm,
      [assets, balances, values, actual, targets],
      [pending, eta],
      historyCount,
    ] = await Promise.all([
      read("name"),
      read("symbol"),
      read("navUsdc"),
      read("totalSupply"),
      read("owner"),
      read("perfFeeBps"),
      read("hwm"),
      read("holdings"),
      read("pendingWeights"),
      read("rebalanceCount"),
    ]);
    const balance = account
      ? await client.readContract({
          address,
          abi: vaultAbi,
          functionName: "balanceOf",
          args: [account],
        })
      : 0n;
    const price = healthy && supply > 0n ? (nav * 10n ** 30n) / supply : 0n;
    const history: HistoryRow[] = [];
    for (
      let id = historyCount > 32n ? historyCount - 32n : 0n;
      id < historyCount;
      id++
    )
      history.push(
        await client.readContract({
          address,
          abi: vaultAbi,
          functionName: "rebalanceAt",
          args: [id],
        }),
      );
    baskets.push({
      address,
      name,
      symbol,
      nav,
      healthy,
      price,
      supply,
      balance,
      creator,
      fee,
      hwm,
      assets,
      balances,
      values,
      actual,
      targets,
      pending,
      eta,
      history: history.reverse(),
      historyCount,
    });
  }
  return baskets;
}
export async function loadOlderHistory(session: ChainSession, basket: Basket) {
  let from = BigInt(session.config.deployBlock);
  const latest = await session.client.getBlockNumber();
  let size = 5000n;
  const rows = [];
  while (from <= latest) {
    const to = from + size - 1n > latest ? latest : from + size - 1n;
    try {
      const logs = await session.client.getContractEvents({
        address: basket.address,
        abi: vaultAbi,
        eventName: "Rebalanced",
        fromBlock: from,
        toBlock: to,
      });
      rows.push(...logs);
      from = to + 1n;
    } catch (error) {
      if (size === 1n) throw error;
      size = size / 2n || 1n;
    }
  }
  return rows.sort((a, b) => Number((b.args.id || 0n) - (a.args.id || 0n)));
}
