import { describe, expect, it } from "vitest";
import { shapeArabic, shapeForOg } from "@/lib/arabic-shaping";

const cps = (text: string) =>
  Array.from(text).map((char) => (char.codePointAt(0) as number).toString(16).toUpperCase().padStart(4, "0")).join(" ");

/**
 * Satori draws presentation forms left to right but its opentype.js reverses every run of base
 * Arabic letters (U+0600..06FF), so those runs must arrive pre-reversed twice (#104: روح drew as حور).
 * Each expectation is the string handed to satori, in code points.
 */
describe("shapeForOg: exact code points handed to satori", () => {
  it.each([
    // all isolated base letters: reversed for the visual order, then re-reversed for opentype = logical order
    ["روح", "0631 0648 062D"],
    ["دار", "062F 0627 0631"],
    // lam joins the reh (presentation forms, visual order); the base run و ح is re-reversed
    ["لروح", "0648 062D FEAE FEDF"],
    ["والدي", "064A FEAA FEDF 0648 0627"],
    ["وارحمه", "FEEA FEE4 FEA3 0648 0627 0631"],
    ["ختمة", "FE94 FEE4 FE98 FEA7"],
    // shadda: kept with its letter, in front of the initial seen in visual order
    ["وسّع", "FECA 0651 FEB3 0648"],
  ])("%s", (word, expected) => {
    expect(cps(shapeForOg(word))).toBe(expected);
  });

  it("a full phrase, word by word, keeps every word's letters in reading order", () => {
    const phrase = "ختمة عن روح";
    expect(phrase.split(" ").map((word) => cps(shapeForOg(word)))).toEqual([
      "FE94 FEE4 FE98 FEA7",
      "FEE6 FECB",
      "0631 0648 062D",
    ]);
  });

  it("leaves Arabic-Indic and Persian digits in reading order (opentype does not reverse them)", () => {
    expect(cps(shapeForOg("\u06F1\u06F2"))).toBe("06F1 06F2");
    expect(cps(shapeForOg("\u0661\u0662"))).toBe("0661 0662");
  });

  it("keeps digits with separators as one left-to-right run", () => {
    expect(cps(shapeForOg("1,000"))).toBe("0031 002C 0030 0030 0030");
    expect(cps(shapeForOg("ب1.5"))).toBe("0031 002E 0035 0628");
  });

  it("joins through tatweel and treats it as a joining letter", () => {
    expect(cps(shapeArabic("كـتاب"))).toBe("FEDB 0640 FE98 FE8E 0628");
  });

  it("joins through ZWJ without leaving it in the output, and ZWNJ breaks the join", () => {
    expect(cps(shapeArabic("\u0628\u200D\u0628"))).toBe("FE91 FE90");
    expect(cps(shapeArabic("\u0628\u200C\u0628"))).toBe("0628 200C 0628");
  });

  it("keeps Quranic marks U+0610..061A with their letter", () => {
    const shaped = shapeArabic("بؐب");
    expect(Array.from(shaped).map((c) => c.codePointAt(0))).toEqual([0xfe91, 0x0610, 0xfe90]);
  });

  it("leaves text without Arabic untouched", () => {
    expect(shapeForOg("Al-Rahman 12")).toBe("Al-Rahman 12");
  });
});
