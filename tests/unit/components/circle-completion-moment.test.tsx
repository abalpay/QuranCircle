import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import KhatimPageClient from "@/components/khatim-page-client";
import { IntlWrapper } from "../../helpers/intl-wrapper";
import type { EventSnapshot, KhatmSnapshot } from "@/lib/types/events";

const { replaceMock, setOpenNextKhatmMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
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
    ensureSession: vi.fn(() => new Promise(() => {})),
    user: null,
  }),
}));

vi.mock("@/lib/actions/juz", () => ({
  markJuzAsRead: vi.fn(),
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

vi.mock("@/lib/share-invite", () => ({
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


const completedKhatm: KhatmSnapshot = {
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
    is_mine: false,
  })),
};

describe("circle page completion moment and organizer controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: "" }));
    window.history.replaceState({}, "", "/s/ABCDEFGH");
    window.localStorage.clear();
  });

  it("opens the completion dialog once per device, then leaves the badge", () => {
    const event = buildEvent({ khatms: [completedKhatm], total_khatms: 1, loaded_khatms: 1 });
    const first = render(<KhatimPageClient event={event} shortCode="ABCDEFGH" />, { wrapper: IntlWrapper });
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Khatm 1 complete" })).toBeInTheDocument();
    first.unmount();

    render(<KhatimPageClient event={event} shortCode="ABCDEFGH" />, { wrapper: IntlWrapper });
    expect(screen.queryByRole("dialog")).toBeNull();
    // A single-khatm circle reads as complete, not "Open For Claims".
    expect(screen.getByText("Khatm 1 complete")).toBeInTheDocument();
    expect(screen.queryByText("Open For Claims")).toBeNull();
  });

  it("does not open the dialog for an open khatm", () => {
    const open = { ...completedKhatm, claimed_count: 29, completed_at: null, completion_source: null };
    render(
      <KhatimPageClient event={buildEvent({ khatms: [open], total_khatms: 1, loaded_khatms: 1 })} shortCode="ABCDEFGH" />,
      { wrapper: IntlWrapper }
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Open For Claims")).toBeInTheDocument();
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
