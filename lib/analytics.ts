import { track } from "@vercel/analytics";

export type ConversionSource =
  | "home_hero"
  | "home_guide"
  | "home_browse"
  | "guide_hero"
  | "guide_preview"
  | "guide_final"
  | "about_final"
  | "whatsapp_hero"
  | "whatsapp_final"
  | "ramadan_hero"
  | "ramadan_final";

type ProductEvent =
  | {
      name: "CTA Clicked";
      properties: {
        action: "create_circle" | "browse_circles" | "read_guide";
        source: ConversionSource;
      };
    }
  | {
      name: "Auth Started";
      properties: { action: "login" | "register" | "google"; source: string };
    }
  | {
      name: "Auth Completed";
      properties: { method: "password_login" | "password_register" };
    }
  | {
      name: "Circle Created";
      properties: {
        visibility: "public" | "link_only";
        source: string;
      };
    }
  | {
      name: "Guide Content Copied";
      properties: {
        content: "invitation" | "reminder" | "completion";
      };
    }
  | {
      name: "Circle Invite Shared" | "Circle Invite Copied";
      properties: { visibility: "public" | "link_only" };
    }
  | {
      name: "Khatm Completed";
      properties: Record<string, never>;
    };

export function trackProductEvent<T extends ProductEvent>(
  name: T["name"],
  properties: T["properties"],
) {
  track(name, properties);
}
