import { ImageResponse } from "next/og";
import BrandMark from "@/components/brand-mark";
import { BRAND_COLORS } from "@/lib/brand";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
        <BrandMark variant="on-dark" width="27" height="27" />
      </div>
    ),
    { ...size }
  );
}
