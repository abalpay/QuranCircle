import type { KhatmSnapshot } from "@/lib/types/events";

export const AUTO_COMPLETE_DAYS = 7;
/** Qur'an 2:127 */
export const COMPLETION_DUA_AR = "رَبَّنَا تَقَبَّلْ مِنَّا ۖ إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ";

/** Fully claimed and still open: the organizer may complete it (D5.2). */
export function isReadyToComplete(khatm: KhatmSnapshot) {
  return khatm.claimed_count === 30 && !khatm.completed_at;
}

/** Latest claim + 7 days (D5.3), or null when the snapshot does not carry the claim time. */
export function getAutoCompleteDate(khatm: Pick<KhatmSnapshot, "last_claimed_at">): Date | null {
  if (!khatm.last_claimed_at) return null;
  const last = new Date(khatm.last_claimed_at);
  if (Number.isNaN(last.getTime())) return null;
  return new Date(last.getTime() + AUTO_COMPLETE_DAYS * 864e5);
}

/** Distinct reader names, in Juz order: the register of a completed khatm (D16). */
export function getReaderNames(khatm: Pick<KhatmSnapshot, "juzs">) {
  return Array.from(
    new Set(
      khatm.juzs
        .map((juz) => juz.claimed_by_name?.trim())
        .filter((name): name is string => Boolean(name))
    )
  );
}
