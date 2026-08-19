/**
 * Biografien werden im Portal ausschließlich als Text unterstützt. Formatiertes
 * Altmaterial aus dem Rich-Text-Editor wird in gut lesbaren Klartext überführt,
 * ohne jemals HTML auszuführen oder Links aktiv zu machen.
 */
export function sanitizeBiographyText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/<(?:br\s*\/?)\s*>/gi, "\n")
    .replace(/<\/?(?:p|div|h[1-6]|li|blockquote|ul|ol)[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/[<>]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 10_000);
}
