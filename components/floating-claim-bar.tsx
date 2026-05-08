"use client";

import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

const MULTI_SELECT_HINT_SEEN_KEY = "qc_multi_select_hint_seen_v1";
const MULTI_SELECT_HINT_AUTO_HIDE_MS = 2500;
const emptySubscribe = () => () => {};

function readStoredFlag(key: string) {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeStoredFlag(key: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // noop: storage may be unavailable in private modes.
  }
}

type FloatingClaimBarProps = {
  selectedCount: number;
  onClaim: () => void;
  onClear: () => void;
};

export default function FloatingClaimBar({
  selectedCount,
  onClaim,
  onClear,
}: FloatingClaimBarProps) {
  const t = useTranslations("FloatingClaimBar");
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [showMultiSelectHint, setShowMultiSelectHint] = useState(false);
  const hintTimerRef = useRef<number | null>(null);

  const visible = selectedCount > 0;
  const coachmarkVisible = selectedCount === 1 && showMultiSelectHint;

  const clearHintTimer = useCallback(() => {
    if (hintTimerRef.current === null) return;

    window.clearTimeout(hintTimerRef.current);
    hintTimerRef.current = null;
  }, []);

  useEffect(() => {
    if (!mounted) return;

    clearHintTimer();

    if (selectedCount !== 1) return;

    if (readStoredFlag(MULTI_SELECT_HINT_SEEN_KEY)) return;

    hintTimerRef.current = window.setTimeout(() => {
      setShowMultiSelectHint(true);

      hintTimerRef.current = window.setTimeout(() => {
        writeStoredFlag(MULTI_SELECT_HINT_SEEN_KEY);
        setShowMultiSelectHint(false);
        hintTimerRef.current = null;
      }, MULTI_SELECT_HINT_AUTO_HIDE_MS);
    }, 0);

    return clearHintTimer;
  }, [clearHintTimer, mounted, selectedCount]);

  useEffect(() => {
    return () => {
      clearHintTimer();
    };
  }, [clearHintTimer]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed bottom-20 left-1/2 z-[45] -translate-x-1/2 md:bottom-6">
      <div
        data-testid="multi-select-coachmark"
        data-state={coachmarkVisible ? "visible" : "hidden"}
        aria-hidden={!coachmarkVisible}
        className={`pointer-events-none absolute -top-10 left-1/2 w-max -translate-x-1/2 whitespace-nowrap rounded-full border border-quran-border/70 bg-white px-3 py-1 text-[11px] font-medium text-quran-muted shadow-sm transition-all duration-200 ${
          coachmarkVisible
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-1 opacity-0"
        }`}
      >
        {t("tipMultiSelect")}
      </div>

      <div
        data-testid="floating-claim-bar"
        data-state={visible ? "visible" : "hidden"}
        className={`flex items-center gap-3 rounded-2xl border border-quran-border bg-white px-4 py-3 shadow-lg transition-all duration-200 ${
          visible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={onClear}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-quran-muted transition-colors hover:bg-quran-border/30"
          aria-label={t("clearSelection")}
        >
          <X className="h-4 w-4" />
        </button>

        <div>
          <span className="text-sm font-semibold text-quran-deep">
            {t("juzSelected", { count: selectedCount })}
          </span>
        </div>

        <Button size="sm" className="ml-1 rounded-full" onClick={onClaim}>
          {t("claim")}
        </Button>
      </div>
    </div>,
    document.body
  );
}
