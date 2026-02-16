import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "QuranCircle - Read & Complete the Quran Together";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Color tokens from globals.css (HSL → hex approximations)
const colors = {
  bg: "#f5f0e4", // hsl(44 40% 95%)
  card: "#fefcf6", // hsl(42 52% 98%)
  deep: "#163f38", // hsl(167 53% 18%)
  green: "#17634f", // hsl(166 62% 24%)
  lightGreen: "#4d9482", // hsl(162 32% 44%)
  gold: "#a58230", // hsl(39 54% 42%)
  muted: "#526b64", // hsl(162 13% 37%)
  border: "#d4c9a8", // hsl(41 24% 78%)
};

export default async function OGImage() {
  const cormorantFont = fetch(
    new URL(
      "https://fonts.gstatic.com/s/cormorantgaramond/v16/co3YmX5slCNuHLi8bLeY9MK7whWMhyjYqXtK.ttf"
    )
  ).then((res) => res.arrayBuffer());

  const manropeFont = fetch(
    new URL(
      "https://fonts.gstatic.com/s/manrope/v15/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk79FO_F.ttf"
    )
  ).then((res) => res.arrayBuffer());

  const [cormorantData, manropeData] = await Promise.all([
    cormorantFont,
    manropeFont,
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

        {/* Subtle geometric overlay — 8-pointed star grid */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%231f4e45' stroke-width='1' opacity='0.06'%3E%3Crect x='36' y='36' width='48' height='48'/%3E%3Crect x='36' y='36' width='48' height='48' transform='rotate(45 60 60)'/%3E%3Cpolygon points='70,36 84,50 84,70 70,84 50,84 36,70 36,50 50,36'/%3E%3Cline x1='60' y1='0' x2='60' y2='26'/%3E%3Cline x1='120' y1='60' x2='94' y2='60'/%3E%3Cline x1='60' y1='120' x2='60' y2='94'/%3E%3Cline x1='0' y1='60' x2='26' y2='60'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "120px 120px",
            opacity: 0.7,
          }}
        />

        {/* Vignette overlay to fade pattern at edges */}
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
