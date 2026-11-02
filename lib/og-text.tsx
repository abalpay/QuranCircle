import type { CSSProperties } from "react";
import { textScript } from "@/lib/text-script";

/**
 * Satori places a text node's words left to right in reading order, so Arabic would read backwards.
 * Arabic-script text is laid out word by word in a wrapping row-reverse flex, which starts at the
 * right edge and wraps correctly. Latin text is a plain flex child, unchanged (#103).
 */
export function OgText({
  text,
  style,
  hug = true,
}: {
  text: string;
  style: CSSProperties;
  /** Arabic blocks span the row so they sit against the right edge; the CTA passes false. */
  hug?: boolean;
}) {
  if (textScript(text) !== "arabic") {
    return <div style={{ ...style, display: "flex" }}>{text}</div>;
  }
  const words = text.split(/\s+/).filter(Boolean);
  const fontSize = typeof style.fontSize === "number" ? style.fontSize : 24;
  // Satori throws on undefined style values, so maxWidth is dropped by destructuring, never set to undefined.
  const { maxWidth: _maxWidth, ...rest } = style;
  return (
    <div
      style={{
        ...(hug ? rest : style),
        display: "flex",
        flexDirection: "row-reverse",
        flexWrap: "wrap",
        columnGap: Math.round(fontSize * 0.2),
        ...(hug ? { width: "100%" } : {}),
      }}
    >
      {words.map((word, index) => (
        <div key={index} style={{ display: "flex" }}>
          {word}
        </div>
      ))}
    </div>
  );
}
