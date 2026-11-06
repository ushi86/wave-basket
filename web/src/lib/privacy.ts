export type Route = "anon" | "bootstrap" | "direct";
export type PrivacySnapshot = {
  anon: number;
  bootstrap: number;
  direct: number;
  failed: number;
  attempted: number;
  coverage: number;
  byMethod: Record<string, { attempted: number; successful: number }>;
};
type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;
/** All app-originated reads cross this boundary. Direct authorization is scoped to one invocation. */
export class PrivateRpc {
  private counts = {
    anon: 0,
    bootstrap: 0,
    direct: 0,
    failed: 0,
    attempted: 0,
  };
  private methods: PrivacySnapshot["byMethod"] = {};
  private listeners = new Set<() => void>();
  constructor(private transports: { anonymous: Fetcher; direct: Fetcher }) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  snapshot(): PrivacySnapshot {
    const { anon, bootstrap, direct } = this.counts;
    return {
      ...this.counts,
      coverage:
        anon + bootstrap + direct === 0
          ? 0
          : (anon / (anon + bootstrap + direct)) * 100,
      byMethod: structuredClone(this.methods),
    };
  }
  private publish() {
    this.listeners.forEach((fn) => fn());
  }
  private async request(
    route: Route,
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    let payload: unknown;
    try {
      payload = JSON.parse(typeof init?.body === "string" ? init.body : "null");
    } catch {
      payload = null;
    }
    const calls = (Array.isArray(payload) ? payload : [payload]).map(
      (call) => ({
        method: typeof call?.method === "string" ? call.method : "unknown",
        id: call?.id,
      }),
    );
    for (const call of calls) {
      this.counts.attempted++;
      const key = `${route}:${call.method}`;
      this.methods[key] ??= { attempted: 0, successful: 0 };
      this.methods[key].attempted++;
    }
    this.publish();
    try {
      const response = await (
        route === "anon" ? this.transports.anonymous : this.transports.direct
      )(input, init);
      if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
      const result: unknown = await response.clone().json();
      const replies = Array.isArray(result) ? result : [result];
      let successes = 0;
      for (const call of calls) {
        const reply = replies.find((r) => r?.id === call.id);
        if (reply && !reply.error && Object.hasOwn(reply, "result")) {
          successes++;
          this.methods[`${route}:${call.method}`].successful++;
        }
      }
      this.counts[route] += successes;
      this.counts.failed += calls.length - successes;
      this.publish();
      return response;
    } catch (error) {
      this.counts.failed += calls.length;
      this.publish();
      throw error;
    }
  }
  fetch: Fetcher = (input, init) => this.request("anon", input, init);
  bootstrap: Fetcher = (input, init) => this.request("bootstrap", input, init);
  readDirectlyOnce: Fetcher = (input, init) =>
    this.request("direct", input, init);
}
