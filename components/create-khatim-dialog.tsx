"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createEvent } from "@/lib/actions/events";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { useRouter } from "@/i18n/navigation";
import { Loader2, CirclePlus } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { trackProductEvent } from "@/lib/analytics";

type CreateKhatimDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  source?: string;
};

export default function CreateKhatimDialog({
  isOpen,
  onClose,
  source = "unknown",
}: CreateKhatimDialogProps) {
  const t = useTranslations("CreateKhatim");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticatedUser } = useAuth();
  const { openAuthModal } = useAuthModal();
  const router = useRouter();

  const resetForm = () => {
    setName("");
    setDescription("");
    setIsPublic(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("circleNameRequired"));
      return;
    }

    if (!isAuthenticatedUser) {
      toast.error(t("signInToCreate"));
      openAuthModal("login");
      return;
    }

    setIsSubmitting(true);
    const result = await createEvent({
      name: name.trim(),
      description: description.trim() || undefined,
      isPublic,
    });

    setIsSubmitting(false);
    if (result.error) {
      toast.error(t("failedToCreate"), { description: result.error });
      return;
    }

    trackProductEvent("Circle Created", {
      visibility: isPublic ? "public" : "link_only",
      source,
    });
    toast.success(t("circleCreated"));
    resetForm();
    onClose();
    router.push(`/s/${result.data!.shortCode}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-[1.75rem] border-quran-border bg-quran-card p-5 sm:max-w-md sm:p-6">
        <DialogHeader className="text-left">
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-quran-green/14 text-quran-green">
            <CirclePlus className="h-5 w-5" />
          </div>
          <DialogTitle className="font-heading text-3xl text-quran-deep">
            {t("createCircle")}
          </DialogTitle>
          <DialogDescription>
            {t("createCircleDesc")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="circleName">{t("circleName")}</Label>
              <Input
                id="circleName"
                placeholder={t("circleNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-xl border-quran-border bg-white/85"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="circleDescription">{t("description")} {t("descriptionOptional")}</Label>
              <Textarea
                id="circleDescription"
                placeholder={t("descriptionPlaceholder")}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl border-quran-border bg-white/85"
              />
            </div>

            <div className="flex items-center justify-between gap-5 rounded-2xl border border-quran-border bg-white/80 p-4">
              <div>
                <Label htmlFor="isPublic" className="font-medium">
                  {t("makePublic")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("makePublicDesc")}
                </p>
                {isPublic ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("publicVisible")}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("linkOnly")}
                  </p>
                )}
              </div>
              <Switch
                id="isPublic"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={onClose}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("creating")}
                </>
              ) : (
                t("create")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
