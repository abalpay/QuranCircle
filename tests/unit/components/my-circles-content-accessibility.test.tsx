import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyCirclesContent from "@/components/my-circles-content";
import { IntlWrapper } from "../../helpers/intl-wrapper";

const { ensureSessionMock, getMyCirclesMock } = vi.hoisted(() => ({
  ensureSessionMock: vi.fn(),
  getMyCirclesMock: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    ensureSession: ensureSessionMock,
    user: { id: "user-1" },
    isAuthenticatedUser: true,
    isAnonymous: false,
  }),
}));

vi.mock("@/lib/actions/events", () => ({
  getMyCircles: getMyCirclesMock,
}));

vi.mock("@/components/create-khatim-dialog", () => ({
  default: () => null,
}));

const circle = {
  description: null,
  short_code: "ABCDEFGH",
  is_public: true,
  created_at: "2026-02-23T00:00:00.000Z",
  archived_at: null,
  relation: "creator" as const,
  claimed: 3,
  total: 30,
  my_claimed: 1,
  my_read: 0,
  last_activity_at: "2026-02-23T00:00:00.000Z",
};

describe("MyCirclesContent accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureSessionMock.mockResolvedValue({ id: "user-1" });
    getMyCirclesMock.mockResolvedValue([
      {
        ...circle,
        id: "active-circle",
        name: "Active Circle",
        is_archived: false,
      },
      {
        ...circle,
        id: "archived-circle",
        name: "Archived Circle",
        is_archived: true,
        archived_at: "2026-02-24T00:00:00.000Z",
      },
    ]);
  });

  it("uses pressed buttons to switch circle status filters", async () => {
    const user = userEvent.setup();
    render(<MyCirclesContent />, { wrapper: IntlWrapper });

    const group = screen.getByRole("group", {
      name: "Circle status filters",
    });
    const activeButton = await within(group).findByRole("button", {
      name: "Active (1)",
    });
    const archivedButton = within(group).getByRole("button", {
      name: "Archived (1)",
    });

    expect(group.querySelector("[role='tab']")).not.toBeInTheDocument();
    expect(group.querySelector("[aria-controls]")).not.toBeInTheDocument();
    expect(activeButton).toHaveAttribute("aria-pressed", "true");
    expect(archivedButton).toHaveAttribute("aria-pressed", "false");

    await user.click(archivedButton);

    expect(archivedButton).toHaveAttribute("aria-pressed", "true");
    expect(activeButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("heading", { name: "Archived Circle" })).toBeInTheDocument();
  });
});
