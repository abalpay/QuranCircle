import { ImageResponse } from "next/og";
import BrandMark from "@/components/brand-mark";
import { BRAND_COLORS } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_COLORS.deep,
        }}
      >
        <BrandMark variant="on-dark" width="138" height="138" />
      </div>
    ),
    { ...size }
  );
}
