/** Prüfer:innenfunktionen sind ausschließlich Erst- und Zweitprüfer:innen vorbehalten. */
export function hasExaminerProfileCapabilities(role: string | null | undefined, isExaminerFlag = false): boolean {
  return isExaminerFlag || role === "examiner" || role === "second_examiner";
}
