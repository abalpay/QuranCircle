import { describe, expect, it, vi } from "vitest";
import { buildCircleInviteText, shareCircleInvite } from "@/lib/share-invite";

describe("buildCircleInviteText", () => {
  it("returns the public-circle invite template", () => {
    const result = buildCircleInviteText({
      name: "Ramadan Friends",
      isPublic: true,
      url: "https://www.qurancircle.io/s/ABC12345",
    });

    expect(result).toBe(
      'Join the "Ramadan Friends" Khatm circle on QuranCircle. Claim a Juz here: https://www.qurancircle.io/s/ABC12345'
    );
  });

  it("returns the link-only invite template", () => {
    const result = buildCircleInviteText({
      name: "Family Weekly",
      isPublic: false,
      url: "https://www.qurancircle.io/s/FAMILY01",
    });

    expect(result).toBe(
      'You\'re invited to join the "Family Weekly" Khatm circle on QuranCircle. Claim a Juz here: https://www.qurancircle.io/s/FAMILY01'
    );
  });

  it("always includes both name and URL", () => {
    const name = "Masjid Group";
    const url = "https://www.qurancircle.io/s/MASJID99";
    const result = buildCircleInviteText({
      name,
      isPublic: true,
      url,
    });

    expect(result).toContain(name);
    expect(result).toContain(url);
  });
});

describe("shareCircleInvite", () => {
  const input = {
    name: "Quran Study Group",
    isPublic: true,
    url: "https://www.qurancircle.io/s/STUDY123",
  };

  it("uses native share payload when navigator.share is available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const onCopySuccess = vi.fn();
    const onCopyError = vi.fn();
    const onShareSuccess = vi.fn();

    await shareCircleInvite(input, {
      title: input.name,
      navigatorRef: {
        share,
        clipboard: { writeText },
      },
      onShareSuccess,
      onCopySuccess,
      onCopyError,
    });

    expect(share).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({
      title: input.name,
      text: buildCircleInviteText(input),
      url: input.url,
    });
    expect(writeText).not.toHaveBeenCalled();
    expect(onShareSuccess).toHaveBeenCalledTimes(1);
    expect(onCopySuccess).not.toHaveBeenCalled();
    expect(onCopyError).not.toHaveBeenCalled();
  });

  it("copies invite text to clipboard when native share is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const onCopySuccess = vi.fn();
    const onCopyError = vi.fn();

    await shareCircleInvite(input, {
      navigatorRef: {
        clipboard: { writeText },
      },
      onCopySuccess,
      onCopyError,
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(buildCircleInviteText(input));
    expect(onCopySuccess).toHaveBeenCalledTimes(1);
    expect(onCopyError).not.toHaveBeenCalled();
  });

  it("invokes error callback when clipboard write fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Clipboard blocked"));
    const onCopySuccess = vi.fn();
    const onCopyError = vi.fn();

    await shareCircleInvite(input, {
      navigatorRef: {
        clipboard: { writeText },
      },
      onCopySuccess,
      onCopyError,
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(onCopySuccess).not.toHaveBeenCalled();
    expect(onCopyError).toHaveBeenCalledTimes(1);
  });

  it("keeps AbortError from native share silent", async () => {
    const abortError = new Error("Share cancelled");
    abortError.name = "AbortError";
    const share = vi.fn().mockRejectedValue(abortError);
    const onCopyError = vi.fn();

    await expect(
      shareCircleInvite(input, {
        navigatorRef: { share },
        onCopyError,
      })
    ).resolves.toBeUndefined();

    expect(share).toHaveBeenCalledTimes(1);
    expect(onCopyError).not.toHaveBeenCalled();
  });
});
