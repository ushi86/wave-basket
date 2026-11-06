import { ArrowRight, ArrowUpRight, Layers } from "lucide-react";
import { useState } from "react";
import { formatUnits, parseUnits, type Address } from "viem";
import type { Basket } from "../lib/baskets";
import type { Deployment } from "../lib/config";
import { colors, errorText, money, number, percent } from "../lib/format";
export function Holdings({
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
export function CreateBasket({
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
export function CreatorControls({
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
export function HookTrading({
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

export function PendingAllocation({
  basket,
  connected,
  disabled,
  tokenSymbol,
  execute,
}: {
  basket: Basket;
  connected: boolean;
  disabled: boolean;
  tokenSymbol: (address: Address) => string;
  execute: () => Promise<void>;
}) {
  if (basket.eta === 0n) return null;
  return (
    <section
      className="small-card creator-controls"
      aria-label="Pending allocation"
    >
      <h3>Pending allocation change</h3>
      <p>
        Proposed targets:{" "}
        {basket.pending
          .map(
            (weight, i) =>
              `${tokenSymbol(basket.assets[i])} ${percent(weight)}`,
          )
          .join(" · ")}
        .
      </p>
      <p>
        Executable after {new Date(Number(basket.eta) * 1000).toLocaleString()}.
        Automated rebalances are paused while this proposal is pending.
      </p>
      <button
        className="button secondary"
        disabled={
          disabled || !connected || Number(basket.eta) > Date.now() / 1000
        }
        onClick={execute}
      >
        {connected ? "Execute pending weights" : "Connect a wallet to execute"}
      </button>
    </section>
  );
}
