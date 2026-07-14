import type { JsonValue } from "./types.js";

const SECRET_KEY = /(authorization|api[-_]?key|access[-_]?token|refresh[-_]?token|private[-_]?key|hmac|secret|idempotency[-_]?key)/i;
const SECRET_VALUE_PATTERNS = [
  /\bkh_[A-Za-z0-9_-]{8,}\b/g,
  /\bwfb_[A-Za-z0-9_-]{8,}\b/g,
  /\bBearer\s+[^\s"']+/gi
];

export function redactString(value: string): string {
  return SECRET_VALUE_PATTERNS.reduce(
    (redacted, pattern) => redacted.replace(pattern, "[REDACTED]"),
    value
  );
}

export function redact(value: unknown, key = ""): JsonValue {
  if (SECRET_KEY.test(key)) {
    return "[REDACTED]";
  }
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return redactString(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redact(entry));
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redact(entryValue, entryKey)])
    );
  }
  return String(value);
}
