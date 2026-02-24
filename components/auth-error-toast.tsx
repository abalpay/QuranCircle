"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function AuthErrorToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("Auth");

  useEffect(() => {
    if (searchParams.get("error") === "auth") {
      toast.error(t("authFailed"), {
        description: t("authFailedDesc"),
      });

      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, router, t]);

  return null;
}
