/**
 * Biografien werden im Portal ausschließlich als Text unterstützt.
 * HTML-Markup und Steuerzeichen werden vor der Speicherung entfernt, damit
 * auch künftige Darstellungen keine ausführbaren Inhalte erhalten können.
 */
export function sanitizeBiographyText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 10_000);
}
