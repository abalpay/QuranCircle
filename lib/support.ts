// The single place the voluntary support link (D10) is read. Unset or non-https => hidden.
export function getSupportUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPPORT_URL?.trim();
  return url?.startsWith("https://") ? url : null;
}
