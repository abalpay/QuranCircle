import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthModal from "@/components/auth-modal";
import { IntlWrapper } from "../../helpers/intl-wrapper";

const renderAuthModal = (component: React.ReactElement) =>
  render(component, { wrapper: IntlWrapper });

const { authMocks, routerMock, toastMock } = vi.hoisted(() => ({
  authMocks: {
    signInWithGoogle: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
  },
  routerMock: {
    replace: vi.fn(),
  },
  toastMock: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => authMocks,
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/browse",
  useRouter: () => routerMock,
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

describe("AuthModal behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.signInWithGoogle.mockResolvedValue({ error: null });
    authMocks.signInWithPassword.mockResolvedValue({ error: null });
    authMocks.signUp.mockResolvedValue({ error: null });
    authMocks.resetPassword.mockResolvedValue({ error: null });
  });

  it("submits login form and closes modal on success", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    renderAuthModal(
      <AuthModal isOpen onClose={onClose} action="login" onSuccess={onSuccess} />
    );

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "Password!1");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(authMocks.signInWithPassword).toHaveBeenCalledWith(
        "test@example.com",
        "Password!1"
      );
    });
    expect(toastMock.success).toHaveBeenCalledWith("Login successful");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("switches language from inside the sign-in dialog", async () => {
    const user = userEvent.setup();

    renderAuthModal(<AuthModal isOpen onClose={() => {}} action="login" />);

    await user.click(
      screen.getByRole("button", { name: "Switch to Turkish" }),
    );

    expect(routerMock.replace).toHaveBeenCalledWith("/browse", {
      locale: "tr",
    });
  });

  it("shows paused error when merge preparation blocks login", async () => {
    const user = userEvent.setup();
    const mergeError = new Error("Could not secure claim transfer, retry required.");
    mergeError.name = "MergePreparationError";
    authMocks.signInWithPassword.mockResolvedValue({ error: mergeError });

    renderAuthModal(<AuthModal isOpen onClose={() => {}} action="login" />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "Password!1");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Login paused", {
        description:
          "Your existing circle activity could not be secured for transfer. Please try again.",
      });
    });
  });

  it("handles register errors with a user-friendly toast", async () => {
    const user = userEvent.setup();
    authMocks.signUp.mockResolvedValue({
      error: new Error("Invalid login credentials"),
    });

    renderAuthModal(<AuthModal isOpen onClose={() => {}} action="register" />);

    await user.type(screen.getByLabelText("Username"), "Ahmet");
    await user.type(screen.getByLabelText("Email"), "ahmet@example.com");
    await user.type(screen.getByLabelText("Password"), "Password!1");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(authMocks.signUp).toHaveBeenCalledWith(
        "ahmet@example.com",
        "Password!1",
        "Ahmet"
      );
    });
    expect(toastMock.error).toHaveBeenCalledWith("Registration failed", {
      description:
        "We couldn't complete that request. Check your details and try again.",
    });
  });

  it("rejects a registration password that does not meet the hosted policy", async () => {
    const user = userEvent.setup();

    renderAuthModal(<AuthModal isOpen onClose={() => {}} action="register" />);

    await user.type(screen.getByLabelText("Username"), "Ahmet");
    await user.type(screen.getByLabelText("Email"), "ahmet@example.com");
    await user.type(screen.getByLabelText("Password"), "alllowercase1");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      await screen.findByText(
        "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol."
      )
    ).toBeInTheDocument();
    expect(authMocks.signUp).not.toHaveBeenCalled();
  });

  it("submits forgot password and shows success state", async () => {
    const user = userEvent.setup();

    renderAuthModal(
      <AuthModal isOpen onClose={() => {}} action="forgot-password" />,
    );

    await user.type(screen.getByLabelText("Email"), "reset@example.com");
    await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

    await waitFor(() => {
      expect(authMocks.resetPassword).toHaveBeenCalledWith("reset@example.com");
    });
    expect(toastMock.success).toHaveBeenCalledWith("Password reset email sent");
    expect(
      screen.getByRole("heading", { name: "Check your email" })
    ).toBeInTheDocument();
  });
});
