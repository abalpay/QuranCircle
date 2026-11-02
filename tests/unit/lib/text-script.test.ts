import { describe, expect, it } from "vitest";
import { textScript } from "@/lib/text-script";

describe("textScript", () => {
  it("follows the first letter, not the locale", () => {
    expect(textScript("In memory of Yusuf")).toBe("latin");
    expect(textScript("في ذكرى يوسف")).toBe("arabic");
    expect(textScript("“يوسف” Khatm")).toBe("arabic");
    expect(textScript("123 يوسف")).toBe("arabic");
    expect(textScript("")).toBe("latin");
    expect(textScript(null)).toBe("latin");
  });
});
