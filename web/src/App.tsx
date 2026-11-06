import {
  AlertCircle,
  Check,
  ChevronDown,
  Copy,
  Droplets,
  ExternalLink,
  LayoutGrid,
  Plus,
  RefreshCw,
  ShieldCheck,
  Wallet,
  Waves,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { type Address } from "viem";

import { useWaveProtocol } from "./hooks/useWaveProtocol";
import { short } from "./lib/format";
import type { Page } from "./lib/navigation";
import { CreatePage } from "./pages/CreatePage";
import { ExplorePage } from "./pages/ExplorePage";
import { FaucetPage } from "./pages/FaucetPage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { PrivacyPage } from "./pages/PrivacyPage";
export function App() {
  const model = useWaveProtocol();
  const {
    config,
    privacy,
    meter,
    error,
    setError,
    tx,
    setTx,
    busy,
    statusLabel,
    account,
    connect,
  } = model;
  const [selected, setSelected] = useState<Address>();
  const [page, setPage] = useState<Page>(
    () =>
      (["baskets", "portfolio", "create", "privacy", "faucet"].includes(
        location.hash.slice(1),
      )
        ? location.hash.slice(1)
        : "baskets") as Page,
  );
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
  const navigate = (p: Page) => {
    location.hash = p;
    setPage(p);
    setError("");
  };
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
            <ExplorePage
              model={model}
              selected={selected}
              onSelect={setSelected}
              navigate={navigate}
            />
          )}
          {page === "portfolio" && (
            <PortfolioPage
              model={model}
              onSelect={setSelected}
              navigate={navigate}
            />
          )}
          {page === "create" && (
            <CreatePage model={model} navigate={navigate} />
          )}
          {page === "privacy" && <PrivacyPage model={model} />}
          {page === "faucet" && <FaucetPage model={model} />}
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
