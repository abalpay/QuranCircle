import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "QuranCircle - Read & Complete the Quran Together";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
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
          background: "linear-gradient(145deg, #0a3d34 0%, #0f5f52 40%, #1a7a6a 100%)",
          position: "relative",
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

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
          }}
        >
          {/* Quran icon placeholder using text */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: "rgba(255, 255, 255, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
            }}
          >
            &#128214;
          </div>

          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-1px",
              display: "flex",
            }}
          >
            QuranCircle
          </div>

          <div
            style={{
              fontSize: 28,
              color: "rgba(255, 255, 255, 0.85)",
              maxWidth: 700,
              textAlign: "center",
              lineHeight: 1.4,
              display: "flex",
            }}
          >
            Read & Complete the Quran Together
          </div>

          {/* Divider */}
          <div
            style={{
              width: 80,
              height: 3,
              background: "linear-gradient(90deg, transparent, #d4af37, transparent)",
              borderRadius: 2,
              display: "flex",
            }}
          />

          <div
            style={{
              fontSize: 18,
              color: "rgba(255, 255, 255, 0.6)",
              display: "flex",
            }}
          >
            qurancircle.io
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
