import { ImageResponse } from "next/og";
import { createAnonClient } from "@/lib/supabase/anon";

export const runtime = "edge";

export const alt = "QuranCircle Khatm Circle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const colors = {
  bg: "#f5f0e4",
  deep: "#163f38",
  green: "#17634f",
  lightGreen: "#4d9482",
  gold: "#a58230",
  muted: "#526b64",
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
          background: `linear-gradient(180deg, ${colors.bg} 0%, ${colors.bg} 44%, #f0ead8 100%)`,
          position: "relative",
          overflow: "hidden",
          padding: "60px 80px",
        }}
      >
        {/* Top-right green radial glow */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${colors.lightGreen}28 0%, transparent 70%)`,
            display: "flex",
          }}
        />
        {/* Bottom-left gold radial glow */}
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 450,
            height: 450,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${colors.gold}1a 0%, transparent 70%)`,
            display: "flex",
          }}
        />

        {/* Vignette */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            background: `radial-gradient(ellipse at 50% 45%, transparent 40%, ${colors.bg} 85%)`,
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
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `${colors.green}18`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            &#128214;
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: colors.muted,
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
            gap: 16,
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 600,
              color: colors.deep,
              letterSpacing: "-0.5px",
              lineHeight: 1.15,
              fontFamily: "Cormorant Garamond",
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
                fontSize: 22,
                color: colors.muted,
                lineHeight: 1.5,
                maxWidth: 800,
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
              width: 64,
              height: 2,
              marginTop: 8,
              background: `linear-gradient(90deg, ${colors.gold}99, ${colors.gold}33)`,
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
              fontSize: 17,
              color: `${colors.muted}99`,
              fontFamily: "Manrope",
              letterSpacing: "0.5px",
              display: "flex",
            }}
          >
            qurancircle.io
          </div>
          <div
            style={{
              fontSize: 17,
              color: colors.green,
              fontFamily: "Manrope",
              fontWeight: 600,
              display: "flex",
            }}
          >
            Join this Khatm Circle
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
