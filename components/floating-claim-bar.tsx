"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const visible = selectedCount > 0;

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed bottom-20 left-1/2 z-[45] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-quran-border bg-white px-4 py-3 shadow-lg transition-all duration-200 md:bottom-6 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <button
        type="button"
        onClick={onClear}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-quran-muted transition-colors hover:bg-quran-border/30"
        aria-label="Clear selection"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col">
        <span className="text-sm font-semibold text-quran-deep">
          {selectedCount} Juz selected
        </span>
        {selectedCount === 1 && (
          <span className="text-[11px] text-quran-muted">
            Tap more to select multiple
          </span>
        )}
      </div>

      <Button size="sm" className="ml-1 rounded-full" onClick={onClaim}>
        Claim
      </Button>
    </div>,
    document.body
  );
}
