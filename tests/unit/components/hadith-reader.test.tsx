import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SourceText, SourceDetails } from "@/components/hadith/source-text";
import type { TextBlock, Edition } from "@/lib/hadith/types";
import { IntlWrapper } from "../../helpers/intl-wrapper";
afterEach(cleanup);
const text: TextBlock = { title: "A <source> title", text: "[Text]\n<script>alert(1)</script>", explanation: "Explanation\n unchanged", benefits: "1. Benefit", grade: "[Grade]", attribution: "[Reference]", wordMeanings: "word: meaning" };
describe("hadith source rendering", () => {
  it("preserves every field as escaped text", () => {
    const { container } = render(<SourceText text={text} locale="en" />, { wrapper: IntlWrapper });
    for (const value of Object.values(text)) expect(container.textContent).toContain(value);
    expect(container.querySelector("script")).toBeNull();
  });
  it("renders Arabic once when there is no paired translation", () => {
    render(<SourceText text={{ ...text, text: "عَرَبِيّ" }} locale="ar" />, { wrapper: IntlWrapper });
    expect(screen.getAllByText("عَرَبِيّ")).toHaveLength(1);
    expect(screen.getByText("عَرَبِيّ")).toHaveAttribute("lang", "ar");
  });
  it("includes complete notice, edition version and publisher links", () => {
    const edition = { locale: "en", version: "v1", notice: "Complete\n[notice] <literal>", sourceUrl: "https://hadeethenc.com/en", downloadUrl: "https://hadeethenc.com/en/download", checkUrl: "https://hadeethenc.com/en/check", publisherUpdatedAt: "date", retrievedAt: "date", sha256: "abc" } satisfies Edition;
    const { container } = render(<SourceDetails edition={edition} />, { wrapper: IntlWrapper });
    expect(container.textContent).toContain(edition.notice);
    expect(container.textContent).toContain("v1");
    expect(container.querySelectorAll("a")).toHaveLength(3);
  });
});
