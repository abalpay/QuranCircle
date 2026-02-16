"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { deleteAccount } from "@/lib/actions/account";
import { formatAuthError } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";

// --- Schemas ---

const profileSchema = z.object({
  username: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .transform((v) => v.trim()),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type PasswordFormValues = z.infer<typeof passwordSchema>;

// --- Component ---

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const provider = user?.app_metadata?.provider ?? "email";
  const isEmailProvider = provider === "email";

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: "" },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  // Populate profile form when user loads
  useEffect(() => {
    if (user) {
      profileForm.reset({
        username:
          (user.user_metadata?.username as string) ||
          user.email?.split("@")[0] ||
          "",
      });
    }
  }, [user, profileForm]);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [user, isLoading, router]);

  const onSaveProfile = async (data: ProfileFormValues) => {
    setIsSavingProfile(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { username: data.username },
    });
    setIsSavingProfile(false);

    if (error) {
      toast.error("Failed to update profile", {
        description: formatAuthError(error.message),
      });
      return;
    }
    toast.success("Profile updated");
  };

  const onChangePassword = async (data: PasswordFormValues) => {
    setIsSavingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: data.newPassword,
    });
    setIsSavingPassword(false);

    if (error) {
      toast.error("Failed to update password", {
        description: formatAuthError(error.message),
      });
      return;
    }
    toast.success("Password updated");
    passwordForm.reset();
  };

  const onDeleteAccount = async () => {
    setIsDeleting(true);
    const { error } = await deleteAccount();
    setIsDeleting(false);

    if (error) {
      toast.error("Failed to delete account", { description: error });
      return;
    }
    // Clear client-side auth state (server action only clears server cookies)
    const supabase = createClient();
    await supabase.auth.signOut();

    toast.success("Account deleted");
    router.replace("/");
  };

  if (isLoading || !user) {
    return (
      <main className="page-shell grow flex items-center justify-center">
        <div className="quran-card p-10 text-center">
          <p className="text-quran-muted">Loading...</p>
        </div>
      </main>
    );
  }

  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="page-shell grow px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-quran-muted hover:text-quran-deep transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <h1 className="font-heading text-2xl font-semibold text-quran-deep sm:text-3xl">
          Account Settings
        </h1>

        {/* ── Profile Section ── */}
        <section className="quran-card-primary rounded-3xl border border-quran-border p-6 sm:p-8 shadow-lg space-y-6">
          <h2 className="font-heading text-lg font-semibold text-quran-deep">
            Profile
          </h2>

          <Form {...profileForm}>
            <form
              onSubmit={profileForm.handleSubmit(onSaveProfile)}
              className="space-y-4"
            >
              <FormField
                control={profileForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your name"
                        {...field}
                        className="rounded-xl border-quran-border bg-white/85"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <label className="text-sm font-medium leading-none">
                  Email
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    value={user.email ?? ""}
                    disabled
                    className="rounded-xl border-quran-border bg-white/50"
                  />
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {provider === "email" ? "Email" : "Google"}
                  </Badge>
                </div>
              </div>

              <p className="text-xs text-quran-muted">
                Member since {memberSince}
              </p>

              <Button
                type="submit"
                className="rounded-full"
                disabled={isSavingProfile}
              >
                {isSavingProfile ? "Saving..." : "Save profile"}
              </Button>
            </form>
          </Form>
        </section>

        {/* ── Security Section (email/password only) ── */}
        {isEmailProvider && (
          <section className="quran-card-primary rounded-3xl border border-quran-border p-6 sm:p-8 shadow-lg space-y-6">
            <h2 className="font-heading text-lg font-semibold text-quran-deep">
              Security
            </h2>

            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit(onChangePassword)}
                className="space-y-4"
              >
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter new password"
                          {...field}
                          autoComplete="new-password"
                          className="rounded-xl border-quran-border bg-white/85"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm new password"
                          {...field}
                          autoComplete="new-password"
                          className="rounded-xl border-quran-border bg-white/85"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="rounded-full"
                  disabled={isSavingPassword}
                >
                  {isSavingPassword ? "Updating..." : "Update password"}
                </Button>
              </form>
            </Form>
          </section>
        )}

        {/* ── Danger Zone ── */}
        <section className="rounded-3xl border border-red-200 bg-red-50/60 p-6 sm:p-8 shadow-lg space-y-4">
          <h2 className="font-heading text-lg font-semibold text-red-700">
            Danger Zone
          </h2>
          <p className="text-sm text-red-600/80">
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>

          <AlertDialog
            onOpenChange={(open) => {
              if (!open) setDeleteConfirmation("");
            }}
          >
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="rounded-full">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account, unclaim all your
                  juz selections, and remove your bookmarks. This action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Type <span className="font-bold">DELETE</span> to confirm
                </label>
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE"
                  className="rounded-xl border-quran-border"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleteConfirmation !== "DELETE" || isDeleting}
                  onClick={(e) => {
                    e.preventDefault();
                    onDeleteAccount();
                  }}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {isDeleting ? "Deleting..." : "Delete account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </div>
    </main>
  );
}
