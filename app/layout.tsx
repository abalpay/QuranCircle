import type { Metadata } from "next";
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
  title: "QuranCircle - Collaborative Quran Reading Platform",
  description:
    "A collaborative Quran reading platform for community-driven Khatm events",
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#0f5f52",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${manrope.variable} ${cormorantGaramond.variable} ${notoNaskhArabic.variable} ${amiri.variable} font-sans antialiased`}
      >
        <NavigationProgress />
        <AuthProvider>
          <AuthModalProvider>
            <div className="relative min-h-screen overflow-x-clip bg-quran-bg">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-104 bg-[radial-gradient(circle_at_top,hsl(var(--quran-light-green)/0.22),transparent_70%)]" />
                <div className="absolute -left-28 top-20 h-64 w-64 rounded-full bg-[hsl(var(--quran-gold)/0.12)] blur-3xl" />
                <div className="absolute -right-28 bottom-12 h-72 w-72 rounded-full bg-[hsl(var(--quran-green)/0.14)] blur-3xl" />
              </div>
              <Header />
              <div className="relative flex min-h-screen flex-col">
                {children}
                <Footer />
              </div>
              <MobileNavigation />
            </div>
            <Toaster />
          </AuthModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
