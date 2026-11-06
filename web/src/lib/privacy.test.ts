import { describe, it, expect } from "vitest";
import { PrivateRpc } from "./privacy";
describe("application privacy boundary", () => {
  it("never falls back on worker failure and authorizes exactly one direct read", async () => {
    let directCalls = 0;
    const direct = async () => {
      directCalls++;
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x1" }),
      );
    };
    const rpc = new PrivateRpc({
      anonymous: async () => {
        throw new Error("offline");
      },
      direct,
    });
    const payload = {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_blockNumber",
      }),
    };
    await expect(rpc.fetch("https://rpc.test", payload)).rejects.toThrow(
      "offline",
    );
    expect(directCalls).toBe(0);
    await rpc.readDirectlyOnce("https://rpc.test", payload);
    await expect(rpc.fetch("https://rpc.test", payload)).rejects.toThrow();
    expect(directCalls).toBe(1);
    expect(rpc.snapshot().direct).toBe(1);
  });
});

describe("traffic accounting", () => {
  it("counts individual batch calls and keeps RPC errors out of successful coverage", async () => {
    const rpc = new PrivateRpc({
      anonymous: async () =>
        new Response(
          JSON.stringify([
            { id: 1, result: "0x1" },
            { id: 2, error: { code: -1, message: "unavailable" } },
          ]),
        ),
      direct: async () =>
        new Response(JSON.stringify({ id: 3, result: "0x2" })),
    });
    await rpc.fetch("https://rpc.test", {
      body: JSON.stringify([
        { id: 1, method: "eth_call" },
        { id: 2, method: "eth_getLogs" },
      ]),
    });
    await rpc.bootstrap("https://rpc.test", {
      body: JSON.stringify({ id: 3, method: "eth_call" }),
    });
    expect(rpc.snapshot()).toMatchObject({
      anon: 1,
      bootstrap: 1,
      direct: 0,
      failed: 1,
      attempted: 3,
      coverage: 50,
    });
    expect(rpc.snapshot().byMethod["anon:eth_getLogs"]).toEqual({
      attempted: 1,
      successful: 0,
    });
  });
});
