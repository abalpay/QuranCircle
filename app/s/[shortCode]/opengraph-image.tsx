import { ImageResponse } from "next/og";
import { createAnonClient } from "@/lib/supabase/anon";

export const runtime = "edge";

export const alt = "QuranCircle Khatm Circle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const colors = {
  bg: "#163f38",
  bgGradient: "#1a4a3f",
  cream: "#f5f0e4",
  gold: "#c9a84c",
  mutedLight: "#9cb3ac",
  greenGlow: "#2a6b5a",
};

export default async function OGImage({
  params,
}: {
  params: Promise<{ shortCode: string }>;
}) {
  const { shortCode } = await params;

  let eventName = "Khatm Circle";
  let eventDescription = "";

  try {
    const supabase = createAnonClient();
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

  const [cormorantData, manropeData] = await Promise.all([
    fetch(
      new URL("../../fonts/CormorantGaramond-SemiBold.ttf", import.meta.url)
    ).then((res) => res.arrayBuffer()),
    fetch(
      new URL("../../fonts/Manrope-Regular.ttf", import.meta.url)
    ).then((res) => res.arrayBuffer()),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(160deg, ${colors.bg} 0%, ${colors.bgGradient} 100%)`,
          position: "relative",
          overflow: "hidden",
          padding: "60px 80px",
        }}
      >
        {/* Top-right gold radial glow — subtle accent */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${colors.gold}0d 0%, transparent 70%)`,
            display: "flex",
          }}
        />
        {/* Bottom-left green radial glow — subtle accent */}
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${colors.greenGlow}14 0%, transparent 70%)`,
            display: "flex",
          }}
        />

        {/* Top bar — branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 40,
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 24,
              display: "flex",
            }}
          >
            &#128214;
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: colors.gold,
              fontFamily: "Manrope",
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
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 600,
              color: colors.cream,
              letterSpacing: "-0.5px",
              lineHeight: 1.15,
              fontFamily: "Cormorant Garamond",
              display: "flex",
              maxWidth: 960,
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
                color: colors.mutedLight,
                lineHeight: 1.5,
                maxWidth: 850,
                fontFamily: "Manrope",
                display: "flex",
              }}
            >
              {eventDescription.length > 120
                ? eventDescription.slice(0, 117) + "..."
                : eventDescription}
            </div>
          ) : null}

          {/* Gold divider */}
          <div
            style={{
              width: 80,
              height: 2,
              marginTop: 8,
              background: `linear-gradient(90deg, ${colors.gold}, ${colors.gold}44)`,
              borderRadius: 2,
              display: "flex",
            }}
          />
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: colors.mutedLight,
              fontFamily: "Manrope",
              letterSpacing: "0.5px",
              display: "flex",
            }}
          >
            qurancircle.io
          </div>
          <div
            style={{
              fontSize: 18,
              color: colors.gold,
              fontFamily: "Manrope",
              fontWeight: 600,
              display: "flex",
            }}
          >
            {`Join this Khatm Circle \u2192`}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Cormorant Garamond",
          data: cormorantData,
          style: "normal",
          weight: 600,
        },
        {
          name: "Manrope",
          data: manropeData,
          style: "normal",
          weight: 400,
        },
      ],
    }
  );
}
