"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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

export function ReaderControls({ entry, hasArabic = false, children }: { entry: SavedEntry; hasArabic?: boolean; children: ReactNode }) {
  const t = useTranslations("Hadith");
  const { state, status, ready, update, setStatus } = useDeviceState();
  const saved = state.entries.some(e => e.id === entry.id && e.locale === entry.locale);
  const [bilingual, setBilingual] = useState(true);
  function toggle() {
    if (saved) update({ ...state, entries: state.entries.filter(e => e.id !== entry.id || e.locale !== entry.locale) });
    else { const result = saveEntry(state, entry); if (result.status === "limit") setStatus("limit"); else update(result.state); }
  }
  return <div className="hadith-reader" data-size={state.size} data-mode={bilingual ? "bilingual" : "translation"}>
    <div className="hadith-toolbar">
      <fieldset disabled={!ready}><legend className="sr-only">{t("textSize")}</legend><div className="hadith-size-controls">{TEXT_SIZES.map((size, index) => <button key={size} type="button" aria-label={t(size)} title={t(size)} aria-pressed={state.size === size} onClick={() => update({ ...state, size })}><span aria-hidden="true" style={{ fontSize: `${14 + index * 3}px` }}>{entry.locale === "ar" ? "أ" : "Aa"}</span></button>)}</div></fieldset>
      {hasArabic && <fieldset className="hadith-view-controls"><legend className="sr-only">{t("readingView")}</legend><button type="button" aria-pressed={bilingual} onClick={() => setBilingual(true)}>{t("bilingual")}</button><button type="button" aria-pressed={!bilingual} onClick={() => setBilingual(false)}>{t("translationOnly")}</button></fieldset>}
      <button className="hadith-save-button" disabled={!ready} type="button" aria-pressed={saved} onClick={toggle}><svg width="16" height="18" viewBox="0 0 16 18" fill={saved ? "currentColor" : "none"} aria-hidden="true"><path d="M3 2h10v14l-5-3-5 3V2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>{t(saved ? "removeSave" : "save")}</button>
    </div>
    <p className="hadith-storage-status" role="status">{status !== "ready" ? t(status) : ""}</p>
    {children}
    <p className="hadith-device-note">{t("deviceOnly")}</p>
  </div>;
}

export function SavedEntries() {
  const t = useTranslations("Hadith");
  const { state, status, ready, update, clear } = useDeviceState();
  const [confirmClear, setConfirmClear] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const clearRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  useEffect(() => {
    if (confirmClear) cancelRef.current?.focus();
    else if (wasConfirming.current) clearRef.current?.focus();
    wasConfirming.current = confirmClear;
  }, [confirmClear]);
  return <>
    <p>{t("deviceOnly")}</p>
    <p role="status">{!ready ? t("loading") : status !== "ready" ? t(status) : ""}</p>
    {ready && !state.entries.length && <div className="hadith-empty"><span className="hadith-empty-mark" aria-hidden="true">⌑</span><h2>{t("emptySaved")}</h2><p>{t("savedHelp")}</p><Link className="hadith-primary-link" href="/hadith">{t("topics")} <span aria-hidden="true">→</span></Link></div>}
    <ul className="hadith-entry-list">{state.entries.map(entry => <li key={`${entry.locale}:${entry.id}`}>
      <Link locale={entry.locale} href={hadithPath(entry.id)} lang={entry.locale} dir={entry.locale === "ar" ? "rtl" : "ltr"}>{entry.title}</Link>
      <button type="button" aria-label={`${t("removeSave")}: ${entry.title}`} onClick={() => update({ ...state, entries: state.entries.filter(e => e.id !== entry.id || e.locale !== entry.locale) })}>{t("removeSave")}</button>
    </li>)}</ul>
    {confirmClear ? <div className="hadith-clear-confirm" role="group" aria-label={t("clear")}><p>{t("confirmClear")}</p><div className="hadith-actions"><button type="button" onClick={() => { clear(); setConfirmClear(false); }}>{t("confirm")}</button><button ref={cancelRef} type="button" onClick={() => setConfirmClear(false)}>{t("cancel")}</button></div></div> : <button ref={clearRef} className="hadith-clear-button" type="button" disabled={!ready} onClick={() => setConfirmClear(true)}>{t("clear")}</button>}
  </>;
}
