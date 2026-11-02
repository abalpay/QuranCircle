import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import KhatimPageClient from "@/components/khatim-page-client";
import { IntlWrapper } from "../../helpers/intl-wrapper";
import type { EventSnapshot } from "@/lib/types/events";

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

describe("Open-next-khatm toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setOpenNextKhatmMock.mockResolvedValue({});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: "" })
    );
    window.history.replaceState({}, "", "/s/ABCDEFGH");
    Object.defineProperty(window, "localStorage", {
      value: { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() },
      configurable: true,
    });
  });

  it("is not offered to non-creators", () => {
    render(<KhatimPageClient event={buildEvent()} shortCode="ABCDEFGH" />, {
      wrapper: IntlWrapper,
    });

    expect(screen.queryByRole("button", { name: "Circle settings" })).not.toBeInTheDocument();
    expect(screen.queryByText("Open a new khatm when this one fills")).not.toBeInTheDocument();
  });

  it("lets the creator switch it off and calls the action", async () => {
    const user = userEvent.setup();
    render(
      <KhatimPageClient
        event={buildEvent({ is_creator: true, can_manage: true })}
        shortCode="ABCDEFGH"
      />,
      { wrapper: IntlWrapper }
    );

    await user.click(screen.getByRole("button", { name: "Circle settings" }));
    const toggle = screen.getByRole("menuitemcheckbox", {
      name: /Open a new khatm when this one fills/,
    });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Turn off if this circle is for a single khatm")).toBeInTheDocument();

    await user.click(toggle);

    await waitFor(() => {
      expect(setOpenNextKhatmMock).toHaveBeenCalledWith("ABCDEFGH", false);
    });
    expect(toastSuccessMock).toHaveBeenCalledWith("No new khatm will open when this one fills");
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  async function openToggle(overrides: Partial<EventSnapshot> = {}) {
    const user = userEvent.setup();
    render(
      <KhatimPageClient
        event={buildEvent({ is_creator: true, can_manage: true, ...overrides })}
        shortCode="ABCDEFGH"
      />,
      { wrapper: IntlWrapper }
    );
    await user.click(screen.getByRole("button", { name: "Circle settings" }));
    return {
      user,
      toggle: screen.getByRole("menuitemcheckbox", {
        name: /Open a new khatm when this one fills/,
      }),
    };
  }

  it("keeps the state and shows the error when the action fails", async () => {
    setOpenNextKhatmMock.mockResolvedValue({ error: "Unauthorized" });
    const { user, toggle } = await openToggle();

    await user.click(toggle);

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Unauthorized"));
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });

  it("is not offered on archived circles", async () => {
    const user = userEvent.setup();
    render(
      <KhatimPageClient
        event={buildEvent({ is_creator: true, can_manage: true, is_archived: true })}
        shortCode="ABCDEFGH"
      />,
      { wrapper: IntlWrapper }
    );
    await user.click(screen.getByRole("button", { name: "Circle settings" }));

    expect(screen.queryByRole("menuitemcheckbox")).not.toBeInTheDocument();
  });

  it("says when the empty khatm was removed", async () => {
    setOpenNextKhatmMock.mockResolvedValue({ removedKhatm: true, openedKhatm: false });
    const { user, toggle } = await openToggle();

    await user.click(toggle);

    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith(
        "No new khatm will open. The empty khatm was removed."
      )
    );
  });

  it("says when a new khatm opened", async () => {
    setOpenNextKhatmMock.mockResolvedValue({ removedKhatm: false, openedKhatm: true });
    const { user, toggle } = await openToggle({ open_next_khatm: false });

    await user.click(toggle);

    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith("A new khatm opened"));
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });
});
