import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

export const alt = "QuranCircle Khatm Circle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ shortCode: string }>;
}) {
  const { shortCode } = await params;

  let eventName = "Khatm Circle";
  let eventDescription = "";

  try {
    const supabase = await createClient();
    const { data: event } = await supabase
      .from("events")
      .select("name, description")
      .eq("short_code", shortCode)
      .single();

    if (event) {
      eventName = event.name;
      eventDescription = event.description || "";
    }
  } catch {
    // Fallback to defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(145deg, #0a3d34 0%, #0f5f52 40%, #1a7a6a 100%)",
          position: "relative",
          padding: "60px 80px",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(255, 215, 0, 0.08)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -40,
            left: -40,
            width: 250,
            height: 250,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.05)",
            display: "flex",
          }}
        />

        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(255, 255, 255, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
            }}
          >
            &#128214;
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.7)",
              display: "flex",
            }}
          >
            QuranCircle
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.5px",
              lineHeight: 1.2,
              display: "flex",
              maxWidth: 900,
            }}
          >
            {eventName.length > 60
              ? eventName.slice(0, 57) + "..."
              : eventName}
          </div>

          {eventDescription ? (
            <div
              style={{
                fontSize: 24,
                color: "rgba(255, 255, 255, 0.7)",
                lineHeight: 1.4,
                maxWidth: 800,
                display: "flex",
              }}
            >
              {eventDescription.length > 120
                ? eventDescription.slice(0, 117) + "..."
                : eventDescription}
            </div>
          ) : null}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: "rgba(255, 255, 255, 0.5)",
              display: "flex",
            }}
          >
            qurancircle.io
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#d4af37",
              display: "flex",
            }}
          >
            Join this Khatm Circle
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
