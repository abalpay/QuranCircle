import { describe, expect, it } from "vitest";
import {
  getLanguageAlternates,
  getLocaleDirection,
  getLocalizedPath,
  getOpenGraphLocale,
} from "@/i18n/locale-config";

describe("locale configuration", () => {
  it("keeps English unprefixed and prefixes Turkish and Arabic", () => {
    expect(getLocalizedPath("en", "/browse")).toBe("/browse");
    expect(getLocalizedPath("tr", "/browse")).toBe("/tr/browse");
    expect(getLocalizedPath("ar", "/browse")).toBe("/ar/browse");
  });

  it("defines Arabic as RTL with localized social metadata", () => {
    expect(getLocaleDirection("ar")).toBe("rtl");
    expect(getLocaleDirection("tr")).toBe("ltr");
    expect(getOpenGraphLocale("ar")).toBe("ar_AR");
  });

  it("builds complete language alternatives", () => {
    expect(getLanguageAlternates("/about")).toEqual({
      en: "/about",
      tr: "/tr/about",
      ar: "/ar/about",
    });
  });
});
