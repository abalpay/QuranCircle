import { containsArabicScript } from "@/lib/text-script";

type Dir = "ltr" | "rtl";
type Kind = Dir | "number" | "neutral";

function kindOf(word: string): Kind {
  if (containsArabicScript(word)) return "rtl";
  if (/\p{L}/u.test(word)) return "ltr";
  if (/\p{N}/u.test(word)) return "number";
  return "neutral";
}

/**
 * Satori lays a text node out left to right in reading order and has no bidi, so mixed-script
 * text is ordered here, word by word, following the Unicode rules in outline:
 *  - the paragraph runs the direction of its first letter;
 *  - a number takes the direction of the word before it (so "الختمة 1" shows the 1 to the left);
 *  - punctuation between two same-direction words takes it, otherwise the paragraph's.
 * Returns the words in the order a flex row must receive them: `row-reverse` for an RTL
 * paragraph (first child at the right edge), `row` for an LTR one. A run whose direction opposes
 * the paragraph is emitted reversed, so its words still read in their own direction.
 */
export function layoutBidiWords(text: string): { paragraph: Dir; words: string[] } {
  const words = text.split(/\s+/).filter(Boolean);
  const kinds = words.map(kindOf);
  const firstLetter = kinds.find((kind) => kind === "rtl" || kind === "ltr");
  const paragraph: Dir = firstLetter === "rtl" ? "rtl" : "ltr";

  const dirs: Dir[] = [];
  let previousStrong: Dir | null = null;
  kinds.forEach((kind, index) => {
    if (kind === "rtl" || kind === "ltr") {
      dirs[index] = kind;
      previousStrong = kind;
    } else if (kind === "number") {
      dirs[index] = previousStrong ?? paragraph;
    } else {
      const next = kinds.slice(index + 1).find((k) => k === "rtl" || k === "ltr") as Dir | undefined;
      dirs[index] = previousStrong && previousStrong === next ? previousStrong : paragraph;
    }
  });

  const runs: { dir: Dir; words: string[] }[] = [];
  words.forEach((word, index) => {
    const last = runs[runs.length - 1];
    if (last && last.dir === dirs[index]) last.words.push(word);
    else runs.push({ dir: dirs[index], words: [word] });
  });

  return {
    paragraph,
    words: runs.flatMap((run) => (run.dir === paragraph ? run.words : [...run.words].reverse())),
  };
}
