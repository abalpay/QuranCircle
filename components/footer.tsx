import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

export default async function Footer() {
  const t = await getTranslations("Footer");
  return (
    <footer className="app-footer mt-auto hidden lg:block">
      <div className="mx-auto max-w-[88rem] px-8 py-9 lg:px-10">
        <div className="flex items-center justify-between gap-8">
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--quran-gold)/0.42)] bg-white/[0.05]">
              <Image src="/quran-icon.png" alt="" width={22} height={22} />
            </div>
            <div>
              <span className="block font-heading text-2xl leading-none text-white">
                QuranCircle
              </span>
              <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--quran-gold)/0.78)]">
                Read together
              </span>
            </div>
          </div>
          <p className="shrink-0 text-xs text-[hsl(158_12%_66%)]">
            © {new Date().getFullYear()} QuranCircle. {t("allRightsReserved")}
          </p>
        </div>

        <nav
          aria-label="Footer"
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
    </footer>
  );
}
