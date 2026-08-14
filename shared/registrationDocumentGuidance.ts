export function getRegistrationDocumentGuidance(input: { department?: string | null; targetSemester?: string | null }) {
  const department = input.department?.trim() || "Ihres Fachbereichs";
  const semester = input.targetSemester?.trim() || "Ihres Zielsemesters";
  return {
    department,
    semester,
    deadlineText: `Die verbindliche Einreichungsfrist legt die Verwaltung ${department} fest. Reichen Sie das Dokument bitte unmittelbar nach Erhalt ein, damit Ihre Anmeldung für ${semester} fristgerecht geprüft werden kann.`,
  };
}
