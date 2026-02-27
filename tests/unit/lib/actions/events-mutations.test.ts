import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveEvent,
  deleteEvent,
  unarchiveEvent,
} from "@/lib/actions/events";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

function mockMutationRpc(result: { data?: unknown; error: { message?: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(result);
  vi.mocked(createClient).mockResolvedValue({ rpc } as never);
  return rpc;
}

describe("event mutation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid short codes before calling supabase", async () => {
    const result = await archiveEvent("bad short code!");

    expect(result).toEqual({ error: "Invalid input" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns rpc errors for archiveEvent", async () => {
    const rpc = mockMutationRpc({
      data: null,
      error: { message: "archive failed" },
    });

    const result = await archiveEvent("VALID123");

    expect(result).toEqual({ error: "archive failed" });
    expect(rpc).toHaveBeenCalledWith("set_event_archive", {
      p_short_code: "VALID123",
      p_is_archived: true,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates all related paths on archive success", async () => {
    const rpc = mockMutationRpc({
      data: {},
      error: null,
    });

    const result = await archiveEvent("VALID123");

    expect(result).toEqual({});
    expect(rpc).toHaveBeenCalledWith("set_event_archive", {
      p_short_code: "VALID123",
      p_is_archived: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/s/VALID123");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/browse");
    expect(revalidatePath).toHaveBeenCalledWith("/my-circles");
    expect(revalidatePath).toHaveBeenCalledTimes(4);
  });

  it("revalidates all related paths on unarchive success", async () => {
    const rpc = mockMutationRpc({
      data: {},
      error: null,
    });

    const result = await unarchiveEvent("VALID123");

    expect(result).toEqual({});
    expect(rpc).toHaveBeenCalledWith("set_event_archive", {
      p_short_code: "VALID123",
      p_is_archived: false,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/s/VALID123");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/browse");
    expect(revalidatePath).toHaveBeenCalledWith("/my-circles");
    expect(revalidatePath).toHaveBeenCalledTimes(4);
  });

  it("revalidates list surfaces on delete success", async () => {
    const rpc = mockMutationRpc({
      data: {},
      error: null,
    });

    const result = await deleteEvent("VALID123");

    expect(result).toEqual({});
    expect(rpc).toHaveBeenCalledWith("delete_event_by_shortcode", {
      p_short_code: "VALID123",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/browse");
    expect(revalidatePath).toHaveBeenCalledWith("/my-circles");
    expect(revalidatePath).toHaveBeenCalledTimes(3);
  });

  it("returns rpc errors for deleteEvent", async () => {
    mockMutationRpc({
      data: null,
      error: { message: "delete failed" },
    });

    const result = await deleteEvent("VALID123");

    expect(result).toEqual({ error: "delete failed" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
