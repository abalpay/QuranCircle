import { describe, expect, it } from "vitest";
import {
  getAutoCompleteDate,
  getReaderNames,
  isCircleOldEnoughForSupportAsk,
  isInFuture,
  isReadyToComplete,
} from "@/lib/completion";
import { getCircleOgState } from "@/lib/circle-og";
import { buildWhatsAppShareUrl } from "@/lib/whatsapp";
import type { KhatmSnapshot } from "@/lib/types/events";

const khatm = (over: Partial<KhatmSnapshot> = {}) =>
  ({ id: "k", khatm_number: 1, claimed_count: 30, completed_at: null, juzs: [], ...over }) as KhatmSnapshot;

describe("completion helpers", () => {
  it("is ready only when all 30 are claimed and it is not complete", () => {
    expect(isReadyToComplete(khatm())).toBe(true);
    expect(isReadyToComplete(khatm({ claimed_count: 29 }))).toBe(false);
    expect(isReadyToComplete(khatm({ completed_at: "2026-11-01T00:00:00Z" }))).toBe(false);
  });

  it("auto-completes seven days after the latest claim", () => {
    expect(getAutoCompleteDate({ last_claimed_at: "2026-11-01T10:00:00Z" })?.toISOString()).toBe(
      "2026-11-08T10:00:00.000Z"
    );
    expect(getAutoCompleteDate({})).toBeNull();
    expect(getAutoCompleteDate({ last_claimed_at: "nope" })).toBeNull();
  });

  it("lists distinct reader names in Juz order", () => {
    const juzs = ["Omar", "Amina", "Omar", null, " "].map((claimed_by_name, i) => ({
      id: String(i),
      juz_number: i + 1,
      status: "read" as const,
      claimed_by_name,
      is_mine: false,
    }));
    expect(getReaderNames({ juzs })).toEqual(["Omar", "Amina"]);
  });

  it("only offers the support ask on circles older than 72 hours", () => {
    const now = Date.parse("2026-11-05T12:00:00Z");
    expect(isCircleOldEnoughForSupportAsk("2026-11-02T11:00:00Z", now)).toBe(true);
    expect(isCircleOldEnoughForSupportAsk("2026-11-02T13:00:00Z", now)).toBe(false);
    expect(isCircleOldEnoughForSupportAsk("nope", now)).toBe(false);
  });

  it("shows the automatic date only while it is ahead", () => {
    const now = Date.parse("2026-11-05T12:00:00Z");
    expect(isInFuture(new Date("2026-11-06T00:00:00Z"), now)).toBe(true);
    expect(isInFuture(new Date("2026-11-04T00:00:00Z"), now)).toBe(false);
    expect(isInFuture(null, now)).toBe(false);
  });

  it("builds a WhatsApp link carrying the text and the circle link", () => {
    const url = buildWhatsAppShareUrl("Khatm 1 is complete", "https://qurancircle.io/s/ABC");
    expect(new URL(url).searchParams.get("text")).toBe(
      "Khatm 1 is complete\nhttps://qurancircle.io/s/ABC"
    );
  });
});

describe("share preview state (Open Graph)", () => {
  it("is completed when the latest khatm is complete, including a single khatm", () => {
    expect(
      getCircleOgState({ name: "A", khatms: [{ khatm_number: 1, completed_at: "2026-11-01" }] }, "x")
        .completedKhatmNumber
    ).toBe(1);
    expect(
      getCircleOgState(
        {
          name: "A",
          khatms: [
            { khatm_number: 1, completed_at: "2026-11-01" },
            { khatm_number: 2, completed_at: null },
          ],
        },
        "x"
      ).completedKhatmNumber
    ).toBeNull();
  });

  it("falls back to the default name and no completion", () => {
    expect(getCircleOgState(null, "Khatm Circle")).toEqual({
      name: "Khatm Circle",
      description: "",
      completedKhatmNumber: null,
      showJoinCta: true,
    });
  });

  it("drops the join call to action when the latest khatm is complete", () => {
    const state = getCircleOgState(
      { name: "A", khatms: [{ khatm_number: 1, completed_at: "2026-11-01" }] },
      "x"
    );
    expect(state.showJoinCta).toBe(false);
  });
});
