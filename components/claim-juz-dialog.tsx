"use client";

import type { FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";

const CLAIMER_NAME_KEY = "quranCircleClaimerName";

type ClaimJuzDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  juzNumbers: number[];
  onSubmit: (claimerName: string, juzNumbers: number[]) => void;
};

export default function ClaimJuzDialog({
  isOpen,
  onClose,
  juzNumbers,
  onSubmit,
}: ClaimJuzDialogProps) {
  const t = useTranslations("ClaimDialog");
  const isMultiple = juzNumbers.length > 1;
  const { user, isAuthenticatedUser } = useAuth();

  const getSavedName = () => {
    if (typeof window === "undefined") return "";
    if (isAuthenticatedUser) {
      return (
        (user?.user_metadata?.username as string) ||
        user?.email?.split("@")[0] ||
        ""
      );
    }
    return localStorage.getItem(CLAIMER_NAME_KEY) || "";
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get("claimerName") as string | null)?.trim();

    if (name) {
      if (!isAuthenticatedUser && typeof window !== "undefined") {
        localStorage.setItem(CLAIMER_NAME_KEY, name);
      }
      onSubmit(name, juzNumbers);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-[1.75rem] border-quran-border bg-quran-card p-5 sm:max-w-md sm:p-6">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-quran-green/14 p-2">
            <BookOpen className="h-6 w-6 text-quran-green" />
          </div>
          <DialogTitle className="font-heading text-3xl text-quran-deep">
            {isMultiple ? `${t("claim")} ${juzNumbers.length} ${t("juz")}` : `${t("claim")} ${t("juz")} ${juzNumbers[0]}`}
          </DialogTitle>
          <DialogDescription>
            {isMultiple
              ? `${t("juz")} ${juzNumbers.join(", ")} — ${t("enterName")}`
              : t("enterNameDesc")}
          </DialogDescription>
        </DialogHeader>

        <form
          key={`${juzNumbers.join("-")}-${isOpen ? "open" : "closed"}-${isAuthenticatedUser ? user?.id : "guest"}`}
          onSubmit={handleSubmit}
          className="mt-2"
        >
          <div className="mb-6">
            <Label htmlFor="claimerName">{t("yourName")}</Label>
            <Input
              id="claimerName"
              name="claimerName"
              defaultValue={getSavedName()}
              placeholder={t("enterYourName")}
              required
              className="mt-1 rounded-xl border-quran-border bg-white/85"
            />
            {isAuthenticatedUser && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("useDifferentName")}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={onClose}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" className="rounded-full">
              {isMultiple ? `${t("claimButton")} ${juzNumbers.length} ${t("juz")}` : `${t("claimButton")} ${t("juz")}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
