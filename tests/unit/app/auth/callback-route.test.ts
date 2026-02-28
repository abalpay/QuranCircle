import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildMergeStateToken } from "@/lib/auth/merge-state";

const cookieStore = {
  get: vi.fn(),
};

const getUser = vi.fn();
const exchangeCodeForSession = vi.fn();
const adminRpc = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser, exchangeCodeForSession },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    rpc: adminRpc,
  })),
}));

import { GET, POST } from "@/app/auth/callback/route";

describe("/auth/callback merge finalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_MERGE_COOKIE_SECRET = "unit-test-merge-secret";
    exchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it("POST returns no_pending_merge when merge cookie is absent", async () => {
    cookieStore.get.mockReturnValue(undefined);

    const response = await POST(
      new Request("https://example.com/auth/callback", { method: "POST" })
    );
    const payload = (await response.json()) as { status: string };

    expect(payload.status).toBe("no_pending_merge");
    expect(getUser).not.toHaveBeenCalled();
    expect(adminRpc).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.headers.get("Expires")).toBe("0");
  });

  it("POST returns pending_auth when target user is anonymous", async () => {
    const sourceUserId = "6f5a86a7-7d44-4e1d-8be2-f2f28696a4e4";
    cookieStore.get.mockReturnValue({
      value: buildMergeStateToken(sourceUserId),
    });
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "anon-target",
          is_anonymous: true,
        },
      },
    });

    const response = await POST(
      new Request("https://example.com/auth/callback", { method: "POST" })
    );
    const payload = (await response.json()) as { status: string };

    expect(payload.status).toBe("pending_auth");
    expect(adminRpc).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("POST returns invalid_merge_state and clears cookie for invalid token", async () => {
    cookieStore.get.mockReturnValue({ value: "invalid-token" });
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "cb1f258a-6c9f-49b1-bc3f-b8987f9df334",
          is_anonymous: false,
        },
      },
    });

    const response = await POST(
      new Request("https://example.com/auth/callback", { method: "POST" })
    );
    const payload = (await response.json()) as { status: string };

    expect(payload.status).toBe("invalid_merge_state");
    expect(response.headers.get("set-cookie")).toContain("quran_circle_merge_state=");
    expect(adminRpc).not.toHaveBeenCalled();
  });

  it("POST returns invalid_merge_state and clears cookie when source equals target", async () => {
    const userId = "cb1f258a-6c9f-49b1-bc3f-b8987f9df334";
    cookieStore.get.mockReturnValue({
      value: buildMergeStateToken(userId),
    });
    getUser.mockResolvedValue({
      data: {
        user: {
          id: userId,
          is_anonymous: false,
        },
      },
    });

    const response = await POST(
      new Request("https://example.com/auth/callback", { method: "POST" })
    );
    const payload = (await response.json()) as { status: string };

    expect(payload.status).toBe("invalid_merge_state");
    expect(response.headers.get("set-cookie")).toContain("quran_circle_merge_state=");
    expect(adminRpc).not.toHaveBeenCalled();
  });

  it("POST calls privileged merge RPC and returns merged", async () => {
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

  it("POST returns no_merge_required and clears cookie when merge result is false", async () => {
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
      data: { merged: false, reason: "source_missing" },
      error: null,
    });

    const response = await POST(
      new Request("https://example.com/auth/callback", { method: "POST" })
    );
    const payload = (await response.json()) as { status: string };

    expect(payload.status).toBe("no_merge_required");
    expect(response.headers.get("set-cookie")).toContain("quran_circle_merge_state=");
  });

  it("POST returns retryable status and keeps cookie when privileged RPC fails", async () => {
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

  it("GET exchanges auth code and redirects to safe next path", async () => {
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

    const response = await GET(
      new Request("https://example.com/auth/callback?code=oauth-code&next=/browse")
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("oauth-code");
    expect(response.headers.get("location")).toBe("https://example.com/browse");
    expect(response.headers.get("set-cookie")).toContain("quran_circle_merge_state=");
  });

  it("GET sanitizes unsafe next path values", async () => {
    cookieStore.get.mockReturnValue(undefined);

    const response = await GET(
      new Request("https://example.com/auth/callback?code=oauth-code&next=//evil.com")
    );

    expect(response.headers.get("location")).toBe("https://example.com/");
  });

  it("GET redirects with auth error and clears cookie when exchange fails", async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: { message: "code exchange failed" },
    });

    const response = await GET(
      new Request("https://example.com/auth/callback?code=oauth-code")
    );

    expect(response.headers.get("location")).toBe("https://example.com/?error=auth");
    expect(response.headers.get("set-cookie")).toContain("quran_circle_merge_state=");
  });

  it("GET redirects with auth error when code is absent", async () => {
    const response = await GET(
      new Request("https://example.com/auth/callback?next=/browse")
    );

    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://example.com/?error=auth");
    expect(response.headers.get("set-cookie")).toContain("quran_circle_merge_state=");
  });
});
