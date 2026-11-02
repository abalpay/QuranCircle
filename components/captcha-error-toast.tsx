"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  CAPTCHA_FAILED_EVENT,
  CAPTCHA_INTERACTIVE_EVENT,
  setCaptchaInteractiveLabel,
} from "@/lib/captcha";

export default function CaptchaErrorToast() {
  const t = useTranslations("Captcha");
  const [interactive, setInteractive] = useState(false);

  useEffect(() => setCaptchaInteractiveLabel(t("interactive")), [t]);

  useEffect(() => {
    const onFailed = (event: Event) => {
      const onRetry = (event as CustomEvent<{ onRetry?: () => void }>).detail?.onRetry;
      // Fixed id: repeated failures (session bootstrap retries) update one toast, never stack.
      toast.error(t("failed"), {
        id: "captcha-failed",
        description: t("failedDescription"),
        action: onRetry ? { label: t("retry"), onClick: onRetry } : undefined,
      });
    };
    const onInteractive = (event: Event) =>
      setInteractive(Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active));
    window.addEventListener(CAPTCHA_FAILED_EVENT, onFailed);
    window.addEventListener(CAPTCHA_INTERACTIVE_EVENT, onInteractive);
    return () => {
      window.removeEventListener(CAPTCHA_FAILED_EVENT, onFailed);
      window.removeEventListener(CAPTCHA_INTERACTIVE_EVENT, onInteractive);
    };
  }, [t]);

  return (
    <p role="status" aria-live="polite" className="sr-only">
      {interactive ? t("interactive") : ""}
    </p>
  );
}
