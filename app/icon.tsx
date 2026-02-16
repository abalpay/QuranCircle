import { ImageResponse } from "next/og";

export const runtime = "edge";

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
          borderRadius: 6,
          background: "linear-gradient(135deg, #17634f 0%, #163f38 100%)",
        }}
      >
        <div
          style={{
            fontSize: 20,
            display: "flex",
          }}
        >
          &#128214;
        </div>
      </div>
    ),
    { ...size }
  );
}
