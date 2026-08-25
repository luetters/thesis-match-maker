export function getRegistrationDocumentGuidance(input: { department?: string | null; targetSemester?: string | null; language?: "de" | "en" }) {
  const isEnglish = input.language === "en";
  const department = input.department?.trim() || (isEnglish ? "your department" : "Ihres Fachbereichs");
  const semester = input.targetSemester?.trim() || (isEnglish ? "your target semester" : "Ihres Zielsemesters");
  return {
    department,
    semester,
    deadlineText: isEnglish
      ? `The administration of ${department} determines the binding submission deadline. Please submit the document immediately after receiving it so that your registration for ${semester} can be reviewed in time.`
      : `Die verbindliche Einreichungsfrist legt die Verwaltung ${department} fest. Reichen Sie das Dokument bitte unmittelbar nach Erhalt ein, damit Ihre Anmeldung für ${semester} fristgerecht geprüft werden kann.`,
  };
}
