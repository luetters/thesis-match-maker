/**
 * Zweisprachige E-Mail-Templates für alle automatisch versendeten E-Mails.
 * Jede E-Mail enthält immer BEIDE Sprachen: zuerst Deutsch, dann Englisch.
 * Am Anfang steht der Hinweis „English below".
 */

export type Lang = "de" | "en";

const LOGO_URL = "https://storage.manus.space/public/manus-webdev-static/thesis-match-logo-1746007561.png";

const DISCLAIMER_DE = "⚠️ Dies ist ein nicht offizielles Tool an der HTW Berlin, welches zu Testzwecken installiert wurde.";
const DISCLAIMER_EN = "⚠️ This is an unofficial tool at HTW Berlin, installed for testing purposes.";

function htmlWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:560px">
      <tr><td style="background:#006937;padding:24px 32px;text-align:center">
        <img src="${LOGO_URL}" alt="Thesis Match Maker" style="height:48px;max-width:200px;object-fit:contain" />
        <p style="color:#ffffff;margin:8px 0 0 0;font-size:13px;opacity:0.85">HTW Berlin – Thesis Match Maker</p>
      </td></tr>
      <tr><td style="padding:8px 32px 8px 32px;background:#f0f7e6;border-bottom:1px solid #d4edaa">
        <p style="color:#5a7a00;font-size:12px;margin:0;font-style:italic">🇬🇧 English below</p>
      </td></tr>
      <tr><td style="padding:32px">
        ${content}
      </td></tr>
      <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center">
        <p style="color:#9ca3af;font-size:11px;margin:0 0 4px 0">${DISCLAIMER_DE}</p>
        <p style="color:#9ca3af;font-size:11px;margin:0">${DISCLAIMER_EN}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:2px solid #e5e7eb;margin:28px 0" />`;
}

function p(text: string): string {
  return `<p style="color:#374151;font-size:14px;margin:0 0 12px 0">${text}</p>`;
}

function strong(text: string): string {
  return `<strong style="color:#111827">${text}</strong>`;
}

// ─── Prüfer-Anfrage (PAV schlägt Prüfer:in vor) ───────────────────────────────
export function examinerRequestEmail(opts: {
  examinerName?: string | null;
  role: "first" | "second";
  thesisTitle: string;
  studentName?: string | null;
  studiengang?: string | null;
  semester?: string | null;
  acceptUrl?: string;
  declineUrl?: string;
}): { subject: string; html: string } {
  const roleDE = opts.role === "first" ? "Erstprüfer:in" : "Zweitprüfer:in";
  const roleEN = opts.role === "first" ? "first examiner" : "second examiner";
  const subject = `HTW Berlin – Anfrage als ${roleDE} / Request as ${roleEN}: ${opts.thesisTitle}`;

  const ctaDE = opts.acceptUrl && opts.declineUrl ? `
    <p style="margin:20px 0 12px 0">
      <a href="${opts.acceptUrl}" style="background:#76B900;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;margin-right:8px;display:inline-block">Anfrage annehmen</a>
      <a href="${opts.declineUrl}" style="background:#76B900;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">Anfrage ablehnen</a>
    </p>` : "";
  const ctaEN = opts.acceptUrl && opts.declineUrl ? `
    <p style="margin:20px 0 12px 0">
      <a href="${opts.acceptUrl}" style="background:#76B900;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;margin-right:8px;display:inline-block">Accept request</a>
      <a href="${opts.declineUrl}" style="background:#76B900;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">Decline request</a>
    </p>` : "";

  const body = `
    ${p(`Sehr geehrte/r ${opts.examinerName ?? "Prüfer:in"},`)}
    ${p(`Der Prüfungsausschuss hat Sie als ${strong(roleDE)} für folgende Abschlussarbeit vorgeschlagen:`)}
    ${p(`${strong("Thema:")} ${opts.thesisTitle}`)}
    ${opts.studentName ? p(`${strong("Studierende:r:")} ${opts.studentName}`) : ""}
    ${opts.studiengang ? p(`${strong("Studiengang:")} ${opts.studiengang}`) : ""}
    ${opts.semester ? p(`${strong("Semester:")} ${opts.semester}`) : ""}
    ${p("Bitte nehmen Sie die Anfrage an oder lehnen Sie sie ab:")}
    ${ctaDE}
    ${p("Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsausschuss")}

    ${divider()}

    ${p(`Dear ${opts.examinerName ?? "Examiner"},`)}
    ${p(`The examination committee has proposed you as ${strong(roleEN)} for the following thesis:`)}
    ${p(`${strong("Title:")} ${opts.thesisTitle}`)}
    ${opts.studentName ? p(`${strong("Student:")} ${opts.studentName}`) : ""}
    ${opts.studiengang ? p(`${strong("Programme:")} ${opts.studiengang}`) : ""}
    ${opts.semester ? p(`${strong("Semester:")} ${opts.semester}`) : ""}
    ${p("Please accept or decline the request:")}
    ${ctaEN}
    ${p("Kind regards,<br>HTW Berlin – Examination Committee")}
  `;

  return { subject, html: htmlWrapper(body) };
}

