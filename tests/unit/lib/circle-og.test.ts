import { describe, expect, it } from "vitest";
import { getCircleOgState, getOgDescription, ogVersion, truncateAtWord } from "@/lib/circle-og";
import en from "../../../messages/en.json";
import tr from "../../../messages/tr.json";
import ar from "../../../messages/ar.json";

const k = (over = {}) => ({ khatm_number: 1, completed_at: null, claimed_count: 3, ...over });

describe("circle share state", () => {
  it("is open, full, completed or archived; archived wins; only open shows the join call", () => {
    expect(getCircleOgState({ name: "A", khatms: [k()] }, "x").status).toBe("open");
    expect(getCircleOgState({ name: "A", khatms: [k({ claimed_count: 30 })] }, "x").status).toBe("full");
    expect(getCircleOgState({ name: "A", khatms: [k({ completed_at: "2026-11-01" })] }, "x").status).toBe("completed");
    expect(
      getCircleOgState({ name: "A", is_archived: true, khatms: [k({ completed_at: "2026-11-01" })] }, "x").status
    ).toBe("archived");
    for (const [over, join] of [[{}, true], [{ claimed_count: 30 }, false], [{ completed_at: "2026-11-01" }, false]] as const) {
      expect(getCircleOgState({ name: "A", khatms: [k(over)] }, "x").showJoinCta).toBe(join);
    }
    expect(getCircleOgState({ name: "A", is_archived: true, khatms: [k()] }, "x").showJoinCta).toBe(false);
  });

  it("flags link-only circles so their card is not indexed", () => {
    expect(getCircleOgState({ name: "A", is_public: false }, "x").isPublic).toBe(false);
    expect(getCircleOgState({ name: "A", is_public: true }, "x").isPublic).toBe(true);
    expect(getCircleOgState({ name: "A" }, "x").isPublic).toBe(true);
  });
});

describe("og:description by state", () => {
  const t = (messages: typeof en.CircleMetadata) => (key: keyof typeof en.CircleMetadata, values: { eventName: string; number?: number }) =>
    messages[key].replace("{eventName}", values.eventName).replace("{number}", String(values.number ?? ""));
  const state = (data: object) => getCircleOgState({ name: "Aisha", ...data }, "x");

  it("keeps the circle's own words while it is open, falls back to the open line without them", () => {
    expect(getOgDescription(state({ khatms: [k()] }), "For Aisha", t(en.CircleMetadata))).toBe("For Aisha");
    expect(getOgDescription(state({ khatms: [k()] }), null, t(en.CircleMetadata))).toBe(
      "Join the \u2068Aisha\u2069 Khatm circle on QuranCircle"
    );
  });

  it.each([
    ["en", en.CircleMetadata],
    ["tr", tr.CircleMetadata],
    ["ar", ar.CircleMetadata],
  ])("%s: says where a full, completed or archived circle stands, never an invitation", (_l, messages) => {
    const tt = t(messages);
    const full = getOgDescription(state({ khatms: [k({ claimed_count: 30 })] }), "own", tt);
    const done = getOgDescription(state({ khatms: [k({ khatm_number: 2, completed_at: "x" })] }), "own", tt);
    const archived = getOgDescription(state({ is_archived: true, khatms: [k()] }), "own", tt);
    expect(new Set([full, done, archived, "own"]).size).toBe(4);
    expect(done).toContain("2");
    for (const text of [full, done, archived]) expect(text).toContain("Aisha");
  });
});

describe("truncateAtWord", () => {
  it("returns short text untouched", () => {
    expect(truncateAtWord("Khatm for Aisha", 60)).toBe("Khatm for Aisha");
  });

  it("cuts at the last whole word and never inside one", () => {
    const text = "Khatm for our beloved grandfather Hajji Muhammad Abdulrahman Al-Hashimi";
    const out = truncateAtWord(text, 60);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(60);
    expect(text.startsWith(out.slice(0, -1))).toBe(true);
    expect(text[out.length - 1]).toBe(" ");
  });

  it("keeps a word that ends exactly at the limit, and works on Arabic", () => {
    expect(truncateAtWord("aaaa bbbb cccc", 10)).toBe("aaaa bbbb…");
    const ar = truncateAtWord("ختمة عن روح المرحوم يوسف عبد الرحمن الهاشمي", 20);
    expect("ختمة عن روح المرحوم يوسف عبد الرحمن الهاشمي".startsWith(ar.slice(0, -1))).toBe(true);
    expect(ar.length).toBeLessThanOrEqual(20);
  });

  it("hard-cuts only when one word has no boundary at all", () => {
    expect(truncateAtWord("abcdefghijklmnop", 8)).toBe("abcdefg…");
  });
});

describe("ogVersion", () => {
  it("is stable for the same state and changes when anything the card shows changes", () => {
    const base = ogVersion("Aisha", null, "open", null, 1, "2026-10-01");
    expect(ogVersion("Aisha", null, "open", null, 1, "2026-10-01")).toBe(base);
    expect(base).toMatch(/^[0-9a-z]+$/);
    for (const changed of [
      ogVersion("Aisha", null, "completed", 1, 1, "2026-10-01"),
      ogVersion("Aisha", null, "full", null, 1, "2026-10-01"),
      ogVersion("Aisha", null, "archived", null, 1, "2026-10-01"),
      ogVersion("Aisha K", null, "open", null, 1, "2026-10-01"),
      ogVersion("Aisha", "dua", "open", null, 1, "2026-10-01"),
    ]) {
      expect(changed).not.toBe(base);
    }
  });
});
