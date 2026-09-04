import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import TopicPage from "@/app/[locale]/hadith/topics/[topicId]/page";
import ReaderPage from "@/app/[locale]/hadith/[id]/page";
import HadithLayout, { generateMetadata } from "@/app/[locale]/hadith/layout";
import HadithError from "@/app/[locale]/hadith/error";
import { getReader, getTopicPage, getTopics, getManifest } from "@/lib/hadith/repository";
import HadithHome from "@/app/[locale]/hadith/page";
import SourcesPage from "@/app/[locale]/hadith/sources/page";
import SavedPage from "@/app/[locale]/hadith/saved/page";
import { IntlWrapper } from "../../helpers/intl-wrapper";
import { fireEvent } from "@testing-library/react";
vi.mock("next/dist/compiled/server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: () => { throw Error("404"); } }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/lib/hadith/repository", () => ({ getReader: vi.fn(), getTopicPage: vi.fn(), getTopics: vi.fn(), getManifest: vi.fn(), HADITH_PAGE_SIZE: 20 }));
beforeEach(() => { vi.stubEnv("HADITH_READER_ENABLED", "true"); });
vi.mock("@/i18n/navigation", () => ({ Link: ({ href, locale, children, ...props }: { href: string | { pathname: string; query: Record<string, string | number> }; locale?: string; children: React.ReactNode }) => <a href={`${locale && locale !== "en" ? `/${locale}` : ""}${typeof href === "string" ? href : `${href.pathname}?${new URLSearchParams(Object.entries(href.query).map(([k,v]) => [k, String(v)]))}`}`} {...props}>{children}</a> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllEnvs(); });
describe("Hadith routes", () => {
  it.each([
    ["index", () => HadithHome({ params: Promise.resolve({ locale: "en" }) })],
    ["topic", () => TopicPage({ params: Promise.resolve({ locale: "en", topicId: "all" }), searchParams: Promise.resolve({}) })],
    ["reader", () => ReaderPage({ params: Promise.resolve({ locale: "en", id: "4560" }), searchParams: Promise.resolve({}) })],
    ["sources", () => SourcesPage()],
    ["saved", () => SavedPage()],
  ] as const)("gates direct %s children before any source read", async (_name, page) => {
    vi.stubEnv("HADITH_READER_ENABLED", "false");
    await expect(page()).rejects.toThrow("404");
    for (const read of [getReader, getTopicPage, getTopics, getManifest]) expect(read).not.toHaveBeenCalled();
  });
  it.each(["0", "-1", "1.5", "abc", "01", ["1", "2"], "9999999999999999999999"])("404s invalid page %s", async page => {
    await expect(TopicPage({ params: Promise.resolve({ locale: "en", topicId: "all" }), searchParams: Promise.resolve({ page }) })).rejects.toThrow("404");
    expect(getTopicPage).not.toHaveBeenCalled();
  });
  it("404s unknown topics and pages the repository clamps", async () => {
    vi.mocked(getTopicPage).mockResolvedValueOnce(null).mockResolvedValueOnce({ page: 2 } as Awaited<ReturnType<typeof getTopicPage>>);
    for (let i = 0; i < 2; i++) await expect(TopicPage({ params: Promise.resolve({ locale: "en", topicId: "unknown" }), searchParams: Promise.resolve({ page: "3" }) })).rejects.toThrow("404");
  });
  it("shows available edition links instead of silently substituting content", async () => {
    vi.mocked(getReader).mockResolvedValue({ kind: "unavailable", locales: ["en", "ar"] });
    render(await ReaderPage({ params: Promise.resolve({ locale: "tr", id: "4560" }), searchParams: Promise.resolve({}) }));
    expect(screen.getByText("unavailableEdition")).toBeVisible();
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("href", "/hadith/4560");
    expect(screen.getByRole("link", { name: "العربية" })).toHaveAttribute("href", "/ar/hadith/4560");
  });
  it("404s globally unknown and invalid IDs", async () => {
    vi.mocked(getReader).mockResolvedValue({ kind: "missing" });
    for (const id of ["999999", "bad"]) await expect(ReaderPage({ params: Promise.resolve({ locale: "en", id }), searchParams: Promise.resolve({}) })).rejects.toThrow("404");
  });
  it("gates the route by default and keeps noindex when enabled", async () => {
    vi.stubEnv("HADITH_READER_ENABLED", "false");
    await expect(HadithLayout({ children: "content" })).rejects.toThrow("404");
    vi.stubEnv("HADITH_READER_ENABLED", "true");
    expect(await HadithLayout({ children: "content" })).toBeTruthy();
    expect((await generateMetadata()).robots).toEqual({ index: false, follow: false });
  });
  it("calls Next's retry callback for operational errors", () => {
    const retry = vi.fn();
    render(<HadithError error={Error("filesystem")} retry={retry} />, { wrapper: IntlWrapper });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
