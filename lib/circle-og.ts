import type { KhatmSnapshot } from "@/lib/types/events";
import { isolateName } from "@/lib/share-invite";

type OgSnapshot = {
  name?: string;
  description?: string | null;
  is_public?: boolean;
  is_archived?: boolean;
  khatms?: (Pick<KhatmSnapshot, "khatm_number" | "completed_at"> & { claimed_count?: number })[];
};

export type CircleOgStatus = "open" | "full" | "completed" | "archived";

/**
 * What the share preview shows. Archived wins over everything; then completed (the latest khatm,
 * or the only one, is complete); then full (all 30 Juz claimed); otherwise open.
 */
export function getCircleOgState(
  data: OgSnapshot | null | undefined,
  fallbackName: string
) {
  const latest = data?.khatms?.[data.khatms.length - 1];
  const completedKhatmNumber = latest?.completed_at ? latest.khatm_number : null;
  const status: CircleOgStatus = data?.is_archived
    ? "archived"
    : completedKhatmNumber !== null
      ? "completed"
      : latest && (latest.claimed_count ?? 0) >= 30
        ? "full"
        : "open";
  return {
    name: data?.name || fallbackName,
    description: data?.description || "",
    completedKhatmNumber,
    status,
    isPublic: data?.is_public === true,
    // Only an open circle has a Juz left to take.
    showJoinCta: status === "open",
  };
}

/** Cuts at the last whole word that fits, then adds an ellipsis. Never splits a word (a single over-long word is cut). */
export function truncateAtWord(text: string, max: number): string {
  const chars = Array.from(text.trim());
  if (chars.length <= max) return chars.join("");
  const room = chars.slice(0, max - 1);
  // A cut that lands exactly before a space is already on a word boundary.
  const boundary = /\s/.test(chars[max - 1]) ? room.length : room.map((c) => /\s/.test(c)).lastIndexOf(true);
  const kept = boundary > 0 ? room.slice(0, boundary) : room;
  return `${kept.join("").trimEnd()}…`;
}

/** Short stable hash (FNV-1a, base 36) used to bust preview caches when anything the card shows changes. */
export function ogVersion(...parts: (string | number | boolean | null | undefined)[]): string {
  let hash = 0x811c9dc5;
  for (const char of parts.map((part) => String(part ?? "")).join("␟")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

type DescriptionTranslator = (
  key: "description" | "descriptionFull" | "descriptionCompleted" | "descriptionArchived",
  values: { eventName: string; number?: number }
) => string;

/** og:description follows the state: an open circle shows its own words, the others say where it stands. */
export function getOgDescription(
  state: ReturnType<typeof getCircleOgState>,
  ownDescription: string | null | undefined,
  t: DescriptionTranslator
): string {
  const values = { eventName: isolateName(state.name), number: state.completedKhatmNumber ?? undefined };
  if (state.status === "archived") return t("descriptionArchived", values);
  if (state.status === "completed") return t("descriptionCompleted", values);
  if (state.status === "full") return t("descriptionFull", values);
  return ownDescription || t("description", values);
}
