import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import KhatmCard from "@/components/khatm-card";
import { CompletionContent, CompletionDialog } from "@/components/completion-moment";
import { useCompletionMoment } from "@/hooks/use-completion-moment";
import type { KhatmSnapshot } from "@/lib/types/events";
import { IntlWrapper } from "../../helpers/intl-wrapper";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ ensureSession: vi.fn(), user: null }),
}));
vi.mock("@/lib/actions/juz", () => ({ claimMultipleJuz: vi.fn(), completeKhatm: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

function makeKhatm(overrides: Partial<KhatmSnapshot> = {}): KhatmSnapshot {
  return {
    id: "k1",
    khatm_number: 1,
    claimed_count: 30,
    read_count: 30,
    completed_at: "2026-11-02T08:00:00Z",
    completion_source: "all_done",
    juzs: Array.from({ length: 30 }, (_, i) => ({
      id: `j${i + 1}`,
      juz_number: i + 1,
      status: "read" as const,
      claimed_by_name: i % 2 ? "Amina" : "Omar",
      is_mine: false,
    })),
    ...overrides,
  };
}

function renderContent(khatm = makeKhatm(), variant: "dialog" | "record" = "dialog", showSupport = true) {
  return render(
    <CompletionContent
      circleName="Khatm for Maryam"
      khatm={khatm}
      variant={variant}
      showSupport={showSupport}
      headingId="h"
    />,
    { wrapper: IntlWrapper }
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("completion content (#81)", () => {
  it("names the khatm, the circle, the dua and the prayer", () => {
    renderContent();
    expect(screen.getByRole("heading", { name: "Khatm 1 complete" })).toBeInTheDocument();
    expect(screen.getByText("Khatm for Maryam")).toBeInTheDocument();
    expect(screen.getByText("رَبَّنَا تَقَبَّلْ مِنَّا ۖ إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ")).toBeInTheDocument();
    expect(
      screen.getByText("Our Lord, accept this from us. You are the All-Hearing, the All-Knowing.")
    ).toBeInTheDocument();
    expect(screen.getByText("May Allah accept this khatm.")).toBeInTheDocument();
    expect(screen.getByText("Completed November 2, 2026")).toBeInTheDocument();
  });

  it("lists each reader once in the dialog and not in the record", () => {
    const { unmount } = renderContent();
    expect(screen.getByText("Read by")).toBeInTheDocument();
    expect(screen.getAllByText("Amina")).toHaveLength(1);
    unmount();
    renderContent(makeKhatm(), "record");
    expect(screen.queryByText("Read by")).toBeNull();
  });

  it("says all 30 Juz were taken up for an auto-completed khatm, never that they were read", () => {
    renderContent(makeKhatm({ completion_source: "auto", read_count: 3 }));
    expect(screen.getByText(/All 30 Juz were taken up\./)).toBeInTheDocument();
    expect(screen.getByText("Taken up by")).toBeInTheDocument();
    expect(screen.queryByText("Read by")).toBeNull();
  });

  it("does not claim anything about Juz for an all-done or organizer completion", () => {
    renderContent(makeKhatm({ completion_source: "organizer" }));
    expect(screen.queryByText(/taken up/i)).toBeNull();
    expect(screen.getByText("Read by")).toBeInTheDocument();
  });

  it("hides the support line without a URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_URL", "");
    renderContent();
    expect(screen.queryByTestId("completion-support-link")).toBeNull();
    expect(screen.queryByText(/sadaqah jariyah/)).toBeNull();
  });

  it("shows the support line and link below the share button when a URL is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_URL", "https://ko-fi.com/qurancircle");
    renderContent();
    const link = screen.getByTestId("completion-support-link");
    expect(link).toHaveAttribute("href", "https://ko-fi.com/qurancircle");
    expect(
      screen.getByText(
        "QuranCircle is free and run as sadaqah jariyah. Help keep it running and share in the reward."
      )
    ).toBeInTheDocument();
    const share = screen.getByRole("button", { name: "Share on WhatsApp" });
    expect(share.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the support line out when the caller does not allow it", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_URL", "https://ko-fi.com/qurancircle");
    renderContent(makeKhatm(), "record", false);
    expect(screen.queryByTestId("completion-support-link")).toBeNull();
  });

  it("shares on WhatsApp with prefilled text and the circle link", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    window.history.replaceState({}, "", "/s/ABCDEFGH");
    renderContent();
    await userEvent.setup().click(screen.getByRole("button", { name: "Share on WhatsApp" }));
    expect(open).toHaveBeenCalledTimes(1);
    const target = new URL(open.mock.calls[0][0] as string);
    expect(target.origin + target.pathname).toBe("https://wa.me/");
    const text = target.searchParams.get("text") ?? "";
    expect(text).toContain("Khatm 1 for “Khatm for Maryam” is complete");
    expect(text).toContain(`${window.location.origin}/s/ABCDEFGH`);
  });
});

