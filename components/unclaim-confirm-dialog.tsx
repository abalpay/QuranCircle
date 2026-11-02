"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslations } from "next-intl";

type Props = {
  /** Juz number being unclaimed, or null when closed. */
  juzNumber: number | null;
  /** Reader's name, when an organizer unclaims someone else's Juz. */
  readerName?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  /** Called as the dialog closes; preventDefault() keeps focus from returning to the trigger. */
  onCloseAutoFocus?: (event: Event) => void;
};

export default function UnclaimConfirmDialog({
  juzNumber,
  readerName,
  onConfirm,
  onCancel,
  onCloseAutoFocus,
}: Props) {
  const t = useTranslations("UnclaimDialog");
  // Keep the last values while the close animation plays (no "Juz 0").
  const [kept, setKept] = useState<{ number: number; name: string | null }>({
    number: 0,
    name: null,
  });
  const name = readerName?.trim() || null;
  if (juzNumber !== null && (kept.number !== juzNumber || kept.name !== name)) {
    setKept({ number: juzNumber, name });
  }

  return (
    <AlertDialog
      open={juzNumber !== null}
      onOpenChange={(open) => !open && onCancel()}
    >
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {kept.name
              ? // U+2068/U+2069 isolate the name so its script cannot reorder the sentence
                t("titleFrom", { number: kept.number, name: `⁨${kept.name}⁩` })
              : t("title", { number: kept.number })}
          </AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t("confirm")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
