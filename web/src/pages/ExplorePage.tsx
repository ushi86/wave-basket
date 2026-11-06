import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Layers,
  Plus,
  RefreshCw,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { useState } from "react";
import { formatUnits, parseUnits, type Address } from "viem";
import { adapterAbi, tokenAbi, vaultAbi } from "../../../shared/abi";
import {
  CreatorControls,
  Holdings,
  HookTrading,
  PendingAllocation,
} from "../components/BasketControls";
import { AddressLink, PageTitle } from "../components/Common";
import type { WaveProtocolModel } from "../hooks/useWaveProtocol";
import { loadOlderHistory } from "../lib/baskets";
import {
  colors,
  errorText,
  money,
  number,
  percent,
  short,
} from "../lib/format";
import type { Page } from "../lib/navigation";
export function ExplorePage({
  model,
  selected,
  onSelect,
  navigate,
}: {
  model: WaveProtocolModel;
  selected?: Address;
  onSelect: (address: Address) => void;
  navigate: (page: Page) => void;
}) {
  const {
    session,
    config,
    meter,
    account,
    baskets,
    setError,
    loading,
    setRefreshKey,
    walletBalance,
    connect,
    run,
    busy,
    ready,
    usdc,
  } = model;
  const [action, setAction] = useState<"deposit" | "redeem" | "kind">(
    "deposit",
  );
  const [amount, setAmount] = useState("");
  const [older, setOlder] = useState<
    Awaited<ReturnType<typeof loadOlderHistory>>
  >([]);
  const [olderLoading, setOlderLoading] = useState(false);
  const hookSnapshot = model.hookSnapshot;
  const basket =
    baskets.find((b) => b.address === selected) ||
    baskets.find((b) => b.address === config?.flagship) ||
    baskets[0];
  const token = (address: string) =>
    config?.tokens.find(
      (t) => t.address.toLowerCase() === address.toLowerCase(),
    );
  const totalNav = baskets.reduce((sum, b) => sum + number(b.nav), 0);
  const totalPosition = baskets.reduce(
    (sum, b) => sum + number(b.balance, 18) * number(b.price, 18),
    0,
  );
  const setSelected = onSelect;
  const transact = async () => {
    if (!basket || !usdc || !account) return;
    await run(
      action === "deposit"
        ? "Deposit"
        : action === "redeem"
          ? "Redeem to mUSDC"
          : "Redeem in kind",
      async (submit) => {
        if (action === "deposit") {
          const value = parseUnits(amount, 6);
          if (value <= 0n) throw new Error("Enter a positive deposit amount");
          await submit(usdc.address, tokenAbi, "approve", [
            basket.address,
            value,
          ]);
          const min =
            basket.price > 0n
              ? (((value * 10n ** 30n) / basket.price) * 99n) / 100n
              : 0n;
          await submit(basket.address, vaultAbi, "deposit", [
            value,
            min,
            account,
          ]);
        } else {
          const shares = parseUnits(amount, 18);
          if (shares <= 0n || shares > basket.balance)
            throw new Error("Enter a share amount within your balance");
          if (action === "kind")
            await submit(basket.address, vaultAbi, "redeemInKind", [
              shares,
              account,
            ]);
          else {
            if (!session) throw new Error("Chain session is unavailable");
            const [netQuote] = await session.client.readContract({
              address: basket.address,
              abi: vaultAbi,
              functionName: "previewRedeem",
              args: [shares],
            });
            await submit(basket.address, vaultAbi, "redeem", [
              shares,
              (netQuote * 99n) / 100n,
              account,
            ]);
          }
        }
        setAmount("");
      },
    );
  };
  return (
    <>
      <PageTitle eyebrow="DIVERSIFY WITH INTENTION" title="Find your balance.">
        <button className="button secondary" onClick={() => navigate("create")}>
          <Plus size={16} />
          Create a basket
        </button>
      </PageTitle>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-tag">
            <span className="tiny-dot" /> ONE POSITION. A WIDER HORIZON.
          </span>
          <h2>
            A basket of assets.
            <br />A clearer way forward.
          </h2>
          <p>
            Transparent allocations. Bounded rebalances.
            <br />
            Your assets, always in view.
          </p>
          <button
            className="hero-link"
            onClick={() =>
              document
                .getElementById("basket-detail")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Explore the flagship basket <ArrowRight size={17} />
          </button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="art-label label-eth">
            Ξ <span>ETH</span>
          </div>
          <div className="art-label label-btc">
            ₿ <span>BTC</span>
          </div>
          <div className="art-label label-link">
            ⬡ <span>LINK</span>
          </div>
          <div className="art-core">
            <Waves size={38} />
          </div>
        </div>
      </section>
      <div className="metrics-row">
        <div>
          <span>Total basket value</span>
          <strong>
            {ready && baskets.every((b) => b.healthy) ? money(totalNav) : "—"}
          </strong>
          <small>Oracle-valued underlying assets</small>
        </div>
        <div>
          <span>Live baskets</span>
          <strong>
            {ready ? String(baskets.length).padStart(2, "0") : "—"}
          </strong>
          <small>Independently deployed vaults</small>
        </div>
        <div>
          <span>Your position</span>
          <strong>
            {account &&
            baskets.filter((b) => b.balance > 0n).every((b) => b.healthy)
              ? money(totalPosition)
              : "—"}
          </strong>
          <small>
            {account ? "Across all Wave baskets" : "Connect a wallet to view"}
          </small>
        </div>
        <div>
          <span>Private read coverage</span>
          <strong>
            {meter.attempted ? `${meter.coverage.toFixed(1)}%` : "—"}
          </strong>
          <small>
            {meter.anon} anonymized · {meter.bootstrap} bootstrap
          </small>
        </div>
      </div>
      <div className="section-heading">
        <div>
          <h2>
            Explore baskets{" "}
            <span className="count-badge">{baskets.length}</span>
          </h2>
          <p>A considered mix. Clear rules. Yours to hold.</p>
        </div>
        <button
          className="text-button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading || !ready}
        >
          <RefreshCw size={14} className={loading ? "spinning" : ""} />
          {loading ? "Refreshing" : "Refresh"}
        </button>
      </div>
      {baskets.length > 1 && (
        <div className="basket-selector">
          {baskets.map((b) => (
            <button
              className={basket?.address === b.address ? "selected" : ""}
              key={b.address}
              onClick={() => {
                setSelected(b.address);
                setOlder([]);
              }}
            >
              {b.name}
              <span>{b.symbol}</span>
            </button>
          ))}
        </div>
      )}
      <section id="basket-detail" className="basket-layout">
        <div className="basket-panel">
          <div className="basket-heading">
            <div className="basket-avatar">
              <Layers size={22} />
            </div>
            <div>
              <h2>{basket?.name || "Wave Blue Chip"}</h2>
              <span>
                {basket?.symbol || "FUND"} <span className="separator">·</span>{" "}
                {basket?.assets.length || 3} underlying assets
              </span>
            </div>
            <span
              className={`health-tag ${basket && !basket.healthy ? "unhealthy" : ""}`}
            >
              {basket
                ? basket.healthy
                  ? "Healthy oracles"
                  : "Oracle unavailable"
                : "Awaiting deployment"}
            </span>
          </div>
          <div className="basket-summary">
            <div>
              <span>Net asset value / share</span>
              <strong>
                {basket?.healthy ? money(number(basket.price, 18), 4) : "—"}
              </strong>
              <small>Priced from underlying holdings</small>
            </div>
            <div className="mini-summary">
              <span>Basket NAV</span>
              <strong>
                {basket?.healthy ? money(number(basket.nav)) : "—"}
              </strong>
              <span>
                Performance fee <b>{basket ? percent(basket.fee) : "10%"}</b>
              </span>
            </div>
          </div>
          <div className="allocation">
            <div
              className="allocation-chart"
              role="img"
              aria-label={`Target allocation: ${(basket?.targets || [4000, 3500, 2500]).map((w, i) => `${basket ? token(basket.assets[i])?.symbol : ["WETH", "WBTC", "LINK"][i]} ${percent(w)}`).join(", ")}`}
              style={{
                background: `conic-gradient(${(basket?.targets || [4000, 3500, 2500]).map((_, i, arr) => `${colors[i]} ${arr.slice(0, i).reduce((a, b) => a + b, 0) / 100}% ${arr.slice(0, i + 1).reduce((a, b) => a + b, 0) / 100}%`).join(",")})`,
              }}
            >
              <div>
                <Layers size={20} />
                <strong>{basket?.assets.length || 3}</strong>
                <span>ASSETS</span>
              </div>
            </div>
            <div className="allocation-legend">
              <div className="eyebrow">TARGET ALLOCATION</div>
              {(basket?.assets || ["ETH", "BTC", "LINK"]).map((a, i) => (
                <div className="legend-row" key={a}>
                  <span
                    className="legend-dot"
                    style={{ background: colors[i] }}
                  />
                  <span>
                    {basket
                      ? token(a)?.symbol || short(a)
                      : ["WETH", "WBTC", "LINK"][i]}
                  </span>
                  <b>{percent(basket?.targets[i] || [4000, 3500, 2500][i])}</b>
                </div>
              ))}
            </div>
          </div>
          <div className="basket-footer">
            <span>
              <ShieldCheck size={14} />
              On-chain allocation limits
            </span>
            <span>
              <Activity size={14} />
              Uniswap v4 execution
            </span>
            {basket && config && (
              <AddressLink address={basket.address} chainId={config.chainId} />
            )}
          </div>
        </div>
        <aside className="action-panel">
          <div
            className="action-tabs"
            role="tablist"
            aria-label="Basket action"
          >
            {(
              [
                { id: "deposit", label: "Deposit" },
                { id: "redeem", label: "Redeem" },
                { id: "kind", label: "In kind" },
              ] as const
            ).map((a) => (
              <button
                role="tab"
                aria-selected={action === a.id}
                className={action === a.id ? "active" : ""}
                key={a.id}
                onClick={() => {
                  setAction(a.id);
                  setAmount("");
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="action-body">
            <h3>
              {action === "deposit"
                ? "Make a little room for more."
                : action === "kind"
                  ? "Take the assets with you."
                  : "Your basket, your exit."}
            </h3>
            <p>
              {action === "deposit"
                ? "Deposit mUSDC. Receive your share of the basket."
                : action === "kind"
                  ? "Receive underlying tokens without swaps or oracle reads."
                  : "Sell your proportional assets into mUSDC."}
            </p>
            <label htmlFor="amount">
              {action === "deposit" ? "You deposit" : "Shares to redeem"}
            </label>
            <div className="amount-input">
              <input
                id="amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span>
                {action === "deposit" ? "mUSDC" : basket?.symbol || "FUND"}
              </span>
            </div>
            <div className="balance-line">
              Available:{" "}
              {action === "deposit"
                ? walletBalance !== undefined
                  ? `${number(walletBalance).toLocaleString()} mUSDC`
                  : "—"
                : basket && account
                  ? `${number(basket.balance, 18).toFixed(6)} ${basket.symbol}`
                  : "—"}
              {action !== "deposit" && basket && account && (
                <button
                  onClick={() => setAmount(formatUnits(basket.balance, 18))}
                >
                  MAX
                </button>
              )}
            </div>
            <dl className="trade-details">
              <div>
                <dt>
                  {action === "deposit"
                    ? "Execution tolerance"
                    : "Withdrawal fee"}
                </dt>
                <dd>{action === "deposit" ? "1.00%" : "0.10%"}</dd>
              </div>
              <div>
                <dt>
                  {action === "deposit"
                    ? "Withdrawal fee"
                    : action === "kind"
                      ? "Settlement"
                      : "Minimum output"}
                </dt>
                <dd>
                  {action === "deposit"
                    ? "0.10%"
                    : action === "kind"
                      ? "Proportional assets"
                      : "Post-fee quote − 1%"}
                </dd>
              </div>
              <div>
                <dt>Network</dt>
                <dd>{config?.name || "Sepolia"}</dd>
              </div>
            </dl>
            <button
              className="button primary full"
              disabled={Boolean(
                busy ||
                !ready ||
                !basket ||
                (!basket.healthy && action !== "kind") ||
                (account && !amount),
              )}
              onClick={() => (account ? transact() : connect())}
            >
              {busy ? (
                <>
                  <RefreshCw size={16} className="spinning" />
                  Transaction in progress
                </>
              ) : (
                <>
                  {account
                    ? action === "deposit"
                      ? "Deposit into basket"
                      : action === "kind"
                        ? "Redeem underlying assets"
                        : "Redeem to mUSDC"
                    : "Connect to get started"}
                  <ArrowUpRight size={17} />
                </>
              )}
            </button>
            <p className="action-disclosure">
              <ShieldCheck size={13} />
              {action === "kind"
                ? "Healthy feeds: creator fees crystallize. Stale feeds: full net pro-rata exit; pending creator fees are waived."
                : "Performance fees apply only above the high-water mark."}
            </p>
          </div>
        </aside>
      </section>
      {basket && (
        <>
          <Holdings
            basket={basket}
            tokenSymbol={(a) => token(a)?.symbol || short(a)}
            tokenDecimals={(a) => token(a)?.decimals ?? 18}
          />
          <PendingAllocation
            basket={basket}
            connected={Boolean(account)}
            disabled={Boolean(busy || !ready)}
            tokenSymbol={(a) => token(a)?.symbol || short(a)}
            execute={() =>
              run("Execute weights", (submit) =>
                submit(basket.address, vaultAbi, "executeWeights", []),
              )
            }
          />
          <div className="section-heading">
            <div>
              <h2>Rebalance activity</h2>
              <p>Every allocation change leaves a trace.</p>
            </div>
            <span className="subtle-tag">Chainlink CRE</span>
          </div>
          <div className="table-card">
            {basket.history.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Rebalance</th>
                    <th>Time</th>
                    <th>Turnover</th>
                    <th>Allocation changes</th>
                    <th>NAV after</th>
                    <th>NAV impact</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {basket.history.map((row) => (
                    <tr key={String(row.id)}>
                      <td>
                        <span className="activity-icon">
                          <RefreshCw size={13} />
                        </span>
                        #{String(row.id + 1n)}
                      </td>
                      <td>
                        {new Date(
                          Number(row.timestamp) * 1000,
                        ).toLocaleString()}
                      </td>
                      <td>{percent(Number(row.turnoverBps))}</td>
                      <td>
                        {row.newBps.map((weight, i) => (
                          <div key={i}>
                            {token(basket.assets[i])?.symbol ||
                              `Asset ${i + 1}`}
                            : {percent(row.oldBps[i])} → {percent(weight)}
                          </div>
                        ))}
                      </td>
                      <td>{money(number(row.navAfter))}</td>
                      <td>{money(number(row.navAfter - row.navBefore))}</td>
                      <td>
                        <span title={row.reasonHash}>
                          {short(row.reasonHash)}
                        </span>
                      </td>
                      <td>
                        {row.transactionHash ? (
                          config?.chainId === 11155111 ? (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${row.transactionHash}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {short(row.transactionHash)} ↗
                            </a>
                          ) : (
                            <span title={row.transactionHash}>
                              {short(row.transactionHash)}
                            </span>
                          )
                        ) : (
                          "Reference unavailable"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-row">
                <Clock size={24} />
                <div>
                  <strong>No rebalances yet</strong>
                  <p>
                    A successful CRE report will appear here after confirmation.
                  </p>
                </div>
              </div>
            )}
            {basket.historyCount > 32n && (
              <div className="older-history">
                <button
                  className="text-button"
                  disabled={olderLoading}
                  onClick={async () => {
                    if (!session) return;
                    setOlderLoading(true);
                    try {
                      const logs = await loadOlderHistory(session, basket);
                      setOlder(
                        logs.filter(
                          (log) =>
                            (log.args.id ?? 0n) < basket.historyCount - 32n,
                        ),
                      );
                    } catch (e) {
                      setError(errorText(e));
                    } finally {
                      setOlderLoading(false);
                    }
                  }}
                >
                  {olderLoading ? "Loading events…" : "Load older events"}
                </button>
                {older.map((log) => (
                  <article key={`${log.transactionHash}:${log.args.id}`}>
                    <strong>
                      #{String((log.args.id ?? 0n) + 1n)} · block{" "}
                      {String(log.blockNumber)}
                    </strong>
                    <p>
                      {(log.args.newBps ?? [])
                        .map(
                          (weight, i) =>
                            `${token(basket.assets[i])?.symbol || `Asset ${i + 1}`}: ${percent(log.args.oldBps?.[i] ?? 0)} → ${percent(weight)}`,
                        )
                        .join(" · ")}
                    </p>
                    <p>
                      Turnover: {percent(Number(log.args.turnoverBps ?? 0n))} ·
                      NAV {money(number(log.args.navBefore ?? 0n))} →{" "}
                      {money(number(log.args.navAfter ?? 0n))} · impact{" "}
                      {money(
                        number(
                          (log.args.navAfter ?? 0n) -
                            (log.args.navBefore ?? 0n),
                        ),
                      )}
                    </p>
                    {config?.chainId === 11155111 ? (
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={`https://sepolia.etherscan.io/tx/${log.transactionHash}`}
                      >
                        {short(log.transactionHash!)} ↗
                      </a>
                    ) : (
                      <span title={log.transactionHash || ""}>
                        {short(log.transactionHash || "")}
                      </span>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
          <div className="details-grid">
            <div className="small-card">
              <h3>Transparent by design</h3>
              <dl>
                <div>
                  <dt>High-water mark</dt>
                  <dd>{money(number(basket.hwm, 18), 4)}</dd>
                </div>
                <div>
                  <dt>Creator performance fee</dt>
                  <dd>{percent(basket.fee)}</dd>
                </div>
                <div>
                  <dt>Withdrawal fee</dt>
                  <dd>0.10%</dd>
                </div>
                <div>
                  <dt>Withdrawal treasury</dt>
                  <dd>
                    <AddressLink
                      address={basket.treasury}
                      chainId={config!.chainId}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Creator fee shares minted</dt>
                  <dd>
                    {number(basket.feeSharesMinted, 18).toLocaleString(
                      undefined,
                      { maximumFractionDigits: 6 },
                    )}{" "}
                    {basket.symbol}
                  </dd>
                </div>
                <div>
                  <dt>Pending creator fee shares</dt>
                  <dd>
                    {basket.healthy
                      ? `${number(basket.pendingFeeShares, 18).toFixed(6)} ${basket.symbol}`
                      : "Oracle unavailable"}
                  </dd>
                </div>
                <div>
                  <dt>Pending fee dilution</dt>
                  <dd>
                    {basket.healthy && basket.supply > 0n
                      ? `${(Number((basket.pendingFeeShares * 1000000n) / (basket.supply + basket.pendingFeeShares)) / 10000).toFixed(2)}%`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Creator</dt>
                  <dd>
                    <AddressLink
                      address={basket.creator}
                      chainId={config!.chainId}
                    />
                  </dd>
                </div>
              </dl>
              <p>
                Profit-only, fund-level high-water mark. Healthy-feed in-kind
                exits crystallize pending creator fees. Stale-feed exits pay the
                full net pro-rata slice immediately and may avoid uncrystallized
                creator fees.
              </p>
            </div>
            <div className="small-card">
              <h3>Boundaries built in</h3>
              <dl>
                <div>
                  <dt>Maximum asset weight</dt>
                  <dd>50%</dd>
                </div>
                <div>
                  <dt>Maximum turnover / rebalance</dt>
                  <dd>20%</dd>
                </div>
                <div>
                  <dt>Minimum rebalance interval</dt>
                  <dd>5 minutes</dd>
                </div>
                <div>
                  <dt>Manual weight-change delay</dt>
                  <dd>10 minutes</dd>
                </div>
              </dl>
              <p>
                Allocation and execution limits are enforced by the vault,
                independently of the strategy.
              </p>
            </div>
          </div>
          {account?.toLowerCase() === basket.creator.toLowerCase() && (
            <CreatorControls
              key={basket.address}
              basket={basket}
              disabled={Boolean(busy)}
              submit={(fn, args) =>
                run("Manage weights", (submit) =>
                  submit(basket.address, vaultAbi, fn, args),
                )
              }
            />
          )}
          {config?.adapter && basket.address === config.flagship && (
            <>
              <div className="small-card">
                <h3>Live flagship pool / oracle comparison</h3>
                {hookSnapshot ? (
                  <dl>
                    <div>
                      <dt>Pool price (mUSDC / FUND)</dt>
                      <dd>{number(hookSnapshot[0], 18).toFixed(6)}</dd>
                    </div>
                    <div>
                      <dt>Underlying NAV / FUND</dt>
                      <dd>
                        {hookSnapshot[2]
                          ? number(hookSnapshot[1], 18).toFixed(6)
                          : "Unhealthy oracle"}
                      </dd>
                    </div>
                    <div>
                      <dt>Band around NAV</dt>
                      <dd>±1%</dd>
                    </div>
                    <div>
                      <dt>Sell FUND fee</dt>
                      <dd>
                        {hookSnapshot[2]
                          ? `${(hookSnapshot[3] / 10000).toFixed(2)}%`
                          : "Unavailable"}
                      </dd>
                    </div>
                    <div>
                      <dt>Buy FUND fee</dt>
                      <dd>
                        {hookSnapshot[2]
                          ? `${(hookSnapshot[4] / 10000).toFixed(2)}%`
                          : "Unavailable"}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p>{model.hookError || "Pool data is loading."}</p>
                )}
              </div>
              <HookTrading
                basket={basket}
                usdc={usdc!.address}
                disabled={Boolean(busy || !account || !basket.healthy)}
                run={(input, output, value, min) =>
                  run("Flagship pool swap", async (submit) => {
                    await submit(input, tokenAbi, "approve", [
                      config.adapter!,
                      value,
                    ]);
                    await submit(config.adapter!, adapterAbi, "swap", [
                      input,
                      output,
                      value,
                      min,
                      account!,
                    ]);
                  })
                }
              />
            </>
          )}
        </>
      )}
    </>
  );
}
