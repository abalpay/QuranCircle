/**
 * Satori measures an Arabic word from the isolated letter advances but draws the joined forms,
 * which leaves uneven slack after every word (#104). Shaping the text to Arabic presentation
 * forms (U+FB50..FEFF) before rendering makes the measured width equal the drawn width.
 *
 * Tables are generated from the bundled Tajawal cmap (assets/fonts/Tajawal-Regular.ttf) and the
 * Unicode decompositions of the presentation forms. Letters Tajawal has no forms for (for example
 * Persian گ چ ژ) are left unshaped and still render, with the old slack.
 * Each entry: [isolated, final, initial, medial] (0 = none).
 */
const FORMS: Record<number, [number, number, number, number]> = {
  0x0622: [0, 0xFE82, 0, 0],
  0x0623: [0, 0xFE84, 0, 0],
  0x0624: [0, 0xFE86, 0, 0],
  0x0625: [0, 0xFE88, 0, 0],
  0x0626: [0, 0xFE8A, 0xFE8B, 0xFE8C],
  0x0627: [0, 0xFE8E, 0, 0],
  0x0628: [0, 0xFE90, 0xFE91, 0xFE92],
  0x0629: [0, 0xFE94, 0, 0],
  0x062A: [0, 0xFE96, 0xFE97, 0xFE98],
  0x062B: [0, 0xFE9A, 0xFE9B, 0xFE9C],
  0x062C: [0, 0xFE9E, 0xFE9F, 0xFEA0],
  0x062D: [0, 0xFEA2, 0xFEA3, 0xFEA4],
  0x062E: [0, 0xFEA6, 0xFEA7, 0xFEA8],
  0x062F: [0, 0xFEAA, 0, 0],
  0x0630: [0, 0xFEAC, 0, 0],
  0x0631: [0, 0xFEAE, 0, 0],
  0x0632: [0, 0xFEB0, 0, 0],
  0x0633: [0, 0xFEB2, 0xFEB3, 0xFEB4],
  0x0634: [0, 0xFEB6, 0xFEB7, 0xFEB8],
  0x0635: [0, 0xFEBA, 0xFEBB, 0xFEBC],
  0x0636: [0, 0xFEBE, 0xFEBF, 0xFEC0],
  0x0637: [0, 0xFEC2, 0xFEC3, 0xFEC4],
  0x0638: [0, 0xFEC6, 0xFEC7, 0xFEC8],
  0x0639: [0, 0xFECA, 0xFECB, 0xFECC],
  0x063A: [0, 0xFECE, 0xFECF, 0xFED0],
  0x0641: [0, 0xFED2, 0xFED3, 0xFED4],
  0x0642: [0, 0xFED6, 0xFED7, 0xFED8],
  0x0643: [0, 0xFEDA, 0xFEDB, 0xFEDC],
  0x0644: [0, 0xFEDE, 0xFEDF, 0xFEE0],
  0x0645: [0, 0xFEE2, 0xFEE3, 0xFEE4],
  0x0646: [0, 0xFEE6, 0xFEE7, 0xFEE8],
  0x0647: [0, 0xFEEA, 0xFEEB, 0xFEEC],
  0x0648: [0, 0xFEEE, 0, 0],
  0x0649: [0, 0xFEF0, 0xFBE8, 0xFBE9],
  0x064A: [0, 0xFEF2, 0xFEF3, 0xFEF4],
  0x0640: [0x0640, 0x0640, 0x0640, 0x0640], // tatweel joins both sides and stays itself
  0x200D: [0x200D, 0x200D, 0x200D, 0x200D], // ZWJ joins both sides; dropped after shaping
  0x067E: [0, 0xFB57, 0xFB58, 0xFB59],
  0x06A4: [0, 0xFB6B, 0xFB6C, 0xFB6D],
};

/** Lam + alef variants: [isolated, final] ligature. */
const LAM_ALEF: Record<number, [number, number]> = {
  0x0622: [0xFEF5, 0xFEF6],
  0x0623: [0xFEF7, 0xFEF8],
  0x0625: [0xFEF9, 0xFEFA],
  0x0627: [0xFEFB, 0xFEFC],
};

const LAM = 0x0644;

function isMark(code: number) {
  return (
    (code >= 0x0610 && code <= 0x061a) ||
    (code >= 0x064b && code <= 0x065f) ||
    code === 0x0670 ||
    (code >= 0x06d6 && code <= 0x06ed)
  );
}

const acceptsPrev = (code: number | undefined) => code !== undefined && FORMS[code] !== undefined && FORMS[code][1] !== 0;

