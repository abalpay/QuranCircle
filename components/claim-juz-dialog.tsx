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
  const isMultiple = juzNumbers.length > 1;
  const { user } = useAuth();

  const getSavedName = () => {
    if (typeof window === "undefined") return "";
    if (user) {
      return (
        (user.user_metadata?.username as string) ||
        user.email?.split("@")[0] ||
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
      if (!user && typeof window !== "undefined") {
        localStorage.setItem(CLAIMER_NAME_KEY, name);
      }
      onSubmit(name, juzNumbers);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-3xl border-quran-border bg-quran-card p-5 sm:p-6">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-quran-green/14 p-2">
            <BookOpen className="h-6 w-6 text-quran-green" />
          </div>
          <DialogTitle className="font-heading text-3xl text-quran-deep">
            {isMultiple ? `Claim ${juzNumbers.length} Juz` : `Claim Juz ${juzNumbers[0]}`}
          </DialogTitle>
          <DialogDescription>
            {isMultiple
              ? `Juz ${juzNumbers.join(", ")} — enter your name to claim`
              : "Enter your name to claim this portion of the Quran"}
          </DialogDescription>
        </DialogHeader>

        <form
          key={`${juzNumbers.join("-")}-${isOpen ? "open" : "closed"}-${user?.id ?? "guest"}`}
          onSubmit={handleSubmit}
          className="mt-2"
        >
          <div className="mb-6">
            <Label htmlFor="claimerName">Your Name</Label>
            <Input
              id="claimerName"
              name="claimerName"
              defaultValue={getSavedName()}
              placeholder="Enter your name"
              required
              className="mt-1 rounded-xl border-quran-border bg-white/85"
            />
            {user && (
              <p className="text-xs text-muted-foreground mt-1">
                You can use a different name if you prefer.
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
              Cancel
            </Button>
            <Button type="submit" className="rounded-full">
              {isMultiple ? `Claim ${juzNumbers.length} Juz` : "Claim Juz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
