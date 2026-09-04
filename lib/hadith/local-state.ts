import type { HadithLocale } from "./types";

export const STORAGE_KEY = "qurancircle:hadith:v1";
export const TEXT_SIZES = ["standard", "large", "larger"] as const;
export type TextSize = typeof TEXT_SIZES[number];
export type SavedEntry = { id: string; title: string; locale: HadithLocale; version: string };
export type LocalState = { version: 1; size: TextSize; entries: SavedEntry[] };
export type StorageStatus = "ready" | "corrupt" | "unavailable" | "limit";
export const emptyState = (): LocalState => ({ version: 1, size: "standard", entries: [] });
const validEntry = (entry: unknown): entry is SavedEntry => {
  if (!entry || typeof entry !== "object") return false;
  const e = entry as SavedEntry;
  return typeof e.id === "string" && /^[0-9]+$/.test(e.id) && typeof e.title === "string" && e.title.length > 0 && typeof e.version === "string" && e.version.length > 0 && ["en", "tr", "ar"].includes(e.locale);
};
export function decodeState(raw: string | null): { state: LocalState; status: StorageStatus } {
  if (raw === null) return { state: emptyState(), status: "ready" };
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || !TEXT_SIZES.includes(value.size) || !Array.isArray(value.entries) || value.entries.length > 100 || !value.entries.every(validEntry)) throw Error("Invalid state");
    const entries: SavedEntry[] = value.entries.map(({ id, title, locale, version }: SavedEntry) => ({ id, title, locale, version }));
    if (new Set(entries.map(e => `${e.locale}:${e.id}`)).size !== entries.length) throw Error("Duplicate state");
    return { state: { version: 1, size: value.size, entries }, status: "ready" };
  } catch { return { state: emptyState(), status: "corrupt" }; }
}
export function readState(storage: Pick<Storage, "getItem">) {
  try { return decodeState(storage.getItem(STORAGE_KEY)); }
  catch { return { state: emptyState(), status: "unavailable" as const }; }
}
export function writeState(storage: Pick<Storage, "setItem">, state: LocalState): boolean {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}
export function saveEntry(state: LocalState, entry: SavedEntry): { state: LocalState; status: StorageStatus } {
  if (!validEntry(entry)) return { state, status: "corrupt" };
  if (state.entries.some(e => e.id === entry.id && e.locale === entry.locale)) return { state, status: "ready" };
  if (state.entries.length >= 100) return { state, status: "limit" };
  const { id, title, locale, version } = entry;
  return { state: { ...state, entries: [...state.entries, { id, title, locale, version }] }, status: "ready" };
}
