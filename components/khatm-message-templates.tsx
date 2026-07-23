"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { trackProductEvent } from "@/lib/analytics";

type CopyTarget = "invitation" | "reminder" | "completion";

export default function KhatmMessageTemplates() {
  const t = useTranslations("KhatmGuide");
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);

  const copyText = async (target: CopyTarget, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(target);
      setCopyFailed(false);
      trackProductEvent("Guide Content Copied", { content: target });
    } catch {
      setCopyFailed(true);
    }
  };

  const templates: Array<{
    id: CopyTarget;
    title: string;
    timing: string;
    text: string;
  }> = [
    {
      id: "invitation",
      title: t("templates.invitationTitle"),
      timing: t("templates.invitationTiming"),
      text: t("templates.invitationText"),
    },
    {
      id: "reminder",
      title: t("templates.reminderTitle"),
      timing: t("templates.reminderTiming"),
      text: t("templates.reminderText"),
    },
    {
      id: "completion",
      title: t("templates.completionTitle"),
      timing: t("templates.completionTiming"),
      text: t("templates.completionText"),
    },
  ];

  return (
    <section
      id="templates"
      aria-labelledby="templates-title"
      className="scroll-mt-32"
    >
      <div className="mb-5 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
          {t("templates.eyebrow")}
        </p>
        <h2
          id="templates-title"
          className="font-heading mt-1 text-3xl text-quran-deep sm:text-4xl"
        >
          {t("templates.title")}
        </h2>
        <p className="mt-2 leading-relaxed text-quran-muted">
          {t("templates.description")}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {templates.map((template, index) => (
          <article
            key={template.id}
            className="quran-card relative flex h-full flex-col overflow-hidden p-5 sm:p-6"
          >
            <span
              aria-hidden
              className="font-heading absolute right-5 top-3 text-5xl text-quran-green/[0.06]"
            >
              0{index + 1}
            </span>
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-quran-gold">
                {template.timing}
              </p>
              <h3 className="font-heading mt-1 text-2xl text-quran-deep">
                {template.title}
              </h3>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-quran-muted">
                {template.text}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-6 w-full rounded-full border-quran-border bg-white/75"
              onClick={() => void copyText(template.id, template.text)}
            >
              {copied === template.id ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied === template.id ? t("copied") : t("copyTemplate")}
            </Button>
          </article>
        ))}
      </div>

      <p aria-live="polite" className="sr-only">
        {copyFailed ? t("copyFailed") : copied ? t("copySuccess") : ""}
      </p>
    </section>
  );
}
