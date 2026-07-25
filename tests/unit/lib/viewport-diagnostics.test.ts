import { describe, expect, it } from "vitest";
import {
  isViewportDiagnosticsEnabled,
  pushBoundedDiagnosticEntry,
  redactDiagnosticPathname,
  roundViewportMetric,
} from "@/lib/viewport-diagnostics";

describe("viewport diagnostics utilities", () => {
  it("enables diagnostics only for the explicit opt-in value", () => {
    expect(isViewportDiagnosticsEnabled(new URLSearchParams("viewportDebug=1"))).toBe(
      true
    );
    expect(isViewportDiagnosticsEnabled(new URLSearchParams("viewportDebug=true"))).toBe(
      false
    );
    expect(isViewportDiagnosticsEnabled(new URLSearchParams())).toBe(false);
  });

  it("redacts public circle short codes from exported routes", () => {
    expect(redactDiagnosticPathname("/s/PrivateInvite123")).toBe(
      "/s/:shortCode"
    );
    expect(redactDiagnosticPathname("/tr/s/PrivateInvite123")).toBe(
      "/tr/s/:shortCode"
    );
    expect(redactDiagnosticPathname("/browse")).toBe("/browse");
  });

  it("keeps only the most recent bounded entries", () => {
    const entries: number[] = [];

    for (let entry = 1; entry <= 5; entry += 1) {
      pushBoundedDiagnosticEntry(entries, entry, 3);
    }

    expect(entries).toEqual([3, 4, 5]);
  });

  it("rounds finite metrics and rejects unavailable values", () => {
    expect(roundViewportMetric(12.345)).toBe(12.35);
    expect(roundViewportMetric(Number.NaN)).toBeNull();
    expect(roundViewportMetric(undefined)).toBeNull();
  });
});
