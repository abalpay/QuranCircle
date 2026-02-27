import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthModal from "@/components/auth-modal";

const { authMocks, toastMock } = vi.hoisted(() => ({
  authMocks: {
    signInWithGoogle: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
  },
  toastMock: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => authMocks,
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

    render(
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

  it("shows paused error when merge preparation blocks login", async () => {
    const user = userEvent.setup();
    const mergeError = new Error("Could not secure claim transfer, retry required.");
    mergeError.name = "MergePreparationError";
    authMocks.signInWithPassword.mockResolvedValue({ error: mergeError });

    render(<AuthModal isOpen onClose={() => {}} action="login" />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "Password!1");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Login paused", {
        description: "Could not secure claim transfer, retry required.",
      });
    });
  });

  it("handles register errors with a user-friendly toast", async () => {
    const user = userEvent.setup();
    authMocks.signUp.mockResolvedValue({
      error: new Error("Invalid login credentials"),
    });

    render(<AuthModal isOpen onClose={() => {}} action="register" />);

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
      description: "Invalid login credentials",
    });
  });

  it("submits forgot password and shows success state", async () => {
    const user = userEvent.setup();

    render(<AuthModal isOpen onClose={() => {}} action="forgot-password" />);

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
