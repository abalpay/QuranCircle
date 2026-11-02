"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CAPTCHA_FAILED_EVENT } from "@/lib/captcha";

export default function CaptchaErrorToast() {
  const t = useTranslations("Captcha");

  useEffect(() => {
    const onFailed = (event: Event) => {
      const onRetry = (event as CustomEvent<{ onRetry?: () => void }>).detail?.onRetry;
      toast.error(t("failed"), {
        description: t("failedDescription"),
        action: onRetry ? { label: t("retry"), onClick: onRetry } : undefined,
      });
    };
    window.addEventListener(CAPTCHA_FAILED_EVENT, onFailed);
    return () => window.removeEventListener(CAPTCHA_FAILED_EVENT, onFailed);
  }, [t]);

  return null;
}
