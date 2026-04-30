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

export interface ColloquiumEventOptions {
  title: string;
  start: Date;
  durationMinutes?: number;
  location?: string;
  description?: string;
}

/**
 * Erzeugt eine .ics-Datei als String für ein Kolloquium.
 */
export function createIcsEvent(opts: ColloquiumEventOptions): string {
  const d = opts.start;
  const durationHours = Math.floor((opts.durationMinutes ?? 60) / 60);
  const durationMinutes = (opts.durationMinutes ?? 60) % 60;

  const event: EventAttributes = {
    uid: `kolloquium-${Date.now()}@htw-berlin.de`,
    title: opts.title,
    description: [
      opts.description ?? "",
      "HTW Berlin – Thesis Match Maker",
    ].filter(Boolean).join("\n"),
    start: [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()],
    duration: { hours: durationHours, minutes: durationMinutes },
    location: opts.location,
    alarms: [
      { action: "display", description: "Erinnerung: Kolloquium in 24 Stunden", trigger: { days: 1, before: true } },
      { action: "display", description: "Erinnerung: Kolloquium in 1 Stunde", trigger: { hours: 1, before: true } },
    ],
    organizer: { name: "HTW Berlin – Prüfungsamt", email: "pruefungsamt@htw-berlin.de" },
    url: "https://thesis-match.htw-berlin.de",
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
