import { ArrowUpRight, Wallet } from "lucide-react";
import { type Address } from "viem";
import { PageTitle } from "../components/Common";
import type { WaveProtocolModel } from "../hooks/useWaveProtocol";
import { money, number } from "../lib/format";
import type { Page } from "../lib/navigation";
export function PortfolioPage({
  model,
  onSelect,
  navigate,
}: {
  model: WaveProtocolModel;
  onSelect: (address: Address) => void;
  navigate: (page: Page) => void;
}) {
  const { account, baskets } = model;
  const setSelected = onSelect;
  const totalPosition = baskets.reduce(
    (sum, b) => sum + number(b.balance, 18) * number(b.price, 18),
    0,
  );
  return (
    <>
      <PageTitle eyebrow="YOUR POSITION" title="A view of what’s yours." />
      <div className="portfolio-total">
        <span>Total underlying value</span>
        <strong>
          {account &&
          baskets.filter((b) => b.balance > 0n).every((b) => b.healthy)
            ? money(totalPosition)
            : "—"}
        </strong>
        <p>
          {account
            ? "Valued using each basket’s oracle-derived NAV."
            : "Connect your wallet to see your basket positions."}
        </p>
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Basket</th>
              <th>Shares</th>
              <th>Underlying value</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {baskets
              .filter((b) => b.balance > 0n)
              .map((b) => (
                <tr key={b.address}>
                  <td>
                    <strong>{b.name}</strong>
                    <small>{b.symbol}</small>
                  </td>
                  <td>
                    {number(b.balance, 18).toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })}
                  </td>
                  <td>
                    {b.healthy
                      ? money(number(b.balance, 18) * number(b.price, 18))
                      : "Oracle unavailable"}
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => {
                        setSelected(b.address);
                        navigate("baskets");
                      }}
                    >
                      Manage <ArrowUpRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!baskets.some((b) => b.balance > 0n) && (
          <div className="empty-row">
            <Wallet size={25} />
            <div>
              <strong>No positions to show</strong>
              <p>Explore a basket and deposit test mUSDC to begin.</p>
            </div>
            <button
              className="button secondary"
              onClick={() => navigate("baskets")}
            >
              Explore baskets
            </button>
          </div>
        )}
      </div>
    </>
  );
}
