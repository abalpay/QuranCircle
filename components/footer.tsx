import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

export default async function Footer() {
  const t = await getTranslations("Footer");
  return (
    <footer className="mt-auto border-t border-quran-border/60 bg-white/40 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-quran-border/50 bg-white/50">
              <Image src="/quran-icon.png" alt="QuranCircle" width={18} height={18} className="opacity-90" />
            </div>
            <span className="font-heading text-xl text-quran-deep">QuranCircle</span>
          </div>
          
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium text-quran-muted">
            <Link href="/" className="hover:text-quran-green transition-colors">{t("home")}</Link>
            <Link href="/browse" className="hover:text-quran-green transition-colors">{t("browse")}</Link>
            <Link href="/my-circles" className="hover:text-quran-green transition-colors">{t("myCircles")}</Link>
            <Link href="/khatm-coordination" className="hover:text-quran-green transition-colors">{t("khatmGuide")}</Link>
            <Link href="/group-khatm-whatsapp" className="hover:text-quran-green transition-colors">{t("whatsappGuide")}</Link>
            <Link href="/ramadan-group-khatm" className="hover:text-quran-green transition-colors">{t("ramadanGuide")}</Link>
            <Link href="/about" className="hover:text-quran-green transition-colors">{t("about")}</Link>
            <Link href="/contact" className="hover:text-quran-green transition-colors">{t("contact")}</Link>
            <Link href="/privacy" className="hover:text-quran-green transition-colors">{t("privacy")}</Link>
            <Link href="/terms" className="hover:text-quran-green transition-colors">{t("terms")}</Link>
          </nav>
          
          <p className="text-xs text-quran-muted/80">
            © {new Date().getFullYear()} QuranCircle. {t("allRightsReserved")}
          </p>
        </div>
      </div>
    </footer>
  );
}
