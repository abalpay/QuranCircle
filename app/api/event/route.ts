import { getEventByShortCodeResult } from "@/lib/actions/events";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shortCode = searchParams.get("shortCode");
  const khatmLimitRaw = searchParams.get("khatmLimit");
  const beforeKhatmNumberRaw = searchParams.get("beforeKhatmNumber");

  if (!shortCode) {
    return NextResponse.json(
      {
        error: { code: "missing_short_code", message: "Missing shortCode" },
      },
      { status: 400 }
    );
  }

  const khatmLimit =
    khatmLimitRaw === null ? undefined : Number.parseInt(khatmLimitRaw, 10);
  const beforeKhatmNumber =
    beforeKhatmNumberRaw === null
      ? undefined
      : Number.parseInt(beforeKhatmNumberRaw, 10);
  if (khatmLimitRaw !== null && Number.isNaN(khatmLimit)) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_khatm_limit",
          message: "Invalid khatmLimit",
        },
      },
      { status: 400 }
    );
  }
  if (khatmLimit !== undefined && khatmLimit < 1) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_khatm_limit",
          message: "Invalid khatmLimit",
        },
      },
      { status: 400 }
    );
  }
  if (beforeKhatmNumberRaw !== null && Number.isNaN(beforeKhatmNumber)) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_before_khatm_number",
          message: "Invalid beforeKhatmNumber",
        },
      },
      { status: 400 }
    );
  }
  if (beforeKhatmNumber !== undefined && beforeKhatmNumber < 1) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_before_khatm_number",
          message: "Invalid beforeKhatmNumber",
        },
      },
      { status: 400 }
    );
  }

  const result = await getEventByShortCodeResult(shortCode, {
    khatmLimit,
    beforeKhatmNumber,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: { code: result.code, message: result.message },
      },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data);
}
