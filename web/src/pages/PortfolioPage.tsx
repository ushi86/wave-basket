import { ArrowRight, ArrowUpRight, Wallet, Layers } from "lucide-react";
import { type Address } from "viem";
import { PageTitle } from "../components/Common";
import type { WaveProtocolModel } from "../hooks/useWaveProtocol";
import { money, number, percent, short } from "../lib/format";
import type { Page } from "../lib/navigation";
import { collectionName } from "../lib/collections";
export function PortfolioPage({
  model,
  onSelect,
  navigate,
}: {
  model: WaveProtocolModel;
  onSelect: (address: Address) => void;
  navigate: (page: Page) => void;
}) {
  const { account, baskets, config, connect, ready, loading } = model;
  const positions = account ? baskets.filter((b) => b.balance > 0n) : [];
  const valued = ready && !loading && positions.every((b) => b.healthy);
  const total = positions.reduce(
    (sum, b) => sum + number(b.balance, 18) * number(b.price, 18),
    0,
  );
  return (
    <>
      <PageTitle
        eyebrow="YOUR LITTLE CORNER OF WAVE"
        title="A portfolio, in perspective."
      >
        <button className="text-button" onClick={() => navigate("baskets")}>
          Explore baskets <ArrowUpRight size={16} />
        </button>
      </PageTitle>
      <section className="portfolio-overview">
        <div className="portfolio-total">
          <span>Your underlying value</span>
          <strong>{account && valued ? money(total) : "—"}</strong>
          <p>
            {account
              ? "Your share of the baskets, valued from onchain holdings."
              : "Connect your wallet to see what’s yours."}
          </p>
          <small>
            Test assets only. Values can fall. No returns are promised.
          </small>
        </div>
        <div className="portfolio-context">
          <Wallet size={25} />
          <span>{account ? short(account) : "YOUR WALLET"}</span>
          <h3>
            {account
              ? `${positions.length} basket position${positions.length === 1 ? "" : "s"}`
              : "Everything starts with a connection."}
          </h3>
          <p>
            Hold one share token. Keep a clear view of every underlying asset.
          </p>
          {!account && (
            <button className="button primary" onClick={connect}>
              Connect wallet <ArrowRight size={16} />
            </button>
          )}
        </div>
      </section>
      <div className="section-heading">
        <div>
          <h2>Your baskets</h2>
          <p>Actual positions. No sample balances.</p>
        </div>
      </div>
      <div className="position-grid">
        {positions.map((b) => (
          <article className="position-card" key={b.address}>
            <span className="collection-icon">
              <Layers size={22} />
            </span>
            <h3>{collectionName(b, config)}</h3>
            <span className="muted">
              {collectionName(b, config) !== b.name ? `${b.name} · ` : ""}
              {b.symbol} · {config?.name}
            </span>
            <dl>
              <div>
                <dt>Your shares</dt>
                <dd>
                  {number(b.balance, 18).toLocaleString(undefined, {
                    maximumFractionDigits: 6,
                  })}
                </dd>
              </div>
              <div>
                <dt>Underlying value</dt>
                <dd>
                  {b.healthy
                    ? money(number(b.balance, 18) * number(b.price, 18))
                    : "Prices unavailable"}
                </dd>
              </div>
              <div>
                <dt>Creator performance fee</dt>
                <dd>{percent(b.fee)} of profit</dd>
              </div>
            </dl>
            <button
              className="button secondary full"
              onClick={() => {
                onSelect(b.address);
                navigate("baskets");
              }}
            >
              View position & exits <ArrowUpRight size={16} />
            </button>
          </article>
        ))}
      </div>
      {!positions.length && (
        <section className="portfolio-empty">
          <div className="empty-orbit">
            <Wallet size={32} />
          </div>
          <span className="eyebrow">ROOM FOR YOUR FIRST BASKET</span>
          <h2>
            {account
              ? loading
                ? "Reading your positions…"
                : "A fresh start."
              : "Your portfolio belongs here."}
          </h2>
          <p>
            {account
              ? "Your confirmed basket holdings will appear here. Browse the available baskets to get started."
              : "Connect a wallet to view positions, or explore the baskets before you decide."}
          </p>
          <button
            className="button primary"
            onClick={() => navigate("baskets")}
          >
            Explore baskets <ArrowRight size={16} />
          </button>
        </section>
      )}
      <aside className="portfolio-note">
        <b>A clear view, with clear limits.</b>
        <p>
          Anon-RPC reduces RPC-provider exposure for Sepolia app reads; onchain
          holdings stay public. Local demo reads are direct. Stale-feed in-kind
          exits remain available with no reserve withheld, but can avoid
          uncrystallized creator fees.
        </p>
      </aside>
    </>
  );
}
