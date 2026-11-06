import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import type { Address } from "viem";
import { short } from "../lib/format";
export function PageTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}
export function AddressLink({
  address,
  chainId,
}: {
  address: Address;
  chainId: number;
}) {
  return chainId === 11155111 ? (
    <a
      href={`https://sepolia.etherscan.io/address/${address}`}
      target="_blank"
      rel="noreferrer"
    >
      {short(address)} <ExternalLink size={12} />
    </a>
  ) : (
    <span title={address}>{short(address)}</span>
  );
}
