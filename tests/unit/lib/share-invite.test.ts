import { describe, expect, it, vi } from "vitest";
import { copyCircleLink, shareCircleInvite } from "@/lib/share-invite";

describe("shareCircleInvite", () => {
  const input = {
    title: "Quran Study Group",
    text: "Join the Quran Study Group Khatm circle on QuranCircle and claim a Juz.",
    url: "https://www.qurancircle.io/s/STUDY123",
  };

  it("shares text and URL as separate native-share fields", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);

    const result = await shareCircleInvite(input, {
      navigatorRef: {
        share,
        clipboard: { writeText },
      },
    });

    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledWith(input);
    expect(input.text).not.toContain(input.url);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies the complete invitation when native share is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    const result = await shareCircleInvite(input, {
      navigatorRef: {
        clipboard: { writeText },
      },
    });

    expect(result).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(`${input.text}\n${input.url}`);
  });

  it("returns failed when clipboard writing is unavailable", async () => {
    await expect(
      shareCircleInvite(input, { navigatorRef: {} })
    ).resolves.toBe("failed");
  });

  it("keeps native-share cancellation silent", async () => {
    const abortError = new Error("Share cancelled");
    abortError.name = "AbortError";
    const share = vi.fn().mockRejectedValue(abortError);

    await expect(
      shareCircleInvite(input, {
        navigatorRef: { share },
      })
    ).resolves.toBe("cancelled");
  });

  it("reports genuine native-share failures", async () => {
    const share = vi.fn().mockRejectedValue(new Error("Share unavailable"));

    await expect(
      shareCircleInvite(input, {
        navigatorRef: { share },
      })
    ).resolves.toBe("failed");
  });
});

describe("copyCircleLink", () => {
  const url = "https://www.qurancircle.io/tr/s/STUDY123";

  it("copies only the canonical circle URL", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    const result = await copyCircleLink(url, {
      navigatorRef: { clipboard: { writeText } },
    });

    expect(result).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(url);
  });

  it("reports clipboard failures", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Clipboard blocked"));

    const result = await copyCircleLink(url, {
      navigatorRef: { clipboard: { writeText } },
    });

    expect(result).toBe("failed");
  });
});
