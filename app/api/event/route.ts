import { getEventByShortCode } from "@/lib/actions/events";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shortCode = searchParams.get("shortCode");
  if (!shortCode) {
    return NextResponse.json({ error: "Missing shortCode" }, { status: 400 });
  }
  const event = await getEventByShortCode(shortCode);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Read the requesting user's identity
  const cookieStore = await cookies();
  const requestDeviceToken =
    cookieStore.get("quran_circle_device_token")?.value ?? null;
  const requestCreatorToken =
    cookieStore.get("quran_circle_creator_token")?.value ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const requestUserId = user?.id ?? null;

  // Compute creator status server-side so raw credentials are never sent to the client
  const isCreator =
    (!!requestUserId && event.created_by === requestUserId) ||
    (!!event.creator_token &&
      !!requestCreatorToken &&
      event.creator_token === requestCreatorToken);

  // Strip sensitive fields before sending to client.
  // Keep device_token/claimed_by_user_id ONLY for juz belonging to the requester.
  const { creator_token: _creator_token, created_by: _created_by, ...safeEvent } = event;
  const safeKhatms = safeEvent.khatms?.map(
    (k: Record<string, unknown> & { juzs?: Record<string, unknown>[] }) => ({
      ...k,
      juzs: k.juzs?.map(
        ({
          device_token,
          claimed_by_user_id,
          ...rest
        }: Record<string, unknown>) => {
          const isOwner =
            (!!requestUserId &&
              !!claimed_by_user_id &&
              requestUserId === claimed_by_user_id) ||
            (!!requestDeviceToken &&
              !!device_token &&
              requestDeviceToken === device_token);

          return {
            ...rest,
            device_token: isOwner ? device_token : null,
            claimed_by_user_id: isOwner ? claimed_by_user_id : null,
          };
        }
      ),
    })
  );

  return NextResponse.json({ ...safeEvent, khatms: safeKhatms ?? [], isCreator });
}
