import { ArrowUpRight, Layers } from "lucide-react";
import type { Basket } from "../lib/baskets";
import { colors, money, number, percent, short } from "../lib/format";
import { AddressLink } from "./Common";

/** A basket overview is always derived from a loaded contract, never a catalog mock. */
export function BasketCard({
  basket,
  displayName = basket.name,
  chainId,
  symbol,
  selected,
  onSelect,
}: {
  basket: Basket;
  displayName?: string;
  chainId: number;
  symbol: (address: string) => string;
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <article className={`collection-card ${selected ? "is-selected" : ""}`}>
      <div className="collection-top">
        <span className="collection-icon">
          <Layers size={23} />
        </span>
        <span
          className={`collection-status ${!basket.healthy ? "is-stale" : ""}`}
        >
          {basket.healthy ? "Onchain basket" : "Prices unavailable"}
        </span>
      </div>
      <h3>{displayName}</h3>
      {displayName !== basket.name && (
        <small className="muted">
          On-chain: {basket.name} · {basket.symbol}
        </small>
      )}
      <p className="collection-purpose">
        One share token. {basket.assets.length} underlying assets. Market
        exposure follows the holdings.
      </p>
      <div className="asset-chips">
        {basket.assets.map((a) => (
          <span key={a}>{symbol(a)}</span>
        ))}
      </div>
      <div className="collection-value">
        <span>NAV per share</span>
        <strong>
          {basket.healthy ? money(number(basket.price, 18), 4) : "—"}
        </strong>
      </div>
      <div
        className="weight-track"
        role="img"
        aria-label={`Target weights: ${basket.assets.map((a, i) => `${symbol(a)} ${percent(basket.targets[i])}`).join(", ")}`}
      >
        {basket.targets.map((w, i) => (
          <span
            key={basket.assets[i]}
            style={{ width: `${w / 100}%`, background: colors[i] }}
          />
        ))}
      </div>
      <div className="collection-facts">
        <span>
          Creator fee <b>{percent(basket.fee)} of profit</b>
        </span>
        <span>
          Risk <b>Asset-dependent</b>
        </span>
      </div>
      <div className="collection-actions">
        <AddressLink address={basket.address} chainId={chainId} />
        <button className="button secondary" onClick={onSelect}>
          View basket <ArrowUpRight size={15} />
        </button>
      </div>
    </article>
  );
}

export function PlannedCollections({
  growthAvailable = false,
}: {
  growthAvailable?: boolean;
}) {
  return (
    <section
      className="planned-collections"
      aria-label="Planned collections, not deployed"
    >
      <div>
        <span className="eyebrow">THE NEXT WAVE</span>
        <h2>More ways to find your balance.</h2>
        <p>
          Planned collections. These are not deployed baskets and cannot accept
          deposits.
        </p>
      </div>
      <div className="planned-grid">
        {[
          ["Growth", "A mix of risk assets for broader crypto exposure."],
          ["Balanced", "Risk assets alongside a settlement-token allocation."],
          ["Yield", "Reserve-backed simulated yield, with NAV in focus."],
        ]
          .filter(([name]) => name !== "Growth" || !growthAvailable)
          .map(([name, description]) => (
            <article className="planned-card" key={name}>
              <span className="subtle-tag">PLANNED · NOT DEPLOYED</span>
              <h3>{name}</h3>
              <p>{description}</p>
              {name === "Yield" && (
                <small>Future demo: simulated yield on Sepolia</small>
              )}
            </article>
          ))}
      </div>
    </section>
  );
}
