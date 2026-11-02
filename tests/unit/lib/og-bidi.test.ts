import { describe, expect, it } from "vitest";
import { layoutBidiWords } from "@/lib/og-bidi";

/** Words as they appear from the left edge to the right edge once the flex row is laid out. */
function visual(text: string) {
  const { paragraph, words } = layoutBidiWords(text);
  return (paragraph === "rtl" ? [...words].reverse() : words).join(" ");
}

describe("share image bidi order (#103)", () => {
  it("lays a pure Arabic title out right to left", () => {
    // Left to right on screen: the last word is leftmost.
    expect(visual("ختمة عن روح مريم")).toBe("مريم روح عن ختمة");
    expect(layoutBidiWords("ختمة عن روح مريم").paragraph).toBe("rtl");
  });

  it("keeps Latin text in reading order", () => {
    expect(visual("Khatm for Aisha Khan")).toBe("Khatm for Aisha Khan");
    expect(visual("Khatm 1 complete")).toBe("Khatm 1 complete");
    expect(layoutBidiWords("Khatm for Aisha Khan").paragraph).toBe("ltr");
  });

  it("RTL paragraph with a Latin run: the runs go right to left, the Latin words stay left to right", () => {
    expect(visual("ختمة for Ahmed Ali")).toBe("for Ahmed Ali ختمة");
    expect(visual("ختمة عن Ahmed Ali Khan")).toBe("Ahmed Ali Khan عن ختمة");
  });

  it("LTR paragraph with an Arabic run: the runs go left to right, the Arabic words read right to left", () => {
    expect(visual("Khatm for مريم الصديقي")).toBe("Khatm for الصديقي مريم");
    expect(layoutBidiWords("Khatm for مريم الصديقي").paragraph).toBe("ltr");
  });

  it("puts a number after an Arabic word to its left, as a browser does", () => {
    expect(visual("اكتملت الختمة 1")).toBe("1 الختمة اكتملت");
  });

  it("puts a leading number to the right of the Arabic that follows it", () => {
    expect(visual("1 ختمة")).toBe("ختمة 1");
  });

  it("punctuation joins the run it sits in, or falls back to the paragraph direction", () => {
    expect(visual("Ahmed - مريم")).toBe("Ahmed - مريم");
    expect(visual("Khatm مريم - الصديقي")).toBe("Khatm الصديقي - مريم");
    expect(visual("انضم إلى حلقة الختمة ←")).toBe("← الختمة حلقة إلى انضم");
  });

  it("handles empty and whitespace-only text", () => {
    expect(layoutBidiWords("   ")).toEqual({ paragraph: "ltr", words: [] });
  });
});
