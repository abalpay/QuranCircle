import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateKhatimDialog from "@/components/create-khatim-dialog";
import { IntlWrapper } from "../../helpers/intl-wrapper";

const { ensureSessionMock, createEventMock, pushMock, openAuthModalMock } = vi.hoisted(() => ({
  openAuthModalMock: vi.fn(),
  ensureSessionMock: vi.fn(),
  createEventMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ ensureSession: ensureSessionMock }),
}));
vi.mock("@/hooks/use-auth-modal", () => ({
  useAuthModal: () => ({ openAuthModal: openAuthModalMock }),
}));
vi.mock("@/lib/actions/events", () => ({ createEvent: createEventMock }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/lib/analytics", () => ({ trackProductEvent: vi.fn() }));

vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

describe("CreateKhatimDialog without an account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureSessionMock.mockResolvedValue({ id: "anon-1", is_anonymous: true });
    createEventMock.mockResolvedValue({ data: { shortCode: "ABC12345" } });
  });

  it("ensures an anonymous session and creates without sign-in", async () => {
    render(<CreateKhatimDialog isOpen onClose={() => {}} />, {
      wrapper: IntlWrapper,
    });
    await userEvent.type(screen.getByRole("textbox", { name: /circle name/i }), "Ramadan");
    await userEvent.click(screen.getByRole("button", { name: "Create Circle" }));

    expect(ensureSessionMock).toHaveBeenCalled();
    expect(createEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ramadan" })
    );
    expect(pushMock).toHaveBeenCalledWith("/s/ABC12345");
  });

  it("does not create when no session can be established", async () => {
    ensureSessionMock.mockResolvedValue(null);
    render(<CreateKhatimDialog isOpen onClose={() => {}} />, {
      wrapper: IntlWrapper,
    });
    await userEvent.type(screen.getByRole("textbox", { name: /circle name/i }), "Ramadan");
    await userEvent.click(screen.getByRole("button", { name: "Create Circle" }));

    expect(createEventMock).not.toHaveBeenCalled();
    expect(openAuthModalMock).toHaveBeenCalledWith("login");
  });
});
