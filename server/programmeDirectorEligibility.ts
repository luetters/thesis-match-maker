/** Studiengangsleitung ist eine Zusatzaufgabe für bereits freigeschaltete Erstprüfer:innen. */
export function isEligibleForProgrammeDirector(existingRoles: string[]): boolean {
  return existingRoles.includes("examiner");
}
