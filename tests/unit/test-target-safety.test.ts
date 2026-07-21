import { describe, expect, it } from "vitest";
import { assertSafeSupabaseTestTarget } from "@/tests/support/supabase-test-target";

describe("Supabase destructive-test target guard", () => {
  it.each([
    "http://localhost:54321",
    "http://127.0.0.1:54321",
    "http://[::1]:54321",
  ])("allows local target %s", (url) => {
    expect(() =>
      assertSafeSupabaseTestTarget({ NEXT_PUBLIC_SUPABASE_URL: url })
    ).not.toThrow();
  });

  it("allows the caller to report missing environment variables", () => {
    expect(() => assertSafeSupabaseTestTarget({})).not.toThrow();
  });

  it("rejects malformed URLs", () => {
    expect(() =>
      assertSafeSupabaseTestTarget({
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
      })
    ).toThrow("must be a valid URL");
  });

  it("rejects remote targets by default", () => {
    expect(() =>
      assertSafeSupabaseTestTarget({
        NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
      })
    ).toThrow("Refusing to run destructive contract/E2E tests");
  });

  it("always rejects the production project, even with remote opt-in", () => {
    expect(() =>
      assertSafeSupabaseTestTarget({
        NEXT_PUBLIC_SUPABASE_URL:
          "https://vbxdcuucynuneqanrquw.supabase.co",
        ALLOW_REMOTE_E2E: "1",
      })
    ).toThrow("production Supabase host");
  });

  it("rejects the production project's equivalent absolute FQDN", () => {
    expect(() =>
      assertSafeSupabaseTestTarget({
        NEXT_PUBLIC_SUPABASE_URL:
          "https://vbxdcuucynuneqanrquw.supabase.co.",
        ALLOW_REMOTE_E2E: "1",
      })
    ).toThrow("production Supabase host");
  });

  it("requires the exact explicit remote opt-in value", () => {
    expect(() =>
      assertSafeSupabaseTestTarget({
        NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
        ALLOW_REMOTE_E2E: "true",
      })
    ).toThrow("Refusing to run destructive contract/E2E tests");

    expect(() =>
      assertSafeSupabaseTestTarget({
        NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
        ALLOW_REMOTE_E2E: "1",
      })
    ).not.toThrow();
  });
});
