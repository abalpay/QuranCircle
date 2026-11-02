import type { CSSProperties } from "react";
import { layoutBidiWords } from "@/lib/og-bidi";
import { containsArabicScript } from "@/lib/text-script";
import { shapeForOg } from "@/lib/arabic-shaping";

/** Satori breaks lines after a hyphen; a non-breaking hyphen (in Manrope and Tajawal) keeps "Al-Hashimi" in one piece. */
export const keepHyphenated = (text: string) => text.replace(/(?<=\p{L})-(?=\p{L})/gu, "\u2011");

/** Baseline of Manrope minus Tajawal inside the same line box, in em: (asc-desc)/2 of each (hhea 2132/-600 per 2000, 643/-357 per 1000). */
const TAJAWAL_BASELINE_DROP = 0.24;

export type OgAlign = "left" | "right" | "center";

/**
 * Satori has no bidi: it places a text node's words left to right in reading order. Text with
 * Arabic script is therefore laid out word by word, ordered by `layoutBidiWords`, in a wrapping
 * flex row (`row-reverse` for an RTL paragraph, so it starts at the right edge). Latin-only text
 * stays one plain node, unchanged (#103).
 *
 * `align` is the physical edge the block's lines sit against (a card has one, set by its name's
 * direction); each line keeps its own internal direction. Every word box gets the same fixed
 * height and line height, because satori's baseline alignment drifts when a word mixes faces or
 * carries marks and punctuation.
 */
export function OgText({
  text,
  style,
  align = "left",
}: {
  text: string;
  style: CSSProperties;
  align?: OgAlign;
}) {
  if (!containsArabicScript(text)) {
    return <div style={{ ...style, display: "flex", textAlign: align }}>{keepHyphenated(text)}</div>;
  }
  const { paragraph, words } = layoutBidiWords(text);
  const rtl = paragraph === "rtl";
  const fontSize = typeof style.fontSize === "number" ? style.fontSize : 24;
  const lineHeight = Math.round(fontSize * (typeof style.lineHeight === "number" ? style.lineHeight : 1.4));
  const atStart = (rtl ? align === "right" : align === "left") ? "flex-start" : "flex-end";
  return (
    <div
      style={{
        ...style,
        display: "flex",
        flexDirection: rtl ? "row-reverse" : "row",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : atStart,
        alignItems: "flex-start",
        columnGap: Math.round(fontSize * 0.2),
      }}
    >
      {words.map((word, index) => {
        const arabic = containsArabicScript(word);
        return (
          <div
            key={index}
            style={{
              display: "flex",
              height: lineHeight,
              lineHeight: `${lineHeight}px`,
              // A word with Arabic letters is set wholly in Tajawal (its dot, tanween and digits too), so one
              // word never mixes faces; the drop lines its baseline up with the Latin words'.
              ...(arabic
                ? { fontFamily: `Tajawal, ${style.fontFamily ?? "sans-serif"}`, position: "relative" as const, top: Math.round(fontSize * TAJAWAL_BASELINE_DROP) }
                : {}),
            }}
          >
            {shapeForOg(keepHyphenated(word))}
          </div>
        );
      })}
    </div>
  );
}
