export type ThesisHistoryPdfLanguage = "de" | "en";

export function getThesisHistoryPdfCopy(language: ThesisHistoryPdfLanguage) {
  const locale = language === "en" ? "en-GB" : "de-DE";
  return language === "en"
    ? {
        locale, invalidId: "Invalid request ID", notFound: "Request not found", forbidden: "No permission", continuation: "Case history (continued)",
        subtitle: (id: number, date: Date) => `Request #${id} · as of: ${date.toLocaleDateString(locale)}`,
        heading: "Case history for examination record", noTitle: "Topic has not yet been defined", student: "Student", programme: "Programme",
        currentStatus: "Current status", firstExaminer: "First examiner", secondExaminer: "Second examiner", unassigned: "Not yet assigned",
        history: "History", reason: "Reason", created: "Request created", statusChanged: "Status changed", accepted: "Examiner accepted", rejected: "Examiner declined",
        firstAssigned: "First examiner assigned", secondAssigned: "Second examiner assigned", deadline: "Submission deadline set", colloquium: "Colloquium created",
      }
    : {
        locale, invalidId: "Ungültige Antrags-ID", notFound: "Antrag nicht gefunden", forbidden: "Keine Berechtigung", continuation: "Fallhistorie (Fortsetzung)",
        subtitle: (id: number, date: Date) => `Antrag #${id} · Stand: ${date.toLocaleDateString(locale)}`,
        heading: "Fallhistorie für Prüfungsakte", noTitle: "Thema wird noch festgelegt", student: "Studierende:r", programme: "Studiengang",
        currentStatus: "Aktueller Status", firstExaminer: "Erstgutachter:in", secondExaminer: "Zweitgutachter:in", unassigned: "Noch nicht zugeordnet",
        history: "Verlauf", reason: "Begründung", created: "Antrag erstellt", statusChanged: "Status geändert", accepted: "Prüfer:in hat angenommen", rejected: "Prüfer:in hat abgelehnt",
        firstAssigned: "Erstgutachter:in zugewiesen", secondAssigned: "Zweitgutachter:in zugewiesen", deadline: "Abgabetermin gesetzt", colloquium: "Kolloquium angelegt",
      };
}
