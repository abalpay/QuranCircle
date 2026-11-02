import { describe, expect, it } from "vitest";
import { resolveOgLocale } from "@/lib/og-image";
import { generateStaticParams } from "@/app/opengraph-image/[locale]/route";
import en from "../../../messages/en.json";
import tr from "../../../messages/tr.json";
import ar from "../../../messages/ar.json";

describe("site link preview per locale (#104)", () => {
  it("serves one card for each supported locale, and English for anything else", () => {
    expect(generateStaticParams()).toEqual([{ locale: "en" }, { locale: "tr" }, { locale: "ar" }]);
    expect(resolveOgLocale("tr")).toBe("tr");
    expect(resolveOgLocale("ar")).toBe("ar");
    expect(resolveOgLocale("fr")).toBe("en");
    expect(resolveOgLocale(undefined)).toBe("en");
  });

  it("leads with the memorial line in every language", () => {
    expect(`${en.SiteOpenGraphImage.line1} ${en.SiteOpenGraphImage.line2}`).toBe("A khatm for someone you love.");
    expect(tr.SiteOpenGraphImage.line1).toContain("Sevdiğiniz biri için");
    expect(ar.SiteOpenGraphImage.line1).toBe("ختمة لمن تحب");
  });
});
