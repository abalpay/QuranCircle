import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import BrandMark from "@/components/brand-mark";
import FooterLanguageNavigation from "@/components/footer-language-navigation";
import FooterSupportLink from "@/components/footer-support-link";
import { getSupportUrl } from "@/lib/support";

const linkClass =
  "inline-flex min-h-11 items-center rounded-full px-3 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export default async function Footer() {
  const t = await getTranslations("Footer");
  const supportUrl = getSupportUrl();
  // The bottom nav already has the first three below lg.
  const links: [string, string, boolean][] = [
    ["/", t("home"), true],
    ["/browse", t("browse"), true],
    ["/my-circles", t("myCircles"), true],
    ["/khatm-coordination", t("khatmGuide"), false],
    ["/group-khatm-whatsapp", t("whatsappGuide"), false],
    ["/ramadan-group-khatm", t("ramadanGuide"), false],
    ["/about", t("about"), false],
    ["/contact", t("contact"), false],
    ["/privacy", t("privacy"), false],
    ["/terms", t("terms"), false],
  ];

  return (
    <footer className="app-footer mt-auto">
      <div className="relative mx-auto max-w-[88rem] px-5 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-8 lg:px-10 lg:pb-9 lg:pt-9">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
          <div className="flex shrink-0 items-center gap-3">
            <BrandMark variant="on-dark" className="h-10 w-10 shrink-0" />
            <div>
              <span className="block font-heading text-2xl leading-none text-white">
                QuranCircle
              </span>
              <span className="mt-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--quran-gold-on-dark))] rtl:text-sm rtl:tracking-normal">
                {t("readTogether")}
              </span>
            </div>
          </div>
          <div className="max-w-md lg:text-end">
            <p className="text-base text-[hsl(158_16%_84%)]">{t("promise")}</p>
            {supportUrl && (
              <FooterSupportLink
                href={supportUrl}
                label={t("support")}
                newTabLabel={t("opensInNewTab")}
                className={`${linkClass} -ms-3 mt-1 text-sm font-medium text-[hsl(158_16%_76%)] underline underline-offset-4 lg:-me-3 lg:ms-0 rtl:text-[0.9375rem]`}
              />
            )}
          </div>
        </div>

        <nav
          aria-label={t("ariaLabel")}
          className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/10 pt-4 text-sm font-medium text-[hsl(158_16%_76%)] rtl:text-[0.9375rem] sm:grid-cols-3 lg:mt-7 lg:grid-cols-5 lg:pt-5"
        >
          {links.map(([href, label, desktopOnly]) => (
            <Link
              key={href}
              href={href}
              className={desktopOnly ? `${linkClass} max-lg:hidden` : linkClass}
            >
              {label}
            </Link>
          ))}
        </nav>

        <FooterLanguageNavigation
          ariaLabel={t("languageNavigation")}
          className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium text-[hsl(158_16%_76%)]"
        />

        <p className="mt-5 text-xs text-[hsl(158_12%_70%)]">
          © {new Date().getFullYear()} <bdi>QuranCircle.</bdi> {t("allRightsReserved")}
        </p>
      </div>
    </footer>
  );
}
