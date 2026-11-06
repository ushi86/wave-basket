import { Droplets } from "lucide-react";
import { tokenAbi } from "../../../shared/abi";
import { AddressLink, PageTitle } from "../components/Common";
import type { WaveProtocolModel } from "../hooks/useWaveProtocol";
export function FaucetPage({ model }: { model: WaveProtocolModel }) {
  const { config, busy, ready, account, connect, run } = model;
  return (
    <>
      <PageTitle
        eyebrow="SETTINGS / DEMO SETUP"
        title="A little preparation."
      />
      <p className="setup-intro">
        Prepare your demo wallet here before presenting. Faucets are optional
        setup tools, not the start of the basket journey.
      </p>
      <div className="small-card faucet-card">
        <div className="faucet-illustration">
          <Droplets size={44} />
        </div>
        <h2>Test tokens. No real value.</h2>
        <p>
          Claim mock tokens once per hour per wallet. You’ll also need{" "}
          {config?.chainId === 31337 ? "local demo" : "Sepolia"} ETH for gas.
        </p>
        {config?.tokens.length ? (
          config.tokens.map((t) => (
            <div className="faucet-row" key={t.address}>
              <div>
                <strong>{t.symbol}</strong>
                <AddressLink address={t.address} chainId={config.chainId} />
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
          rate-limit revert means your wallet must wait until its next claim
          time.
        </p>
      </div>
    </>
  );
}
