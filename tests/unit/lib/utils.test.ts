import { describe, expect, it, vi } from "vitest";
import { formatAuthError, generateShortCode } from "@/lib/utils";

describe("formatAuthError", () => {
  it("normalizes weak password errors", () => {
    const message =
      "Password should contain at least one character of each category";

    expect(formatAuthError(message)).toBe(
      "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol."
    );
  });

  it("returns non-password errors unchanged", () => {
    const message = "Invalid login credentials";

    expect(formatAuthError(message)).toBe(message);
  });
});

describe("generateShortCode", () => {
  it("creates an 8-character alphanumeric short code by default", () => {
    const code = generateShortCode();

    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("creates a short code at requested length", () => {
    const code = generateShortCode(12);

    expect(code).toHaveLength(12);
    expect(code).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("throws when secure random generation is unavailable", () => {
    vi.stubGlobal("crypto", undefined);

    expect(() => generateShortCode()).toThrow(
      "Secure random generation is not available"
    );

    vi.unstubAllGlobals();
  });
});
