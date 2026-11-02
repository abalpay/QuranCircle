import { describe, expect, it, vi } from "vitest";
import {
  buildCircleShare,
  buildWhatsAppShareUrl,
  canNativeShare,
  copyCircleLink,
  isolateName,
  shareCircleInvite,
  shareKindForStatus,
} from "@/lib/share-invite";
import en from "../../../messages/en.json";
import tr from "../../../messages/tr.json";
import ar from "../../../messages/ar.json";

describe("shareCircleInvite", () => {
  const input = {
    title: "Quran Study Group",
    text: "Assalamu alaikum. A khatm is being read: “Quran Study Group”. Please take a Juz here: https://www.qurancircle.io/s/STUDY123",
  };

  it("shares title and the whole message (link inside the text, no duplicate url field)", async () => {
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
    expect(writeText).toHaveBeenCalledWith(input.text);
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

const FSI = "\u2068";
const PDI = "\u2069";
const link = "https://www.qurancircle.io/s/ABCD1234";
const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => values[key]);
const builderFor = (messages: typeof en.ShareText) => (key: "open" | "completed" | "closed", values: { name: string; link: string }) =>
  fill(messages[key], values);

describe("buildCircleShare (one builder for the circle menu and the completion moment)", () => {
  it.each([
    ["en", en.ShareText, `Assalamu alaikum. A khatm is being read: “${FSI}Aisha${PDI}”. Please take a Juz here: ${link}`, `Alhamdulillah, the khatm “${FSI}Aisha${PDI}” is complete. May Allah accept it. ${link}`],
    ["tr", tr.ShareText, `Esselamu aleyküm. Bir hatim okunuyor: “${FSI}Aisha${PDI}”. Lütfen buradan bir cüz alın: ${link}`, `Elhamdülillah, “${FSI}Aisha${PDI}” hatmi tamamlandı. Allah kabul etsin. ${link}`],
    ["ar", ar.ShareText, `السلام عليكم. تُقرأ ختمة: «${FSI}Aisha${PDI}». تفضّلوا باختيار جزء من هنا: ${link}`, `الحمد لله، اكتملت ختمة «${FSI}Aisha${PDI}». تقبّل الله منّا ومنكم. ${link}`],
  ])("%s: open and completed texts, name isolated, link last", (_locale, messages, open, completed) => {
    const t = builderFor(messages);
    expect(buildCircleShare(t, { kind: "open", name: "Aisha", url: link }).text).toBe(open);
    expect(buildCircleShare(t, { kind: "completed", name: "Aisha", url: link }).text).toBe(completed);
  });

  it("isolates a name in another script so the quotes and words around it keep their order", () => {
    expect(isolateName(" ختمة عن روح ")).toBe(`${FSI}ختمة عن روح${PDI}`);
    const share = buildCircleShare(builderFor(en.ShareText), { kind: "open", name: "ختمة عن روح", url: link });
    expect(share.text).toContain(`“${FSI}ختمة عن روح${PDI}”`);
    expect(share.title).toBe("ختمة عن روح");
  });

  it("puts the same message in the WhatsApp link", () => {
    const share = buildCircleShare(builderFor(en.ShareText), { kind: "open", name: "Aisha", url: link });
    expect(share.whatsAppUrl).toBe(buildWhatsAppShareUrl(share.text));
    expect(new URL(share.whatsAppUrl).searchParams.get("text")).toBe(share.text);
  });

  it("never invites to take a Juz in a full or archived circle", () => {
    expect(shareKindForStatus("open")).toBe("open");
    expect(shareKindForStatus("completed")).toBe("completed");
    expect(shareKindForStatus("full")).toBe("closed");
    expect(shareKindForStatus("archived")).toBe("closed");
    for (const messages of [en.ShareText, tr.ShareText, ar.ShareText]) {
      expect(messages.closed).toContain("{link}");
    }
  });

  it("detects the native share sheet", () => {
    expect(canNativeShare({ share: () => {} })).toBe(true);
    expect(canNativeShare({})).toBe(false);
    expect(canNativeShare(null)).toBe(false);
  });
});
