import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildMergeStateToken } from "@/lib/auth/merge-state";

const cookieStore = {
  get: vi.fn(),
};

const getUser = vi.fn();
const adminRpc = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    rpc: adminRpc,
  })),
}));

import { POST } from "@/app/auth/callback/route";

describe("POST /auth/callback merge finalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_MERGE_COOKIE_SECRET = "unit-test-merge-secret";
  });

  it("returns no_pending_merge when merge cookie is absent", async () => {
    cookieStore.get.mockReturnValue(undefined);

    const response = await POST(
      new Request("https://example.com/auth/callback", { method: "POST" })
    );
    const payload = (await response.json()) as { status: string };

    expect(payload.status).toBe("no_pending_merge");
    expect(getUser).not.toHaveBeenCalled();
    expect(adminRpc).not.toHaveBeenCalled();
  });

  it("calls privileged merge RPC for authenticated target user", async () => {
    const sourceUserId = "6f5a86a7-7d44-4e1d-8be2-f2f28696a4e4";
    const targetUserId = "cb1f258a-6c9f-49b1-bc3f-b8987f9df334";
    cookieStore.get.mockReturnValue({
      value: buildMergeStateToken(sourceUserId),
    });
    getUser.mockResolvedValue({
      data: {
        user: {
          id: targetUserId,
          is_anonymous: false,
        },
      },
    });
    adminRpc.mockResolvedValue({
      data: { merged: true },
      error: null,
    });

    const response = await POST(
      new Request("https://example.com/auth/callback", { method: "POST" })
    );
    const payload = (await response.json()) as { status: string };

    expect(payload.status).toBe("merged");
    expect(adminRpc).toHaveBeenCalledWith("merge_anonymous_identity_for_target", {
      p_source_user_id: sourceUserId,
      p_target_user_id: targetUserId,
    });
    expect(response.headers.get("set-cookie")).toContain("quran_circle_merge_state=");
  });

  it("returns retryable status and keeps cookie when privileged RPC fails", async () => {
    const sourceUserId = "2ea7adfc-9b60-40da-a930-fd93240f43ec";
    const targetUserId = "b3fa834a-6f16-4074-b5fa-9f66fbcf85cf";
    cookieStore.get.mockReturnValue({
      value: buildMergeStateToken(sourceUserId),
    });
    getUser.mockResolvedValue({
      data: {
        user: {
          id: targetUserId,
          is_anonymous: false,
        },
      },
    });
    adminRpc.mockResolvedValue({
      data: null,
      error: { message: "merge backend failed" },
    });

    const response = await POST(
      new Request("https://example.com/auth/callback", { method: "POST" })
    );
    const payload = (await response.json()) as { status: string };

    expect(payload.status).toBe("merge_retryable_error");
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