// ─── Statusänderung ───────────────────────────────────────────────────────────
export function statusChangeEmail(opts: {
  recipientName?: string | null;
  thesisTitle: string;
  statusTextDE: string;
  statusTextEN: string;
}): { subject: string; html: string } {
  const subject = `HTW Berlin – Statusänderung / Status Update: ${opts.thesisTitle}`;
  const body = `
    ${p(`Sehr geehrte/r ${opts.recipientName ?? "Nutzende/r"},`)}
    ${p(opts.statusTextDE)}
    ${p("Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung")}

    ${divider()}

    ${p(`Dear ${opts.recipientName ?? "User"},`)}
    ${p(opts.statusTextEN)}
    ${p("Kind regards,<br>HTW Berlin – Examination Office")}
  `;
  return { subject, html: htmlWrapper(body) };
}

// ─── Anmeldefähigkeit ─────────────────────────────────────────────────────────
export function enrollmentEligibilityEmail(opts: {
  studentName?: string | null;
  thesisTitle: string;
  eligible: boolean;
  note?: string | null;
}): { subject: string; html: string } {
  const subject = `HTW Berlin – Anmeldefähigkeit / Enrollment Eligibility: ${opts.thesisTitle}`;
  const statusDE = opts.eligible
    ? "Ihre Anmeldefähigkeit wurde bestätigt. Ihr Antrag wird nun weiterbearbeitet."
    : `Ihre Anmeldefähigkeit wurde nicht bestätigt. Ihr Antrag wurde abgelehnt.${opts.note ? " Begründung: " + opts.note : ""} Bitte wenden Sie sich an die Prüfungsverwaltung.`;
  const statusEN = opts.eligible
    ? "Your enrollment eligibility has been confirmed. Your application will now be processed further."
    : `Your enrollment eligibility has not been confirmed. Your application has been rejected.${opts.note ? " Reason: " + opts.note : ""} Please contact the examination office.`;

  const body = `
    ${p(`Sehr geehrte/r ${opts.studentName ?? "Studierende/r"},`)}
    ${p(statusDE)}
    ${p("Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung")}

    ${divider()}

    ${p(`Dear ${opts.studentName ?? "Student"},`)}
    ${p(statusEN)}
    ${p("Kind regards,<br>HTW Berlin – Examination Office")}
  `;
  return { subject, html: htmlWrapper(body) };
}

// ─── Prüfungsfähigkeit ────────────────────────────────────────────────────────
export function defenseEligibilityEmail(opts: {
  studentName?: string | null;
  thesisTitle: string;
  eligible: boolean;
  note?: string | null;
}): { subject: string; html: string } {
  const subject = `HTW Berlin – Prüfungsfähigkeit / Defense Eligibility: ${opts.thesisTitle}`;
  const statusDE = opts.eligible
    ? "Sie sind prüfungsfähig. Ihr Kolloquium kann geplant werden."
    : `Sie sind derzeit nicht prüfungsfähig.${opts.note ? " Begründung: " + opts.note : ""} Bitte wenden Sie sich an die Prüfungsverwaltung.`;
  const statusEN = opts.eligible
    ? "You are eligible for your defense. Your colloquium can be scheduled."
    : `You are currently not eligible for your defense.${opts.note ? " Reason: " + opts.note : ""} Please contact the examination office.`;

  const body = `
    ${p(`Sehr geehrte/r ${opts.studentName ?? "Studierende/r"},`)}
    ${p(statusDE)}
    ${p("Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung")}

    ${divider()}

    ${p(`Dear ${opts.studentName ?? "Student"},`)}
    ${p(statusEN)}
    ${p("Kind regards,<br>HTW Berlin – Examination Office")}
  `;
  return { subject, html: htmlWrapper(body) };
}

