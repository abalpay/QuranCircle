import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import KhatmCard from "@/components/khatm-card";
import type { KhatmSnapshot } from "@/lib/types/events";
import { IntlWrapper } from "../../helpers/intl-wrapper";

const { completeKhatmMock, toastErrorMock } = vi.hoisted(() => ({
  completeKhatmMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ ensureSession: vi.fn(), user: null }),
}));
vi.mock("@/lib/actions/juz", () => ({
  claimMultipleJuz: vi.fn(),
  completeKhatm: completeKhatmMock,
}));
vi.mock("@/lib/analytics", () => ({ trackProductEvent: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: toastErrorMock, warning: vi.fn() } }));

function makeKhatm(overrides: Partial<KhatmSnapshot> = {}): KhatmSnapshot {
  return {
    id: "k1",
    khatm_number: 1,
    claimed_count: 30,
    read_count: 0,
    completed_at: null,
    completion_source: null,
    last_claimed_at: "2026-11-01T10:00:00Z",
    juzs: Array.from({ length: 30 }, (_, i) => ({
      id: `j${i + 1}`,
      juz_number: i + 1,
      status: "claimed" as const,
      claimed_by_name: "Amina",
      is_mine: false,
    })),
    ...overrides,
  };
}

function renderCard(
  khatm: KhatmSnapshot,
  props: { canManage?: boolean; isReadOnly?: boolean; onCompleted?: () => void } = {}
) {
  return render(
    <KhatmCard
      khatm={khatm}
      shortCode="ABCDEFGH"
      isReadOnly={props.isReadOnly ?? false}
      onRefresh={async () => {}}
      activeFilter="all"
      circleName="Khatm for Maryam"
      canManage={props.canManage ?? true}
      isFinal={Boolean(khatm.completed_at)}
      onCompleted={props.onCompleted}
    />,
    { wrapper: IntlWrapper }
  );
}

describe("organizer completes a khatm (#80)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the banner to the organizer of a fully claimed, open khatm", () => {
    renderCard(makeKhatm());
    expect(screen.getByText("All 30 Juz are claimed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Complete the khatm" })).toBeInTheDocument();
  });

  it.each([
    ["a non-creator", makeKhatm(), { canManage: false }],
    ["a khatm with unclaimed Juz", makeKhatm({ claimed_count: 29 }), {}],
    [
      "a completed khatm",
      makeKhatm({ completed_at: "2026-11-02T00:00:00Z", completion_source: "organizer" }),
      {},
    ],
    ["an archived circle", makeKhatm(), { isReadOnly: true }],
  ])("hides the banner for %s", (_label, khatm, props) => {
    renderCard(khatm, props);
    expect(screen.queryByText("All 30 Juz are claimed")).toBeNull();
    expect(screen.queryByRole("button", { name: "Complete the khatm" })).toBeNull();
  });

  it("names the automatic completion date: latest claim plus seven days", () => {
    renderCard(makeKhatm({ last_claimed_at: "2026-11-01T10:00:00Z" }));
    expect(screen.getByText("Completes automatically on November 8, 2026.")).toBeInTheDocument();
  });

  it("falls back to the rule when the snapshot has no claim time", () => {
    renderCard(makeKhatm({ last_claimed_at: undefined }));
    expect(
      screen.getByText("Completes automatically seven days after the last Juz was claimed.")
    ).toBeInTheDocument();
  });

  it("confirms, then calls the action and refreshes", async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    completeKhatmMock.mockResolvedValue({ newlyCompleted: true });
    renderCard(makeKhatm(), { onCompleted });

    await user.click(screen.getByRole("button", { name: "Complete the khatm" }));
    expect(completeKhatmMock).not.toHaveBeenCalled();
    expect(
      screen.getByText("This marks the khatm complete for everyone. This can’t be undone.")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Complete khatm" }));
    await waitFor(() => expect(completeKhatmMock).toHaveBeenCalledWith("ABCDEFGH", "k1"));
    await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("cancelling does not call the action", async () => {
    const user = userEvent.setup();
    renderCard(makeKhatm());
    await user.click(screen.getByRole("button", { name: "Complete the khatm" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(completeKhatmMock).not.toHaveBeenCalled();
  });

  it("shows a translated error toast and keeps the khatm open", async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    completeKhatmMock.mockResolvedValue({ error: "not_ready" });
    renderCard(makeKhatm(), { onCompleted });

    await user.click(screen.getByRole("button", { name: "Complete the khatm" }));
    await user.click(screen.getByRole("button", { name: "Complete khatm" }));

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith(
        "All 30 Juz must be claimed before the khatm can be completed."
      )
    );
    expect(onCompleted).not.toHaveBeenCalled();
  });

  it("shows a plain error when the request throws", async () => {
    const user = userEvent.setup();
    completeKhatmMock.mockRejectedValue(new Error("network"));
    renderCard(makeKhatm());
    await user.click(screen.getByRole("button", { name: "Complete the khatm" }));
    await user.click(screen.getByRole("button", { name: "Complete khatm" }));
    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith("Unable to complete this khatm. Please try again.")
    );
  });
});
