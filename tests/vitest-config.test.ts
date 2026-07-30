import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import defaultConfig from "../vitest.config.js";
import integrationConfig from "../vitest.integration.config.js";

describe("Vitest safety configuration", () => {
  it("globally excludes live integration tests from default and watch runs", () => {
    const exclude = "test" in defaultConfig ? defaultConfig.test?.exclude : undefined;

    expect(exclude).toContain("tests/integration/**");
  });

  it("uses a dedicated integration-only config for the explicit live suite", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts["test"]).toBe("vitest run");
    expect(packageJson.scripts["test:watch"]).toBe("vitest");
    expect(packageJson.scripts["test:integration"]).toBe("vitest run --config vitest.integration.config.ts");

    const include = "test" in integrationConfig ? integrationConfig.test?.include : undefined;
    const exclude = "test" in integrationConfig ? integrationConfig.test?.exclude : undefined;

    expect(include).toEqual(["tests/integration/**/*.test.ts"]);
    expect(exclude).toBeUndefined();
  });
});
