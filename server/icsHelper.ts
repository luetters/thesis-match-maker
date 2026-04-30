/**
 * ICS-Kalender-Export-Helfer
 * Erzeugt .ics-Dateien für Thesis-Deadlines
 */
import { createEvent, type EventAttributes } from "ics";

export interface DeadlineEventOptions {
  title: string;
  description?: string;
  deadline: Date;
  studentName?: string;
  department?: string;
  thesisId: number;
}

/**
 * Erzeugt eine .ics-Datei als String für eine Thesis-Deadline.
 */
export function generateDeadlineIcs(opts: DeadlineEventOptions): string {
  const d = opts.deadline;

  const event: EventAttributes = {
    uid: `thesis-deadline-${opts.thesisId}@htw-berlin.de`,
    title: `Deadline: ${opts.title}`,
    description: [
      opts.description ?? "",
      opts.studentName ? `Studierende:r: ${opts.studentName}` : "",
      opts.department ? `Fachbereich: ${opts.department}` : "",
      `Thesis-ID: ${opts.thesisId}`,
      "HTW Berlin – Thesis Match Maker",
    ]
      .filter(Boolean)
      .join("\n"),
    start: [d.getFullYear(), d.getMonth() + 1, d.getDate()],
    duration: { days: 1 },
    alarms: [
      { action: "display", description: "Erinnerung: Thesis-Deadline in 7 Tagen", trigger: { weeks: 1, before: true } },
      { action: "display", description: "Erinnerung: Thesis-Deadline morgen", trigger: { days: 1, before: true } },
    ],
    organizer: { name: "HTW Berlin – Prüfungsamt", email: "pruefungsamt@htw-berlin.de" },
    url: "https://thesis-match.htw-berlin.de",
    categories: ["Thesis", "HTW Berlin", "Deadline"],
    status: "CONFIRMED",
    busyStatus: "BUSY",
  };

  const { error, value } = createEvent(event);
  if (error || !value) {
    throw new Error(`ICS-Generierung fehlgeschlagen: ${error?.message ?? "Unbekannter Fehler"}`);
  }
  return value;
}
