import { readFileSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  http,
  encodeAbiParameters,
  parseAbiParameters,
  parseAbi,
  keccak256,
  stringToHex,
} from "viem";
import { foundry, root } from "./foundry.mjs";
import { resolve } from "node:path";
const manifest = JSON.parse(
  readFileSync(resolve(root, "web/public/deployment.local.json"), "utf8"),
);
if (manifest.chainId !== 31337 || manifest.rpcUrl !== "http://127.0.0.1:8545")
  throw new Error("This report fixture is local-only");
const client = createPublicClient({ transport: http(manifest.rpcUrl) });
if ((await client.getChainId()) !== 31337)
  throw new Error("Local chain is not running");
const wallet = createWalletClient({ transport: http(manifest.rpcUrl) });
const [account] = await wallet.getAddresses();
const block = await client.getBlock();
const asOf = block.timestamp;
const abi = parseAbi([
  "function forward(address receiver,bytes metadata,bytes report)",
]);
const metadata = `0x${"1".padStart(64, "0")}${Buffer.from("wave").toString("hex").padEnd(20, "0")}${account.slice(2)}`;
const report = encodeAbiParameters(
  parseAbiParameters("address,uint64,uint16[],uint64,bytes32"),
  [
    manifest.flagship,
    (await client.readContract({
      address: manifest.receiver,
      abi: parseAbi(["function lastNonce(address) view returns(uint64)"]),
      functionName: "lastNonce",
      args: [manifest.flagship],
    })) + 1n,
    [4500, 3000, 2500],
    asOf,
    keccak256(
      stringToHex("Local deterministic report fixture — not a CRE simulation"),
    ),
  ],
);
const hash = await wallet.writeContract({
  account,
  chain: null,
  address: manifest.forwarder,
  abi,
  functionName: "forward",
  args: [manifest.receiver, metadata, report],
});
const receipt = await client.waitForTransactionReceipt({ hash });
if (receipt.status !== "success") throw new Error("Local rebalance reverted");
console.log(
  `Local report fixture accepted: ${hash}\nThis manually exercises the receiver/forwarder boundary. It is not CRE CLI simulation evidence.`,
);
