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
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { formatAuthError } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { createPasswordSchema } from "@/lib/auth/password-policy";
import { LockKeyhole } from "lucide-react";

export default function ResetPasswordPageClient() {
  const router = useRouter();
  const t = useTranslations("ResetPassword");
  const { user, isLoading, isAuthenticatedUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetPasswordSchema = z
    .object({
      password: createPasswordSchema(t("passwordRequirements")),
      confirmPassword: z.string().min(8, t("confirmPasswordRequired")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("passwordsDoNotMatch"),
      path: ["confirmPassword"],
    });

  type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticatedUser) {
      router.replace("/?error=auth");
    }
  }, [isAuthenticatedUser, isLoading, router]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: data.password });
    setIsSubmitting(false);

    if (error) {
      toast.error(t("failedToUpdatePassword"), {
        description: formatAuthError(error.message),
      });
      return;
    }

    toast.success(t("passwordUpdated"));
    router.replace("/");
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

  return (
    <main className="page-shell flex grow items-center justify-center">
      <section className="app-state-card max-w-lg text-left">
        <div className="space-y-6">
          <div>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[1rem] border border-quran-border/60 bg-quran-green/[0.075] text-quran-green">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-quran-gold">
              {t("eyebrow")}
            </p>
            <h1 className="mt-2 font-heading text-4xl text-quran-deep sm:text-5xl">
              {t("setNewPassword")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {t("setNewPasswordDesc")}
            </p>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="password"
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
                control={form.control}
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
                className="w-full rounded-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? t("updating") : t("updatePassword")}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/"
              className="text-primary hover:underline"
            >
              {t("backToHome")}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
