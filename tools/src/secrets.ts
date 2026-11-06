export type SecretFinding = { path: string; line: number; rule: string };
// Heuristic review aid. Findings contain locations only, never matched values.
export function scanSecretText(
  path: string,
  text: string,
  allowedLocalKey?: string,
): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const patterns: Array<[string, RegExp]> = [
    [
      "private key assignment",
      /(?:private_?key|deployer_?key|demo_?key|wallet_?key)\s*[=:]\s*["'`]?\s*(0x[a-f\d]{64})/gi,
    ],
    [
      "access token",
      /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-proj-[A-Za-z0-9_-]{40,})\b/g,
    ],
  ];
  for (const [rule, pattern] of patterns) {
    for (const match of text.matchAll(pattern)) {
      if (
        path === "scripts/local-demo.mjs" &&
        allowedLocalKey &&
        match[1] === allowedLocalKey
      )
        continue;
      findings.push({
        path,
        line: text.slice(0, match.index).split("\n").length,
        rule,
      });
    }
  }
  return findings;
}
