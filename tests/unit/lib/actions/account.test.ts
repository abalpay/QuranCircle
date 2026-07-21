import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAccount } from "@/lib/actions/account";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

function mockUser(user: { id: string; is_anonymous: boolean } | null) {
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn().mockResolvedValue({ error: null });
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      signOut,
    },
    rpc,
  } as never);
  return { rpc, signOut };
}

function mockAdminDelete(result: { error: { message: string } | null }) {
  const deleteUser = vi.fn().mockResolvedValue(result);
  vi.mocked(createAdminClient).mockReturnValue({
    auth: { admin: { deleteUser } },
  } as never);
  return deleteUser;
}

describe("deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it.each([
    ["missing", null],
    ["anonymous", { id: "anon-user", is_anonymous: true }],
  ])("rejects a %s user", async (_label, user) => {
    mockUser(user);

    await expect(deleteAccount()).resolves.toEqual({
      error: "Not authenticated",
    });
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("fails safely before deletion when the admin client is unavailable", async () => {
    const { signOut } = mockUser({ id: "user-1", is_anonymous: false });
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("missing service key");
    });

    await expect(deleteAccount()).resolves.toEqual({
      error: "Server configuration error. Please contact support.",
    });
    expect(signOut).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("runs the rollout cleanup shim before Auth deletion", async () => {
    const { rpc, signOut } = mockUser({ id: "user-1", is_anonymous: false });
    const deleteUser = mockAdminDelete({ error: { message: "delete failed" } });

    await expect(deleteAccount()).resolves.toEqual({
      error: "Failed to delete account. Please try again.",
    });
    expect(rpc).toHaveBeenCalledWith("cleanup_current_user_data");
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(
      deleteUser.mock.invocationCallOrder[0]
    );
    expect(deleteUser).toHaveBeenCalledWith("user-1");
    expect(signOut).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("does not delete the Auth user when the rollout cleanup shim fails", async () => {
    const { rpc, signOut } = mockUser({ id: "user-1", is_anonymous: false });
    rpc.mockResolvedValue({ error: { message: "cleanup failed" } });
    const deleteUser = mockAdminDelete({ error: null });

    await expect(deleteAccount()).resolves.toEqual({
      error: "Failed to clean up account data. Please try again.",
    });
    expect(deleteUser).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("handles an unexpected Auth deletion exception without changing session state", async () => {
    const { signOut } = mockUser({ id: "user-1", is_anonymous: false });
    const deleteUser = vi.fn().mockRejectedValue(new Error("network failure"));
    vi.mocked(createAdminClient).mockReturnValue({
      auth: { admin: { deleteUser } },
    } as never);

    await expect(deleteAccount()).resolves.toEqual({
      error: "Failed to delete account. Please try again.",
    });
    expect(signOut).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("clears the server session and revalidates only after successful deletion", async () => {
    const { rpc, signOut } = mockUser({ id: "user-1", is_anonymous: false });
    const deleteUser = mockAdminDelete({ error: null });

    await expect(deleteAccount()).resolves.toEqual({});
    expect(rpc).toHaveBeenCalledWith("cleanup_current_user_data");
    expect(deleteUser).toHaveBeenCalledWith("user-1");
    expect(signOut).toHaveBeenCalledOnce();
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("reports deletion success when only post-delete session cleanup fails", async () => {
    const { signOut } = mockUser({ id: "user-1", is_anonymous: false });
    signOut.mockRejectedValue(new Error("session endpoint unavailable"));
    mockAdminDelete({ error: null });

    await expect(deleteAccount()).resolves.toEqual({});
    expect(signOut).toHaveBeenCalledOnce();
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });
});
