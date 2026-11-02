import type { KhatmSnapshot } from "@/lib/types/events";

type OgSnapshot = {
  name?: string;
  description?: string | null;
  khatms?: Pick<KhatmSnapshot, "khatm_number" | "completed_at">[];
};

/** What the share preview shows. Completed when the latest khatm (or the only one) is complete. */
export function getCircleOgState(
  data: OgSnapshot | null | undefined,
  fallbackName: string
) {
  const latest = data?.khatms?.[data.khatms.length - 1];
  const completedKhatmNumber = latest?.completed_at ? latest.khatm_number : null;
  return {
    name: data?.name || fallbackName,
    description: data?.description || "",
    completedKhatmNumber,
    // A complete latest khatm leaves nothing to join.
    showJoinCta: completedKhatmNumber === null,
  };
}
