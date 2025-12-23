/**
 * Isolated VM Sandbox for AI-generated code execution
 *
 * Runs transformer code in a V8 isolate with:
 * - No access to Node.js APIs (process, require, fs, etc.)
 * - No access to environment variables
 * - Memory limit (8MB)
 * - Execution timeout (2 seconds)
 *
 * Built-in JS globals (Date, Math, JSON, Array, Object, etc.) are
 * automatically available in the isolate context.
 */
import ivm from "isolated-vm";

const MEMORY_LIMIT_MB = 8;
const TIMEOUT_MS = 5000;

interface SandboxResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Execute code in an isolated V8 sandbox
 *
 * @param code - The transformer code containing a `transform` function
 * @param args - Arguments to pass to the transform function
 * @returns Result with transformed data or error
 */
export async function runInSandbox<T>(
  code: string,
  args: Record<string, unknown>,
): Promise<SandboxResult<T>> {
  const isolate = new ivm.Isolate({ memoryLimit: MEMORY_LIMIT_MB });

  try {
    const context = await isolate.createContext();
    const jail = context.global;

    // Set up global reference (required for some patterns)
    await jail.set("global", jail.derefInto());

    // Inject arguments as deep copies (serialized via JSON for safety)
    // This ensures complex objects are transferred correctly
    for (const [key, value] of Object.entries(args)) {
      // Serialize to JSON string, then parse inside the isolate
      const jsonValue = JSON.stringify(value);
      await jail.set(`__arg_${key}`, jsonValue);
    }

    // Build the execution script that parses args and runs transform
    const argNames = Object.keys(args);
    const argParsers = argNames
      .map((name) => `const ${name} = JSON.parse(__arg_${name});`)
      .join("\n");

    const wrappedCode = `
      (function() {
        ${argParsers}
        ${code}
        return JSON.stringify(transform(${argNames.join(", ")}));
      })();
    `;

    const script = await isolate.compileScript(wrappedCode);
    const resultJson: unknown = await script.run(context, {
      timeout: TIMEOUT_MS,
    });

    if (typeof resultJson !== "string") {
      return {
        success: false,
        error: "Transformer did not return a valid result",
      };
    }

    return {
      success: true,
      data: JSON.parse(resultJson) as T,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sandbox error";
    console.error("[Sandbox] Execution error:", message);
    return {
      success: false,
      error: message,
    };
  } finally {
    isolate.dispose();
  }
}
