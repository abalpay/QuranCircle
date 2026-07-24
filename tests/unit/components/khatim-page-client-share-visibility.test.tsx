import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import KhatimPageClient from "@/components/khatim-page-client";
import { IntlWrapper } from "../../helpers/intl-wrapper";
import type { EventSnapshot } from "@/lib/types/events";
import turkishMessages from "../../../messages/tr.json";

const {
  copyCircleLinkMock,
  replaceMock,
  searchParamsMock,
  shareCircleInviteMock,
  trackProductEventMock,
} = vi.hoisted(() => ({
  copyCircleLinkMock: vi.fn(),
  replaceMock: vi.fn(),
  searchParamsMock: { value: "" },
  shareCircleInviteMock: vi.fn(),
  trackProductEventMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(searchParamsMock.value),
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
}));

vi.mock("@/lib/share-invite", () => ({
  copyCircleLink: copyCircleLinkMock,
  shareCircleInvite: shareCircleInviteMock,
}));

vi.mock("@/lib/analytics", () => ({
  trackProductEvent: trackProductEventMock,
}));

vi.mock("@/hooks/use-pwa-install", () => ({
  hasSeenClaimInstallPrompt: vi.fn(() => true),
  isInstallPromptEnabled: vi.fn(() => false),
  markClaimInstallPromptSeen: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
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

function TurkishIntlWrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="tr" messages={turkishMessages}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("KhatimPageClient share/settings visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsMock.value = "";
    shareCircleInviteMock.mockResolvedValue("shared");
    copyCircleLinkMock.mockResolvedValue("copied");
    window.history.replaceState({}, "", "/s/ABCDEFGH");
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      configurable: true,
    });
  });

  it("shows Share for non-creators and hides creator settings", () => {
    const { container } = render(
      <KhatimPageClient event={buildEvent()} shortCode="ABCDEFGH" />,
      { wrapper: IntlWrapper }
    );

    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
    expect(container.querySelector(".lucide-settings")).not.toBeInTheDocument();
  });

  it("offers invitation sharing and clean-link copying", async () => {
    const user = userEvent.setup();
    render(<KhatimPageClient event={buildEvent()} shortCode="ABCDEFGH" />, {
      wrapper: IntlWrapper,
    });

    await user.click(screen.getByRole("button", { name: "Share" }));

    expect(
      screen.getByRole("menuitem", { name: "Share invitation" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Copy link" })
    ).toBeInTheDocument();
  });

  it("shares a localized invitation with the current locale path", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/tr/s/ABCDEFGH?filter=available");
    render(<KhatimPageClient event={buildEvent()} shortCode="ABCDEFGH" />, {
      wrapper: TurkishIntlWrapper,
    });

    await user.click(screen.getByRole("button", { name: "Paylaş" }));
    await user.click(
      screen.getByRole("menuitem", { name: "Halka davetini paylaş" })
    );

    await waitFor(() => {
      expect(shareCircleInviteMock).toHaveBeenCalledWith({
        title: "Circle One",
        text: "QuranCircle’daki “Circle One” hatim halkasına katılın ve bir cüz sahiplenin.",
        url: "http://localhost:3000/tr/s/ABCDEFGH",
      });
    });
  });

  it("copies only the current circle URL", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/tr/s/ABCDEFGH?filter=mine");
    render(<KhatimPageClient event={buildEvent()} shortCode="ABCDEFGH" />, {
      wrapper: IntlWrapper,
    });

    await user.click(screen.getByRole("button", { name: "Share" }));
    await user.click(screen.getByRole("menuitem", { name: "Copy link" }));

    await waitFor(() => {
      expect(copyCircleLinkMock).toHaveBeenCalledWith(
        "http://localhost:3000/tr/s/ABCDEFGH"
      );
    });
    expect(trackProductEventMock).toHaveBeenCalledWith(
      "Circle Invite Copied",
      { visibility: "public" }
    );
  });

  it("names creator settings and exposes filters as pressed buttons", () => {
    render(
      <KhatimPageClient
        event={buildEvent({
          is_creator: true,
          can_manage: true,
        })}
        shortCode="ABCDEFGH"
      />,
      { wrapper: IntlWrapper }
    );

    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Circle settings" })
    ).toBeInTheDocument();

    const filterGroup = screen.getByRole("group", { name: "Juz filters" });
    expect(filterGroup.querySelector("[role='tab']")).not.toBeInTheDocument();
    expect(filterGroup.querySelector("[aria-controls]")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All (0)" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("uses pressed buttons for creator My Juz views", () => {
    searchParamsMock.value = "filter=mine";

    render(
      <KhatimPageClient
        event={buildEvent({
          is_creator: true,
          can_manage: true,
        })}
        shortCode="ABCDEFGH"
      />,
      { wrapper: IntlWrapper }
    );

    const viewsGroup = screen.getByRole("group", { name: "My Juz views" });
    expect(viewsGroup.querySelector("[role='tab']")).not.toBeInTheDocument();
    expect(viewsGroup.querySelector("[aria-controls]")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "My Juz" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});
