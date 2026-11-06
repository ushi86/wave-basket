/** Deterministic 24-hour momentum tilt around basket targets. All authority remains in the vault. */
export function proposeWeights(
  current: readonly number[],
  baseline: readonly number[],
  changes: readonly number[],
  threshold = 300,
): number[] | null {
  const n = current.length;
  if (
    n < 2 ||
    n > 4 ||
    baseline.length !== n ||
    changes.length !== n ||
    ![...current, ...baseline, ...changes].every(Number.isFinite) ||
    current.some((x) => x < 0) ||
    baseline.some((x) => x <= 0 || x > 5000) ||
    baseline.reduce((a, b) => a + b, 0) !== 10000 ||
    !Number.isInteger(threshold) ||
    threshold < 0
  )
    throw new Error("Invalid strategy input");
  const total = current.reduce((a, b) => a + b, 0);
  if (total <= 0 || total > 10000) throw new Error("Invalid holdings");
  const scores = baseline.map(
    (w, i) => w * (1 + Math.max(-50, Math.min(50, changes[i])) / 100),
  );
  const desired = new Array<number>(n).fill(0);
  let remaining = 10000;
  let active = scores.map((_, i) => i);
  while (active.length) {
    const sum = active.reduce((s, i) => s + scores[i], 0);
    const capped = active.filter((i) => (scores[i] / sum) * remaining > 5000);
    if (!capped.length) {
      for (const i of active)
        desired[i] = Math.floor((scores[i] / sum) * remaining);
      break;
    }
    for (const i of capped) {
      desired[i] = 5000;
      remaining -= 5000;
    }
    active = active.filter((i) => !capped.includes(i));
  }
  const normalize = (weights: number[]) => {
    let delta = 10000 - weights.reduce((a, b) => a + b, 0);
    for (let i = 0; delta > 0; i = (i + 1) % n)
      if (weights[i] < 5000) {
        weights[i]++;
        delta--;
      }
    return weights;
  };
  normalize(desired);
  const distance = (weights: number[]) =>
    Math.ceil(
      (weights.reduce((sum, w, i) => sum + Math.abs(w - current[i]), 0) +
        10000 -
        total) /
        2,
    );
  const turnover = distance(desired);
  if (turnover < threshold) return null;
  const factor = turnover <= 2000 ? 1 : 1999 / turnover;
  const result = normalize(
    desired.map((w, i) => Math.floor(current[i] + factor * (w - current[i]))),
  );
  if (
    result.some((w) => w <= 0 || w > 5000) ||
    distance(result) > 2000 ||
    distance(result) < threshold
  )
    return null;
  return result;
}
