export type PortalLanguage = "de" | "en";

export function isPortalLanguage(value: unknown): value is PortalLanguage {
  return value === "de" || value === "en";
}

/**
 * Angemeldete Personen erhalten ihre im Profil gespeicherte Sprachwahl.
 * Ohne Anmeldung bleibt die lokale Auswahl der Besucherin bzw. des Besuchers erhalten.
 */
export function resolvePreferredLanguage(
  storedLanguage: unknown,
  profileLanguage: unknown,
): PortalLanguage {
  if (isPortalLanguage(profileLanguage)) return profileLanguage;
  if (isPortalLanguage(storedLanguage)) return storedLanguage;
  return "de";
}
