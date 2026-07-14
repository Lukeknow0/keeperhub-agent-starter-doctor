import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli.js";

describe("CLI error contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  it("returns usage code 2 and always prints Step/Cause/Fix/Evidence", async () => {
    let stderr = "";
    vi.spyOn(process.stderr, "write").mockImplementation(((chunk: string | Uint8Array) => {
      stderr += String(chunk);
      return true;
    }) as typeof process.stderr.write);

    const code = await main(["node", "keeperhub-starter", "doctor", "--chain-id", "not-a-chain"]);

    expect(code).toBe(2);
    expect(stderr).toContain("Step:");
    expect(stderr).toContain("Cause:");
    expect(stderr).toContain("Fix:");
    expect(stderr).toContain("Evidence:");
  });
});
