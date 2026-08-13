export function getStudentConsentFlags(role: string, plagiarismConsent?: boolean, aiReviewConsent?: boolean) {
  const isStudent = role === "student";
  return {
    plagiarismConsent: isStudent && plagiarismConsent ? 1 : 0,
    aiReviewConsent: isStudent && aiReviewConsent ? 1 : 0,
  };
}

export function formatConsentForExport(value?: number | boolean | null): "Ja" | "Nein" {
  return value ? "Ja" : "Nein";
}
