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
import { useRouter } from "next/navigation";
import { Loader2, CirclePlus, Globe2, Link2 } from "lucide-react";
import { toast } from "sonner";

type CreateKhatimDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CreateKhatimDialog({
  isOpen,
  onClose,
}: CreateKhatimDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
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
      toast.error("Circle name required");
      return;
    }

    if (!user) {
      toast.error("Sign in to create a Khatm circle");
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
      toast.error("Failed to create circle", { description: result.error });
      return;
    }

    toast.success("Circle created");
    resetForm();
    onClose();
    router.push(`/s/${result.data!.shortCode}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-3xl border-quran-border bg-quran-card p-5 sm:p-6">
        <DialogHeader className="text-left">
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-quran-green/14 text-quran-green">
            <CirclePlus className="h-5 w-5" />
          </div>
          <DialogTitle className="font-heading text-3xl text-quran-deep">
            Create New Khatm Circle
          </DialogTitle>
          <DialogDescription>
            Start a new Quran reading circle and invite others to join
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="circleName">Circle Name</Label>
              <Input
                id="circleName"
                placeholder="e.g., Ramadan Nights"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-xl border-quran-border bg-white/85"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="circleDescription">Description (Optional)</Label>
              <Textarea
                id="circleDescription"
                placeholder="Briefly describe the purpose of this circle"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl border-quran-border bg-white/85"
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-quran-border bg-white/80 p-4">
              <div>
                <Label htmlFor="isPublic" className="font-medium">
                  Public
                </Label>
                <p className="text-sm text-muted-foreground">
                  List on Browse page for anyone to discover
                </p>
              </div>
              <Switch
                id="isPublic"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>

            {!isPublic && (
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Link2 className="h-4 w-4" />
                Link only: Share with those you want to invite.
              </p>
            )}

            {isPublic && (
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Globe2 className="h-4 w-4" />
                Public circles are visible to everyone on Browse.
              </p>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Circle"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
