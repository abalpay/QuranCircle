"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AuthErrorToast() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("error") === "auth") {
      toast.error("Authentication failed", {
        description:
          "Email confirmation failed or the link has expired. Please try signing in or request a new confirmation email.",
      });

      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, router]);

  return null;
}
