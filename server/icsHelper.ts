/**
 * ICS-Kalender-Export-Helfer
 * Erzeugt .ics-Dateien für Thesis-Deadlines und Kolloquien
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
    url: "https://thesis.htw-berlin.com",
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

export interface ColloquiumEventOptions {
  /** Titel des Kolloquiums (= Titel der Abschlussarbeit) */
  title: string;
  start: Date;
  durationMinutes?: number;
  location?: string;
  /** Freitext-Notizen aus dem Kolloquium-Datensatz */
  notes?: string;
  /** Titel der Abschlussarbeit (falls abweichend vom Kolloquium-Titel) */
  thesisTitle?: string;
  /** Vollständiger Name der/des Studierenden */
  studentName?: string;
  /** Vollständiger Name der Erstprüfer:in */
  firstExaminerName?: string;
  /** Vollständiger Name der Zweitprüfer:in */
  secondExaminerName?: string;
  /** Studiengang */
  programmeName?: string;
  /** Interne Kolloquium-ID für stabile UID */
  colloquiumId?: number;
}

/**
 * Erzeugt eine .ics-Datei als String für ein Kolloquium.
 * Die Beschreibung enthält Studierenden-Name, Thesis-Titel und Prüfer:innen-Namen.
 */
export function createIcsEvent(opts: ColloquiumEventOptions): string {
  const d = opts.start;
  const durationHours = Math.floor((opts.durationMinutes ?? 60) / 60);
  const durationMinutes = (opts.durationMinutes ?? 60) % 60;

  const descriptionLines = [
    opts.thesisTitle ? `Abschlussarbeit: ${opts.thesisTitle}` : "",
    opts.studentName ? `Studierende:r: ${opts.studentName}` : "",
    opts.firstExaminerName ? `Erstprüfer:in: ${opts.firstExaminerName}` : "",
    opts.secondExaminerName ? `Zweitprüfer:in: ${opts.secondExaminerName}` : "",
    opts.programmeName ? `Studiengang: ${opts.programmeName}` : "",
    opts.notes ? `Hinweise: ${opts.notes}` : "",
    "HTW Berlin – Thesis Match Maker",
  ].filter(Boolean).join("\n");

  const event: EventAttributes = {
    uid: `kolloquium-${opts.colloquiumId ?? Date.now()}@htw-berlin.de`,
    title: opts.title,
    description: descriptionLines,
    start: [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()],
    duration: { hours: durationHours, minutes: durationMinutes },
    location: opts.location,
    alarms: [
      { action: "display", description: "Erinnerung: Kolloquium in 24 Stunden", trigger: { days: 1, before: true } },
      { action: "display", description: "Erinnerung: Kolloquium in 1 Stunde", trigger: { hours: 1, before: true } },
    ],
    organizer: { name: "HTW Berlin – Prüfungsamt", email: "pruefungsamt@htw-berlin.de" },
    url: "https://thesis.htw-berlin.com",
    categories: ["Kolloquium", "HTW Berlin"],
    status: "CONFIRMED",
    busyStatus: "BUSY",
  };

  const { error, value } = createEvent(event);
  if (error || !value) {
    throw new Error(`ICS-Generierung fehlgeschlagen: ${error?.message ?? "Unbekannter Fehler"}`);
  }
  return value;
}
