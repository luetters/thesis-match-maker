/** Gibt das an der HTW Berlin laufende Semester im Systemformat zurück. */
export function getCurrentSemesterValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (month >= 4 && month <= 9) return `SoSe${year}`;
  return `WS${month >= 10 ? year : year - 1}`;
}
