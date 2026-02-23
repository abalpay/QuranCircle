import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AccountPageClient from "@/components/account-page-client";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Account Settings",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.is_anonymous) {
    redirect("/");
  }

  return <AccountPageClient />;
}
