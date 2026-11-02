"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  buildCircleShare,
  canNativeShare,
  type CircleShareKind,
} from "@/lib/share-invite";

const subscribe = () => () => {};

/** Share payload for the circle menu and the completion moment: the same builder, the same texts. */
export function useCircleShare(name: string, kind: CircleShareKind) {
  const t = useTranslations("ShareText");
  // Server and first client render say no; the share sheet row appears only where the browser has one.
  const nativeShare = useSyncExternalStore(subscribe, () => canNativeShare(), () => false);
  const getCircleUrl = () => `${window.location.origin}${window.location.pathname}`;
  const build = () =>
    buildCircleShare((key, values) => t(key, values), { kind, name, url: getCircleUrl() });
  return { nativeShare, build, getCircleUrl };
}
