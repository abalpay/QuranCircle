/** wa.me share link: prefilled text, then the circle link on its own line. */
export function buildWhatsAppShareUrl(text: string, circleUrl: string) {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${circleUrl}`)}`;
}
