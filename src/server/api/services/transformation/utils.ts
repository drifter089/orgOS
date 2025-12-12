/** Remove markdown code block wrappers from AI-generated code. */
export function cleanGeneratedCode(code: string): string {
  let cleaned = code.trim();

  const openingPatterns = [
    "```typescript",
    "```ts",
    "```javascript",
    "```js",
    "```",
  ];

  for (const pattern of openingPatterns) {
    if (cleaned.startsWith(pattern)) {
      cleaned = cleaned.slice(pattern.length);
      break;
    }
  }

  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  return cleaned.trim();
}

/** Keys that may contain sensitive data and should be redacted. */
const SENSITIVE_KEYS = new Set([
  "authorization",
  "token",
  "password",
  "secret",
  "apikey",
  "api_key",
  "access_token",
  "refresh_token",
  "private_key",
  "ssn",
  "credit_card",
  "cvv",
]);

/**
 * Safely stringify an object for AI prompts.
 * - Handles circular references and BigInt
 * - Redacts sensitive keys
 * - Truncates to maxLength
 */
export function safeStringifyForPrompt(
  obj: unknown,
  maxLength = 15000,
): string {
  const seen = new WeakSet();

  function replacer(key: string, value: unknown): unknown {
    // Redact sensitive keys (case-insensitive)
    if (key && SENSITIVE_KEYS.has(key.toLowerCase())) {
      return "<REDACTED>";
    }

    // Handle BigInt
    if (typeof value === "bigint") {
      return value.toString();
    }

    // Handle circular references
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "<CIRCULAR_REF>";
      }
      seen.add(value);
    }

    return value;
  }

  try {
    const str = JSON.stringify(obj, replacer, 2);
    if (str.length > maxLength) {
      return str.slice(0, maxLength) + "\n... (truncated)";
    }
    return str;
  } catch {
    return "<UNSERIALIZABLE_RESPONSE>";
  }
}
