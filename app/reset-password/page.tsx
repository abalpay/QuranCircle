import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ResetPasswordPageClient from "@/components/reset-password-page-client";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Reset Password",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.is_anonymous) {
    redirect("/?error=auth");
  }

  return <ResetPasswordPageClient />;
}
