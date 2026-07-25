import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import BrandMark from "@/components/brand-mark";

export default async function Footer() {
  const t = await getTranslations("Footer");
  return (
    <footer className="app-footer mt-auto">
      <div className="mx-auto hidden max-w-[88rem] px-8 py-9 lg:block lg:px-10">
        <div className="flex items-center justify-between gap-8">
          <div className="flex shrink-0 items-center gap-3">
            <BrandMark variant="on-dark" className="h-10 w-10 shrink-0" />
            <div>
              <span className="block font-heading text-2xl leading-none text-white">
                QuranCircle
              </span>
              <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--quran-gold)/0.78)]">
                {t("readTogether")}
              </span>
            </div>
          </div>
          <p className="shrink-0 text-xs text-[hsl(158_12%_66%)]">
            © {new Date().getFullYear()} QuranCircle. {t("allRightsReserved")}
          </p>
        </div>

        <nav
          aria-label={t("ariaLabel")}
          className="mt-7 flex flex-wrap items-center gap-x-1 border-t border-white/10 pt-5 text-sm font-medium text-[hsl(158_16%_76%)]"
        >
          {[
            ["/", t("home")],
            ["/browse", t("browse")],
            ["/my-circles", t("myCircles")],
            ["/khatm-coordination", t("khatmGuide")],
            ["/group-khatm-whatsapp", t("whatsappGuide")],
            ["/ramadan-group-khatm", t("ramadanGuide")],
            ["/about", t("about")],
            ["/contact", t("contact")],
            ["/privacy", t("privacy")],
            ["/terms", t("terms")],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="inline-flex min-h-11 items-center rounded-full px-3 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mx-auto px-5 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-7 lg:hidden">
        <div className="flex items-center gap-3">
          <BrandMark variant="on-dark" className="h-9 w-9 shrink-0" />
          <div>
            <span className="block font-heading text-xl leading-none text-white">
              QuranCircle
            </span>
            <span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--quran-gold)/0.78)]">
              {t("readTogether")}
            </span>
          </div>
        </div>
        <nav
          aria-label={t("ariaLabel")}
          className="mt-5 flex flex-wrap items-center gap-x-1 border-t border-white/10 pt-4 text-sm font-medium text-[hsl(158_16%_76%)]"
        >
          <Link
            href="/privacy"
            className="inline-flex min-h-11 items-center rounded-full px-3 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            {t("privacy")}
          </Link>
          <Link
            href="/terms"
            className="inline-flex min-h-11 items-center rounded-full px-3 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            {t("terms")}
          </Link>
        </nav>
        <p className="mt-3 text-xs text-[hsl(158_12%_66%)]">
          © {new Date().getFullYear()} QuranCircle. {t("allRightsReserved")}
        </p>
      </div>
    </footer>
  );
}