/** Replaces Arabic letters with their contextual presentation forms; everything else is untouched. */
export function shapeArabic(text: string): string {
  const chars = Array.from(text);
  const codes = chars.map((char) => char.codePointAt(0) as number);
  const nextLetterIndex = (from: number) => {
    let index = from + 1;
    while (index < codes.length && isMark(codes[index])) index += 1;
    return index;
  };
  let output = "";
  let prevJoins = false; // the previous letter is dual-joining and reaches toward this one
  for (let i = 0; i < codes.length; i += 1) {
    const code = codes[i];
    if (isMark(code)) {
      output += chars[i];
      continue;
    }
    const forms = FORMS[code];
    if (!forms) {
      output += chars[i];
      prevJoins = false;
      continue;
    }
    const nextIndex = nextLetterIndex(i);
    const nextCode = codes[nextIndex];
    if (code === LAM && LAM_ALEF[nextCode]) {
      const [isolated, final] = LAM_ALEF[nextCode];
      output += String.fromCodePoint(prevJoins ? final : isolated);
      // Marks between lam and alef (rare) are kept after the ligature.
      for (let m = i + 1; m < nextIndex; m += 1) output += chars[m];
      i = nextIndex;
      prevJoins = false; // alef does not join forward
      continue;
    }
    const nextJoins = forms[2] !== 0 && acceptsPrev(nextCode);
    const form = prevJoins && nextJoins ? forms[3] : prevJoins ? forms[1] : nextJoins ? forms[2] : forms[0];
    output += String.fromCodePoint(form || forms[0] || code);
    prevJoins = nextJoins;
  }
  return output.replace(/\u200D/g, "");
}

const MIRRORED: Record<string, string> = { "(": ")", ")": "(", "[": "]", "]": "[", "«": "»", "»": "«", "<": ">", ">": "<" };
const DIGIT = /\p{N}/u;
const isLtrLetterOrDigit = (char: string) => /[\p{Script=Latin}\p{N}]/u.test(char);
const isMarkChar = (char: string) => isMark(char.codePointAt(0) as number);
// Letters Tajawal has no presentation form for stay in the base block, and opentype.js (inside @vercel/og)
// reverses every run of exactly these code points, marks included. Digits U+0660..0669 and U+06F0..06F9
// are not in its set, so they are not re-reversed here.
const BASE_ARABIC_RUN = /[\u0600-\u065F\u066A-\u06D3\u06D6-\u06DC\u06DF-\u06ED\u06FA-\u06FF]+/gu;

/**
 * Satori draws presentation forms strictly left to right, so a shaped word has to be handed over in
 * visual order: Latin/digit runs stay as they are (a separator between digits, as in 1,000 or 1.5,
 * stays inside the number), everything else is reversed (marks stay with their base letter, brackets
 * are mirrored). Base-letter runs are reversed once more because opentype.js reverses them again.
 */
export function toVisualOrder(shaped: string): string {
  const all = Array.from(shaped);
  const isLtr = (index: number) => {
    const char = all[index];
    if (isLtrLetterOrDigit(char)) return true;
    return /[.,٫٬]/.test(char) && index > 0 && index < all.length - 1 && DIGIT.test(all[index - 1]) && DIGIT.test(all[index + 1]);
  };
  const runs: { ltr: boolean; chars: string[] }[] = [];
  all.forEach((char, index) => {
    const ltr = isLtr(index);
    const last = runs[runs.length - 1];
    // A mark belongs to the letter before it, whatever that run is.
    if (last && (last.ltr === ltr || isMarkChar(char))) last.chars.push(char);
    else runs.push({ ltr, chars: [char] });
  });
  const visual = runs
    .reverse()
    .map((run) => {
      if (run.ltr) return run.chars.join("");
      const clusters: string[][] = [];
      for (const char of run.chars) {
        if (isMarkChar(char) && clusters.length) clusters[clusters.length - 1].push(char);
        else clusters.push([char]);
      }
      return clusters
        .reverse()
        .map((cluster) => cluster.reverse().map((char) => MIRRORED[char] ?? char).join(""))
        .join("");
    })
    .join("");
  return visual.replace(BASE_ARABIC_RUN, (run) => Array.from(run).reverse().join(""));
}

/** Shaped and ordered for satori; text without Arabic letters is returned unchanged. */
export function shapeForOg(text: string): string {
  return /[\u0600-\u06FF]/.test(text) ? toVisualOrder(shapeArabic(text)) : text;
}
