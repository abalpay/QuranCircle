import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import KhatimPageClient from "@/components/khatim-page-client";
import { IntlWrapper } from "../../helpers/intl-wrapper";
import type { EventSnapshot, KhatmSnapshot } from "@/lib/types/events";

const { replaceMock, setOpenNextKhatmMock, toastSuccessMock, toastErrorMock, ensureSessionMock, markJuzAsReadMock } = vi.hoisted(() => ({
  ensureSessionMock: vi.fn(),
  markJuzAsReadMock: vi.fn(),
  replaceMock: vi.fn(),
  setOpenNextKhatmMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  usePathname: () => "/s/ABCDEFGH",
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => ({
      on() {
        return this;
      },
      subscribe() {
        return this;
      },
    }),
    removeChannel: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    ensureSession: ensureSessionMock,
    user: null,
  }),
}));

vi.mock("@/lib/actions/juz", () => ({
  markJuzAsRead: markJuzAsReadMock,
  unmarkJuzAsRead: vi.fn(),
  unclaimJuz: vi.fn(),
}));

vi.mock("@/lib/actions/events", () => ({
  ensureEventMembershipForShortCode: vi.fn().mockResolvedValue({}),
  archiveEvent: vi.fn().mockResolvedValue({}),
  unarchiveEvent: vi.fn().mockResolvedValue({}),
  deleteEvent: vi.fn().mockResolvedValue({}),
  setOpenNextKhatm: setOpenNextKhatmMock,
}));

vi.mock("@/lib/share-invite", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/share-invite")>()),
  copyCircleLink: vi.fn(),
  shareCircleInvite: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  trackProductEvent: vi.fn(),
}));

vi.mock("@/hooks/use-pwa-install", () => ({
  hasSeenClaimInstallPrompt: vi.fn(() => true),
  isInstallPromptEnabled: vi.fn(() => false),
  markClaimInstallPromptSeen: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

vi.mock("@/components/khatm-card", () => ({
  default: () => <div data-testid="khatm-card" />,
}));

vi.mock("@/components/delete-event-dialog", () => ({
  default: () => null,
}));

vi.mock("@/components/install-app-sheet", () => ({
  default: () => null,
}));

vi.mock("@/components/creator-queue-panel", () => ({
  default: () => null,
}));

function buildEvent(overrides: Partial<EventSnapshot> = {}): EventSnapshot {
  return {
    id: "event-1",
    name: "Circle One",
    description: null,
    short_code: "ABCDEFGH",
    is_public: true,
    is_archived: false,
    open_next_khatm: true,
    created_at: "2026-02-23T00:00:00.000Z",
    is_creator: false,
    is_member: true,
    can_manage: false,
    khatms: [],
    loaded_khatms: 0,
    total_khatms: 0,
    has_more_khatms: false,
    next_before_khatm_number: null,
    ...overrides,
  };
}


function makeKhatm(over: Partial<KhatmSnapshot> = {}, mine = false): KhatmSnapshot {
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
      claimed_by_name: "Amina",
      is_mine: mine && i === 0,
    })),
    ...over,
  };
}

const single = (khatm: KhatmSnapshot) => ({ khatms: [khatm], total_khatms: 1, loaded_khatms: 1 });

describe("circle page completion moment and organizer controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureSessionMock.mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: "" }));
    window.history.replaceState({}, "", "/s/ABCDEFGH");
    window.localStorage.clear();
  });

  it("opens the dialog on arrival for a reader of that khatm, once per device", () => {
    const event = buildEvent(single(makeKhatm({}, true)));
    const first = render(<KhatimPageClient event={event} shortCode="ABCDEFGH" />, { wrapper: IntlWrapper });
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Circle One")).toBeInTheDocument();
    expect(within(dialog).getByText(/^Khatm 1 complete · /)).toBeInTheDocument();
    first.unmount();

    render(<KhatimPageClient event={event} shortCode="ABCDEFGH" />, { wrapper: IntlWrapper });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows only the record, no modal, to a first-time visitor", () => {
    render(<KhatimPageClient event={buildEvent(single(makeKhatm()))} shortCode="ABCDEFGH" />, {
      wrapper: IntlWrapper,
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    // One quiet sentence-case line in the header, not a pill; nothing left to claim.
    expect(screen.getByText("Khatm 1 complete · November 2, 2026")).toBeInTheDocument();
    expect(screen.queryByText("Open For Claims")).toBeNull();
    // No "Available (0) / My Juz (0)" filters when nothing can be claimed.
    expect(screen.queryByRole("group", { name: "Juz filters" })).toBeNull();
  });

  it("opens the dialog right after the visitor's own last Done", async () => {
    const user = userEvent.setup();
    const open = makeKhatm({ completed_at: null, completion_source: null, read_count: 29 }, true);
    open.juzs[0] = { ...open.juzs[0], status: "claimed" };
    const finished = makeKhatm({}, true);
    ensureSessionMock.mockResolvedValue({ id: "u1" });
    markJuzAsReadMock.mockResolvedValue({ newlyCompleted: true });
    vi.stubGlobal(
      "fetch",
      // The snapshot only shows the completion once the visitor's Done went through.
      vi.fn(async () => ({
        ok: true,
        json: async () =>
          buildEvent(single(markJuzAsReadMock.mock.calls.length > 0 ? finished : open)),
      }))
    );
    render(<KhatimPageClient event={buildEvent(single(open))} shortCode="ABCDEFGH" />, {
      wrapper: IntlWrapper,
    });
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await waitFor(() => expect(markJuzAsReadMock).toHaveBeenCalledTimes(1));
  });

  it("keeps the organizer's queue when the latest khatm is complete, without Available", () => {
    render(
      <KhatimPageClient
        event={buildEvent({ ...single(makeKhatm()), can_manage: true, is_creator: true })}
        shortCode="ABCDEFGH"
      />,
      { wrapper: IntlWrapper }
    );
    const group = screen.getByRole("group", { name: "Juz filters" });
    expect(within(group).queryByRole("button", { name: /^Available/ })).toBeNull();
    // No "(30)": a finished khatm has no pending actions.
    expect(within(group).getByRole("button", { name: "Creator Queue" })).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: /^All \(\d+\)$/ })).toBeInTheDocument(); // the others keep their counts
    expect(within(group).queryByRole("button", { name: /^Creator Queue \(\d+\)$/ })).toBeNull();
  });

  it("does not open the dialog for an open khatm", () => {
    const open = makeKhatm({ claimed_count: 29, completed_at: null, completion_source: null }, true);
    render(<KhatimPageClient event={buildEvent(single(open))} shortCode="ABCDEFGH" />, { wrapper: IntlWrapper });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Open For Claims")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Juz filters" })).toBeInTheDocument();
  });

  it("puts the creator queue beside the other views for the organizer only", () => {
    const { unmount } = render(
      <KhatimPageClient event={buildEvent({ can_manage: true, is_creator: true })} shortCode="ABCDEFGH" />,
      { wrapper: IntlWrapper }
    );
    const group = screen.getByRole("group", { name: "Juz filters" });
    expect(within(group).getByRole("button", { name: /^Creator Queue \(\d+\)$/ })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "My Juz views" })).toBeNull();
    expect(screen.getByRole("button", { name: "Circle settings" })).toHaveTextContent("Circle settings");
    unmount();

    render(<KhatimPageClient event={buildEvent()} shortCode="ABCDEFGH" />, { wrapper: IntlWrapper });
    expect(screen.queryByRole("button", { name: /Creator Queue/ })).toBeNull();
  });
});
