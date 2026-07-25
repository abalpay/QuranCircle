import { beforeEach, describe, expect, it, vi } from "vitest";

const { vercelTrackMock } = vi.hoisted(() => ({
  vercelTrackMock: vi.fn(),
}));

vi.mock("@vercel/analytics", () => ({
  track: vercelTrackMock,
}));

import { trackProductEvent } from "@/lib/analytics";

describe("product analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps Vercel event tracking intact", () => {
    trackProductEvent("CTA Clicked", {
      action: "create_circle",
      source: "home_hero",
    });

    expect(vercelTrackMock).toHaveBeenCalledWith("CTA Clicked", {
      action: "create_circle",
      source: "home_hero",
    });
  });

  it("tracks circle creation without visitor attribution", () => {
    trackProductEvent("Circle Created", {
      visibility: "link_only",
      source: "home_hero",
    });

    expect(vercelTrackMock).toHaveBeenCalledWith("Circle Created", {
      visibility: "link_only",
      source: "home_hero",
    });
  });

  it("tracks the completed-Khatm outcome without visitor data", () => {
    trackProductEvent("Khatm Completed", {});

    expect(vercelTrackMock).toHaveBeenCalledWith("Khatm Completed", {});
  });
});
