import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadLocalEnv } from "../src/core/config.js";
import { AppError } from "../src/core/errors.js";

const originalApiKey = process.env.KH_API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.KH_API_KEY;
  else process.env.KH_API_KEY = originalApiKey;
});

describe("local environment loading", () => {
  it("loads an ignored mode-0600 .env without printing the credential", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "keeperhub-env-"));
    const path = join(workspace, ".env");
    await writeFile(path, "KH_API_KEY=kh_fixture_local_only\n", { mode: 0o600 });
    await chmod(path, 0o600);
    delete process.env.KH_API_KEY;

    loadLocalEnv(workspace);

    expect(process.env.KH_API_KEY).toBe("kh_fixture_local_only");
  });

  it("refuses a group/world-readable .env", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "keeperhub-env-"));
    const path = join(workspace, ".env");
    await writeFile(path, "KH_API_KEY=kh_fixture_local_only\n", { mode: 0o644 });
    await chmod(path, 0o644);

    expect(() => loadLocalEnv(workspace)).toThrow(AppError);
  });
});
