import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountPageClient from "@/components/account-page-client";

const {
  authenticatedUser,
  authSignInWithPassword,
  authUpdateUser,
  routerMock,
  toastMock,
} = vi.hoisted(() => ({
  authenticatedUser: {
    id: "user-1",
    email: "user@example.com",
    app_metadata: { provider: "email" },
    user_metadata: { username: "User" },
    created_at: "2026-01-01T00:00:00.000Z",
  },
  authSignInWithPassword: vi.fn(),
  authUpdateUser: vi.fn(),
  routerMock: { replace: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    ({
      currentPassword: "Current password",
      enterCurrentPassword: "Enter current password",
      newPassword: "New password",
      enterNewPassword: "Enter new password",
      confirmPassword: "Confirm password",
      confirmNewPassword: "Confirm new password",
      updatePassword: "Update password",
      passwordRequirements:
        "Use at least 8 characters with uppercase and lowercase letters, a number, and a symbol.",
      currentPasswordRequired: "Please enter your current password",
      confirmPasswordRequired: "Please confirm your password",
      passwordsMustMatch: "Passwords do not match",
      failedToVerifyCurrentPassword: "Current password could not be verified",
    })[key] ?? key,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: authenticatedUser,
    isLoading: false,
    isAuthenticatedUser: true,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: authSignInWithPassword,
      updateUser: authUpdateUser,
      signOut: vi.fn(),
    },
  }),
}));

vi.mock("@/lib/actions/account", () => ({
  deleteAccount: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

describe("AccountPageClient password changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSignInWithPassword.mockResolvedValue({ error: null });
    authUpdateUser.mockResolvedValue({ error: null });
  });

  it("submits the current password with a policy-compliant new password", async () => {
    const user = userEvent.setup();
    render(<AccountPageClient />);

    await user.type(screen.getByLabelText("Current password"), "OldPassword!1");
    await user.type(screen.getByLabelText("New password"), "NewPassword!2");
    await user.type(screen.getByLabelText("Confirm password"), "NewPassword!2");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => {
      expect(authSignInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "OldPassword!1",
      });
      expect(authUpdateUser).toHaveBeenCalledWith({
        current_password: "OldPassword!1",
        password: "NewPassword!2",
      });
    });
    expect(toastMock.success).toHaveBeenCalledWith("passwordUpdated");
  });

  it("does not change the password when current-password verification fails", async () => {
    const user = userEvent.setup();
    authSignInWithPassword.mockResolvedValue({
      error: new Error("Invalid login credentials"),
    });
    render(<AccountPageClient />);

    await user.type(screen.getByLabelText("Current password"), "WrongPassword!1");
    await user.type(screen.getByLabelText("New password"), "NewPassword!2");
    await user.type(screen.getByLabelText("Confirm password"), "NewPassword!2");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith(
        "Current password could not be verified",
        { description: "Invalid login credentials" }
      );
    });
    expect(authUpdateUser).not.toHaveBeenCalled();
  });
});
