# Nox specifier review

Reviewed 2026-11-06. Research only: no application pin, configuration or contract was changed; workers were fetched as byte data, never imported, evaluated or executed. No privacy measurements or installs were performed.

## Finding and recommendation

The mismatch is real and intentional upstream: Wave's current address is a **per-release immutable 0.4.0 pin**; the official adopter address is an **owner-updatable stable address**, currently serving **0.4.1**. They are neither equivalent addresses nor identical worker bytes. The [official adopter listing](https://ethereum.github.io/anon-rpc/adopters/) publishes `0x35133267A8F7EC35046a83DCA0f4Ca8A6e1b7A9A` on Sepolia. Upstream's [release history](https://github.com/hisoka-io/nox-sdk/blob/66bce4af274b4be457ef11336ba9cb6d9200efd1/packages/anon-rpc-worker/CHANGELOG.md) explicitly distinguishes the stable address from per-release immutable pins.

Retain the tested 0.4.0 pin for the current evidence baseline. Make a deliberate subsequent choice: following the official stable address obtains published updates but trusts its owner to choose future executable code; retaining the old pin fixes those bytes but also retains old behavior and embedded trust material. If reviewing 0.4.1, consider a verified per-release immutable deployment or an independently enforced expected hash when fixed-version trust is required. This review does not establish such a 0.4.1 immutable address. Do not treat existing 0.4.0 browser results as validation of 0.4.1. The newer release includes useful fixes and a changed timing/linkability tradeoff, so “newer” alone is insufficient approval.

## Read-only chain snapshot

Viem `eth_call` and `eth_getCode` reads used `https://ethereum-sepolia-rpc.publicnode.com`, pinned to Sepolia block **12075680**, block hash `0x679a3a0dc0d1928a7a1afbae6ee6ac3e7cb6856cc6b4ea009279a7493a254a8f`, timestamp **2026-11-06T09:29:00Z**, observed **2026-11-06T09:29:07.404Z**. This is a public RPC observation, not an independently verified consensus proof. [Block explorer](https://sepolia.etherscan.io/block/12075680).

| Property | Wave current pin | Official stable address |
|---|---|---|
| Address | `0xDf5Db854BA75B52a4bF1a250a93D8d25cB982b2d` | `0x35133267A8F7EC35046a83DCA0f4Ca8A6e1b7A9A` |
| `workerHash()` | `0xd8bef626ec8511d7a468bca5137880680ca2da20d2ea4d9c981a2a3d0c86ba1e` | `0xd9fa04b080a33062680a27cad828196bfb04615a0ebc76bcbffedb6dcbe838d4` |
| `owner()` | Reverts | `0xb18ddF10a9F6a0b9143d05B294815a83d3fa69C5` |
| Runtime bytes | 893 | 3,655 |
| Runtime keccak256 | `0x6516d9f8d7a0e9cf18058865dbc395f8fd70003cf2772f687560e9415415442e` | `0xc4c54384a9c1f1201ef3711a7ed7ba20e078a432e85ecc4f8b14927587cc7b5f` |
| Resolved npm version | 0.4.0 | 0.4.1 |

The old `owner()` revert alone proves no immutability. Stronger evidence is available: Sourcify reports exact creation/runtime matches for both deployments, and the keccak256 of each Sourcify `runtimeBytecode.onchainBytecode` equals the block-pinned RPC runtime hash above. The old verified `ImmutableWorkerSpecifier` embeds an immutable worker hash, initializes resolvers only in its constructor, and exposes no setter, owner or delegate/proxy mechanism. The official verified `WorkerSpecifier` exposes `setWorker(bytes32,string[])` under `onlyOwner`, plus ownership transfer/renunciation; its observed nonzero owner retains update power. Sourcify classifies both as nonproxies. These conclusions use verified source and matching runtime, not a function-name guess. [Old verified source/API](https://sourcify.dev/server/v2/contract/11155111/0xDf5Db854BA75B52a4bF1a250a93D8d25cB982b2d?fields=all), [stable verified source/API](https://sourcify.dev/server/v2/contract/11155111/0x35133267A8F7EC35046a83DCA0f4Ca8A6e1b7A9A?fields=all).

### Exact `workerResolvers()` values

Current pin:

```text
https://raw.githubusercontent.com/hisoka-io/anon-rpc/keccak/d8/bef626ec8511d7a468bca5137880680ca2da20d2ea4d9c981a2a3d0c86ba1e
https://cdn.jsdelivr.net/npm/@hisoka-io/anon-rpc-worker@0.4.0/dist/anon-rpc-worker.js
https://unpkg.com/@hisoka-io/anon-rpc-worker@0.4.0/dist/anon-rpc-worker.js
kps:100.56.0.72:15005:uEiBVDwIs40bsslDkM-BYb2AOHw3PHe70_bj5U_09r7vdIQ/keccak/d8/bef626ec8511d7a468bca5137880680ca2da20d2ea4d9c981a2a3d0c86ba1e
kps:3.232.137.146:15005:uEiDGVPDwsQ96ri9T5WLR6jZov_9LW-gRAgs-DN9FyKuHuw/keccak/d8/bef626ec8511d7a468bca5137880680ca2da20d2ea4d9c981a2a3d0c86ba1e
kps:18.215.18.61:15005:uEiCStd3rfGTo0ts0lSUw5f22u93O3PLCZVWWQIv_MXHm7w/keccak/d8/bef626ec8511d7a468bca5137880680ca2da20d2ea4d9c981a2a3d0c86ba1e
```

Official stable address:

```text
https://raw.githubusercontent.com/hisoka-io/anon-rpc/keccak/d9/fa04b080a33062680a27cad828196bfb04615a0ebc76bcbffedb6dcbe838d4
https://cdn.jsdelivr.net/npm/@hisoka-io/anon-rpc-worker@0.4.1/dist/anon-rpc-worker.js
https://unpkg.com/@hisoka-io/anon-rpc-worker@0.4.1/dist/anon-rpc-worker.js
kps:100.56.0.72:15005:uEiBVDwIs40bsslDkM-BYb2AOHw3PHe70_bj5U_09r7vdIQ/keccak/d9/fa04b080a33062680a27cad828196bfb04615a0ebc76bcbffedb6dcbe838d4
kps:3.232.137.146:15005:uEiDGVPDwsQ96ri9T5WLR6jZov_9LW-gRAgs-DN9FyKuHuw/keccak/d9/fa04b080a33062680a27cad828196bfb04615a0ebc76bcbffedb6dcbe838d4
kps:18.215.18.61:15005:uEiCStd3rfGTo0ts0lSUw5f22u93O3PLCZVWWQIv_MXHm7w/keccak/d9/fa04b080a33062680a27cad828196bfb04615a0ebc76bcbffedb6dcbe838d4
```

## Bundle comparison and provenance

All three HTTPS resolvers for each version were downloaded independently as data. All returned the matching on-chain keccak256 above: **1,820,668 bytes** for 0.4.0 and **1,831,246 bytes** for 0.4.1, a **10,578-byte increase**. KPS resolvers were recorded, not dialled. The npm tarballs' SHA-512 digests matched [registry integrity metadata](https://registry.npmjs.org/@hisoka-io/anon-rpc-worker), and their packaged bundles matched the resolver bytes. Registry publication times are **2026-10-10T08:24:21.845Z** and **2026-10-26T10:38:19.097Z**; the latter differs from the changelog's release date of October 25.

Static bundle diff, corroborated against packaged source and [upstream comparison](https://github.com/hisoka-io/nox-sdk/compare/fee8d69861a112c65f0cbb0b848a7726ec12f01a...66bce4af274b4be457ef11336ba9cb6d9200efd1), establishes actual changes beyond a version label:

- TLS defaults change from one spare with a 20-second TTL to two with a 12-second TTL. Pool code adds replacement refreshes while a host was called in the last minute and can wait for an in-flight handshake. Upstream documents a longer low-traffic timing correlation window, approximately one minute versus 20 seconds; these are upstream analysis/measurements, not Wave measurements.
- New `tls.call` diagnostics record acquisition path, handshake wait, spare age, exchange duration, retries and success. Paid-exit selection gains exclusions, and paid-helper module scaffolding appears in the bundle; this does not show that Wave invokes paid functionality.
- The embedded Nox WASM bytes change. Package dependencies move from nox-client 0.8.0 / nox-wasm 0.2.0 to 0.9.0 / 0.3.0. The release notes describe rejecting reply bodies shorter than 33 bytes instead of trapping. The source comparison also records a topology-fingerprint hashing correction. Those upstream changes were not exercised here.

Packaged provenance identifies source commits [0.4.0: `fee8d69861a112c65f0cbb0b848a7726ec12f01a`](https://github.com/hisoka-io/nox-sdk/commit/fee8d69861a112c65f0cbb0b848a7726ec12f01a) and [0.4.1: `66bce4af274b4be457ef11336ba9cb6d9200efd1`](https://github.com/hisoka-io/nox-sdk/commit/66bce4af274b4be457ef11336ba9cb6d9200efd1). Both commits exist. For each version, packaged `config.ts`, TLS `pool.ts`/`transport.ts`, changelog, snapshot and bootstrap files were byte-identical to those commit paths. Provenance output hashes/sizes agree with observed bundles. This corroborates publisher provenance; it is **not an independent reproducible build or comprehensive source-to-binary audit**.

Provenance records the same registry snapshot at Arbitrum Sepolia block 316207920 (`0x1090f071896b6ef41ddfd40d4ebcd20fae85a66468f82497e19a635488014681`), bootstrap hash (`0x6567e3ad5e1b1ac81529391c890d2652695d3ec139d56625170384794085fb74`), TLS WASM hash (`0x60b29cd4fca7ee2f31fbcff2dca25e64939e4b71a4629ffcfea1b89546f501ce`), and webpki-roots 1.0.9 (July 18, 2026) for both. The changed Nox WASM input hashes are `0x6ff418a78fc022d34dff00a867e173269413fb6887c9d6bf8e6505d4dcfffe2d` and `0x91060e59264ba44c3f16181caff1adcf16193a1e57d6ba4dd3531b192ac42de4`. [0.4.0 package data](https://registry.npmjs.org/@hisoka-io/anon-rpc-worker/-/anon-rpc-worker-0.4.0.tgz), [0.4.1 package data](https://registry.npmjs.org/@hisoka-io/anon-rpc-worker/-/anon-rpc-worker-0.4.1.tgz).

## Remaining verification before a change

No browser compatibility, availability, startup, latency, route coverage, failure behavior or anonymity claim was tested. No independent rebuild was performed, and the full on-chain update/ownership history was not reconstructed. A mutable address must be re-read at the time of any future evaluation: today's hash is not a promise about its next load. Review the intended exact hash, update policy and TLS spare tradeoff, then obtain separately authorized browser evidence for that choice. Worker hash pinning authenticates bytes against the selected contract; it does not audit code, guarantee resolver/node availability, or freeze registry membership, node locations or infrastructure. The [worker README](https://github.com/hisoka-io/nox-sdk/blob/66bce4af274b4be457ef11336ba9cb6d9200efd1/packages/anon-rpc-worker/README.md) describes runtime registry discovery even with fixed worker bytes.
