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

function makeKhatm(overrides: Partial<KhatmSnapshot> = {}, mine = false): KhatmSnapshot {
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
      is_mine: mine && i === 0,
    })),
    ...overrides,
  };
}

function renderContent(
  khatm = makeKhatm(),
  props: { variant?: "dialog" | "record"; showSupport?: boolean; showDate?: boolean } = {}
) {
  return render(
    <CompletionContent
      circleName="Khatm for Maryam"
      khatm={khatm}
      variant={props.variant ?? "dialog"}
      showSupport={props.showSupport ?? true}
      showDate={props.showDate}
      headingId="h"
    />,
    { wrapper: IntlWrapper }
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("completion dialog content (#81)", () => {
  it("leads with the person's name, then the khatm and date, then the dua and the prayer", () => {
    renderContent();
    expect(screen.getByText("Khatm for Maryam")).toBeInTheDocument();
    expect(screen.getByText("Khatm 1 complete · November 2, 2026")).toBeInTheDocument();
    expect(screen.getByText("رَبَّنَا تَقَبَّلْ مِنَّا ۖ إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ")).toBeInTheDocument();
    expect(
      screen.getByText("Our Lord, accept this from us. You are the All-Hearing, the All-Knowing.")
    ).toBeInTheDocument();
    expect(screen.getByText("May Allah accept this khatm.")).toBeInTheDocument();
  });

  it("lists each reader once as an isolated list item, with spacing instead of a separator", () => {
    renderContent();
    expect(screen.getByText("Read by")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["Omar", "Amina"]);
    items.forEach((item) => {
      expect(item.querySelector("bdi")?.textContent).toBe(item.textContent);
      expect(item.className).not.toMatch(/before|content-/);
    });
    expect(items[0].parentElement?.className).not.toMatch(/before|content-/);
  });

  it("says all 30 Juz were taken up for an auto-completed khatm, never that they were read", () => {
    renderContent(makeKhatm({ completion_source: "auto", read_count: 3 }));
    expect(screen.getByText("All 30 Juz were taken up.")).toBeInTheDocument();
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
    renderContent(makeKhatm(), { showSupport: false });
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

describe("a long register in the dialog", () => {
  const manyReaders = () =>
    makeKhatm({
      juzs: Array.from({ length: 30 }, (_, i) => ({
        id: `j${i + 1}`,
        juz_number: i + 1,
        status: "read" as const,
        claimed_by_name: i % 2 ? `قارئ طويل الاسم رقم ${i}` : `A Very Long Reader Name Number ${i}`,
        is_mine: i === 0,
      })),
    });

  it("shows 12 names, then expands in place behind an accessible 'and N more' button", async () => {
    const user = userEvent.setup();
    renderContent(manyReaders());
    expect(screen.getAllByRole("listitem")).toHaveLength(12);
    const toggle = screen.getByRole("button", { name: "and 18 more" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(screen.getAllByRole("listitem")).toHaveLength(30);
    const fewer = screen.getByRole("button", { name: "Show fewer" });
    expect(fewer).toHaveAttribute("aria-expanded", "true");

    await user.click(fewer);
    expect(screen.getAllByRole("listitem")).toHaveLength(12);
  });

  it("has no toggle at 12 names or fewer", () => {
    renderContent();
    expect(screen.queryByRole("button", { name: /more|fewer/i })).toBeNull();
  });

  it("keeps share and the close button pinned while the dialog scrolls", () => {
    render(
      <CompletionDialog khatm={manyReaders()} circleName="Khatm for Maryam" circleCreatedAt="2020-01-01T00:00:00Z" onClose={vi.fn()} />,
      { wrapper: IntlWrapper }
    );
    const share = screen.getByRole("button", { name: "Share on WhatsApp" });
    expect(share.closest(".sticky")?.className).toMatch(/bottom-0/);
    expect(screen.getByRole("button", { name: "Close" }).closest(".sticky")?.className).toMatch(/top-0/);
  });
});

describe("support ask in the dialog (D10, D19)", () => {
  const hour = 36e5;
  const ago = (hours: number) => new Date(Date.now() - hours * hour).toISOString();

  it("waits until the circle is more than 72 hours old", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_URL", "https://ko-fi.com/qurancircle");
    const { unmount } = render(
      <CompletionDialog khatm={makeKhatm()} circleName="Khatm for Maryam" circleCreatedAt={ago(71)} onClose={vi.fn()} />,
      { wrapper: IntlWrapper }
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByTestId("completion-support-link")).toBeNull();
    unmount();

    render(
      <CompletionDialog khatm={makeKhatm()} circleName="Khatm for Maryam" circleCreatedAt={ago(73)} onClose={vi.fn()} />,
      { wrapper: IntlWrapper }
    );
    expect(screen.getByTestId("completion-support-link")).toBeInTheDocument();
  });

  it("closes from the close button", async () => {
    const onClose = vi.fn();
    render(
      <CompletionDialog khatm={makeKhatm()} circleName="Khatm for Maryam" circleCreatedAt={new Date().toISOString()} onClose={onClose} />,
      { wrapper: IntlWrapper }
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("completed khatm record on the circle page (#81, fixes 2 and 37)", () => {
  function renderRecord(props: { isLatest: boolean }) {
    return render(
      <KhatmCard
        khatm={makeKhatm()}
        shortCode="ABCDEFGH"
        isReadOnly={false}
        onRefresh={async () => {}}
        activeFilter="all"
        isFinal
        circleName="Khatm for Maryam"
        isLatest={props.isLatest}
      />,
      { wrapper: IntlWrapper }
    );
  }

  it("shows the khatm record without repeating the name, claim instructions or the support ask", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_URL", "https://ko-fi.com/qurancircle");
    renderRecord({ isLatest: true });
    expect(screen.getByRole("heading", { name: "Khatm 1 complete" })).toBeInTheDocument();
    expect(screen.queryByText("Khatm for Maryam")).toBeNull();
    expect(screen.queryByText("Tap Juz to select, then press Claim.")).toBeNull();
    expect(screen.queryByText(/Open for claims/i)).toBeNull();
    expect(screen.queryByTestId("completion-support-link")).toBeNull();
    // The page header carries the latest khatm's date.
    expect(screen.queryByText(/November 2, 2026/)).toBeNull();
  });

  it("states the date on an earlier khatm, which the header does not cover", () => {
    renderRecord({ isLatest: false });
    expect(screen.getByText("November 2, 2026")).toBeInTheDocument();
  });
});

describe("when the completion dialog opens", () => {
  beforeEach(() => window.localStorage.clear());

  it("opens on arrival for a visitor with a Juz in the khatm, once per device", () => {
    const khatms = [makeKhatm({}, true)];
    const first = renderHook(() => useCompletionMoment(khatms));
    expect(first.result.current.khatm?.id).toBe("k1");
    act(() => first.result.current.close());
    expect(first.result.current.khatm).toBeNull();
    first.unmount();

    const second = renderHook(() => useCompletionMoment(khatms));
    expect(second.result.current.khatm).toBeNull();
  });

  it("does not open on arrival for a visitor with no Juz in it (a link from WhatsApp)", () => {
    const { result } = renderHook(() => useCompletionMoment([makeKhatm()]));
    expect(result.current.khatm).toBeNull();
  });

  it("opens after the visitor's own completing action", () => {
    const open = makeKhatm({ completed_at: null, completion_source: null }, true);
    const { result, rerender } = renderHook(({ khatms }) => useCompletionMoment(khatms), {
      initialProps: { khatms: [open] },
    });
    expect(result.current.khatm).toBeNull();
    act(() => result.current.announceOwnCompletion("k1"));
    expect(result.current.khatm).toBeNull(); // the refreshed snapshot has not landed yet
    rerender({ khatms: [makeKhatm({}, true)] });
    expect(result.current.khatm?.id).toBe("k1");
  });

  it("stays quiet when a khatm completes by someone else's action (realtime)", () => {
    const open = makeKhatm({ completed_at: null, completion_source: null }, true);
    const { result, rerender } = renderHook(({ khatms }) => useCompletionMoment(khatms), {
      initialProps: { khatms: [open] },
    });
    rerender({ khatms: [makeKhatm({}, true)] });
    expect(result.current.khatm).toBeNull();
  });

  it("marks older khatms that are loaded later silently, even after an own action", () => {
    const current = makeKhatm({ id: "k2", khatm_number: 2, completed_at: null, completion_source: null }, true);
    const { result, rerender } = renderHook(({ khatms }) => useCompletionMoment(khatms), {
      initialProps: { khatms: [current] },
    });
    act(() => result.current.announceOwnCompletion("k2"));
    rerender({ khatms: [makeKhatm({ id: "k1", khatm_number: 1 }, true), current] });
    expect(result.current.khatm).toBeNull();
  });

  it("opens only for the khatm the visitor completed, not another one completed by realtime", () => {
    const open = (id: string, n: number) =>
      makeKhatm({ id, khatm_number: n, completed_at: null, completion_source: null }, true);
    const { result, rerender } = renderHook(({ khatms }) => useCompletionMoment(khatms), {
      initialProps: { khatms: [open("k1", 1), open("k2", 2)] },
    });
    act(() => result.current.announceOwnCompletion("k2"));
    // k1 completes by realtime first; k2 is the visitor's own.
    rerender({ khatms: [makeKhatm({ id: "k1", khatm_number: 1 }, true), open("k2", 2)] });
    expect(result.current.khatm).toBeNull();
    rerender({
      khatms: [makeKhatm({ id: "k1", khatm_number: 1 }, true), makeKhatm({ id: "k2", khatm_number: 2 }, true)],
    });
    expect(result.current.khatm?.id).toBe("k2");
  });

  it("opens when the realtime refresh lands before the visitor's announce", () => {
    const open = makeKhatm({ completed_at: null, completion_source: null }, true);
    const { result, rerender } = renderHook(({ khatms }) => useCompletionMoment(khatms), {
      initialProps: { khatms: [open] },
    });
    rerender({ khatms: [makeKhatm({}, true)] }); // the snapshot shows it complete: silent
    expect(result.current.khatm).toBeNull();
    act(() => result.current.announceOwnCompletion("k1")); // the action result arrives after
    expect(result.current.khatm?.id).toBe("k1");
  });

  describe("own-action window", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-11-02T12:00:00Z"));
    });
    afterEach(() => vi.useRealTimers());

    it("expires after 15 seconds: a late completion stays silent", () => {
      const open = makeKhatm({ completed_at: null, completion_source: null }, true);
      const { result, rerender } = renderHook(({ khatms }) => useCompletionMoment(khatms), {
        initialProps: { khatms: [open] },
      });
      act(() => result.current.announceOwnCompletion("k1"));
      vi.setSystemTime(new Date("2026-11-02T12:00:16Z"));
      rerender({ khatms: [makeKhatm({}, true)] });
      expect(result.current.khatm).toBeNull();
    });

    it("still opens just inside the window", () => {
      const open = makeKhatm({ completed_at: null, completion_source: null }, true);
      const { result, rerender } = renderHook(({ khatms }) => useCompletionMoment(khatms), {
        initialProps: { khatms: [open] },
      });
      act(() => result.current.announceOwnCompletion("k1"));
      vi.setSystemTime(new Date("2026-11-02T12:00:14Z"));
      rerender({ khatms: [makeKhatm({}, true)] });
      expect(result.current.khatm?.id).toBe("k1");
    });
  });

  it("still stops repeats within the visit when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const khatms = [makeKhatm({}, true)];
    const { result, rerender } = renderHook(({ list }) => useCompletionMoment(list), {
      initialProps: { list: khatms },
    });
    expect(result.current.khatm?.id).toBe("k1");
    act(() => result.current.close());
    rerender({ list: [...khatms] });
    expect(result.current.khatm).toBeNull();
  });
});
