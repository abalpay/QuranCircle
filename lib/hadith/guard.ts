import "next/dist/compiled/server-only";
import { notFound } from "next/navigation";
import { isHadithEnabled } from "./feature";

/** Layouts and pages can render independently: guard before any page data reads. */
export function requireHadithEnabled(): void {
  if (!isHadithEnabled()) notFound();
}
