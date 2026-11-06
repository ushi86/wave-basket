import { factoryAbi, tokenAbi } from "../../../shared/abi";
import { CreateBasket } from "../components/BasketControls";
import { PageTitle } from "../components/Common";
import type { WaveProtocolModel } from "../hooks/useWaveProtocol";
import type { Page } from "../lib/navigation";
export function CreatePage({
  model,
  navigate,
}: {
  model: WaveProtocolModel;
  navigate: (page: Page) => void;
}) {
  const { config, ready, busy, account, connect, run, usdc } = model;
  return (
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
  );
}
