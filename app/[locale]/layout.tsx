import type { Metadata } from "next";
import { Suspense } from "react";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import {
  Manrope,
  Cormorant_Garamond,
  Noto_Naskh_Arabic,
  Amiri,
} from "next/font/google";
import "../globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/use-auth";
import { AuthModalProvider } from "@/hooks/use-auth-modal";
import Header from "@/components/header";
import MobileNavigation from "@/components/mobile-navigation";
import Footer from "@/components/footer";
import NavigationProgress from "@/components/navigation-progress";
import AuthErrorToast from "@/components/auth-error-toast";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getSiteUrl, toAbsoluteUrl } from "@/lib/site-url";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { routing } from "@/i18n/routing";
import {
  getLocaleDirection,
  getLocalizedPath,
  getOpenGraphLocale,
} from "@/i18n/locale-config";
import { BRAND_SOCIAL_IMAGE_PATH } from "@/lib/brand";

const siteUrl = getSiteUrl();
const socialImageUrl = toAbsoluteUrl(BRAND_SOCIAL_IMAGE_PATH);
const isVercelDeployment = process.env.VERCEL === "1";

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

type LocaleLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

// Nonce-based CSP requires each HTML response to be rendered with the
// request-specific nonce supplied by proxy.ts.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Pick<LocaleLayoutProps, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Metadata" });
  const localeUrl = toAbsoluteUrl(getLocalizedPath(locale));

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: t("siteTitle"),
      template: `%s - QuranCircle`,
    },
    description: t("siteDescription"),
    manifest: "/manifest.json",
    openGraph: {
      type: "website",
      locale: getOpenGraphLocale(locale),
      url: localeUrl,
      siteName: "QuranCircle",
      title: t("siteTitle"),
      description: t("openGraphDescription"),
      images: [
        {
          url: socialImageUrl,
          width: 1200,
          height: 630,
          alt: "QuranCircle",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("siteTitle"),
      description: t("openGraphDescription"),
      images: [socialImageUrl],
    },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#0d332a",
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={getLocaleDirection(locale)}
      data-scroll-behavior="smooth"
    >
      <body
        className={`${manrope.variable} ${cormorantGaramond.variable} ${notoNaskhArabic.variable} ${amiri.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <NavigationProgress />
          <AuthProvider>
            <AuthModalProvider>
              <div className="relative min-h-screen overflow-x-clip bg-quran-bg">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
                >
                  <div className="absolute inset-x-0 top-0 h-104 bg-[radial-gradient(circle_at_top,hsl(var(--quran-light-green)/0.22),transparent_70%)]" />
                  <div className="absolute -left-28 top-20 h-64 w-64 rounded-full bg-[hsl(var(--quran-gold)/0.08)] blur-3xl" />
                  <div className="absolute -right-28 bottom-12 h-72 w-72 rounded-full bg-[hsl(var(--quran-green)/0.14)] blur-3xl" />
                </div>
                <Header />
                <div className="relative flex min-h-screen flex-col">
                  {children}
                  <Footer />
                </div>
                <MobileNavigation />
              </div>
              <Suspense fallback={null}>
                <AuthErrorToast />
              </Suspense>
              <Toaster />
              {isVercelDeployment ? (
                <>
                  <Analytics />
                  <SpeedInsights />
                </>
              ) : null}
            </AuthModalProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
