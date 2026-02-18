import { createClient } from "@/lib/supabase/server";
import {
  buildMergeStateToken,
  getMergeStateClearCookieOptions,
  getMergeStateCookieOptions,
  MERGE_STATE_COOKIE,
} from "@/lib/auth/merge-state";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const isSecureOrigin = new URL(request.url).protocol === "https:";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.is_anonymous) {
    const response = NextResponse.json({
      prepared: false,
      reason: "not_anonymous",
    });
    response.cookies.set(
      MERGE_STATE_COOKIE,
      "",
      getMergeStateClearCookieOptions(isSecureOrigin)
    );
    return response;
  }

  try {
    const token = buildMergeStateToken(user.id);
    const response = NextResponse.json({ prepared: true });
    response.cookies.set(
      MERGE_STATE_COOKIE,
      token,
      getMergeStateCookieOptions(isSecureOrigin)
    );
    return response;
  } catch (error) {
    console.error("[auth] prepare merge cookie failed:", error);
    const response = NextResponse.json(
      {
        prepared: false,
        reason: "merge_state_unavailable",
      },
      { status: 500 }
    );
    response.cookies.set(
      MERGE_STATE_COOKIE,
      "",
      getMergeStateClearCookieOptions(isSecureOrigin)
    );
    return response;
  }
}
