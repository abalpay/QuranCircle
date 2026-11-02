import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OgText } from "@/lib/og-text";
import { loadOgFonts } from "@/lib/og-fonts";
import { containsArabicScript } from "@/lib/text-script";
import { shapeArabic, shapeForOg } from "@/lib/arabic-shaping";

describe("share image text (#103)", () => {
  it("lays Arabic out word by word in a wrapping row-reverse so satori reads it right to left", () => {
    const { container } = render(
      <OgText text="ختمة عن روح" style={{ fontSize: 64, maxWidth: 960 }} />
    );
    const row = container.firstElementChild as HTMLElement;
    expect(row.style.flexDirection).toBe("row-reverse");
    expect(row.style.flexWrap).toBe("wrap");
    expect(Array.from(row.children).map((child) => child.textContent)).toEqual(["\uFE94\uFEE4\uFE98\uFEA7", "\uFEE6\uFECB", "\u0631\u0648\u062D"]);
  });

  it("keeps a hyphenated name in one piece", () => {
    const { container } = render(<OgText text="Hajji Yusuf Al-Rahman" style={{ fontSize: 64 }} />);
    expect(container.textContent).toBe("Hajji Yusuf Al\u2011Rahman");
  });

  it("never passes an undefined style value to satori (it throws on them)", () => {
    const { container } = render(<OgText text="ختمة 1" style={{ fontSize: 64, maxWidth: 960 }} />);
    for (const element of Array.from(container.querySelectorAll<HTMLElement>("*"))) {
      expect(element.getAttribute("style") ?? "").not.toMatch(/undefined|NaN/);
    }
  });

  it("keeps Latin text as one plain node", () => {
    const { container } = render(<OgText text="Khatm for Aisha" style={{ fontSize: 64 }} />);
    expect(container.firstElementChild?.children).toHaveLength(0);
    expect(container.textContent).toBe("Khatm for Aisha");
  });

  it("bundles the Arabic and Latin fonts for the image", async () => {
    const fonts = await loadOgFonts();
    expect(fonts.map((font) => font.name)).toEqual(["Manrope", "Tajawal"]);
    fonts.forEach((font) => expect(font.data.byteLength).toBeGreaterThan(10_000));
  });

  it("detects Arabic script in any of the strings", () => {
    expect(containsArabicScript("Khatm", null, "ختمة")).toBe(true);
    expect(containsArabicScript("Khatm", "Aisha", undefined)).toBe(false);
  });

  it("shapes Arabic into joined presentation forms, then orders it visually for satori", () => {
    // ب + س + م: initial, medial, final forms
    expect(shapeArabic("بسم")).toBe("\uFE91\uFEB4\uFEE2");
    expect(shapeForOg("بسم")).toBe("\uFEE2\uFEB4\uFE91");
    // lam + alef joins as one ligature; digits and Latin keep their own order
    expect(shapeArabic("لا")).toBe("\uFEFB");
    expect(shapeForOg("ب1")).toBe("1\u0628");
    expect(shapeForOg("Khatm")).toBe("Khatm");
  });

  it("keeps a combining mark with its letter and mirrors brackets", () => {
    const visual = shapeForOg("(سّ)");
    // logical "(…)" read right to left: the left edge shows the mirrored closing bracket as "("
    expect(visual.startsWith("(")).toBe(true);
    expect(visual.endsWith(")")).toBe(true);
    expect(visual.indexOf("\u0651")).toBeGreaterThan(-1);
  });

  it("gives every word box the same height and sets Arabic words in Tajawal, dropped to the Latin baseline", () => {
    const { container } = render(<OgText text="الختمة 1" style={{ fontSize: 28, lineHeight: 1.5, fontFamily: "Manrope, sans-serif" }} />);
    const boxes = Array.from(container.firstElementChild!.children) as HTMLElement[];
    expect(new Set(boxes.map((box) => box.style.height))).toEqual(new Set(["42px"]));
    const arabic = boxes.find((box) => box.textContent?.includes("\uFE94") || box.textContent?.match(/[\u0600-\u06FF\uFB50-\uFEFF]/))!;
    const latin = boxes.find((box) => box.textContent === "1")!;
    expect(arabic.style.fontFamily).toContain("Tajawal");
    expect(arabic.style.top).toBe("7px");
    expect(latin.style.top).toBe("");
  });

  it("aligns a block to one physical edge", () => {
    const rtl = render(<OgText text="ختمة" align="right" style={{ fontSize: 28 }} />).container.firstElementChild as HTMLElement;
    expect(rtl.style.justifyContent).toBe("flex-start"); // row-reverse starts at the right
    const ltrInRtlCard = render(<OgText text="Khatm" align="right" style={{ fontSize: 28 }} />).container.firstElementChild as HTMLElement;
    expect(ltrInRtlCard.style.textAlign).toBe("right");
  });

});
