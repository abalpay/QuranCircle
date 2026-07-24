"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function AuthErrorToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Auth");

  useEffect(() => {
    if (searchParams.get("error") === "auth") {
      toast.error(t("authFailed"), {
        description: t("authFailedDesc"),
      });

      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete("error");
      const query = nextSearchParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }
  }, [pathname, searchParams, router, t]);

  return null;
}
