import { formatUnits } from "viem";
export const short = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`;
export const number = (amount: bigint, decimals = 6) =>
  Number(formatUnits(amount, decimals));
export const money = (amount: number, maximumFractionDigits = 2) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(amount);
export const percent = (bps: number) =>
  `${(bps / 100).toFixed(bps % 100 ? 2 : 0)}%`;
export const colors = ["#257b63", "#89b6a0", "#d6c9a6", "#9ea6c9"];
export function errorText(error: unknown) {
  const e = error as { shortMessage?: string; message?: string };
  return e.shortMessage || e.message || String(error);
}
