import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  Layers,
  LayoutGrid,
  Wallet,
  ShieldCheck,
  Waves,
  Plus,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  Check,
  Clock,
  AlertCircle,
  Droplets,
  X,
  Copy,
  Activity,
} from "lucide-react";
import {
  formatUnits,
  parseUnits,
  isAddress,
  type Address,
  type Hash,
} from "viem";
import { factoryAbi, vaultAbi, tokenAbi, adapterAbi } from "../../shared/abi";
import { loadDeployment, type Deployment } from "./lib/config";
import {
  createChainSession,
  type ChainSession,
  type PrivacyState,
} from "./lib/chain";
import { loadBaskets, loadOlderHistory, type Basket } from "./lib/baskets";
import type { PrivacySnapshot } from "./lib/privacy";

const short = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`;
const number = (amount: bigint, decimals = 6) =>
  Number(formatUnits(amount, decimals));
const money = (amount: number, maximumFractionDigits = 2) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(amount);
const percent = (bps: number) => `${(bps / 100).toFixed(bps % 100 ? 2 : 0)}%`;
const colors = ["#257b63", "#89b6a0", "#d6c9a6", "#9ea6c9"];
const emptyMeter: PrivacySnapshot = {
  anon: 0,
  bootstrap: 0,
  direct: 0,
  failed: 0,
  attempted: 0,
  coverage: 0,
  byMethod: {},
};
type Page = "baskets" | "portfolio" | "create" | "privacy" | "faucet";
type Transaction = {
  label: string;
  status: "waiting" | "pending" | "confirmed" | "error";
  hash?: Hash;
  error?: string;
};
function errorText(error: unknown) {
  const e = error as { shortMessage?: string; message?: string };
  return e.shortMessage || e.message || String(error);
}
function PageTitle({
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
function AddressLink({
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
export function App() {
  const [session, setSession] = useState<ChainSession>();
  const [config, setConfig] = useState<Deployment>();
  const [privacy, setPrivacy] = useState<PrivacyState>("booting");
  const [privacyError, setPrivacyError] = useState("");
  const [meter, setMeter] = useState(emptyMeter);
  const [account, setAccount] = useState<Address>();
  const [baskets, setBaskets] = useState<Basket[]>([]);
  const [selected, setSelected] = useState<Address>();
  const [page, setPage] = useState<Page>(
    () => (location.hash.slice(1) as Page) || "baskets",
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tx, setTx] = useState<Transaction>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [action, setAction] = useState<"deposit" | "redeem" | "kind">(
    "deposit",
  );
  const [amount, setAmount] = useState("");
  const [directBlock, setDirectBlock] = useState("");
  const [privateBlock, setPrivateBlock] = useState("");
  const [older, setOlder] = useState<string[]>([]);
  const [olderLoading, setOlderLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<bigint>();
  useEffect(() => {
    let alive = true;
    let current: ChainSession | undefined;
    loadDeployment()
      .then((c) => {
        if (!alive) return;
        setConfig(c);
        current = createChainSession(c, (state, message) => {
          if (alive) {
            setPrivacy(state);
            setPrivacyError(message || "");
          }
        });
        setSession(current);
      })
      .catch((e) => setError(errorText(e)));
    return () => {
      alive = false;
      current?.close();
    };
  }, []);
  useEffect(() => {
    const listener = () =>
      setPage(
        (["baskets", "portfolio", "create", "privacy", "faucet"].includes(
          location.hash.slice(1),
        )
          ? location.hash.slice(1)
          : "baskets") as Page,
      );
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  useEffect(() => {
    if (!session) return;
    setMeter(session.meter.snapshot());
    return session.meter.subscribe(() => setMeter(session.meter.snapshot()));
  }, [session]);
  useEffect(() => {
    const provider = window.ethereum;
    if (!provider?.on) return;
    const reset = () => {
      setAccount(undefined);
      setWalletBalance(undefined);
      setRefreshKey((k) => k + 1);
    };
    provider.on("accountsChanged", reset);
    provider.on("chainChanged", reset);
    return () => {
      provider.removeListener?.("accountsChanged", reset);
      provider.removeListener?.("chainChanged", reset);
    };
  }, []);
  useEffect(() => {
    if (!session || !config?.factory || !["ready", "local"].includes(privacy))
      return;
    let alive = true;
    let busy = false;
    const refresh = async () => {
      if (busy) return;
      busy = true;
      setLoading(true);
      try {
        const data = await loadBaskets(session, account);
        if (alive) {
          setBaskets(data);
          setError("");
        }
        if (account) {
          const usdc = config.tokens.find((t) => t.symbol === "mUSDC");
          if (usdc) {
            const balance = await session.client.readContract({
              address: usdc.address,
              abi: tokenAbi,
              functionName: "balanceOf",
              args: [account],
            });
            if (alive) setWalletBalance(balance);
          }
        }
      } catch (e) {
        if (alive) setError(errorText(e));
      } finally {
        busy = false;
        if (alive) setLoading(false);
      }
    };
    refresh();
    const interval = setInterval(refresh, 15_000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [session, config, privacy, account, refreshKey]);
  const basket =
    baskets.find((b) => b.address === selected) ||
    baskets.find((b) => b.address === config?.flagship) ||
    baskets[0];
  const token = (address: string) =>
    config?.tokens.find(
      (t) => t.address.toLowerCase() === address.toLowerCase(),
    );
  const usdc = config?.tokens.find((t) => t.symbol === "mUSDC");
  const navigate = (p: Page) => {
    location.hash = p;
    setPage(p);
    setError("");
  };
  const connect = async () => {
    try {
      if (!session) throw new Error("Configuration is still loading");
      const { account } = await session.connect();
      setAccount(account);
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  };
  const run = async (
    label: string,
    work: (
      submit: (
        address: Address,
        abi:
          | typeof tokenAbi
          | typeof vaultAbi
          | typeof factoryAbi
          | typeof adapterAbi,
        fn: string,
        args: readonly unknown[],
      ) => Promise<void>,
    ) => Promise<void>,
  ) => {
    if (!session || !account) {
      setError("Connect a wallet first");
      return;
    }
    if (tx?.status === "pending" || tx?.status === "waiting") return;
    setTx({ label, status: "waiting" });
    setError("");
    try {
      await work(async (address, abi, fn, args) => {
        setTx({ label: `${label} · ${fn}`, status: "waiting" });
        const hash = await session.send(address, abi, fn, args, account);
        setTx({ label, status: "pending", hash });
        const receipt = await session.client.waitForTransactionReceipt({
          hash,
          timeout: 180_000,
        });
        if (receipt.status !== "success")
          throw new Error("Transaction reverted");
        setTx({ label, status: "confirmed", hash });
      });
      setRefreshKey((k) => k + 1);
      setAmount("");
    } catch (e) {
      setTx((t) => ({ ...t!, status: "error", error: errorText(e) }));
    }
  };
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
          else
            await submit(basket.address, vaultAbi, "redeem", [
              shares,
              (((shares * basket.price) / 10n ** 30n) * 989n) / 1000n,
              account,
            ]);
        }
      },
    );
  };
  const busy = tx?.status === "pending" || tx?.status === "waiting";
  const ready = Boolean(
    config?.factory && ["ready", "local"].includes(privacy),
  );
  const totalNav = baskets.reduce((sum, b) => sum + number(b.nav), 0);
  const totalPosition = baskets.reduce(
    (sum, b) => sum + number(b.balance, 18) * number(b.price, 18),
    0,
  );
  const statusLabel =
    privacy === "local"
      ? "Local · direct reads"
      : privacy === "ready"
        ? meter.direct
          ? "Direct read used"
          : "Private reads active"
        : privacy === "failed"
          ? "Private reads unavailable"
          : "Connecting privately";
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("Clipboard unavailable. Copy the full address from its link.");
    }
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="#baskets" className="brand" aria-label="Wave Protocol home">
          <span className="brand-icon">
            <Waves size={25} />
          </span>
          <span>
            Wave<span className="brand-sub">PROTOCOL</span>
          </span>
        </a>
        <div className="nav-label">YOUR HORIZON</div>
        <nav aria-label="Main navigation">
          {(
            [
              { id: "baskets", label: "Explore baskets", icon: LayoutGrid },
              { id: "portfolio", label: "My portfolio", icon: Wallet },
              { id: "create", label: "Create a basket", icon: Plus },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "nav-item active" : "nav-item"}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={18} />
              {item.label}
              {page === item.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="nav-label second">UNDER THE SURFACE</div>
        <nav aria-label="Tools">
          <button
            className={`nav-item ${page === "privacy" ? "active" : ""}`}
            onClick={() => navigate("privacy")}
          >
            <ShieldCheck size={18} />
            Privacy center
          </button>
          <button
            className={`nav-item ${page === "faucet" ? "active" : ""}`}
            onClick={() => navigate("faucet")}
          >
            <Droplets size={18} />
            Testnet faucet
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="testnet-note">
            <span className="tiny-dot" /> BUILT ON ETHEREUM
            <span>Testnet assets. Real mechanics.</span>
          </div>
          <div className="sidebar-foot">
            <span>Wave Protocol</span>
            <span>v0.1 ↗</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Protocol <span>/</span>{" "}
            {page === "baskets"
              ? "Explore"
              : page.charAt(0).toUpperCase() + page.slice(1)}
          </div>
          <div className="top-actions">
            <span className="network-pill">
              <span className="tiny-dot" />
              {config?.name || "Sepolia"}
              <ChevronDown size={12} />
            </span>
            <button
              aria-label={statusLabel}
              className={`privacy-pill ${privacy === "ready" && !meter.direct ? "private" : "amber"}`}
              onClick={() => navigate("privacy")}
            >
              <ShieldCheck size={14} />
              <span>{statusLabel}</span>
            </button>
            <button className="button connect" onClick={connect}>
              <Wallet size={15} />
              {account
                ? short(account)
                : config?.chainId === 31337
                  ? "Connect demo wallet"
                  : "Connect wallet"}
            </button>
          </div>
        </header>
        <main>
          {!config?.factory && (
            <div className="notice">
              <AlertCircle size={16} />
              <span>
                Deployment not configured. Run <code>npm run demo</code> for the
                local chain, or configure a Sepolia manifest.
              </span>
            </div>
          )}
          {config?.oracleMode === "demo" && (
            <div className="demo-strip">
              <span>
                <span className="tiny-dot" /> DEMO ORACLES
              </span>
              <span>
                Mock assets and prices ·{" "}
                {config.chainId === 31337
                  ? "Local chain reads are direct and counted."
                  : "Disposable Sepolia deployment."}
              </span>
            </div>
          )}
          {error && (
            <div role="alert" className="notice error">
              <AlertCircle size={17} />
              <span>{error}</span>
              <button
                className="icon-button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {page === "baskets" && (
            <>
              <PageTitle
                eyebrow="DIVERSIFY WITH INTENTION"
                title="Find your balance."
              >
                <button
                  className="button secondary"
                  onClick={() => navigate("create")}
                >
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
                    {ready && baskets.every((b) => b.healthy)
                      ? money(totalNav)
                      : "—"}
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
                    baskets
                      .filter((b) => b.balance > 0n)
                      .every((b) => b.healthy)
                      ? money(totalPosition)
                      : "—"}
                  </strong>
                  <small>
                    {account
                      ? "Across all Wave baskets"
                      : "Connect a wallet to view"}
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
                      className={
                        basket?.address === b.address ? "selected" : ""
                      }
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
                        {basket?.symbol || "FUND"}{" "}
                        <span className="separator">·</span>{" "}
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
                        {basket?.healthy
                          ? money(number(basket.price, 18), 4)
                          : "—"}
                      </strong>
                      <small>Priced from underlying holdings</small>
                    </div>
                    <div className="mini-summary">
                      <span>Basket NAV</span>
                      <strong>
                        {basket?.healthy ? money(number(basket.nav)) : "—"}
                      </strong>
                      <span>
                        Performance fee{" "}
                        <b>{basket ? percent(basket.fee) : "10%"}</b>
                      </span>
                    </div>
                  </div>
                  <div className="allocation">
                    <div
                      className="allocation-chart"
                      role="img"
                      aria-label={`Target allocation: ${(basket?.targets || [4000, 3500, 2500]).map((w, i) => `${basket ? token(basket.assets[i])?.symbol : ["WETH", "WBTC", "LINK"][i]} ${percent(w)}`).join(", ")}`}
                      style={{
                        background: `conic-gradient(${(basket?.targets || [4000, 3500, 2500]).map((w, i, arr) => `${colors[i]} ${arr.slice(0, i).reduce((a, b) => a + b, 0) / 100}% ${arr.slice(0, i + 1).reduce((a, b) => a + b, 0) / 100}%`).join(",")})`,
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
                      {(basket?.assets || ["ETH", "BTC", "LINK"]).map(
                        (a, i) => (
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
                            <b>
                              {percent(
                                basket?.targets[i] || [4000, 3500, 2500][i],
                              )}
                            </b>
                          </div>
                        ),
                      )}
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
                      <AddressLink
                        address={basket.address}
                        chainId={config.chainId}
                      />
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
                      {action === "deposit"
                        ? "You deposit"
                        : "Shares to redeem"}
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
                        {action === "deposit"
                          ? "mUSDC"
                          : basket?.symbol || "FUND"}
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
                          onClick={() =>
                            setAmount(formatUnits(basket.balance, 18))
                          }
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
                              : "Oracle quote − 1.1%"}
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
                        ? "No performance fee crystallization on in-kind exit."
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
                            <th>NAV after</th>
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
                              <td>{money(number(row.navAfter))}</td>
                              <td>
                                <span title={row.reasonHash}>
                                  {short(row.reasonHash)}
                                </span>
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
                            A successful CRE report will appear here after
                            confirmation.
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
                              const logs = await loadOlderHistory(
                                session,
                                basket,
                              );
                              setOlder(
                                logs.map(
                                  (log) =>
                                    `#${String((log.args.id || 0n) + 1n)} · ${log.transactionHash}`,
                                ),
                              );
                            } catch (e) {
                              setError(errorText(e));
                            } finally {
                              setOlderLoading(false);
                            }
                          }}
                        >
                          {olderLoading
                            ? "Loading events…"
                            : "Load older events"}
                        </button>
                        {older.map((row) => (
                          <div key={row}>{row}</div>
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
                        Profit-only, fund-level high-water mark. In-kind exits
                        do not crystallize outstanding performance fees.
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
                        Allocation and execution limits are enforced by the
                        vault, independently of the strategy.
                      </p>
                    </div>
                  </div>
                  {account?.toLowerCase() === basket.creator.toLowerCase() && (
                    <CreatorControls
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
                  )}
                </>
              )}
            </>
          )}
          {page === "portfolio" && (
            <>
              <PageTitle
                eyebrow="YOUR POSITION"
                title="A view of what’s yours."
              />
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
                              ? money(
                                  number(b.balance, 18) * number(b.price, 18),
                                )
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
          )}
          {page === "create" && (
            <>
              <PageTitle
                eyebrow="BUILD YOUR OWN"
                title="A basket with your perspective."
              />
              <CreateBasket
                config={config}
                ready={ready}
                disabled={Boolean(busy)}
                connected={Boolean(account)}
                onConnect={connect}
                onCreate={(name, symbol, assets, weights, fee, seed) =>
                  run("Create basket", async (submit) => {
                    if (!config?.factory || !usdc)
                      throw new Error("Deployment unavailable");
                    await submit(usdc.address, tokenAbi, "approve", [
                      config.factory,
                      seed,
                    ]);
                    await submit(config.factory, factoryAbi, "createBasket", [
                      name,
                      symbol,
                      assets,
                      weights,
                      fee,
                      seed,
                    ]);
                    navigate("baskets");
                  })
                }
              />
            </>
          )}
          {page === "privacy" && (
            <>
              <PageTitle
                eyebrow="PRIVACY, MADE VISIBLE"
                title="Know where your reads go."
              />
              <div
                className={`privacy-banner ${privacy === "ready" && !meter.direct ? "" : "warning"}`}
              >
                <ShieldCheck size={28} />
                <div>
                  <h2>{statusLabel}</h2>
                  <p>
                    {privacy === "local"
                      ? "This local demo talks directly to your loopback Anvil node. It does not claim anonymous routing."
                      : privacy === "ready"
                        ? "Application reads use the hash-pinned Anon-RPC worker by default."
                        : "Application reads are paused until the private worker is ready."}
                  </p>
                  {privacyError && <small>{privacyError}</small>}
                  {session?.bootTimeMs !== undefined && (
                    <small>
                      Worker startup: {(session.bootTimeMs / 1000).toFixed(2)}{" "}
                      seconds.
                    </small>
                  )}
                </div>
              </div>
              <div className="metrics-row privacy-metrics">
                {[
                  { label: "Anonymized reads", value: meter.anon },
                  { label: "Bootstrap reads", value: meter.bootstrap },
                  { label: "Explicit direct reads", value: meter.direct },
                  { label: "Failed attempts", value: meter.failed },
                ].map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
              <div className="details-grid">
                <div className="small-card">
                  <h3>What the meter measures</h3>
                  <p>
                    {meter.coverage.toFixed(1)}% of successful app RPC calls
                    were anonymous. Bootstrap and direct successes are included
                    in the denominator. Each call inside a batch is counted
                    separately.
                  </p>
                  <p>
                    {meter.attempted} attempted calls in this page session.
                    Errors and retries stay visible; they never count as
                    successful anonymous reads.
                  </p>
                  <button
                    className="button secondary"
                    disabled={!session || privacy !== "ready"}
                    onClick={async () => {
                      try {
                        setPrivateBlock(
                          String(
                            await session!.client.getBlockNumber({
                              cacheTime: 0,
                            }),
                          ),
                        );
                      } catch (e) {
                        setError(errorText(e));
                      }
                    }}
                  >
                    Check private connection
                  </button>
                  {privateBlock && (
                    <p>Private read result: block {privateBlock}.</p>
                  )}
                  <button
                    className="button secondary"
                    disabled={!session}
                    onClick={async () => {
                      try {
                        setDirectBlock(await session!.readBlockDirectlyOnce());
                      } catch (e) {
                        setError(errorText(e));
                      }
                    }}
                  >
                    <AlertCircle size={15} />
                    Read block directly once
                  </button>
                  {directBlock && (
                    <p>
                      Explicit direct result: block {directBlock}. This does not
                      authorize any other read.
                    </p>
                  )}
                </div>
                <div className="small-card">
                  <h3>The boundaries of privacy</h3>
                  <ul>
                    <li>
                      Worker-specifier bootstrap reads use the configured direct
                      provider.
                    </li>
                    <li>
                      Your wallet signs, broadcasts, and uses its own RPC
                      independently.
                    </li>
                    <li>CRE runs off-browser and is outside this meter.</li>
                    <li>On-chain balances and transactions remain public.</li>
                    <li>A failure never silently switches to direct reads.</li>
                  </ul>
                </div>
              </div>
              <div className="section-heading">
                <h2>Traffic by method</h2>
                <span className="subtle-tag">This page session</span>
              </div>
              <div className="table-card">
                <table>
                  <thead>
                    <tr>
                      <th>Route : method</th>
                      <th>Attempted</th>
                      <th>Successful</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(meter.byMethod).map(([method, count]) => (
                      <tr key={method}>
                        <td>
                          <code>{method}</code>
                        </td>
                        <td>{count.attempted}</td>
                        <td>{count.successful}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!meter.attempted && (
                  <div className="empty-row">No RPC traffic recorded yet.</div>
                )}
              </div>
            </>
          )}
          {page === "faucet" && (
            <>
              <PageTitle eyebrow="A PLACE TO START" title="Test the waters." />
              <div className="small-card faucet-card">
                <div className="faucet-illustration">
                  <Droplets size={44} />
                </div>
                <h2>Test tokens. No real value.</h2>
                <p>
                  Claim mock tokens once per hour per wallet. You’ll also need{" "}
                  {config?.chainId === 31337 ? "local demo" : "Sepolia"} ETH for
                  gas.
                </p>
                {config?.tokens.length ? (
                  config.tokens.map((t) => (
                    <div className="faucet-row" key={t.address}>
                      <div>
                        <strong>{t.symbol}</strong>
                        <AddressLink
                          address={t.address}
                          chainId={config.chainId}
                        />
                      </div>
                      <button
                        className="button secondary"
                        disabled={Boolean(busy || !ready)}
                        onClick={() =>
                          account
                            ? run(`Claim ${t.symbol}`, (submit) =>
                                submit(t.address, tokenAbi, "faucet", []),
                              )
                            : connect()
                        }
                      >
                        <Droplets size={14} />
                        {account ? "Claim tokens" : "Connect wallet"}
                      </button>
                    </div>
                  ))
                ) : (
                  <p>Configure a deployment to enable the faucet.</p>
                )}
                <p className="muted">
                  These tokens do not represent real USDC, ETH, BTC, or LINK. A
                  rate-limit revert means your wallet must wait until its next
                  claim time.
                </p>
              </div>
            </>
          )}
          <footer className="main-footer">
            <span>
              <Waves size={15} />
              Wave Protocol <span className="separator">·</span> Token baskets,
              in balance.
            </span>
            <span>Sepolia demo · No real assets or promised returns</span>
          </footer>
        </main>
      </div>
      {tx && (
        <div role="status" className={`transaction-toast ${tx.status}`}>
          <span className="toast-icon">
            {tx.status === "confirmed" ? (
              <Check size={18} />
            ) : tx.status === "error" ? (
              <AlertCircle size={18} />
            ) : (
              <RefreshCw size={18} className="spinning" />
            )}
          </span>
          <div>
            <strong>{tx.label}</strong>
            <p>
              {tx.status === "waiting"
                ? "Confirm in your wallet"
                : tx.status === "pending"
                  ? "Waiting for chain confirmation"
                  : tx.status === "confirmed"
                    ? "Confirmed on chain"
                    : tx.error}
            </p>
            {tx.hash &&
              (config?.chainId === 11155111 ? (
                <a
                  href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View transaction <ExternalLink size={12} />
                </a>
              ) : (
                <button className="text-button" onClick={() => copy(tx.hash!)}>
                  {short(tx.hash)}
                  <Copy size={12} />
                </button>
              ))}
          </div>
          {!busy && (
            <button
              className="icon-button"
              aria-label="Dismiss transaction"
              onClick={() => setTx(undefined)}
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
function Holdings({
  basket,
  tokenSymbol,
  tokenDecimals,
}: {
  basket: Basket;
  tokenSymbol: (a: Address) => string;
  tokenDecimals: (a: Address) => number;
}) {
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Under the surface</h2>
          <p>The assets that make up this basket.</p>
        </div>
        <span className="subtle-tag">On-chain holdings</span>
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Token balance</th>
              <th>Value (USD)</th>
              <th>Actual weight</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            {basket.assets.map((a, i) => (
              <tr key={a}>
                <td>
                  <span
                    className="asset-symbol"
                    style={{ background: colors[i] }}
                  >
                    {tokenSymbol(a).replace("mW", "").slice(0, 1)}
                  </span>
                  <strong>{tokenSymbol(a)}</strong>
                </td>
                <td>
                  {Number(
                    formatUnits(basket.balances[i], tokenDecimals(a)),
                  ).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </td>
                <td>
                  {basket.healthy ? money(number(basket.values[i], 18)) : "—"}
                </td>
                <td>
                  {basket.healthy ? (
                    <span className="weight-bar">
                      <i
                        style={{
                          width: `${basket.actual[i] / 100}%`,
                          background: colors[i],
                        }}
                      />
                      {percent(basket.actual[i])}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{percent(basket.targets[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function CreateBasket({
  config,
  ready,
  disabled,
  connected,
  onConnect,
  onCreate,
}: {
  config?: Deployment;
  ready: boolean;
  disabled: boolean;
  connected: boolean;
  onConnect: () => void;
  onCreate: (
    name: string,
    symbol: string,
    assets: Address[],
    weights: number[],
    fee: number,
    seed: bigint,
  ) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [seed, setSeed] = useState("10");
  const [fee, setFee] = useState("10");
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const tokens = config?.tokens || [];
  const assets = tokens.filter((t) => Number(weights[t.address]) > 0);
  const sum = assets.reduce((s, t) => s + Number(weights[t.address]), 0);
  const create = async () => {
    try {
      setError("");
      if (!name.trim() || !symbol.trim())
        throw new Error("Name and symbol are required");
      if (
        assets.length < 2 ||
        assets.length > 4 ||
        Math.abs(sum - 100) > 0.0001 ||
        assets.some((t) => Number(weights[t.address]) > 50)
      )
        throw new Error(
          "Choose 2–4 assets with positive weights up to 50%, totaling 100%",
        );
      const feeBps = Math.round(Number(fee) * 100);
      if (!Number.isFinite(feeBps) || feeBps < 0 || feeBps > 2000)
        throw new Error("Performance fee must be between 0% and 20%");
      const seedValue = parseUnits(seed, 6);
      if (seedValue < 10_000_000n) throw new Error("Minimum seed is 10 mUSDC");
      await onCreate(
        name.trim(),
        symbol.trim(),
        assets.map((t) => t.address),
        assets.map((t) => Math.round(Number(weights[t.address]) * 100)),
        feeBps,
        seedValue,
      );
    } catch (e) {
      setError(errorText(e));
    }
  };
  return (
    <div className="create-layout">
      <form
        className="small-card create-form"
        onSubmit={(e) => {
          e.preventDefault();
          connected ? create() : onConnect();
        }}
      >
        <h2>Define your basket</h2>
        <p>
          Each basket is an independent vault with enforceable allocation rules.
        </p>
        <div className="form-row">
          <label>
            Basket name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={64}
              placeholder="e.g. Wave Horizons"
              required
            />
          </label>
          <label>
            Share symbol
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              maxLength={12}
              placeholder="e.g. HRZN"
              required
            />
          </label>
        </div>
        <div className="form-label">
          Choose your allocation{" "}
          <span className={sum === 100 ? "valid" : ""}>
            {sum.toFixed(2)} / 100%
          </span>
        </div>
        {tokens.map((t, i) => (
          <label className="weight-input" key={t.address}>
            <span>
              <i className="legend-dot" style={{ background: colors[i] }} />
              {t.symbol}
            </span>
            <div>
              <input
                type="number"
                min="0"
                max="50"
                step="0.01"
                value={weights[t.address] || ""}
                placeholder="0"
                onChange={(e) =>
                  setWeights({ ...weights, [t.address]: e.target.value })
                }
              />
              %
            </div>
          </label>
        ))}
        <div className="form-row">
          <label>
            Creator performance fee (%)
            <input
              type="number"
              min="0"
              max="20"
              step="0.01"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
          </label>
          <label>
            Seed deposit (mUSDC)
            <input
              type="number"
              min="10"
              step="0.000001"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <button
          className="button primary full"
          type="submit"
          disabled={disabled || !ready}
        >
          {connected ? "Approve seed & create basket" : "Connect wallet"}
          <ArrowUpRight size={16} />
        </button>
      </form>
      <div className="small-card create-aside">
        <Layers size={28} />
        <h3>
          Your perspective.
          <br />
          Clear boundaries.
        </h3>
        <ul>
          <li>2–4 allowlisted assets</li>
          <li>Maximum 50% per asset</li>
          <li>Weights sum to 100%</li>
          <li>10 mUSDC minimum seed</li>
          <li>Profit-only creator fees, capped at 20%</li>
          <li>10-minute delay for manual target changes</li>
        </ul>
        <p>
          Only the flagship basket has a secondary-market hook pool. All baskets
          support deposits and both redemption modes.
        </p>
      </div>
    </div>
  );
}
function CreatorControls({
  basket,
  disabled,
  submit,
}: {
  basket: Basket;
  disabled: boolean;
  submit: (fn: string, args: readonly unknown[]) => Promise<void>;
}) {
  const [weights, setWeights] = useState(
    basket.targets.map((w) => String(w / 100)),
  );
  const [error, setError] = useState("");
  return (
    <div className="small-card creator-controls">
      <h3>Creator allocation controls</h3>
      <p>
        Proposing pauses automated rebalances until execution or cancellation.
        Execution activates targets; it does not trade assets.
      </p>
      <div className="form-row">
        {weights.map((w, i) => (
          <label key={i}>
            Asset {i + 1} (%)
            <input
              aria-label={`Proposed weight ${i + 1}`}
              type="number"
              min="0.01"
              max="50"
              step="0.01"
              value={w}
              onChange={(e) =>
                setWeights(
                  weights.map((x, j) => (i === j ? e.target.value : x)),
                )
              }
            />
          </label>
        ))}
      </div>
      <div className="button-row">
        <button
          className="button secondary"
          disabled={disabled}
          onClick={() => {
            const bps = weights.map((w) => Math.round(Number(w) * 100));
            if (
              bps.some((w) => !Number.isFinite(w) || w <= 0 || w > 5000) ||
              bps.reduce((a, b) => a + b, 0) !== 10000
            ) {
              setError(
                "Weights must be positive, at most 50%, and total 100%.",
              );
              return;
            }
            setError("");
            submit("proposeWeights", [bps]);
          }}
        >
          Propose weights
        </button>
        <button
          className="button secondary"
          disabled={
            disabled ||
            basket.eta === 0n ||
            Number(basket.eta) > Date.now() / 1000
          }
          onClick={() => submit("executeWeights", [])}
        >
          Execute after delay
        </button>
        <button
          className="text-button"
          disabled={disabled || basket.eta === 0n}
          onClick={() => submit("cancelWeights", [])}
        >
          Cancel proposal
        </button>
      </div>
      {error && <p className="field-error">{error}</p>}
      {basket.eta > 0n && (
        <p>
          Pending targets: {basket.pending.map(percent).join(" / ")} ·
          executable at {new Date(Number(basket.eta) * 1000).toLocaleString()}
        </p>
      )}
    </div>
  );
}
function HookTrading({
  basket,
  usdc,
  disabled,
  run,
}: {
  basket: Basket;
  usdc: Address;
  disabled: boolean;
  run: (
    input: Address,
    output: Address,
    value: bigint,
    min: bigint,
  ) => Promise<void>;
}) {
  const [buy, setBuy] = useState(true);
  const [amount, setAmount] = useState("");
  const [minimum, setMinimum] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="small-card hook-trading">
      <h3>
        Flagship secondary market{" "}
        <span className="subtle-tag">NavGuardHook</span>
      </h3>
      <p>
        Trade FUND against mUSDC on v4. Outside a 1% NAV band, swaps toward NAV
        pay 0.05% and swaps away pay 1%. Inside the band both directions pay
        0.05%. Fees use the price before the swap.
      </p>
      <div className="button-row">
        <button
          className={`button ${buy ? "primary" : "secondary"}`}
          onClick={() => {
            setBuy(true);
            setAmount("");
            setMinimum("");
          }}
        >
          Buy FUND
        </button>
        <button
          className={`button ${!buy ? "primary" : "secondary"}`}
          onClick={() => {
            setBuy(false);
            setAmount("");
            setMinimum("");
          }}
        >
          Sell FUND
        </button>
      </div>
      <div className="form-row">
        <label>
          Input ({buy ? "mUSDC" : "FUND"})
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label>
          Minimum output ({buy ? "FUND" : "mUSDC"})
          <input
            inputMode="decimal"
            value={minimum}
            onChange={(e) => setMinimum(e.target.value)}
          />
        </label>
      </div>
      <button
        className="button secondary"
        disabled={disabled}
        onClick={() => {
          try {
            const value = parseUnits(amount, buy ? 6 : 18);
            const min = parseUnits(minimum, buy ? 18 : 6);
            if (value <= 0n || min <= 0n)
              throw new Error(
                "Enter positive input and minimum output amounts",
              );
            setError("");
            run(
              buy ? usdc : basket.address,
              buy ? basket.address : usdc,
              value,
              min,
            );
          } catch (e) {
            setError(errorText(e));
          }
        }}
      >
        Approve & swap <ArrowRight size={15} />
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
