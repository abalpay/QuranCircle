"use client";

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
  onConfirm: () => void;
  onCancel: () => void;
};

export default function UnclaimConfirmDialog({
  juzNumber,
  onConfirm,
  onCancel,
}: Props) {
  const t = useTranslations("UnclaimDialog");

  return (
    <AlertDialog
      open={juzNumber !== null}
      onOpenChange={(open) => !open && onCancel()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { number: juzNumber ?? 0 })}</AlertDialogTitle>
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
