import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Manrope,
  Cormorant_Garamond,
  Noto_Naskh_Arabic,
  Amiri,
} from "next/font/google";
import "./globals.css";
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
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

const siteUrl = getSiteUrl();
const socialImageUrl = toAbsoluteUrl("/quran-icon.png");
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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "QuranCircle - Read & Complete the Quran Together",
    template: "%s - QuranCircle",
  },
  description:
    "Join collaborative Quran readings with your community. Create or join a Khatm circle, claim your Juz, and complete the Quran together. Free and open to all.",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "QuranCircle",
    title: "QuranCircle - Read & Complete the Quran Together",
    description:
      "Join collaborative Quran readings with your community. Create or join a Khatm circle, claim your Juz, and complete the Quran together.",
    images: [
      {
        url: socialImageUrl,
        width: 512,
        height: 512,
        alt: "QuranCircle",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "QuranCircle - Read & Complete the Quran Together",
    description:
      "Join collaborative Quran readings with your community. Create or join a Khatm circle, claim your Juz, and complete the Quran together.",
    images: [socialImageUrl],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#0f5f52",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} data-scroll-behavior="smooth">
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
