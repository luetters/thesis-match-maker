export type EmailPreviewLanguage = "de" | "en";

const PREVIEW_VALUES: Record<EmailPreviewLanguage, Record<string, string>> = {
  de: {
    "{{studentName}}": "Mara Muster",
    "{{examinerName}}": "Prof. Dr. Alex Beispiel",
    "{{thesisTitle}}": "Digitale Transformation in der Hochschullehre",
    "{{actionUrl}}": "https://thesis.htw-berlin.com/aktion",
    "{{rejectionReason}}": "Bitte konkretisieren Sie den methodischen Ansatz.",
    "{{colloquiumDate}}": "15. Oktober 2026",
    "{{colloquiumTime}}": "10:00 Uhr",
    "{{colloquiumLocation}}": "Campus Treskowallee, Raum C 201",
    "{{newStatus}}": "In Bearbeitung",
    "{{recipientName}}": "Mara Muster",
    "{{userName}}": "Mara Muster",
  },
  en: {
    "{{studentName}}": "Mara Example",
    "{{examinerName}}": "Prof. Dr Alex Example",
    "{{thesisTitle}}": "Digital Transformation in Higher Education",
    "{{actionUrl}}": "https://thesis.htw-berlin.com/action",
    "{{rejectionReason}}": "Please specify the methodological approach.",
    "{{colloquiumDate}}": "15 October 2026",
    "{{colloquiumTime}}": "10:00 am",
    "{{colloquiumLocation}}": "Campus Treskowallee, room C 201",
    "{{newStatus}}": "In progress",
    "{{recipientName}}": "Mara Example",
    "{{userName}}": "Mara Example",
  },
};

export function fillEmailTemplatePreview(template: string, language: EmailPreviewLanguage): string {
  return Object.entries(PREVIEW_VALUES[language]).reduce(
    (rendered, [placeholder, value]) => rendered.replaceAll(placeholder, value),
    template,
  );
}
