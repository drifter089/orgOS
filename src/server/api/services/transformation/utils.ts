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
