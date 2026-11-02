import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Fonts for share images with Arabic text. Satori's default fallback cannot shape Arabic
 * ("lookupType: 5 - substFormat: 3 is not yet supported"), and Noto Sans/Naskh Arabic and Amiri
 * fail the same way. Tajawal (60 KB, SIL OFL, assets/fonts) shapes correctly; Manrope covers Latin.
 * Buffers are read once per server instance; a font that cannot be read is skipped (logged once)
 * so the image still renders instead of answering 500 (without Tajawal the renderer may try to fetch a
 * fallback Arabic font, which can fail: Arabic text is then at risk, not the response). A partial list is
 * never kept: the next request retries.
 */
// Literal paths on purpose: the bundler traces them into the image routes' output (a variable path would not be).
const FILES = [
  { name: "Manrope", read: () => readFile(join(process.cwd(), "app/fonts/Manrope-Regular.ttf")) },
  { name: "Tajawal", read: () => readFile(join(process.cwd(), "assets/fonts/Tajawal-Regular.ttf")) },
] as const;

type OgFont = { name: string; data: Buffer; weight: 400; style: "normal" };
let cached: Promise<OgFont[]> | null = null;

async function readFonts(): Promise<OgFont[]> {
  const fonts: (OgFont | null)[] = await Promise.all(
    FILES.map(async ({ name, read }) => {
      try {
        return { name: name as string, data: await read(), weight: 400 as const, style: "normal" as const };
      } catch (error) {
        console.error(`OG font ${name} could not be read; rendering without it`, error);
        return null;
      }
    })
  );
  return fonts.filter((font): font is OgFont => font !== null);
}

export function loadOgFonts() {
  cached ??= readFonts().then((fonts) => {
    if (fonts.length < FILES.length) cached = null;
    return fonts;
  });
  return cached;
}

/** Font-family list for the fonts that did load, ending in the generic fallback. */
export function ogFontFamily(fonts: { name: string }[]) {
  return [...fonts.map((font) => font.name), "sans-serif"].join(", ");
}
