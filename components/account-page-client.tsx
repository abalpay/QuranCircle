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
  FormDescription,
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
import { useTranslations } from "next-intl";
import { createPasswordSchema } from "@/lib/auth/password-policy";

// --- Component ---

export default function AccountPageClient() {
  const router = useRouter();
  const t = useTranslations("AccountPage");
  const { user, isLoading, isAuthenticatedUser } = useAuth();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const provider = user?.app_metadata?.provider ?? "email";
  const isEmailProvider = provider === "email";

  const profileSchema = z.object({
    username: z
      .string()
      .min(2, t("nameMinLength"))
      .max(50, t("nameMaxLength"))
      .transform((v) => v.trim()),
  });
  type ProfileFormValues = z.infer<typeof profileSchema>;

  const passwordSchema = z
    .object({
      currentPassword: z.string().min(1, t("currentPasswordRequired")),
      newPassword: createPasswordSchema(t("passwordRequirements")),
      confirmPassword: z.string().min(8, t("confirmPasswordRequired")),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("passwordsMustMatch"),
      path: ["confirmPassword"],
    });
  type PasswordFormValues = z.infer<typeof passwordSchema>;

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: "" },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
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
    if (!isLoading && !isAuthenticatedUser) {
      router.replace("/");
    }
  }, [isAuthenticatedUser, isLoading, router]);

  const onSaveProfile = async (data: ProfileFormValues) => {
    setIsSavingProfile(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { username: data.username },
      });

      if (error) {
        toast.error(t("failedToUpdateProfile"), {
          description: formatAuthError(error.message),
        });
        return;
      }
      toast.success(t("profileUpdated"));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected profile update error";
      toast.error(t("failedToUpdateProfile"), {
        description: formatAuthError(message),
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const onChangePassword = async (data: PasswordFormValues) => {
    setIsSavingPassword(true);
    try {
      const supabase = createClient();
      const email = user?.email;
      if (!email) {
        toast.error(t("failedToVerifyCurrentPassword"));
        return;
      }

      const { error: verificationError } =
        await supabase.auth.signInWithPassword({
          email,
          password: data.currentPassword,
        });

      if (verificationError) {
        toast.error(t("failedToVerifyCurrentPassword"), {
          description: formatAuthError(verificationError.message),
        });
        return;
      }

      const { error } = await supabase.auth.updateUser({
        current_password: data.currentPassword,
        password: data.newPassword,
      });

      if (error) {
        toast.error(t("failedToUpdatePassword"), {
          description: formatAuthError(error.message),
        });
        return;
      }
      toast.success(t("passwordUpdated"));
      passwordForm.reset();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected password update error";
      toast.error(t("failedToUpdatePassword"), {
        description: formatAuthError(message),
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const onDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { error } = await deleteAccount();

      if (error) {
        toast.error(t("failedToDeleteAccount"), { description: error });
        return;
      }
      // Clear client-side auth state (server action only clears server cookies)
      const supabase = createClient();
      await supabase.auth.signOut();

      toast.success(t("accountDeleted"));
      router.replace("/");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected account deletion error";
      toast.error(t("failedToDeleteAccount"), {
        description: formatAuthError(message),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading || !isAuthenticatedUser || !user) {
    return (
      <main className="page-shell grow flex items-center justify-center">
        <div className="quran-card p-10 text-center">
          <p className="text-quran-muted">{t("loading")}</p>
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
          {t("backToHome")}
        </Link>

        <h1 className="font-heading text-2xl font-semibold text-quran-deep sm:text-3xl">
          {t("accountSettings")}
        </h1>

        {/* ── Profile Section ── */}
        <section className="quran-card-primary rounded-3xl border border-quran-border p-6 sm:p-8 shadow-lg space-y-6">
          <h2 className="font-heading text-lg font-semibold text-quran-deep">
            {t("profile")}
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
                    <FormLabel>{t("displayName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("yourName")}
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
                  {t("email")}
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    value={user.email ?? ""}
                    disabled
                    className="rounded-xl border-quran-border bg-white/50"
                  />
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {provider === "email" ? t("emailProvider") : t("googleProvider")}
                  </Badge>
                </div>
              </div>

              <p className="text-xs text-quran-muted">
                {t("memberSince")} {memberSince}
              </p>

              <Button
                type="submit"
                className="rounded-full"
                disabled={isSavingProfile}
              >
                {isSavingProfile ? t("saving") : t("saveProfile")}
              </Button>
            </form>
          </Form>
        </section>

        {/* ── Security Section (email/password only) ── */}
        {isEmailProvider && (
          <section className="quran-card-primary rounded-3xl border border-quran-border p-6 sm:p-8 shadow-lg space-y-6">
            <h2 className="font-heading text-lg font-semibold text-quran-deep">
              {t("security")}
            </h2>

            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit(onChangePassword)}
                className="space-y-4"
              >
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("currentPassword")}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t("enterCurrentPassword")}
                          {...field}
                          required
                          aria-required="true"
                          autoComplete="current-password"
                          className="rounded-xl border-quran-border bg-white/85"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("newPassword")}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t("enterNewPassword")}
                          {...field}
                          required
                          aria-required="true"
                          autoComplete="new-password"
                          className="rounded-xl border-quran-border bg-white/85"
                        />
                      </FormControl>
                      <FormDescription>
                        {t("passwordRequirements")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("confirmPassword")}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t("confirmNewPassword")}
                          {...field}
                          required
                          aria-required="true"
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
                  {isSavingPassword ? t("updating") : t("updatePassword")}
                </Button>
              </form>
            </Form>
          </section>
        )}

        {/* ── Danger Zone ── */}
        <section className="rounded-3xl border border-red-200 bg-red-50/60 p-6 sm:p-8 shadow-lg space-y-4">
          <h2 className="font-heading text-lg font-semibold text-red-700">
            {t("dangerZone")}
          </h2>
          <p className="text-sm text-red-600/80">
            {t("dangerZoneDesc")}
          </p>

          <AlertDialog
            onOpenChange={(open) => {
              if (!open) setDeleteConfirmation("");
            }}
          >
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="rounded-full">
                <Trash2 className="mr-2 h-4 w-4" />
                {t("deleteAccount")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deleteYourAccount")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("deleteAccountDesc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("typeDelete")} <span className="font-bold">DELETE</span> {t("toConfirm")}
                </label>
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder={t("deletePlaceholder")}
                  className="rounded-xl border-quran-border"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleteConfirmation !== "DELETE" || isDeleting}
                  onClick={(e) => {
                    e.preventDefault();
                    onDeleteAccount();
                  }}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {isDeleting ? t("deleting") : t("deleteAccount")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </div>
    </main>
  );
}
