import { describe, expect, it, vi } from "vitest";
import type { AppLocale } from "@/i18n/routing";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(
    async ({
      locale,
      namespace,
    }: {
      locale: AppLocale;
      namespace: string;
    }) => {
      const messages =
        locale === "tr"
          ? (await import("@/messages/tr.json")).default
          : locale === "ar"
            ? (await import("@/messages/ar.json")).default
          : (await import("@/messages/en.json")).default;
      const namespaceMessages = messages[
        namespace as keyof typeof messages
      ] as Record<string, unknown>;

      return (key: string) =>
        key.split(".").reduce<unknown>(
          (value, segment) => (value as Record<string, unknown>)[segment],
          namespaceMessages,
        ) as string;
    },
  ),
  setRequestLocale: vi.fn(),
}));

import { generateMetadata as generateAboutMetadata } from "@/app/[locale]/about/page";
import { generateMetadata as generateWhatsappMetadata } from "@/app/[locale]/group-khatm-whatsapp/page";
import { generateMetadata as generateRamadanMetadata } from "@/app/[locale]/ramadan-group-khatm/page";

describe("SEO resource metadata", () => {
  it("targets a distinct group Khatm intent on each page", async () => {
    const [aboutMetadata, whatsappMetadata, ramadanMetadata] =
      await Promise.all([
        generateAboutMetadata({ params: Promise.resolve({ locale: "en" }) }),
        generateWhatsappMetadata({
          params: Promise.resolve({ locale: "en" }),
        }),
        generateRamadanMetadata({
          params: Promise.resolve({ locale: "en" }),
        }),
      ]);

    expect(aboutMetadata.title).toContain("Group Quran Khatm Tracker");
    expect(whatsappMetadata.title).toContain("Khatm on WhatsApp");
    expect(ramadanMetadata.title).toContain("Ramadan Group Quran Khatm");
  });

  it("uses a self-referencing canonical for each resource", async () => {
    const [aboutMetadata, whatsappMetadata, ramadanMetadata] =
      await Promise.all([
        generateAboutMetadata({ params: Promise.resolve({ locale: "en" }) }),
        generateWhatsappMetadata({
          params: Promise.resolve({ locale: "en" }),
        }),
        generateRamadanMetadata({
          params: Promise.resolve({ locale: "en" }),
        }),
      ]);

    expect(aboutMetadata.alternates?.canonical).toBe("/about");
    expect(whatsappMetadata.alternates?.canonical).toBe(
      "/group-khatm-whatsapp",
    );
    expect(ramadanMetadata.alternates?.canonical).toBe(
      "/ramadan-group-khatm",
    );
  });

  it("gives each resource a unique social URL", async () => {
    const [aboutMetadata, whatsappMetadata, ramadanMetadata] =
      await Promise.all([
        generateAboutMetadata({ params: Promise.resolve({ locale: "en" }) }),
        generateWhatsappMetadata({
          params: Promise.resolve({ locale: "en" }),
        }),
        generateRamadanMetadata({
          params: Promise.resolve({ locale: "en" }),
        }),
      ]);

    expect(aboutMetadata.openGraph?.url).toBe("/about");
    expect(whatsappMetadata.openGraph?.url).toBe("/group-khatm-whatsapp");
    expect(ramadanMetadata.openGraph?.url).toBe("/ramadan-group-khatm");
  });

  it("publishes Arabic canonicals and language alternatives", async () => {
    const metadata = await generateAboutMetadata({
      params: Promise.resolve({ locale: "ar" }),
    });

    expect(metadata.alternates?.canonical).toBe("/ar/about");
    expect(metadata.alternates?.languages).toEqual({
      en: "/about",
      tr: "/tr/about",
      ar: "/ar/about",
    });
    expect(metadata.openGraph?.url).toBe("/ar/about");
  });
});
