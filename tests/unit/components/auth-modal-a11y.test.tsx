import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AuthModal from "@/components/auth-modal";
import { IntlWrapper } from "../../helpers/intl-wrapper";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
    resetPassword: vi.fn().mockResolvedValue({ error: null }),
  }),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn() }),
}));

describe("AuthModal keyboard-accessible auth links", () => {
  it("renders forgot-password and back-to-login as button controls", async () => {
    const user = userEvent.setup();
    render(<AuthModal isOpen onClose={() => {}} action="login" />, {
      wrapper: IntlWrapper,
    });

    const forgotPasswordButton = screen.getByRole("button", {
      name: "Forgot password?",
    });
    expect(forgotPasswordButton).toBeInTheDocument();

    await user.click(forgotPasswordButton);
    expect(
      screen.getByRole("heading", { name: "Reset Password" })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Back to Login" })
    ).toBeInTheDocument();
  });
});
