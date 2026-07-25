export const VIEWPORT_DIAGNOSTICS_PARAM = "viewportDebug";
export const VIEWPORT_DIAGNOSTICS_REQUEST_HEADER =
  "x-qurancircle-viewport-debug";
export const VIEWPORT_DIAGNOSTICS_SCHEMA_VERSION = 1;
export const MAX_VIEWPORT_DIAGNOSTIC_ENTRIES = 300;

export function isViewportDiagnosticsEnabled(searchParams: URLSearchParams) {
  return searchParams.get(VIEWPORT_DIAGNOSTICS_PARAM) === "1";
}

export function redactDiagnosticPathname(pathname: string) {
  return pathname.replace(/\/s\/[^/]+(?=\/|$)/, "/s/:shortCode");
}

export function pushBoundedDiagnosticEntry<T>(
  entries: T[],
  entry: T,
  maxEntries = MAX_VIEWPORT_DIAGNOSTIC_ENTRIES
) {
  entries.push(entry);

  if (entries.length > maxEntries) {
    entries.splice(0, entries.length - maxEntries);
  }
}

export function roundViewportMetric(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(value * 100) / 100
    : null;
}
