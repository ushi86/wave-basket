import { isAddress, type Address } from "viem";
export type Token = {
  address: Address;
  symbol: string;
  decimals: number;
  marketId: string;
  feed?: Address;
};
export type Deployment = {
  chainId: number;
  name: string;
  oracleMode: "demo" | "chainlink" | "unconfigured";
  tokens: Token[];
  deployBlock: string;
  factory?: Address;
  flagship?: Address;
  adapter?: Address;
  hook?: Address;
  receiver?: Address;
  registry?: Address;
  forwarder?: Address;
  rpcUrl?: string;
  bootstrapRpcUrl?: string;
  anonSpecifier?: Address;
};
export async function loadDeployment(): Promise<Deployment> {
  const response = await fetch(
    import.meta.env.VITE_DEPLOYMENT_URL || "/deployment.json",
  );
  if (!response.ok) throw new Error("Deployment manifest is unavailable");
  const data = (await response.json()) as Deployment;
  if (![11155111, 31337].includes(data.chainId) || !Array.isArray(data.tokens))
    throw new Error("Unsupported deployment configuration");
  for (const field of [
    "factory",
    "flagship",
    "adapter",
    "hook",
    "receiver",
    "registry",
    "forwarder",
    "anonSpecifier",
  ] as const)
    if (data[field] && !isAddress(data[field]!))
      throw new Error(`Invalid deployment ${field}`);
  for (const token of data.tokens)
    if (
      !isAddress(token.address) ||
      !Number.isInteger(token.decimals) ||
      token.decimals < 0 ||
      token.decimals > 18
    )
      throw new Error("Invalid token configuration");
  if (
    data.chainId === 31337 &&
    (!data.rpcUrl ||
      !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(data.rpcUrl))
  )
    throw new Error("Local demo requires a loopback RPC");
  return data;
}
