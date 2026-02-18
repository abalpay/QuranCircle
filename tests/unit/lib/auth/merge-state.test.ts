import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildMergeStateToken,
  getMergeStateClearCookieOptions,
  getMergeStateCookieOptions,
  parseMergeStateToken,
} from "@/lib/auth/merge-state";

const VALID_SOURCE_ID = "143c985a-4375-421f-8dcb-49dc42058b17";
const SECRET_ENV_KEY = "AUTH_MERGE_COOKIE_SECRET";

describe("merge-state token helpers", () => {
  const originalSecret = process.env[SECRET_ENV_KEY];

  beforeEach(() => {
    process.env[SECRET_ENV_KEY] = "unit-test-merge-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env[SECRET_ENV_KEY];
    } else {
      process.env[SECRET_ENV_KEY] = originalSecret;
    }
    vi.restoreAllMocks();
  });

  it("builds and parses a token for a valid source user id", () => {
    const token = buildMergeStateToken(VALID_SOURCE_ID);

    expect(parseMergeStateToken(token)).toBe(VALID_SOURCE_ID);
  });

  it("throws when source user id is not a UUID", () => {
    expect(() => buildMergeStateToken("not-a-uuid")).toThrow(
      "Invalid source user id."
    );
  });

  it("returns null when token signature is tampered", () => {
    const [payloadBase64, signature] = buildMergeStateToken(
      VALID_SOURCE_ID
    ).split(".");
    const tamperedSignature = `${signature.slice(0, -1)}${
      signature.endsWith("a") ? "b" : "a"
    }`;

    expect(
      parseMergeStateToken(`${payloadBase64}.${tamperedSignature}`)
    ).toBeNull();
  });

  it("returns null when token is expired", () => {
    const dateNowSpy = vi.spyOn(Date, "now");
    dateNowSpy.mockReturnValue(1_700_000_000_000);

    const token = buildMergeStateToken(VALID_SOURCE_ID);

    dateNowSpy.mockReturnValue(1_700_003_601_000);
    expect(parseMergeStateToken(token)).toBeNull();
  });

  it("returns null for malformed token payloads", () => {
    expect(parseMergeStateToken("missing-dot")).toBeNull();
    expect(parseMergeStateToken("one.two.three")).toBeNull();
    expect(parseMergeStateToken("invalid-base64.signature")).toBeNull();
  });

  it("returns null when secret is missing at parse time", () => {
    const token = buildMergeStateToken(VALID_SOURCE_ID);
    delete process.env[SECRET_ENV_KEY];

    expect(parseMergeStateToken(token)).toBeNull();
  });
});

describe("merge-state cookie options", () => {
  it("returns secure cookie options for merge state token", () => {
    expect(getMergeStateCookieOptions(true)).toEqual({
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 3600,
    });
  });

  it("returns clear-cookie options that expire immediately", () => {
    expect(getMergeStateClearCookieOptions(false)).toEqual({
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 0,
    });
  });
});
