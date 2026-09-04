import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReaderControls, SavedEntries } from "@/components/hadith/reader-controls";
import { IntlWrapper } from "../../helpers/intl-wrapper";
import { emptyState, STORAGE_KEY } from "@/lib/hadith/local-state";
vi.mock("@/i18n/navigation", () => ({ Link: ({ href, locale, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { locale?: string }) => <a href={`${locale === "en" ? "" : `/${locale}`}${href}`} {...props}>{children}</a> }));
const entry = { id: "4560", title: "Full original title", locale: "tr" as const, version: "1" };
beforeEach(() => window.localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("hadith controls", () => {
  it("persists a bookmark and size across mounts, then removes the bookmark", () => {
    const view = render(<ReaderControls entry={entry}><p>Source body</p></ReaderControls>, { wrapper: IntlWrapper });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: "Large" }));
    expect(screen.getByRole("button", { name: "Large" })).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem(STORAGE_KEY)).not.toContain("Source body");
    view.unmount();
    render(<ReaderControls entry={entry}><p>Source body</p></ReaderControls>, { wrapper: IntlWrapper });
    expect(screen.getByRole("button", { name: "Remove saved entry" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Remove saved entry" }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).entries).toEqual([]);
  });
  it("uses the saved language and clears only feature data", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...emptyState(), entries: [entry] }));
    localStorage.setItem("unrelated", "keep");
    render(<SavedEntries />, { wrapper: IntlWrapper });
    expect(screen.getByRole("link", { name: entry.title })).toHaveAttribute("href", "/tr/hadith/4560");
    fireEvent.click(screen.getByRole("button", { name: "Clear Hadith data on this device" }));
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Clear Hadith data on this device" })).toHaveFocus();
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Clear Hadith data on this device" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear saved data" }));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });
  it("shows quota failure while reading remains usable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("quota"); });
    render(<ReaderControls entry={entry}><p>Readable source</p></ReaderControls>, { wrapper: IntlWrapper });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("status")).toHaveTextContent("Device storage is unavailable");
    expect(screen.getByText("Readable source")).toBeVisible();
  });
  it("switches the reading view without modifying source children or saved data", () => {
    const { container } = render(<ReaderControls entry={entry} hasArabic><p>Original source</p></ReaderControls>, { wrapper: IntlWrapper });
    fireEvent.click(screen.getByRole("button", { name: "Translation only" }));
    expect(container.querySelector(".hadith-reader")).toHaveAttribute("data-mode", "translation");
    expect(screen.getByText("Original source")).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Arabic + translation" }));
    expect(container.querySelector(".hadith-reader")).toHaveAttribute("data-mode", "bilingual");
  });
  it("shows a visible limit message", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...emptyState(), entries: Array.from({ length: 100 }, (_, id) => ({ ...entry, id: String(id) })) }));
    render(<ReaderControls entry={entry}><p>Source</p></ReaderControls>, { wrapper: IntlWrapper });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("status")).toHaveTextContent("up to 100");
  });
});