// ─── Direkte Prüfer-Zuweisung (PAV weist Prüfer:in zu) ───────────────────────
export function directAssignmentEmail(opts: {
  examinerName?: string | null;
  role: "first" | "second";
  thesisTitle: string;
}): { subject: string; html: string } {
  const roleDE = opts.role === "first" ? "Erstprüfer:in" : "Zweitprüfer:in";
  const roleEN = opts.role === "first" ? "first examiner" : "second examiner";
  const subject = `HTW Berlin – Zuweisung als ${roleDE} / Assignment as ${roleEN}: ${opts.thesisTitle}`;

  const body = `
    ${p(`Sehr geehrte/r ${opts.examinerName ?? "Prüfer:in"},`)}
    ${p(`Der Prüfungsausschuss hat Sie als ${strong(roleDE)} für folgende Abschlussarbeit direkt zugewiesen:`)}
    ${p(strong(opts.thesisTitle))}
    ${p("Diese Zuweisung ist verbindlich und erfordert keine weitere Bestätigung Ihrerseits. Bei Rückfragen wenden Sie sich bitte an den Prüfungsausschuss.")}
    ${p("Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsausschuss")}

    ${divider()}

    ${p(`Dear ${opts.examinerName ?? "Examiner"},`)}
    ${p(`The examination committee has directly assigned you as ${strong(roleEN)} for the following thesis:`)}
    ${p(strong(opts.thesisTitle))}
    ${p("This assignment is binding and does not require further confirmation on your part. For questions, please contact the examination committee.")}
    ${p("Kind regards,<br>HTW Berlin – Examination Committee")}
  `;
  return { subject, html: htmlWrapper(body) };
}

// ─── Standard-Templates für Prüfer (Zusage / Absage / Ausgebucht) ─────────────
// Gibt Plaintext-Vorlagen zurück (werden im E-Mail-Dialog angezeigt und können bearbeitet werden)
export function defaultExaminerTemplate(
  _lang: Lang, // wird ignoriert – immer zweisprachig
  type: "acceptance" | "rejection" | "fully_booked",
  vars: {
    name?: string;
    thema?: string;
    semester?: string;
    studiengang?: string;
    examinerName?: string;
    examinerTitle?: string;
    bookingUrl?: string;
  }
): { subject: string; body: string } {
  const { name = "{{name}}", thema = "{{thema}}", semester = "{{semester}}", studiengang = "{{studiengang}}", examinerName = "", examinerTitle = "", bookingUrl = "" } = vars;
  const signature = examinerTitle ? `${examinerTitle} ${examinerName}` : examinerName;

  switch (type) {
    case "acceptance":
      return {
        subject: `Zusage / Acceptance – ${thema}`,
        body: `Sehr geehrte/r ${name},

hiermit bestätige ich, dass ich als Erstgutachter für Ihre Thesis im Studiengang ${studiengang} mit dem Thema ${thema} im ${semester} zur Verfügung stehe.${bookingUrl ? `\n\nBitte buchen Sie alsbald einen Sprechstundentermin unter ${bookingUrl}` : ""}

Mit freundlichen Grüßen
${signature}

---

Dear ${name},

I hereby confirm that I am available as first examiner for your thesis in the programme ${studiengang} on the topic "${thema}" in ${semester}.${bookingUrl ? `\n\nPlease book an office hour appointment at ${bookingUrl}` : ""}

Kind regards,
${signature}`,
      };
    case "rejection":
      return {
        subject: `Absage / Rejection – ${thema}`,
        body: `Sehr geehrte/r ${name},

leider muss ich Ihre Anfrage zur Betreuung Ihrer Thesis mit dem Thema ${thema} ablehnen. Bitte wenden Sie sich an einen anderen Prüfer.

Mit freundlichen Grüßen
${signature}

---

Dear ${name},

Unfortunately I must decline your request to supervise your thesis on the topic "${thema}". Please contact another examiner.

Kind regards,
${signature}`,
      };
    case "fully_booked":
      return {
        subject: `Keine Kapazität / No Capacity – ${thema}`,
        body: `Sehr geehrte/r ${name},

leider stehen mir derzeit keine freien Betreuungskapazitäten zur Verfügung. Bitte wenden Sie sich an einen anderen Prüfer.

Mit freundlichen Grüßen
${signature}

---

Dear ${name},

Unfortunately I currently have no available supervision capacity. Please contact another examiner.

Kind regards,
${signature}`,
      };
  }
}
