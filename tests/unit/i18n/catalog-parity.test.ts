import { describe, expect, it } from "vitest";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";

function flattenMessages(
  value: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;

      if (typeof child === "string") {
        return [[path, child]];
      }

      if (child && typeof child === "object" && !Array.isArray(child)) {
        return Object.entries(
          flattenMessages(child as Record<string, unknown>, path),
        );
      }

      throw new TypeError(`Message "${path}" must be a string or object`);
    }),
  );
}

function placeholders(message: string) {
  return [...message.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)/g)]
    .map((match) => match[1])
    .sort();
}

describe("translation catalog parity", () => {
  const english = flattenMessages(en);
  const turkish = flattenMessages(tr);
  const arabic = flattenMessages(ar);

  it("contains the same message keys in every supported language", () => {
    expect(Object.keys(turkish).sort()).toEqual(Object.keys(english).sort());
    expect(Object.keys(arabic).sort()).toEqual(Object.keys(english).sort());
  });

  it("preserves every ICU placeholder in Turkish and Arabic", () => {
    for (const [key, englishMessage] of Object.entries(english)) {
      expect(placeholders(turkish[key]), key).toEqual(
        placeholders(englishMessage),
      );
      expect(placeholders(arabic[key]), key).toEqual(
        placeholders(englishMessage),
      );
    }
  });

  it("does not contain empty translations", () => {
    for (const catalog of [turkish, arabic]) {
      for (const [key, message] of Object.entries(catalog)) {
        expect(message.trim(), key).not.toBe("");
      }
    }
  });
});
