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
import { BasketCard, PlannedCollections } from "../components/BasketCard";
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
  const [amount, setAmount] = useState("100");
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
      <PageTitle
        eyebrow="A LITTLE LESS TO MANAGE"
        title="Token baskets, in balance."
      >
        <button className="text-button" onClick={() => navigate("portfolio")}>
          My portfolio <ArrowUpRight size={16} />
        </button>
      </PageTitle>
      <section className="wave-hero">
        <div className="wave-hero-copy">
          <span className="eyebrow">ONE TOKEN. A WHOLE BASKET.</span>
          <h2>
            Put in $100.
            <br />
            Find your balance.
          </h2>
          <p>
            Choose a basket. Your deposit is split across its assets through
            Uniswap v4. See what you own, how it’s valued, and when its
            allocation changes.
          </p>
          <div className="hero-cta-row">
            <button
              className="button primary"
              disabled={!basket || !ready}
              onClick={() => {
                setAction("deposit");
                setAmount("100");
                document
                  .getElementById("basket-detail")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Put in $100 <ArrowRight size={17} />
            </button>
            <span>100 test mUSDC · You confirm every transaction</span>
          </div>
          <small>
            Testnet demo · Mock assets · Unaudited · No promised returns
          </small>
        </div>
        <div className="wave-hero-visual">
          <div className="visual-wave" aria-hidden="true">
            <Waves size={44} strokeWidth={1.25} />
          </div>
          <span className="eyebrow">MANY ASSETS. ONE POSITION.</span>
          <h3>
            A portfolio,
            <br />
            with a little more flow.
          </h3>
          <div className="journey-step">
            <span>01</span>
            <div>
              <b>Choose your basket</b>
              <small>Know the assets and the fees</small>
            </div>
            <Layers size={18} />
          </div>
          <div className="journey-step">
            <span>02</span>
            <div>
              <b>Let the allocation happen</b>
              <small>Onchain swaps, visible holdings</small>
            </div>
            <ArrowRight size={18} />
          </div>
          <div className="journey-step">
            <span>03</span>
            <div>
              <b>Stay in the picture</b>
              <small>Watch NAV, weights and activity</small>
            </div>
            <Activity size={18} />
          </div>
        </div>
      </section>
      <section className="partner-cards" aria-label="Three things in balance">
        <article>
          <span>01 / FAIR VALUE</span>
          <h3>Every swap has a reference.</h3>
          <p>
            Uniswap v4 executes swaps. NavGuardHook adjusts the approved pool’s
            fee relative to Chainlink-based NAV.
          </p>
          <b>Uniswap Foundation</b>
        </article>
        <article>
          <span>02 / TARGET ALLOCATION</span>
          <h3>A clear direction. Hard limits.</h3>
          <p>
            Chainlink feeds value the basket. CRE proposes bounded rebalances; a
            run can correctly hold or fail.
          </p>
          <b>Chainlink</b>
        </article>
        <article>
          <span>03 / PRIVATE VISIBILITY</span>
          <h3>Less exposure while you look.</h3>
          <p>
            Anon-RPC is the default for Sepolia app reads. Onchain holdings stay
            public. Local demo reads are direct.
          </p>
          <b>Ethereum Foundation / Anon-RPC</b>
        </article>
      </section>
      <div className="metrics-row">
        <div>
          <span>Total basket value</span>
          <strong>
            {ready &&
            !loading &&
            baskets.length > 0 &&
            baskets.every((b) => b.healthy)
              ? money(totalNav)
              : "—"}
          </strong>
          <small>Oracle-valued underlying assets</small>
        </div>
        <div>
          <span>Onchain baskets</span>
          <strong>
            {ready ? String(baskets.length).padStart(2, "0") : "—"}
          </strong>
          <small>Loaded from the configured factory</small>
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
          <p>
            Your available baskets. Actual holdings, clear fees, onchain state.
          </p>
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
      <div className="collection-grid">
        {baskets.map((b) => (
          <BasketCard
            key={b.address}
            basket={b}
            chainId={config?.chainId ?? 0}
            symbol={(a) => token(a)?.symbol || short(a)}
            selected={basket?.address === b.address}
            onSelect={() => {
              setSelected(b.address);
              setOlder([]);
              document
                .getElementById("basket-detail")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        ))}
        {!baskets.length && (
          <div className="empty-collection">
            <Layers size={28} />
            <h3>
              {loading ? "Reading your baskets…" : "No baskets available"}
            </h3>
            <p>
              {loading
                ? "Loading holdings and NAV from the configured chain."
                : "A verified deployment is needed before a basket can accept deposits. No example balances are shown."}
            </p>
          </div>
        )}
      </div>
      <PlannedCollections />
      <section id="basket-detail" className="basket-layout">
        <div className="basket-panel">
          <div className="basket-heading">
            <div className="basket-avatar">
              <Layers size={22} />
            </div>
            <div>
              <h2>{basket?.name || "Choose an available basket"}</h2>
              <span>
                {basket?.symbol || "—"} <span className="separator">·</span>{" "}
                {basket?.assets.length ?? 0} underlying assets
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
                Performance fee <b>{basket ? percent(basket.fee) : "—"}</b>
              </span>
            </div>
          </div>
          <div className="allocation">
            <div
              className="allocation-chart"
              role="img"
              aria-label={`Target allocation: ${(basket?.targets || []).map((w, i) => `${basket ? token(basket.assets[i])?.symbol : ["WETH", "WBTC", "LINK"][i]} ${percent(w)}`).join(", ")}`}
              style={{
                background: `conic-gradient(${(basket?.targets || []).map((_, i, arr) => `${colors[i]} ${arr.slice(0, i).reduce((a, b) => a + b, 0) / 100}% ${arr.slice(0, i + 1).reduce((a, b) => a + b, 0) / 100}%`).join(",")})`,
              }}
            >
              <div>
                <Layers size={20} />
                <strong>{basket?.assets.length ?? 0}</strong>
                <span>ASSETS</span>
              </div>
            </div>
            <div className="allocation-legend">
              <div className="eyebrow">TARGET ALLOCATION</div>
              {(basket?.assets || []).map((a, i) => (
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
                  <b>{percent(basket?.targets[i] ?? 0)}</b>
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
                ? "Put your basket in motion."
                : action === "kind"
                  ? "Take the assets with you."
                  : "Your basket, your exit."}
            </h3>
            <p>
              {action === "deposit"
                ? "Start with 100 test mUSDC, or choose your own amount. Review before you confirm."
                : action === "kind"
                  ? "Receive underlying tokens without swaps, even when feeds are stale."
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
                {action === "deposit" ? "mUSDC" : basket?.symbol || "—"}
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
                ? "Healthy feeds: creator fees crystallize. Stale feeds: full net pro-rata exit, no reserve withheld; uncrystallized creator fees can be avoided."
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
