import { describe, expect, it } from "vitest";
import { decodeState, emptyState, saveEntry, writeState, readState, STORAGE_KEY } from "@/lib/hadith/local-state";

const entry = { id: "4560", title: "Full [source] title", locale: "en" as const, version: "1.0" };
describe("hadith device state", () => {
  it("rejects corrupt and unsupported state", () => {
    for (const raw of ["{", "null", JSON.stringify({ version: 2 }), JSON.stringify({ ...emptyState(), entries: [{ ...entry, id: "../4560" }] })]) {
      expect(decodeState(raw).status).toBe("corrupt");
    }
  });
  it("round trips bookmark metadata and size without source bodies or URLs", () => {
    const state = saveEntry({ ...emptyState(), size: "large" }, entry).state;
    expect(decodeState(JSON.stringify(state)).state).toEqual(state);
    expect(state.entries).toEqual([entry]);
    expect(Object.keys(state.entries[0]).sort()).toEqual(["id", "locale", "title", "version"]);
  });
  it("caps entries at 100 and ignores duplicate saves", () => {
    const state = { ...emptyState(), entries: Array.from({ length: 100 }, (_, id) => ({ ...entry, id: String(id) })) };
    expect(saveEntry(state, entry).status).toBe("limit");
    expect(saveEntry(state, { ...entry, id: "1" }).state.entries).toHaveLength(100);
  });
  it("reports blocked reads and quota errors without throwing", () => {
    expect(readState({ getItem() { throw Error("blocked"); } }).status).toBe("unavailable");
    expect(writeState({ setItem() { throw Error("quota"); } }, emptyState())).toBe(false);
    const values = new Map();
    expect(writeState({ setItem(k, v) { values.set(k, v); } }, saveEntry(emptyState(), entry).state)).toBe(true);
    expect(readState({ getItem: k => values.get(k) }).state.entries).toEqual([entry]);
    expect(values.has(STORAGE_KEY)).toBe(true);
  });
});
