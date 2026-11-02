import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupportUrl } from "@/lib/support";

afterEach(() => vi.unstubAllEnvs());

describe("getSupportUrl", () => {
  it.each([undefined, "", "  ", "http://ko-fi.com/x", "//ko-fi.com/x", "javascript:alert(1)"])(
    "returns null for %j",
    (value) => {
      vi.stubEnv("NEXT_PUBLIC_SUPPORT_URL", value);
      expect(getSupportUrl()).toBeNull();
    },
  );

  it("returns an https URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_URL", " https://ko-fi.com/x ");
    expect(getSupportUrl()).toBe("https://ko-fi.com/x");
  });
});
