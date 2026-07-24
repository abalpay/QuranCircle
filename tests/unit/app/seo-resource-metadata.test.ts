import { describe, expect, it } from "vitest";
import { metadata as aboutMetadata } from "@/app/about/page";
import { metadata as whatsappMetadata } from "@/app/group-khatm-whatsapp/page";
import { metadata as ramadanMetadata } from "@/app/ramadan-group-khatm/page";

describe("SEO resource metadata", () => {
  it("targets a distinct group Khatm intent on each page", () => {
    expect(aboutMetadata.title).toContain("Group Quran Khatm Tracker");
    expect(whatsappMetadata.title).toContain("Khatm on WhatsApp");
    expect(ramadanMetadata.title).toContain("Ramadan Group Quran Khatm");
  });

  it("uses a self-referencing canonical for each resource", () => {
    expect(aboutMetadata.alternates?.canonical).toBe("/about");
    expect(whatsappMetadata.alternates?.canonical).toBe(
      "/group-khatm-whatsapp",
    );
    expect(ramadanMetadata.alternates?.canonical).toBe(
      "/ramadan-group-khatm",
    );
  });

  it("gives each resource a unique social URL", () => {
    expect(aboutMetadata.openGraph?.url).toBe("/about");
    expect(whatsappMetadata.openGraph?.url).toBe("/group-khatm-whatsapp");
    expect(ramadanMetadata.openGraph?.url).toBe("/ramadan-group-khatm");
  });
});
