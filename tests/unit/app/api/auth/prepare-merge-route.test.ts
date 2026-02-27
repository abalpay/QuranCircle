import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { POST } from "@/app/api/auth/prepare-merge/route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("POST /api/auth/prepare-merge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_MERGE_COOKIE_SECRET = "unit-test-merge-secret";
  });

  it("clears merge cookie for non-anonymous or missing users", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    } as never);

    const response = await POST(
      new Request("https://example.com/api/auth/prepare-merge", {
        method: "POST",
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      prepared: false,
      reason: "not_anonymous",
    });
    expect(response.headers.get("set-cookie")).toContain("quran_circle_merge_state=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("sets signed merge cookie for anonymous users", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "143c985a-4375-421f-8dcb-49dc42058b17",
              is_anonymous: true,
            },
          },
        }),
      },
    } as never);

    const response = await POST(
      new Request("https://example.com/api/auth/prepare-merge", {
        method: "POST",
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ prepared: true });
    expect(response.headers.get("set-cookie")).toContain("quran_circle_merge_state=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=3600");
  });

  it("returns 500 when merge state token cannot be created", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "not-a-uuid",
              is_anonymous: true,
            },
          },
        }),
      },
    } as never);

    const response = await POST(
      new Request("https://example.com/api/auth/prepare-merge", {
        method: "POST",
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      prepared: false,
      reason: "merge_state_unavailable",
    });
    expect(response.headers.get("set-cookie")).toContain("quran_circle_merge_state=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