describe("completed khatm on the circle page (#81, fix 2 and 37)", () => {
  it("a single completed khatm shows the record and no claim instructions or Open for claims", () => {
    render(
      <KhatmCard
        khatm={makeKhatm()}
        shortCode="ABCDEFGH"
        isReadOnly={false}
        onRefresh={async () => {}}
        activeFilter="all"
        isFinal
        circleName="Khatm for Maryam"
        isLatest
      />,
      { wrapper: IntlWrapper }
    );
    expect(screen.getByRole("heading", { name: "Khatm 1 complete" })).toBeInTheDocument();
    expect(screen.queryByText("Tap Juz to select, then press Claim.")).toBeNull();
    expect(screen.queryByText(/Open for claims/i)).toBeNull();
  });
});

describe("completion dialog: once per khatm per device", () => {
  beforeEach(() => window.localStorage.clear());

  it("opens the first time, then never again on this device", () => {
    const khatms = [makeKhatm()];
    const first = renderHook(() => useCompletionMoment(khatms));
    expect(first.result.current.khatm?.id).toBe("k1");
    act(() => first.result.current.close());
    expect(first.result.current.khatm).toBeNull();
    first.unmount();

    const second = renderHook(() => useCompletionMoment(khatms));
    expect(second.result.current.khatm).toBeNull();
  });

  it("opens when a khatm completes during the visit", () => {
    const open = makeKhatm({ completed_at: null, completion_source: null });
    const { result, rerender } = renderHook(({ khatms }) => useCompletionMoment(khatms), {
      initialProps: { khatms: [open] },
    });
    expect(result.current.khatm).toBeNull();
    rerender({ khatms: [makeKhatm()] });
    expect(result.current.khatm?.id).toBe("k1");
  });

  it("shows only the newest unseen khatm and marks the older ones seen", () => {
    const older = makeKhatm({ id: "k1", khatm_number: 1 });
    const newer = makeKhatm({ id: "k2", khatm_number: 2 });
    const first = renderHook(() => useCompletionMoment([older, newer]));
    expect(first.result.current.khatm?.id).toBe("k2");
    first.unmount();
    expect(renderHook(() => useCompletionMoment([older, newer])).result.current.khatm).toBeNull();
  });

  it("still stops repeats within the visit when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const khatms = [makeKhatm()];
    const { result, rerender } = renderHook(({ list }) => useCompletionMoment(list), {
      initialProps: { list: khatms },
    });
    expect(result.current.khatm?.id).toBe("k1");
    act(() => result.current.close());
    rerender({ list: [...khatms] });
    expect(result.current.khatm).toBeNull();
  });

  it("renders as a dialog with the title and closes", async () => {
    const onClose = vi.fn();
    render(<CompletionDialog khatm={makeKhatm()} circleName="Khatm for Maryam" onClose={onClose} />, {
      wrapper: IntlWrapper,
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Khatm 1 complete" })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
