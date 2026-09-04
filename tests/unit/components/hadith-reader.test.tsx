import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SourceText, SourceDetails } from "@/components/hadith/source-text";
import { SourcePassage } from "@/components/hadith/source-passage";
import type { TextBlock, Edition } from "@/lib/hadith/types";
import { IntlWrapper } from "../../helpers/intl-wrapper";
afterEach(cleanup);
const text: TextBlock = { title: "A <source> title", text: "[Text]\n<script>alert(1)</script>", explanation: "Explanation\n unchanged", benefits: "1. Benefit", grade: "[Grade]", attribution: "[Reference]", wordMeanings: "word: meaning" };
describe("hadith source rendering", () => {
  it.each(["First line\nSecond line\n", "First\r\n\r\n  Second", "عَرَبِيّ\nنص", "<script>literal</script>"])("formats source boundaries without changing text: %s", source => {
    const { container } = render(<SourcePassage text={source} locale="en" />);
    expect(container.querySelector("[data-source-passage]")?.textContent).toBe(source);
    expect(container.querySelector("script")).toBeNull();
  });
  it("renders benefit lines as a semantic list without adding numbers or losing delimiters", () => {
    const source = "First benefit\nSecond benefit\n";
    const { container } = render(<SourcePassage text={source} locale="en" kind="benefits" />);
    expect(container.querySelectorAll("ul > li")).toHaveLength(2);
    expect(container.querySelector("ul")?.textContent).toBe(source);
  });
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
    expect(container.querySelectorAll("a")).toHaveLength(4);
    expect(screen.getByRole("link", { name: "HadeethEnc · Publisher" })).toHaveAttribute("href", edition.sourceUrl);
    expect(container.querySelector(".hadith-source-credit")?.textContent).toContain("Source:");
  });
  it("uses the single source credit as the original-entry link", () => {
    const edition = { locale: "en", version: "1.25.0", notice: "Complete original notice", sourceUrl: "https://hadeethenc.com/en", downloadUrl: "https://hadeethenc.com/en/download", checkUrl: "https://hadeethenc.com/en/check", publisherUpdatedAt: "date", retrievedAt: "date", sha256: "abc" } satisfies Edition;
    const { container } = render(<SourceDetails edition={edition} sourceUrl="https://hadeethenc.com/en/browse/hadith/4560" />, { wrapper: IntlWrapper });
    expect(screen.getByRole("link", { name: "HadeethEnc · Original entry" })).toHaveAttribute("href", "https://hadeethenc.com/en/browse/hadith/4560");
    expect(container.querySelectorAll(".hadith-source-credit")).toHaveLength(1);
    expect(container.querySelector(".hadith-source-credit")?.textContent).toContain("Edition 1.25.0");
  });
});
