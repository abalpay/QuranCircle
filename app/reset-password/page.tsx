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
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { formatAuthError } from "@/lib/utils";
import { toast } from "sonner";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/?error=auth");
    }
  }, [user, isLoading, router]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: data.password });
    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to update password", {
        description: formatAuthError(error.message),
      });
      return;
    }

    toast.success("Password updated successfully");
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

  return (
    <main className="page-shell grow flex items-center justify-center px-4">
      <section className="quran-card-primary w-full max-w-md rounded-3xl border border-quran-border p-6 sm:p-8 shadow-lg">
        <div className="space-y-6">
          <div className="text-center sm:text-left">
            <h1 className="font-heading text-2xl font-semibold text-quran-deep sm:text-3xl">
              Set new password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your new password below. Make sure it&apos;s at least 8
              characters.
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
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter new password"
                        {...field}
                        required
                        aria-required="true"
                        className="rounded-xl border-quran-border bg-white/85"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        {...field}
                        required
                        aria-required="true"
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
                {isSubmitting ? "Updating..." : "Update password"}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/"
              className="text-primary hover:underline"
            >
              Back to home
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
