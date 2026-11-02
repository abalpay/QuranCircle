import { ImageResponse } from "next/og";
import { createAnonClient } from "@/lib/supabase/anon";
import { getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import BrandMark from "@/components/brand-mark";
import { getCircleOgState } from "@/lib/circle-og";
import { containsArabicScript } from "@/lib/text-script";
import { loadOgFonts } from "@/lib/og-fonts";
import { OgText } from "@/lib/og-text";

export const runtime = "nodejs";

export const alt = "QuranCircle Khatm Circle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const colors = {
  bg: "#163f38",
  bgGradient: "#1a4a3f",
  cream: "#f5f0e4",
  gold: "#c9a84c",
  mutedLight: "#9cb3ac",
  greenGlow: "#2a6b5a",
};

export default async function OGImage({
  params,
}: {
  params: Promise<{ locale: string; shortCode: string }>;
}) {
  const { locale, shortCode } = await params;
  const supportedLocale = hasLocale(routing.locales, locale)
    ? locale
    : routing.defaultLocale;
  const t = await getTranslations({
    locale: supportedLocale,
    namespace: "OpenGraphImage",
  });

  let eventName = t("fallbackCircleName");
  let eventDescription = "";
  let completedKhatmNumber: number | null = null;
  let showJoinCta = true;

  try {
    const supabase = createAnonClient();
    const { data } = await supabase.rpc("get_event_snapshot_by_shortcode", {
      p_short_code: shortCode,
      p_khatm_limit: 1,
    });

    if (data && typeof data === "object") {
      const state = getCircleOgState(data, eventName);
      eventName = state.name;
      eventDescription = state.description;
      completedKhatmNumber = state.completedKhatmNumber;
      showJoinCta = state.showJoinCta;
    }
  } catch {
    // Fallback to defaults
  }

  const completedLabel =
    completedKhatmNumber !== null ? t("khatmComplete", { number: completedKhatmNumber }) : "";
  // Latin-only images keep satori's default font. Arabic text needs a bundled font it can shape (#103).
  const fonts = containsArabicScript(eventName, eventDescription, completedLabel, t("joinCircle"))
    ? await loadOgFonts()
    : null;
  const sans = fonts ? "Manrope, Tajawal, sans-serif" : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(160deg, ${colors.bg} 0%, ${colors.bgGradient} 100%)`,
          position: "relative",
          overflow: "hidden",
          padding: "60px 80px",
        }}
      >
        {/* Top-right gold radial glow — subtle accent */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${colors.gold}0d 0%, transparent 70%)`,
            display: "flex",
          }}
        />
        {/* Bottom-left green radial glow — subtle accent */}
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${colors.greenGlow}14 0%, transparent 70%)`,
            display: "flex",
          }}
        />

        {/* Top bar — branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 40,
            position: "relative",
          }}
        >
          <BrandMark variant="on-dark" width="42" height="42" />
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: colors.gold,
              fontFamily: sans,
              display: "flex",
            }}
          >
            QuranCircle
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            gap: 20,
            position: "relative",
          }}
        >
          {completedKhatmNumber !== null ? (
            <OgText
              text={completedLabel}
              style={{ fontSize: 28, fontWeight: 600, color: colors.gold, fontFamily: sans }}
            />
          ) : null}
          <OgText
            text={eventName.length > 60 ? eventName.slice(0, 57) + "..." : eventName}
            style={{
              fontSize: 64,
              fontWeight: 400,
              color: colors.cream,
              lineHeight: 1.15,
              fontFamily: sans,
              maxWidth: 960,
            }}
          />

          {eventDescription ? (
            <OgText
              text={eventDescription.length > 120 ? eventDescription.slice(0, 117) + "..." : eventDescription}
              style={{
                fontSize: 24,
                color: colors.mutedLight,
                lineHeight: 1.5,
                maxWidth: 850,
                fontFamily: sans,
              }}
            />
          ) : null}

          {/* Gold divider */}
          <div
            style={{
              width: 80,
              height: 2,
              marginTop: 8,
              background: `linear-gradient(90deg, ${colors.gold}, ${colors.gold}44)`,
              borderRadius: 2,
              display: "flex",
            }}
          />
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: colors.mutedLight,
              fontFamily: sans,
              letterSpacing: "0.5px",
              display: "flex",
            }}
          >
            qurancircle.io
          </div>
          {/* A complete khatm has nothing left to join. */}
          {showJoinCta ? (
            <OgText
              text={`${t("joinCircle")} ${supportedLocale === "ar" ? "\u2190" : "\u2192"}`}
              hug={false}
              style={{ fontSize: 18, color: colors.gold, fontFamily: sans, fontWeight: 600 }}
            />
          ) : null}
        </div>
      </div>
    ),
    fonts ? { ...size, fonts } : size
  );
}
