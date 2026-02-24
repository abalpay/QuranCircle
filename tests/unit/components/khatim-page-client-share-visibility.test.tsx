import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import KhatimPageClient from "@/components/khatim-page-client";
import { IntlWrapper } from "../../helpers/intl-wrapper";
import type { EventSnapshot } from "@/lib/types/events";

const { replaceMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  usePathname: () => "/s/ABCDEFGH",
  useSearchParams: () => new URLSearchParams(""),
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

describe("KhatimPageClient share/settings visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("shows creator settings controls for creators", () => {
    const { container } = render(
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
    expect(container.querySelector(".lucide-settings")).toBeInTheDocument();
  });
});
