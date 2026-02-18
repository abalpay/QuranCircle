import { describe, expect, it } from "vitest";
import {
  SHORT_CODE_MAX_LENGTH,
  SHORT_CODE_MIN_LENGTH,
  SHORT_CODE_REGEX,
} from "@/lib/constants/short-code";

describe("short code constants", () => {
  it("matches expected contract boundaries", () => {
    expect(SHORT_CODE_MIN_LENGTH).toBe(1);
    expect(SHORT_CODE_MAX_LENGTH).toBe(24);
    expect(SHORT_CODE_MIN_LENGTH).toBeLessThan(SHORT_CODE_MAX_LENGTH);
  });

  it("accepts only alphanumeric short codes", () => {
    expect(SHORT_CODE_REGEX.test("A1b2C3")).toBe(true);
    expect(SHORT_CODE_REGEX.test("qurancircle123")).toBe(true);
    expect(SHORT_CODE_REGEX.test("with-dash")).toBe(false);
    expect(SHORT_CODE_REGEX.test("with_space")).toBe(false);
    expect(SHORT_CODE_REGEX.test("")).toBe(false);
  });
});
