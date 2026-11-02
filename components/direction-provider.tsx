"use client";

import type { ReactNode } from "react";
import { Direction } from "radix-ui";

// Radix menus, selects and popovers default to LTR; this gives them the locale direction.
export default function DirectionProvider({
  dir,
  children,
}: {
  dir: "ltr" | "rtl";
  children: ReactNode;
}) {
  return <Direction.Provider dir={dir}>{children}</Direction.Provider>;
}
