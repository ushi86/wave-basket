import type { Basket } from "./baskets";
import type { Deployment } from "./config";

/** Growth is a presentation name for the existing Sepolia flagship, not a new vault. */
export function hasGrowthFlagship(config?: Deployment) {
  return config?.chainId === 11155111 && Boolean(config.flagship);
}

export function collectionName(basket: Basket, config?: Deployment) {
  if (config?.chainId !== 11155111 || !config.flagship) return basket.name;
  return basket.address.toLowerCase() === config.flagship.toLowerCase()
    ? "Growth"
    : basket.name;
}
