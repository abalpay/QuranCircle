"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { CircleCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { completeKhatm } from "@/lib/actions/juz";
import { getAutoCompleteDate } from "@/lib/completion";
import { trackProductEvent } from "@/lib/analytics";
import type { KhatmSnapshot } from "@/lib/types/events";

type Props = {
  khatm: KhatmSnapshot;
  shortCode: string;
  /** Called after the RPC succeeds so the page can refresh and open the completion moment. */
  onCompleted: () => Promise<void> | void;
};

/** Organizer only (the parent decides): all 30 Juz are claimed and the khatm is still open. */
export default function CompleteKhatmBanner({ khatm, shortCode, onCompleted }: Props) {
  const t = useTranslations("Completion");
  const format = useFormatter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const autoDate = getAutoCompleteDate(khatm);

  const confirm = async () => {
    if (pending) return;
    setPending(true);
    try {
      const result = await completeKhatm(shortCode, khatm.id);
      if (result.error) {
        toast.error(t(`error_${result.error}`));
        return;
      }
      if (result.newlyCompleted) trackProductEvent("Khatm Completed", {});
      setConfirming(false);
      await onCompleted();
    } catch {
      toast.error(t("error_failed"));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <section
        aria-labelledby={`complete-banner-${khatm.id}`}
        className="flex flex-col gap-4 border-b border-quran-border/60 bg-emerald-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8"
      >
        <div>
          <h3
            id={`complete-banner-${khatm.id}`}
            className="flex items-center gap-2 text-base font-semibold text-quran-deep"
          >
            <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-quran-green" />
            {t("bannerTitle")}
          </h3>
          <p className="mt-1 text-sm text-quran-deep/80">
            {autoDate
              ? t("autoOn", {
                  date: format.dateTime(autoDate, { dateStyle: "long", timeZone: "UTC" }),
                })
              : t("autoAfter")}
          </p>
        </div>
        <Button
          type="button"
          className="w-full shrink-0 rounded-full bg-quran-green px-5 text-white hover:bg-quran-green/90 sm:w-auto"
          onClick={() => setConfirming(true)}
        >
          {t("bannerAction")}
        </Button>
      </section>

      <AlertDialog open={confirming} onOpenChange={(open) => !pending && setConfirming(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmTitle", { number: khatm.khatm_number })}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{t("cancel")}</AlertDialogCancel>
            {/* A plain Button, not AlertDialogAction: the dialog must stay open while the request runs. */}
            <Button type="button" onClick={() => void confirm()} disabled={pending} aria-busy={pending}>
              {pending ? t("completing") : t("confirmAction")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
