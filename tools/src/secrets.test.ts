import { it, expect } from "vitest";
import { scanSecretText } from "./secrets";
it("reports secret assignments without exposing their values and distinguishes hashes", () => {
  const secret = "0x" + "a".repeat(64);
  const result = scanSecretText(
    "example.ts",
    `const privateKey = "${secret}";\nconst transactionHash="0x${"b".repeat(64)}";`,
  );
  expect(result).toEqual([
    { path: "example.ts", line: 1, rule: "private key assignment" },
  ]);
  expect(JSON.stringify(result)).not.toContain(secret);
});
