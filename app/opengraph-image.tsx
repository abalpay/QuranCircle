import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "QuranCircle - Read & Complete the Quran Together";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Color tokens from globals.css (HSL → hex approximations)
const colors = {
  bg: "#f5f0e4", // hsl(44 40% 95%)
  deep: "#163f38", // hsl(167 53% 18%)
  green: "#17634f", // hsl(166 62% 24%)
  lightGreen: "#4d9482", // hsl(162 32% 44%)
  gold: "#a58230", // hsl(39 54% 42%)
  muted: "#526b64", // hsl(162 13% 37%)
};

export default async function OGImage() {
  const [cormorantData, manropeData] = await Promise.all([
    fetch(new URL("./fonts/CormorantGaramond-SemiBold.ttf", import.meta.url)).then(
      (res) => res.arrayBuffer()
    ),
    fetch(new URL("./fonts/Manrope-Regular.ttf", import.meta.url)).then(
      (res) => res.arrayBuffer()
    ),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(180deg, ${colors.bg} 0%, ${colors.bg} 44%, #f0ead8 100%)`,
          position: "relative",
          overflow: "hidden",
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

        {/* Vignette overlay */}
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

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            position: "relative",
          }}
        >
          {/* Bismillah */}
          <div
            style={{
              fontSize: 36,
              color: `${colors.gold}99`,
              marginBottom: 12,
              display: "flex",
            }}
          >
            بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
          </div>

          {/* Main heading */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              fontFamily: "Cormorant Garamond",
            }}
          >
            <div
              style={{
                fontSize: 72,
                fontWeight: 600,
                color: colors.deep,
                letterSpacing: "-1px",
                lineHeight: 1.1,
                display: "flex",
              }}
            >
              Complete the Quran
            </div>
            <div
              style={{
                fontSize: 72,
                fontWeight: 600,
                letterSpacing: "-1px",
                lineHeight: 1.1,
                display: "flex",
                color: colors.green,
              }}
            >
              together.
            </div>
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 22,
              color: colors.muted,
              maxWidth: 650,
              textAlign: "center",
              lineHeight: 1.5,
              marginTop: 16,
              fontFamily: "Manrope",
              display: "flex",
            }}
          >
            Create a circle, claim your Juz, and finish your
            collective Khatm with clarity.
          </div>

          {/* Gold divider */}
          <div
            style={{
              width: 96,
              height: 2,
              marginTop: 24,
              background: `linear-gradient(90deg, transparent, ${colors.gold}99, transparent)`,
              borderRadius: 2,
              display: "flex",
            }}
          />

          {/* URL */}
          <div
            style={{
              fontSize: 17,
              color: colors.muted,
              marginTop: 16,
              fontFamily: "Manrope",
              letterSpacing: "0.5px",
              display: "flex",
            }}
          >
            qurancircle.io
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
