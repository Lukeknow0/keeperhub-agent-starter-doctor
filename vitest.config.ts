import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "tests/integration/**"],
    coverage: {
      reporter: ["text", "json-summary"]
    }
  }
});
