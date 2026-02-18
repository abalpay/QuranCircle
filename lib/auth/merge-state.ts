import { createHmac, randomUUID, timingSafeEqual } from "crypto";

type MergeStatePayload = {
  v: 1;
  source_user_id: string;
  exp: number;
  nonce: string;
};

export const MERGE_STATE_COOKIE = "quran_circle_merge_state";
const MERGE_STATE_TTL_SECONDS = 60 * 60;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getMergeStateSecret() {
  const secret = process.env.AUTH_MERGE_COOKIE_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing AUTH_MERGE_COOKIE_SECRET.");
  }
  return secret;
}

function toBase64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signPayload(payloadBase64: string) {
  const secret = getMergeStateSecret();
  return createHmac("sha256", secret).update(payloadBase64).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function buildMergeStateToken(sourceUserId: string) {
  if (!UUID_REGEX.test(sourceUserId)) {
    throw new Error("Invalid source user id.");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: MergeStatePayload = {
    v: 1,
    source_user_id: sourceUserId,
    exp: now + MERGE_STATE_TTL_SECONDS,
    nonce: randomUUID(),
  };

  const payloadBase64 = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

export function parseMergeStateToken(token: string) {
  const [payloadBase64, providedSignature, ...extra] = token.split(".");
  if (!payloadBase64 || !providedSignature || extra.length > 0) return null;

  let expectedSignature: string;
  try {
    expectedSignature = signPayload(payloadBase64);
  } catch {
    return null;
  }
  if (!safeEqual(expectedSignature, providedSignature)) return null;

  let payload: MergeStatePayload;
  try {
    payload = JSON.parse(fromBase64Url(payloadBase64)) as MergeStatePayload;
  } catch {
    return null;
  }

  if (payload.v !== 1) return null;
  if (!UUID_REGEX.test(payload.source_user_id)) return null;
  if (!Number.isFinite(payload.exp)) return null;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) return null;

  return payload.source_user_id;
}

export function getMergeStateCookieOptions(isSecureOrigin: boolean) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecureOrigin,
    maxAge: MERGE_STATE_TTL_SECONDS,
  };
}

export function getMergeStateClearCookieOptions(isSecureOrigin: boolean) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecureOrigin,
    maxAge: 0,
  };
}
