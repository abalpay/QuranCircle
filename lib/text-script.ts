// User text (titles, duas, names) picks its font by its own script, not the page locale.
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export type TextScript = "arabic" | "latin";

/** Script of the first letter in the text; Latin when there is none. */
export function textScript(text: string | null | undefined): TextScript {
  const firstLetter = text?.match(/\p{L}/u)?.[0];
  return firstLetter && ARABIC_SCRIPT.test(firstLetter) ? "arabic" : "latin";
}

/** True when any of the strings contains an Arabic-script letter. */
export function containsArabicScript(...texts: (string | null | undefined)[]) {
  return texts.some((text) => Boolean(text && ARABIC_SCRIPT.test(text)));
}
