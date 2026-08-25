export function getThesisConsentFlags(plagiarismConsent?: boolean, aiReviewConsent?: boolean) {
  return {
    plagiarismConsent: plagiarismConsent ? 1 : 0,
    aiReviewConsent: aiReviewConsent ? 1 : 0,
  };
}

export function formatConsentForExport(value?: number | boolean | null): "Ja" | "Nein" {
  return value ? "Ja" : "Nein";
}
