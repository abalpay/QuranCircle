"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
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
import { ArrowLeft, LockKeyhole, Trash2, UserRound } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { createPasswordSchema } from "@/lib/auth/password-policy";
import AppPageHero from "@/components/app-page-hero";

// --- Component ---

export default function AccountPageClient() {
  const router = useRouter();
  const t = useTranslations("AccountPage");
  const format = useFormatter();
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
        <div className="app-state-card max-w-md">
          <p className="text-quran-muted">{t("loading")}</p>
        </div>
      </main>
    );
  }

  const memberSince = format.dateTime(new Date(user.created_at), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="page-shell grow">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-sm text-quran-muted transition-colors hover:text-quran-deep"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToHome")}
        </Link>

        <AppPageHero
          eyebrow={t("eyebrow")}
          title={t("accountSettings")}
          description={t("description")}
          icon={UserRound}
          compact
        >
          <div className="app-hero-ledger">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-quran-gold">
              {t("memberSince")}
            </p>
            <p className="mt-3 font-heading text-3xl text-quran-deep">
              {memberSince}
            </p>
            <p className="mt-2 truncate text-sm text-quran-muted">
              {user.email}
            </p>
          </div>
        </AppPageHero>

        {/* ── Profile Section ── */}
        <section className="quran-card space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-quran-green/10 text-quran-green">
              <UserRound className="h-5 w-5" />
            </div>
            <h2 className="font-heading text-3xl text-quran-deep">
              {t("profile")}
            </h2>
          </div>

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
                <label htmlFor="account-email" className="text-sm font-medium leading-none">
                  {t("email")}
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    id="account-email"
                    value={user.email ?? ""}
                    disabled
                    className="rounded-xl border-quran-border bg-white/50"
                  />
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {provider === "email" ? t("emailProvider") : t("googleProvider")}
                  </Badge>
                </div>
              </div>
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
          <section className="quran-card space-y-6 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-quran-green/10 text-quran-green">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <h2 className="font-heading text-3xl text-quran-deep">
                {t("security")}
              </h2>
            </div>

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
        <section className="space-y-4 rounded-[1.5rem] border border-red-200/80 bg-red-50/55 p-6 shadow-[0_20px_52px_-44px_rgba(153,27,27,0.35)] sm:p-8">
          <h2 className="font-heading text-3xl text-red-700">
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
                <label htmlFor="delete-confirmation" className="text-sm font-medium">
                  {t("typeDelete")} <span className="font-bold">DELETE</span> {t("toConfirm")}
                </label>
                <Input
                  id="delete-confirmation"
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
