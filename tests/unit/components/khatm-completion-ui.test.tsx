import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import KhatmCard from "@/components/khatm-card";
import CreatorQueuePanel from "@/components/creator-queue-panel";
import { getCreatorManageRows } from "@/lib/event-filters";
import type { KhatmSnapshot } from "@/lib/types/events";
import { IntlWrapper } from "../../helpers/intl-wrapper";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ ensureSession: vi.fn(), user: null }),
}));
vi.mock("@/lib/actions/juz", () => ({
  claimMultipleJuz: vi.fn(),
  unclaimJuz: vi.fn(),
  markJuzAsRead: vi.fn(),
  unmarkJuzAsRead: vi.fn(),
}));
vi.mock("@/lib/analytics", () => ({ trackProductEvent: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function makeKhatm(completed: boolean): KhatmSnapshot {
  return {
    id: "k1",
    khatm_number: 1,
    claimed_count: 30,
    read_count: 1,
    completed_at: completed ? "2026-11-01T00:00:00Z" : null,
    completion_source: completed ? "organizer" : null,
    juzs: Array.from({ length: 30 }, (_, i) => ({
      id: `j${i + 1}`,
      juz_number: i + 1,
      status: i === 1 ? ("read" as const) : ("claimed" as const),
      claimed_by_name: "Me",
      is_mine: i < 2,
    })),
  };
}

function renderCard(
  khatm: KhatmSnapshot,
  props: { isCompleted?: boolean; isFinal?: boolean; filter?: "all" | "mine" | "available" }
) {
  return render(
    <KhatmCard
      khatm={khatm}
      shortCode="ABC"
      isReadOnly={false}
      onRefresh={async () => {}}
      activeFilter={props.filter ?? "mine"}
      isCompleted={props.isCompleted}
      isFinal={props.isFinal}
    />,
    { wrapper: IntlWrapper }
  );
}

describe("completed khatm UI (D6)", () => {
  it("hides Unclaim but keeps Done and Undo on a completed khatm", () => {
    renderCard(makeKhatm(true), { isFinal: true });
    expect(screen.queryByText("Unclaim")).toBeNull();
    expect(screen.getByText("Mark Read")).toBeTruthy();
    expect(screen.getByText("Undo")).toBeTruthy();
  });

  it("shows Unclaim on an open khatm", () => {
    renderCard(makeKhatm(false), {});
    expect(screen.getAllByText("Unclaim").length).toBe(2);
  });

  it("keeps a full khatm with a newer khatm collapsed even when not completed", () => {
    renderCard(makeKhatm(false), { filter: "all", isCompleted: true });
    expect(screen.queryByText("Unclaim")).toBeNull();
    // Collapsed summary button, not the expanded grid.
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("keeps a full khatm without a newer khatm expanded when not completed", () => {
    renderCard(makeKhatm(false), { filter: "all" });
    expect(screen.getAllByRole("button").length).toBeGreaterThan(1);
  });

  it("does not let readers select a Juz of a completed khatm", () => {
    const khatm = makeKhatm(true);
    khatm.claimed_count = 29;
    khatm.juzs[29] = { ...khatm.juzs[29], status: "unclaimed", claimed_by_name: null };
    const { unmount } = renderCard(khatm, { filter: "all", isFinal: false });
    expect(screen.queryByTitle("Tap to select Juz 30")).toBeTruthy();
    unmount();
    renderCard(khatm, { filter: "all", isFinal: true });
    expect(screen.queryByTitle("Tap to select Juz 30")).toBeNull();
  });

  it("hides Unclaim in the organizer queue for completed khatms only", () => {
    const done = makeKhatm(true);
    const open = { ...makeKhatm(false), id: "k2", khatm_number: 2 };
    const rows = getCreatorManageRows({ khatms: [done, open] });
    expect(rows.find((r) => r.khatmId === "k1")?.isCompleted).toBe(true);
    expect(rows.find((r) => r.khatmId === "k2")?.isCompleted).toBe(false);

    render(
      <CreatorQueuePanel
        rows={rows.filter((r) => r.khatmId === "k1")}
        onMarkRead={vi.fn()}
        onUndoRead={vi.fn()}
        onUnclaim={vi.fn()}
      />,
      { wrapper: IntlWrapper }
    );
    expect(screen.queryByText("Unclaim")).toBeNull();
    expect(screen.getAllByText("Mark Read").length).toBeGreaterThan(0);
    expect(screen.getByText("Undo")).toBeTruthy();

    render(
      <CreatorQueuePanel
        rows={rows.filter((r) => r.khatmId === "k2")}
        onMarkRead={vi.fn()}
        onUndoRead={vi.fn()}
        onUnclaim={vi.fn()}
      />,
      { wrapper: IntlWrapper }
    );
    expect(screen.getAllByText("Unclaim").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByText("Unclaim")[0]);
  });
});
