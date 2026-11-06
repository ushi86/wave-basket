import { describe, it, expect } from "vitest";
import { proposeWeights } from "./strategy";
describe("rebalance proposal boundary", () => {
  it("uses external market changes but stays within allocation and turnover limits", () => {
    const result = proposeWeights(
      [4000, 3500, 2500],
      [4000, 3500, 2500],
      [20, -20, 0],
      300,
    );
    expect(result).not.toBeNull();
    expect(result?.reduce((a, b) => a + b, 0)).toBe(10000);
    expect(Math.max(...result!)).toBeLessThanOrEqual(5000);
    expect(result![0]).toBeGreaterThan(4000);
    expect(result![1]).toBeLessThan(3500);
  });
});

it("skips unchanged allocations and rejects malformed external values", () => {
  expect(
    proposeWeights([4000, 3500, 2500], [4000, 3500, 2500], [0, 0, 0]),
  ).toBeNull();
  expect(() =>
    proposeWeights([4000, 3500, 2500], [4000, 3500, 2500], [NaN, 0, 0]),
  ).toThrow("Invalid strategy input");
});
it("never submits an allocation beyond the vault turnover bound", () => {
  const result = proposeWeights(
    [1000, 4500, 4500],
    [5000, 2500, 2500],
    [50, -50, -50],
  );
  expect(result).not.toBeNull();
  expect(
    result!.reduce(
      (sum, w, i) => sum + Math.abs(w - [1000, 4500, 4500][i]),
      0,
    ) / 2,
  ).toBeLessThanOrEqual(2000);
  expect(result!.reduce((a, b) => a + b, 0)).toBe(10000);
});
