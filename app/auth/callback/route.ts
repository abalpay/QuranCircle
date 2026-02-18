import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSafeNextPath } from "@/lib/supabase/auth-urls";
import { cookies } from "next/headers";
import {
  getMergeStateClearCookieOptions,
  MERGE_STATE_COOKIE,
  parseMergeStateToken,
} from "@/lib/auth/merge-state";

type MergeFinalizeStatus =
  | "no_pending_merge"
  | "pending_auth"
  | "merge_retryable_error"
  | "merged"
  | "no_merge_required"
  | "invalid_merge_state";

type MergeFinalizeResult = {
  status: MergeFinalizeStatus;
  shouldClearCookie: boolean;
};

async function finalizePendingMerge({
  supabase,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
}): Promise<MergeFinalizeResult> {
  const cookieStore = await cookies();
  const mergeStateToken = cookieStore.get(MERGE_STATE_COOKIE)?.value ?? null;

  if (!mergeStateToken) {
    return { status: "no_pending_merge", shouldClearCookie: false };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.is_anonymous) {
    return { status: "pending_auth", shouldClearCookie: false };
  }

  const sourceUserId = parseMergeStateToken(mergeStateToken);

  if (!sourceUserId || sourceUserId === user.id) {
    return { status: "invalid_merge_state", shouldClearCookie: true };
  }

  const { data, error } = await supabase.rpc("merge_anonymous_identity", {
    p_source_user_id: sourceUserId,
  });

  if (error) {
    console.error("Auth callback merge failed (retryable):", error.message);
    return { status: "merge_retryable_error", shouldClearCookie: false };
  }

  const mergeResult = (data ?? {}) as {
    merged?: boolean;
    reason?: string;
  };

  if (!mergeResult.merged) {
    return { status: "no_merge_required", shouldClearCookie: true };
  }

  return { status: "merged", shouldClearCookie: true };
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeNextPath(searchParams.get("next") ?? undefined);
  const isSecureOrigin = origin.startsWith("https://");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      const mergeResult = await finalizePendingMerge({ supabase });
      if (mergeResult.shouldClearCookie) {
        response.cookies.set(
          MERGE_STATE_COOKIE,
          "",
          getMergeStateClearCookieOptions(isSecureOrigin)
        );
      }
      return response;
    }
    console.error("Auth callback failed:", error.message);
  }

  const response = NextResponse.redirect(`${origin}/?error=auth`);
  response.cookies.set(
    MERGE_STATE_COOKIE,
    "",
    getMergeStateClearCookieOptions(isSecureOrigin)
  );
  return response;
}

export async function POST(request: Request) {
  const isSecureOrigin = new URL(request.url).protocol === "https:";
  const supabase = await createClient();
  const mergeResult = await finalizePendingMerge({ supabase });
  const response = NextResponse.json({ status: mergeResult.status });

  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  if (mergeResult.shouldClearCookie) {
    response.cookies.set(
      MERGE_STATE_COOKIE,
      "",
      getMergeStateClearCookieOptions(isSecureOrigin)
    );
  }
  return response;
}
