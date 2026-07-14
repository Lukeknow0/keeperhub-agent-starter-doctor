import { describe, expect, it } from "vitest";
import { canonicalJson, sha256 } from "../src/core/json.js";
import { redact, redactString } from "../src/core/redact.js";

describe("core safety helpers", () => {
  it("canonicalizes object keys before hashing", () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe(canonicalJson({ a: 1, b: 2 }));
    expect(sha256(canonicalJson({ b: 2, a: 1 }))).toHaveLength(64);
  });

  it("recursively redacts API keys, bearer headers, tokens, HMAC and idempotency keys", () => {
    const value = redact({
      message: "Bearer kh_top_secret",
      apiKey: "kh_top_secret",
      nested: { refreshToken: "token", hmacSecret: "hmac", idempotencyKey: "uuid" }
    });
    const serialized = JSON.stringify(value);
    expect(serialized).not.toContain("kh_top_secret");
    expect(serialized).not.toContain("Bearer");
    expect(serialized).not.toContain(':"hmac"');
    expect(serialized).not.toContain(':"uuid"');
    expect(redactString("wfb_should_not_leak")).toBe("[REDACTED]");
  });
});
