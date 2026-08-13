/** Fügt eine Zweitprüfer:innen-ID ohne Dubletten zur bestehenden Präferenzliste hinzu. */
export function appendCommissionPreference(existingIds: number[], examinerId: number): number[] {
  return existingIds.includes(examinerId) ? existingIds : [...existingIds, examinerId];
}
