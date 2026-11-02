import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import BrandMark from "@/components/brand-mark";
import { hasLocale } from "next-intl";
import { routing, type AppLocale } from "@/i18n/routing";
import { loadOgFonts, ogFontFamily } from "@/lib/og-fonts";
import { OgText } from "@/lib/og-text";

const size = { width: 1200, height: 630 };

// Color tokens from globals.css (HSL → hex approximations)
const colors = {
  bg: "#f5f0e4", // hsl(44 40% 95%)
  deep: "#163f38", // hsl(167 53% 18%)
  green: "#17634f", // hsl(166 62% 24%)
  lightGreen: "#4d9482", // hsl(162 32% 44%)
  gold: "#a58230", // hsl(39 54% 42%)
  muted: "#526b64", // hsl(162 13% 37%)
};

/** The card for an unknown or missing locale is English. */
export function resolveOgLocale(locale: string | null | undefined): AppLocale {
  return hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
}

export default async function createOgImage(requestedLocale?: string | null) {
  const locale = resolveOgLocale(requestedLocale);
  const t = await getTranslations({ locale, namespace: "SiteOpenGraphImage" });
  const fonts = await loadOgFonts();
  const sans = ogFontFamily(fonts);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(180deg, ${colors.bg} 0%, ${colors.bg} 44%, #f0ead8 100%)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top-right green radial glow */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${colors.lightGreen}28 0%, ${colors.bg}00 70%)`,
            display: "flex",
          }}
        />
        {/* Bottom-left gold radial glow */}
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 450,
            height: 450,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${colors.gold}1a 0%, ${colors.bg}00 70%)`,
            display: "flex",
          }}
        />

        {/* Vignette overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            background: `radial-gradient(ellipse at 50% 45%, ${colors.bg}00 40%, ${colors.bg} 85%)`,
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 28,
            }}
          >
            <BrandMark variant="on-light" width="52" height="52" />
            <div
              style={{
                display: "flex",
                color: colors.deep,
                fontFamily: "serif",
                fontSize: 32,
                fontWeight: 600,
              }}
            >
              QuranCircle
            </div>
          </div>

          {/* Main heading */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              fontFamily: "sans-serif",
            }}
          >
            <OgText
              text={t("line1")}
              align="center"
              style={{ fontSize: 72, fontWeight: 400, color: colors.deep, lineHeight: 1.2, fontFamily: sans }}
            />
            <OgText
              text={t("line2")}
              align="center"
              style={{ fontSize: 72, fontWeight: 400, color: colors.green, lineHeight: 1.2, fontFamily: sans }}
            />
          </div>

          {/* Subtitle */}
          <OgText
            text={t("subtitle")}
            align="center"
            style={{
              fontSize: 24,
              color: colors.muted,
              maxWidth: 760,
              textAlign: "center",
              justifyContent: "center",
              lineHeight: 1.5,
              marginTop: 16,
              fontFamily: sans,
            }}
          />

          {/* Gold divider */}
          <div
            style={{
              width: 96,
              height: 2,
              marginTop: 24,
              background: `linear-gradient(90deg, ${colors.gold}00, ${colors.gold}99, ${colors.gold}00)`,
              borderRadius: 2,
              display: "flex",
            }}
          />

          {/* URL */}
          <div
            style={{
              fontSize: 17,
              color: colors.muted,
              marginTop: 16,
              fontFamily: sans,
              letterSpacing: "0.5px",
              display: "flex",
            }}
          >
            qurancircle.io
          </div>
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) }
  );
}
