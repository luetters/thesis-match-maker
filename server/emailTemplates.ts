/**
 * Zweisprachige E-Mail-Templates für alle automatisch versendeten E-Mails.
 * Sprache richtet sich nach dem preferredLanguage-Feld des Empfängers.
 */

export type Lang = "de" | "en";

const LOGO_URL = "https://storage.manus.space/public/manus-webdev-static/thesis-match-logo-1746007561.png";

function htmlWrapper(lang: Lang, content: string): string {
  const disclaimer =
    lang === "de"
      ? "⚠️ Dies ist ein nicht offizielles Tool an der HTW Berlin, welches zu Testzwecken installiert wurde."
      : "⚠️ This is an unofficial tool at HTW Berlin, installed for testing purposes.";
  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:560px">
      <tr><td style="background:#006937;padding:24px 32px;text-align:center">
        <img src="${LOGO_URL}" alt="Thesis Match Maker" style="height:48px;max-width:200px;object-fit:contain" />
        <p style="color:#ffffff;margin:8px 0 0 0;font-size:13px;opacity:0.85">HTW Berlin – Thesis Match Maker</p>
      </td></tr>
      <tr><td style="padding:32px">
        ${content}
      </td></tr>
      <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center">
        <p style="color:#9ca3af;font-size:11px;margin:0">${disclaimer}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function greeting(lang: Lang, name?: string | null): string {
  if (lang === "en") {
    return name ? `<p style="color:#374151;font-size:14px;margin:0 0 16px 0">Dear ${name},</p>` : `<p style="color:#374151;font-size:14px;margin:0 0 16px 0">Dear student,</p>`;
  }
  return name ? `<p style="color:#374151;font-size:14px;margin:0 0 16px 0">Sehr geehrte/r ${name},</p>` : `<p style="color:#374151;font-size:14px;margin:0 0 16px 0">Sehr geehrte/r Studierende/r,</p>`;
}

function regards(lang: Lang): string {
  if (lang === "en") return `<p style="color:#374151;font-size:14px;margin:16px 0 0 0">Kind regards,<br>HTW Berlin – Examination Office</p>`;
  return `<p style="color:#374151;font-size:14px;margin:16px 0 0 0">Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung</p>`;
}

function p(text: string): string {
  return `<p style="color:#374151;font-size:14px;margin:0 0 12px 0">${text}</p>`;
}

function strong(text: string): string {
  return `<strong style="color:#111827">${text}</strong>`;
}

// ─── Prüfer-Anfrage (Gutachter erhält Anfrage) ────────────────────────────────
export function examinerRequestEmail(lang: Lang, opts: {
  examinerName?: string | null;
  role: "first" | "second";
  thesisTitle: string;
  studentName: string;
  studiengang?: string | null;
  semester?: string | null;
  actionUrl?: string;
}): { subject: string; html: string } {
  const roleLabel = lang === "de"
    ? (opts.role === "first" ? "Erstprüfer:in" : "Zweitprüfer:in")
    : (opts.role === "first" ? "first examiner" : "second examiner");
  const subject = lang === "de"
    ? `HTW Berlin – Anfrage als ${roleLabel}: ${opts.thesisTitle}`
    : `HTW Berlin – Request as ${roleLabel}: ${opts.thesisTitle}`;
  const body = lang === "de" ? `
    ${greeting("de", opts.examinerName)}
    ${p(`ein:e Studierende:r bittet Sie, als ${strong(roleLabel)} für folgende Abschlussarbeit zur Verfügung zu stehen:`)}
    ${p(`${strong("Thema:")} ${opts.thesisTitle}`)}
    ${opts.studentName ? p(`${strong("Studierende:r:")} ${opts.studentName}`) : ""}
    ${opts.studiengang ? p(`${strong("Studiengang:")} ${opts.studiengang}`) : ""}
    ${opts.semester ? p(`${strong("Semester:")} ${opts.semester}`) : ""}
    ${opts.actionUrl ? `<p style="margin:20px 0 0 0"><a href="${opts.actionUrl}" style="background:#76B900;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">Zum Dashboard</a></p>` : ""}
    ${regards("de")}
  ` : `
    ${greeting("en", opts.examinerName)}
    ${p(`A student is requesting you to act as ${strong(roleLabel)} for the following thesis:`)}
    ${p(`${strong("Title:")} ${opts.thesisTitle}`)}
    ${opts.studentName ? p(`${strong("Student:")} ${opts.studentName}`) : ""}
    ${opts.studiengang ? p(`${strong("Programme:")} ${opts.studiengang}`) : ""}
    ${opts.semester ? p(`${strong("Semester:")} ${opts.semester}`) : ""}
    ${opts.actionUrl ? `<p style="margin:20px 0 0 0"><a href="${opts.actionUrl}" style="background:#76B900;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">Go to Dashboard</a></p>` : ""}
    ${regards("en")}
  `;
  return { subject, html: htmlWrapper(lang, body) };
}

// ─── Statusänderung (Studierende:r erhält Update) ─────────────────────────────
export function statusChangeEmail(lang: Lang, opts: {
  studentName?: string | null;
  thesisTitle: string;
  statusText: string;
}): { subject: string; html: string } {
  const subject = lang === "de"
    ? `HTW Berlin – Statusänderung: ${opts.thesisTitle}`
    : `HTW Berlin – Status Update: ${opts.thesisTitle}`;
  const body = `
    ${greeting(lang, opts.studentName)}
    ${p(opts.statusText)}
    ${regards(lang)}
  `;
  return { subject, html: htmlWrapper(lang, body) };
}

// ─── Anmeldefähigkeit ─────────────────────────────────────────────────────────
export function enrollmentEligibilityEmail(lang: Lang, opts: {
  studentName?: string | null;
  thesisTitle: string;
  eligible: boolean;
  note?: string | null;
}): { subject: string; html: string } {
  const subject = lang === "de"
    ? `HTW Berlin – Anmeldefähigkeit: ${opts.thesisTitle}`
    : `HTW Berlin – Enrollment Eligibility: ${opts.thesisTitle}`;
  let statusText: string;
  if (lang === "de") {
    statusText = opts.eligible
      ? "Sie sind anmeldefähig. Ihr Antrag kann eingereicht werden."
      : `Sie sind derzeit nicht anmeldefähig.${opts.note ? " Begründung: " + opts.note : ""} Bitte wenden Sie sich an die Prüfungsverwaltung.`;
  } else {
    statusText = opts.eligible
      ? "You are eligible to enroll. Your application can be submitted."
      : `You are currently not eligible to enroll.${opts.note ? " Reason: " + opts.note : ""} Please contact the examination office.`;
  }
  const body = `
    ${greeting(lang, opts.studentName)}
    ${p(statusText)}
    ${regards(lang)}
  `;
  return { subject, html: htmlWrapper(lang, body) };
}

// ─── Prüfungsfähigkeit ────────────────────────────────────────────────────────
export function defenseEligibilityEmail(lang: Lang, opts: {
  studentName?: string | null;
  thesisTitle: string;
  eligible: boolean;
  note?: string | null;
}): { subject: string; html: string } {
  const subject = lang === "de"
    ? `HTW Berlin – Prüfungsfähigkeit: ${opts.thesisTitle}`
    : `HTW Berlin – Defense Eligibility: ${opts.thesisTitle}`;
  let statusText: string;
  if (lang === "de") {
    statusText = opts.eligible
      ? "Sie sind prüfungsfähig. Ihr Kolloquium kann geplant werden."
      : `Sie sind derzeit nicht prüfungsfähig.${opts.note ? " Begründung: " + opts.note : ""} Bitte wenden Sie sich an die Prüfungsverwaltung.`;
  } else {
    statusText = opts.eligible
      ? "You are eligible for your defense. Your colloquium can be scheduled."
      : `You are currently not eligible for your defense.${opts.note ? " Reason: " + opts.note : ""} Please contact the examination office.`;
  }
  const body = `
    ${greeting(lang, opts.studentName)}
    ${p(statusText)}
    ${regards(lang)}
  `;
  return { subject, html: htmlWrapper(lang, body) };
}

// ─── Direkte Prüfer-Zuweisung (PAV weist Prüfer:in zu) ───────────────────────
export function directAssignmentEmail(lang: Lang, opts: {
  examinerName?: string | null;
  role: "first" | "second";
  thesisTitle: string;
}): { subject: string; html: string } {
  const roleLabel = lang === "de"
    ? (opts.role === "first" ? "Erstprüfer:in" : "Zweitprüfer:in")
    : (opts.role === "first" ? "first examiner" : "second examiner");
  const subject = lang === "de"
    ? `HTW Berlin – Sie wurden als ${roleLabel} zugewiesen: ${opts.thesisTitle}`
    : `HTW Berlin – You have been assigned as ${roleLabel}: ${opts.thesisTitle}`;
  const body = lang === "de" ? `
    ${greeting("de", opts.examinerName)}
    ${p(`Der Prüfungsausschuss hat Sie als ${strong(roleLabel)} für folgende Abschlussarbeit direkt zugewiesen:`)}
    ${p(strong(opts.thesisTitle))}
    ${p("Diese Zuweisung ist verbindlich und erfordert keine weitere Bestätigung Ihrerseits. Bei Rückfragen wenden Sie sich bitte an den Prüfungsausschuss.")}
    ${regards("de")}
  ` : `
    ${greeting("en", opts.examinerName)}
    ${p(`The examination committee has directly assigned you as ${strong(roleLabel)} for the following thesis:`)}
    ${p(strong(opts.thesisTitle))}
    ${p("This assignment is binding and does not require further confirmation on your part. For questions, please contact the examination committee.")}
    ${regards("en")}
  `;
  return { subject, html: htmlWrapper(lang, body) };
}

// ─── Standard-Templates für Prüfer (Zusage / Absage / Ausgebucht) ─────────────
export function defaultExaminerTemplate(lang: Lang, type: "acceptance" | "rejection" | "fully_booked", vars: {
  name?: string;
  thema?: string;
  semester?: string;
  studiengang?: string;
  examinerName?: string;
  examinerTitle?: string;
  bookingUrl?: string;
}): { subject: string; body: string } {
  const { name = "{{name}}", thema = "{{thema}}", semester = "{{semester}}", studiengang = "{{studiengang}}", examinerName = "", examinerTitle = "", bookingUrl = "" } = vars;
  const signature = examinerTitle ? `${examinerTitle} ${examinerName}` : examinerName;

  if (lang === "de") {
    switch (type) {
      case "acceptance":
        return {
          subject: `Zusage zur Betreuung Ihrer Arbeit mit dem Titel ${thema}`,
          body: `Sehr geehrte/r ${name},\n\nhiermit bestätige ich, dass ich als Erstgutachter für Ihre Thesis im Studiengang ${studiengang} mit dem Thema ${thema} im ${semester} zur Verfügung stehe.${bookingUrl ? `\n\nBitte buchen Sie alsbald einen Sprechstundentermin unter ${bookingUrl}` : ""}\n\nMit freundlichen Grüßen\n${signature}`,
        };
      case "rejection":
        return {
          subject: `Absage zur Betreuung Ihrer Arbeit mit dem Titel ${thema}`,
          body: `Sehr geehrte/r ${name},\n\nleider muss ich Ihre Anfrage zur Betreuung Ihrer Thesis mit dem Thema ${thema} ablehnen. Bitte wenden Sie sich an einen anderen Prüfer.\n\nMit freundlichen Grüßen\n${signature}`,
        };
      case "fully_booked":
        return {
          subject: `Keine Kapazität für Ihre Arbeit mit dem Titel ${thema}`,
          body: `Sehr geehrte/r ${name},\n\nleider stehen mir derzeit keine freien Betreuungskapazitäten zur Verfügung. Bitte wenden Sie sich an einen anderen Prüfer.\n\nMit freundlichen Grüßen\n${signature}`,
        };
    }
  } else {
    switch (type) {
      case "acceptance":
        return {
          subject: `Acceptance of supervision for your thesis: ${thema}`,
          body: `Dear ${name},\n\nI hereby confirm that I am available as first examiner for your thesis in the programme ${studiengang} on the topic "${thema}" in ${semester}.${bookingUrl ? `\n\nPlease book an office hour appointment at ${bookingUrl}` : ""}\n\nKind regards,\n${signature}`,
        };
      case "rejection":
        return {
          subject: `Rejection of supervision request for your thesis: ${thema}`,
          body: `Dear ${name},\n\nUnfortunately I must decline your request to supervise your thesis on the topic "${thema}". Please contact another examiner.\n\nKind regards,\n${signature}`,
        };
      case "fully_booked":
        return {
          subject: `No capacity available for your thesis: ${thema}`,
          body: `Dear ${name},\n\nUnfortunately I currently have no available supervision capacity. Please contact another examiner.\n\nKind regards,\n${signature}`,
        };
    }
  }
}
