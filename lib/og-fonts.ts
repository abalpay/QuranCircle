import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Fonts for share images with Arabic text. Satori's default fallback cannot shape Arabic
 * ("lookupType: 5 - substFormat: 3 is not yet supported"), and Noto Sans/Naskh Arabic and Amiri
 * fail the same way. Tajawal (60 KB, SIL OFL, assets/fonts) shapes correctly; Manrope covers Latin.
 */
export async function loadOgFonts() {
  const [arabic, latin] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Tajawal-Regular.ttf")),
    readFile(join(process.cwd(), "app/fonts/Manrope-Regular.ttf")),
  ]);
  return [
    { name: "Manrope", data: latin, weight: 400 as const, style: "normal" as const },
    { name: "Tajawal", data: arabic, weight: 400 as const, style: "normal" as const },
  ];
}
