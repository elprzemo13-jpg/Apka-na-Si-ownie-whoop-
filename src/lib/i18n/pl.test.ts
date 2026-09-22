import { describe, expect, it } from "vitest";
import { pl } from "./pl";

/**
 * Text with placeholders is easy to break with a careless search-and-replace:
 * `${kg} kg` silently becomes ` kg`. Every function in the dictionary is
 * called here with a marker and must put it in the result.
 */
function walk(value: unknown, path: string, found: [string, unknown][] = []) {
  if (typeof value === "function") found.push([path, value]);
  else if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`, found);
  }
  return found;
}

describe("Polish strings", () => {
  const functions = walk(pl, "pl");

  it("has text functions to check", () => {
    expect(functions.length).toBeGreaterThan(5);
  });

  it.each(functions)("%s keeps its placeholders", (_path, fn) => {
    const marker = 424242;
    const result = (fn as (...args: unknown[]) => string)(marker, marker);
    expect(typeof result).toBe("string");
    expect(result).toContain(String(marker));
  });
});
