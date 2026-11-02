"use client";

import { useEffect } from "react";

// TEMPORARY (#105): review-only switch. ?decor=a|b|c sets <html data-decor>, which app/decor-variants.css keys off.
// Without the param nothing changes. Delete this file, decor-variants.css and decor-assets.css once a direction is chosen.
export default function DecorSwitch() {
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("decor");
    if (value && /^[abc]$/.test(value)) document.documentElement.dataset.decor = value;
  }, []);
  return null;
}
