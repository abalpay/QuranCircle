import type { CSSProperties } from "react";
import { layoutBidiWords } from "@/lib/og-bidi";
import { containsArabicScript } from "@/lib/text-script";
import { shapeForOg } from "@/lib/arabic-shaping";

/** Satori breaks lines after a hyphen; a non-breaking hyphen (in Manrope and Tajawal) keeps "Al-Hashimi" in one piece. */
export const keepHyphenated = (text: string) => text.replace(/(?<=\p{L})-(?=\p{L})/gu, "\u2011");

/**
 * Satori has no bidi: it places a text node's words left to right in reading order. Text with
 * Arabic script is therefore laid out word by word, ordered by `layoutBidiWords`, in a wrapping
 * flex row (`row-reverse` for an RTL paragraph, so it starts at the right edge). Latin-only text
 * stays one plain node, unchanged (#103).
 */
export function OgText({
  text,
  style,
  hug = true,
}: {
  text: string;
  style: CSSProperties;
  /** RTL blocks span the row so they sit against the right edge; the CTA passes false. */
  hug?: boolean;
}) {
  if (!containsArabicScript(text)) {
    return <div style={{ ...style, display: "flex" }}>{keepHyphenated(text)}</div>;
  }
  const { paragraph, words } = layoutBidiWords(text);
  const rtl = paragraph === "rtl";
  const fontSize = typeof style.fontSize === "number" ? style.fontSize : 24;
  // Satori throws on undefined style values, so maxWidth is dropped by destructuring, never set to undefined.
  const { maxWidth: _maxWidth, ...rest } = style;
  return (
    <div
      style={{
        ...(rtl && hug ? rest : style),
        display: "flex",
        flexDirection: rtl ? "row-reverse" : "row",
        flexWrap: "wrap",
        // Words in different faces (digits, Latin) share one baseline.
        alignItems: "baseline",
        columnGap: Math.round(fontSize * 0.2),
        ...(rtl && hug ? { width: "100%" } : {}),
      }}
    >
      {words.map((word, index) => (
        <div key={index} style={{ display: "flex" }}>
          {shapeForOg(keepHyphenated(word))}
        </div>
      ))}
    </div>
  );
}
