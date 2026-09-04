"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { hadithPath } from "@/lib/hadith/paths";
import { emptyState, readState, writeState, saveEntry, STORAGE_KEY, TEXT_SIZES, type LocalState, type SavedEntry, type StorageStatus } from "@/lib/hadith/local-state";

function useDeviceState() {
  const [state, setState] = useState<LocalState>(emptyState);
  const [status, setStatus] = useState<StorageStatus>("ready");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => {
      try { const result = readState(window.localStorage); setState(result.state); setStatus(result.status); }
      catch { setStatus("unavailable"); }
      setReady(true);
    };
    sync();
    const onStorage = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) sync(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const update = (next: LocalState) => {
    setState(next);
    try { setStatus(writeState(window.localStorage, next) ? "ready" : "unavailable"); }
    catch { setStatus("unavailable"); }
  };
  const clear = () => {
    try { window.localStorage.removeItem(STORAGE_KEY); setState(emptyState()); setStatus("ready"); }
    catch { setStatus("unavailable"); }
  };
  return { state, status, ready, update, clear, setStatus };
}

export function ReaderControls({ entry, children }: { entry: SavedEntry; children: ReactNode }) {
  const t = useTranslations("Hadith");
  const { state, status, ready, update, setStatus } = useDeviceState();
  const saved = state.entries.some(e => e.id === entry.id && e.locale === entry.locale);
  function toggle() {
    if (saved) update({ ...state, entries: state.entries.filter(e => e.id !== entry.id || e.locale !== entry.locale) });
    else { const result = saveEntry(state, entry); if (result.status === "limit") setStatus("limit"); else update(result.state); }
  }
  return <div className="hadith-reader" data-size={state.size}>
    <div className="hadith-toolbar">
      <fieldset disabled={!ready}><legend>{t("textSize")}</legend><div className="hadith-actions">{TEXT_SIZES.map(size => <button key={size} type="button" aria-pressed={state.size === size} onClick={() => update({ ...state, size })}>{t(size)}</button>)}</div></fieldset>
      <button disabled={!ready} type="button" aria-pressed={saved} onClick={toggle}>{t(saved ? "removeSave" : "save")}</button>
    </div>
    <p className="hadith-device-note">{t("deviceOnly")}</p>
    <p role="status">{status !== "ready" ? t(status) : ""}</p>
    {children}
  </div>;
}

export function SavedEntries() {
  const t = useTranslations("Hadith");
  const { state, status, ready, update, clear } = useDeviceState();
  return <>
    <p>{t("deviceOnly")}</p>
    <p role="status">{!ready ? t("loading") : status !== "ready" ? t(status) : ""}</p>
    {ready && !state.entries.length && <p>{t("emptySaved")}</p>}
    <ul className="hadith-entry-list">{state.entries.map(entry => <li key={`${entry.locale}:${entry.id}`}>
      <Link locale={entry.locale} href={hadithPath(entry.id)} lang={entry.locale} dir={entry.locale === "ar" ? "rtl" : "ltr"}>{entry.title}</Link>
      <button type="button" aria-label={`${t("removeSave")}: ${entry.title}`} onClick={() => update({ ...state, entries: state.entries.filter(e => e.id !== entry.id || e.locale !== entry.locale) })}>{t("removeSave")}</button>
    </li>)}</ul>
    <button type="button" disabled={!ready} onClick={clear}>{t("clear")}</button>
  </>;
}
