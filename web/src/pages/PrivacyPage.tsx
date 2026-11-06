import { AlertCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { PageTitle } from "../components/Common";
import type { WaveProtocolModel } from "../hooks/useWaveProtocol";
import { errorText } from "../lib/format";
export function PrivacyPage({ model }: { model: WaveProtocolModel }) {
  const { session, privacy, privacyError, meter, statusLabel, setError } =
    model;
  const [directBlock, setDirectBlock] = useState("");
  const [privateBlock, setPrivateBlock] = useState("");
  const [failureResult, setFailureResult] = useState("");
  return (
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
              Worker startup: {(session.bootTimeMs / 1000).toFixed(2)} seconds.
            </small>
          )}
        </div>
      </div>
      <div className="small-card">
        <h3>Measurement and failure test</h3>
        <p>
          Export actual session observations. Local, partial, dirty-build, and
          worker-only sessions are labeled and cannot satisfy the Sepolia
          lifecycle gate. Screenshots and a genuine CRE CLI log must be
          collected separately.
        </p>
        <div className="button-row">
          <button
            className="button secondary"
            disabled={!session}
            onClick={() => {
              const filename = `session-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
              const data = session!.exportMeasurement(
                `docs/privacy/${filename}`,
              );
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(data, null, 2) + "\n"], {
                  type: "application/json",
                }),
              );
              const link = document.createElement("a");
              link.href = url;
              link.download = filename;
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 0);
            }}
          >
            Export session measurement
          </button>
          <button
            className="button secondary"
            disabled={!session || privacy !== "ready"}
            onClick={async () => {
              try {
                const result = await session!.testFailClosed();
                setFailureResult(
                  `Private read failed: ${result.privateReadFailed}. Direct successes: ${result.directBefore} → ${result.directAfter}. Reload to reconnect.`,
                );
              } catch (error) {
                setError(errorText(error));
              }
            }}
          >
            Stop worker and test fail-closed
          </button>
        </div>
        {failureResult && <p role="status">{failureResult}</p>}
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
            {meter.coverage.toFixed(1)}% of successful app RPC calls were
            anonymous. Bootstrap and direct successes are included in the
            denominator. Each call inside a batch is counted separately.
          </p>
          <p>
            {meter.attempted} attempted calls in this page session. Errors and
            retries stay visible; they never count as successful anonymous
            reads.
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
          {privateBlock && <p>Private read result: block {privateBlock}.</p>}
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
              Your wallet signs, broadcasts, and uses its own RPC independently.
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
  );
}
