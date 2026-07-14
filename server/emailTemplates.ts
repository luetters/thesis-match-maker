/**
 * Zweisprachige E-Mail-Templates für alle automatisch versendeten E-Mails.
 * Jede E-Mail enthält immer BEIDE Sprachen: zuerst Deutsch, dann Englisch.
 * Am Anfang steht der Hinweis „English below".
 */

export type Lang = "de" | "en";

const SITE_URL_BASE = process.env.SITE_URL ?? process.env.FRONTEND_URL ?? "https://thesis.htw-berlin.com";
const LOGO_URL = `${SITE_URL_BASE}/manus-storage/ThesisMatchMaker_b92cd3c0.jpg`;

const FOOTER_NOTE_DE = "Dies ist eine automatisch generierte E-Mail vom Thesis Match Maker der HTW Berlin.";
const FOOTER_NOTE_EN = "This is an automatically generated email from the Thesis Match Maker of HTW Berlin.";

function htmlWrapper(content: string, showEnglishBelow = true): string {
  const englishBelowBanner = showEnglishBelow
    ? `<tr><td style="padding:8px 32px;background:#f0f7e6;border-bottom:1px solid #d4edaa">
        <p style="color:#5a7a00;font-size:12px;margin:0;font-style:italic">🇬🇧 <a href="#english" style="color:#5a7a00;text-decoration:underline">English below</a></p>
      </td></tr>`
    : "";
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:560px">
      <tr><td style="background:#006937;padding:24px 32px;text-align:center">
        <img src="${LOGO_URL}" alt="Thesis Match Maker" style="height:48px;max-width:200px;object-fit:contain;display:block;margin:0 auto" />
        <p style="color:#ffffff;margin:8px 0 0 0;font-size:13px;opacity:0.85">HTW Berlin – Thesis Match Maker</p>
      </td></tr>
      ${englishBelowBanner}
      <tr><td style="padding:32px">
        ${content}
      </td></tr>
      <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center">
        <p style="color:#9ca3af;font-size:11px;margin:0 0 4px 0">${FOOTER_NOTE_DE}</p>
        <p style="color:#9ca3af;font-size:11px;margin:0">${FOOTER_NOTE_EN}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function divider(): string {
  return `<hr id="english" style="border:none;border-top:2px solid #e5e7eb;margin:28px 0" />`;
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
  lang?: Lang;
}): { subject: string; html: string } {
  const roleDE = opts.role === "first" ? "Erstprüfer:in" : "Zweitprüfer:in";
  const roleEN = opts.role === "first" ? "first examiner" : "second examiner";
  // Betreff je nach Sprache
  const subject = opts.lang === "en"
    ? `HTW Berlin – Request as ${roleEN}: ${opts.thesisTitle}`
    : opts.lang === "de"
    ? `HTW Berlin – Anfrage als ${roleDE}: ${opts.thesisTitle}`
    : `HTW Berlin – Anfrage als ${roleDE} / Request as ${roleEN}: ${opts.thesisTitle}`;

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

  let body: string;
  if (opts.lang === "en") {
    body = `
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
  } else if (opts.lang === "de") {
    body = `
    ${p(`Sehr geehrte/r ${opts.examinerName ?? "Prüfer:in"},`)}
    ${p(`Der Prüfungsausschuss hat Sie als ${strong(roleDE)} für folgende Abschlussarbeit vorgeschlagen:`)}
    ${p(`${strong("Thema:")} ${opts.thesisTitle}`)}
    ${opts.studentName ? p(`${strong("Studierende:r:")} ${opts.studentName}`) : ""}
    ${opts.studiengang ? p(`${strong("Studiengang:")} ${opts.studiengang}`) : ""}
    ${opts.semester ? p(`${strong("Semester:")} ${opts.semester}`) : ""}
    ${p("Bitte nehmen Sie die Anfrage an oder lehnen Sie sie ab:")}
    ${ctaDE}
    ${p("Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsausschuss")}
  `;
  } else {
    // Kein lang angegeben: zweisprachig (Legacy-Verhalten)
    body = `
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
  }

  return { subject, html: htmlWrapper(body) };
}

// ─── Statusänderung ───────────────────────────────────────────────────────────
export function statusChangeEmail(opts: {
  recipientName?: string | null;
  thesisTitle: string;
  statusTextDE: string;
  statusTextEN: string;
  lang?: Lang;
}): { subject: string; html: string } {
  const subject = opts.lang === "en"
    ? `HTW Berlin – Status Update: ${opts.thesisTitle}`
    : opts.lang === "de"
    ? `HTW Berlin – Statusänderung: ${opts.thesisTitle}`
    : `HTW Berlin – Statusänderung / Status Update: ${opts.thesisTitle}`;
  let body: string;
  if (opts.lang === "en") {
    body = `
    ${p(`Dear ${opts.recipientName ?? "User"},`)}
    ${p(opts.statusTextEN)}
    ${p("Kind regards,<br>HTW Berlin – Examination Office")}
  `;
  } else if (opts.lang === "de") {
    body = `
    ${p(`Sehr geehrte/r ${opts.recipientName ?? "Nutzende/r"},`)}
    ${p(opts.statusTextDE)}
    ${p("Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung")}
  `;
  } else {
    body = `
    ${p(`Sehr geehrte/r ${opts.recipientName ?? "Nutzende/r"},`)}
    ${p(opts.statusTextDE)}
    ${p("Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung")}

    ${divider()}

    ${p(`Dear ${opts.recipientName ?? "User"},`)}
    ${p(opts.statusTextEN)}
    ${p("Kind regards,<br>HTW Berlin – Examination Office")}
  `;
  }
  return { subject, html: htmlWrapper(body) };
}

// ─── Zusage unter Vorbehalt ──────────────────────────────────────────────────
export function conditionalAcceptanceEmail(opts: {
  recipientName?: string | null;
  examinerName?: string | null;
  thesisTitle: string;
  reason: string;
  lang?: Lang;
}): { subject: string; html: string } {
  const subject = opts.lang === "en"
    ? `HTW Berlin – Conditional Acceptance: ${opts.thesisTitle}`
    : `HTW Berlin – Zusage unter Vorbehalt: ${opts.thesisTitle}`;

  const reasonBlockDE = opts.reason
    ? `${p(`<strong>Vorbehalt / Hinweis des Betreuers:</strong>`)}
       ${p(opts.reason)}`
    : "";
  const reasonBlockEN = opts.reason
    ? `${p(`<strong>Condition / Note from supervisor:</strong>`)}
       ${p(opts.reason)}`
    : "";

  let body: string;
  if (opts.lang === "en") {
    body = `
    ${p(`Dear ${opts.recipientName ?? "Student"},`)}
    ${p(`Your thesis application <strong>&ldquo;${opts.thesisTitle}&rdquo;</strong> has received a <strong>conditional acceptance</strong> from ${opts.examinerName ?? "your supervisor"}.`)}
    ${p("This means the supervisor is generally willing to supervise your thesis, but has indicated conditions or open questions that must be resolved before a final commitment can be given.")}
    ${reasonBlockEN}
    ${p("Please contact your supervisor directly to clarify the open points. Once all conditions have been met, the supervisor will confirm the final acceptance in the system.")}
    ${p("Kind regards,<br>HTW Berlin \u2013 Examination Office")}
  `;
  } else if (opts.lang === "de") {
    body = `
    ${p(`Sehr geehrte/r ${opts.recipientName ?? "Studierende/r"},`)}
    ${p(`Ihre Abschlussarbeitsanfrage <strong>&bdquo;${opts.thesisTitle}&ldquo;</strong> hat eine <strong>Zusage unter Vorbehalt</strong> von ${opts.examinerName ?? "Ihrer Betreuungsperson"} erhalten.`)}
    ${p("Das bedeutet, dass die Betreuungsperson grunds\u00e4tzlich bereit ist, Ihre Arbeit zu betreuen, jedoch noch Bedingungen oder offene Fragen bestehen, die vor einer endg\u00fcltigen Zusage gekl\u00e4rt werden m\u00fcssen.")}
    ${reasonBlockDE}
    ${p("Bitte nehmen Sie direkt Kontakt mit Ihrer Betreuungsperson auf, um die offenen Punkte zu kl\u00e4ren. Sobald alle Bedingungen erf\u00fcllt sind, wird die Betreuungsperson die endg\u00fcltige Zusage im System best\u00e4tigen.")}
    ${p("Mit freundlichen Gr\u00fc\u00dfen<br>HTW Berlin \u2013 Pr\u00fcfungsverwaltung")}
  `;
  } else {
    // Zweisprachig (Standard)
    body = `
    ${p(`Sehr geehrte/r ${opts.recipientName ?? "Studierende/r"},`)}
    ${p(`Ihre Abschlussarbeitsanfrage <strong>&bdquo;${opts.thesisTitle}&ldquo;</strong> hat eine <strong>Zusage unter Vorbehalt</strong> von ${opts.examinerName ?? "Ihrer Betreuungsperson"} erhalten.`)}
    ${p("Das bedeutet, dass die Betreuungsperson grunds\u00e4tzlich bereit ist, Ihre Arbeit zu betreuen, jedoch noch Bedingungen oder offene Fragen bestehen, die vor einer endg\u00fcltigen Zusage gekl\u00e4rt werden m\u00fcssen.")}
    ${reasonBlockDE}
    ${p("Bitte nehmen Sie direkt Kontakt mit Ihrer Betreuungsperson auf, um die offenen Punkte zu kl\u00e4ren. Sobald alle Bedingungen erf\u00fcllt sind, wird die Betreuungsperson die endg\u00fcltige Zusage im System best\u00e4tigen.")}
    ${p("Mit freundlichen Gr\u00fc\u00dfen<br>HTW Berlin \u2013 Pr\u00fcfungsverwaltung")}

    ${divider()}

    ${p(`Dear ${opts.recipientName ?? "Student"},`)}
    ${p(`Your thesis application <strong>&ldquo;${opts.thesisTitle}&rdquo;</strong> has received a <strong>conditional acceptance</strong> from ${opts.examinerName ?? "your supervisor"}.`)}
    ${p("This means the supervisor is generally willing to supervise your thesis, but has indicated conditions or open questions that must be resolved before a final commitment can be given.")}
    ${reasonBlockEN}
    ${p("Please contact your supervisor directly to clarify the open points. Once all conditions have been met, the supervisor will confirm the final acceptance in the system.")}
    ${p("Kind regards,<br>HTW Berlin \u2013 Examination Office")}
  `;
  }
  return { subject, html: htmlWrapper(body) };
}

// ─── Anmeldefähigkeit ─────────────────────────────────────────────────────────
export function enrollmentEligibilityEmail(opts: {
  studentName?: string | null;
  thesisTitle: string;
  eligible: boolean;
  note?: string | null;
  lang?: Lang;
}): { subject: string; html: string } {
  const subject = opts.lang === "en"
    ? `HTW Berlin – Enrollment Eligibility: ${opts.thesisTitle}`
    : opts.lang === "de"
    ? `HTW Berlin – Anmeldefähigkeit: ${opts.thesisTitle}`
    : `HTW Berlin – Anmeldefähigkeit / Enrollment Eligibility: ${opts.thesisTitle}`;
  const statusDE = opts.eligible
    ? "Ihre Anmeldefähigkeit wurde bestätigt. Ihr Antrag wird nun weiterbearbeitet."
    : `Ihre Anmeldefähigkeit wurde nicht bestätigt. Ihr Antrag wurde abgelehnt.${opts.note ? " Begründung: " + opts.note : ""} Bitte wenden Sie sich an die Prüfungsverwaltung.`;
  const statusEN = opts.eligible
    ? "Your enrollment eligibility has been confirmed. Your application will now be processed further."
    : `Your enrollment eligibility has not been confirmed. Your application has been rejected.${opts.note ? " Reason: " + opts.note : ""} Please contact the examination office.`;

  let body: string;
  if (opts.lang === "en") {
    body = `
    ${p(`Dear ${opts.studentName ?? "Student"},`)}
    ${p(statusEN)}
    ${p("Kind regards,<br>HTW Berlin – Examination Office")}
  `;
  } else if (opts.lang === "de") {
    body = `
    ${p(`Sehr geehrte/r ${opts.studentName ?? "Studierende/r"},`)}
    ${p(statusDE)}
    ${p("Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung")}
  `;
  } else {
    body = `
    ${p(`Sehr geehrte/r ${opts.studentName ?? "Studierende/r"},`)}
    ${p(statusDE)}
    ${p("Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung")}

    ${divider()}

    ${p(`Dear ${opts.studentName ?? "Student"},`)}
    ${p(statusEN)}
    ${p("Kind regards,<br>HTW Berlin – Examination Office")}
  `;
  }
  return { subject, html: htmlWrapper(body) };
}

// ─── Prüfungsfähigkeit ────────────────────────────────────────────────────────
export function defenseEligibilityEmail(opts: {
  studentName?: string | null;
  thesisTitle: string;
  eligible: boolean;
  note?: string | null;
  lang?: Lang;
}): { subject: string; html: string } {
  const subject = opts.lang === "en"
    ? `HTW Berlin – Defense Eligibility: ${opts.thesisTitle}`
    : opts.lang === "de"
    ? `HTW Berlin – Prüfungsfähigkeit: ${opts.thesisTitle}`
    : `HTW Berlin – Prüfungsfähigkeit / Defense Eligibility: ${opts.thesisTitle}`;
  const statusDE = opts.eligible
    ? "Sie sind prüfungsfähig. Ihr Kolloquium kann geplant werden."
    : `Sie sind derzeit nicht prüfungsfähig.${opts.note ? " Begründung: " + opts.note : ""} Bitte wenden Sie sich an die Prüfungsverwaltung.`;
  const statusEN = opts.eligible
    ? "You are eligible for your defense. Your colloquium can be scheduled."
    : `You are currently not eligible for your defense.${opts.note ? " Reason: " + opts.note : ""} Please contact the examination office.`;

  let body: string;
  if (opts.lang === "en") {
    body = `
    ${p(`Dear ${opts.studentName ?? "Student"},`)}
    ${p(statusEN)}
    ${p("Kind regards,<br>HTW Berlin – Examination Office")}
  `;
  } else if (opts.lang === "de") {
    body = `
    ${p(`Sehr geehrte/r ${opts.studentName ?? "Studierende/r"},`)}
    ${p(statusDE)}
    ${p("Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung")}
  `;
  } else {
    body = `
    ${p(`Sehr geehrte/r ${opts.studentName ?? "Studierende/r"},`)}
    ${p(statusDE)}
    ${p("Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung")}

    ${divider()}

    ${p(`Dear ${opts.studentName ?? "Student"},`)}
    ${p(statusEN)}
    ${p("Kind regards,<br>HTW Berlin – Examination Office")}
  `;
  }
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

// ─── Freischaltungs-E-Mails ───────────────────────────────────────────────────
// SITE_URL kann per Umgebungsvariable überschrieben werden (z.B. für spätere Domain-Änderungen)
const SITE_URL = process.env.SITE_URL ?? "https://thesis.htw-berlin.com";

export function roleApprovedEmail(opts: {
  userName: string;
  roleLabel: string;
  dashboardPath: string; // z.B. "/examiner"
}): { subject: string; html: string; text: string } {
  const dashboardUrl = `${SITE_URL}${opts.dashboardPath}`;
  const subject = `Ihre Rolle wurde freigeschaltet – HTW Berlin Thesis Match Maker / Your role has been activated`;
  const body = `
    <h2 style="color:#1a1a2e;font-size:20px;margin:0 0 16px 0">Freischaltung bestätigt / Role Activated</h2>
    ${p(`Sehr geehrte:r ${opts.userName},`)}
    ${p(`Ihre Rolle als <strong style="color:#006937">${opts.roleLabel}</strong> wurde soeben durch die Verwaltung freigeschaltet. Sie können sich nun vollständig im System anmelden und alle Funktionen nutzen.`)}
    <p style="margin:20px 0 24px 0">
      <a href="${dashboardUrl}" style="background:#76B900;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">Zum Dashboard</a>
    </p>
    ${p("Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung")}
    ${divider()}
    ${p(`Dear ${opts.userName},`)}
    ${p(`Your role as <strong style="color:#006937">${opts.roleLabel}</strong> has been activated by the administration. You can now log in and use all features.`)}
    <p style="margin:20px 0 24px 0">
      <a href="${dashboardUrl}" style="background:#76B900;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">Go to Dashboard</a>
    </p>
    ${p("Kind regards,<br>HTW Berlin – Examination Office")}
  `;
  return {
    subject,
    html: htmlWrapper(body),
    text: `Ihre Rolle als ${opts.roleLabel} wurde freigeschaltet.\nZum Dashboard: ${dashboardUrl}\n\nYour role as ${opts.roleLabel} has been activated.\nGo to dashboard: ${dashboardUrl}`,
  };
}

export function roleRejectedEmail(opts: {
  userName: string;
  roleLabel: string;
  reason?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Ihre Rollenanfrage wurde abgelehnt – HTW Berlin Thesis Match Maker / Your role request was declined`;
  const reasonBlockDE = opts.reason ? p(`<strong>Begründung:</strong> ${opts.reason}`) : "";
  const reasonBlockEN = opts.reason ? p(`<strong>Reason:</strong> ${opts.reason}`) : "";
  const body = `
    <h2 style="color:#1a1a2e;font-size:20px;margin:0 0 16px 0">Rollenanfrage abgelehnt / Role Request Declined</h2>
    ${p(`Sehr geehrte:r ${opts.userName},`)}
    ${p(`Ihre Anfrage zur Rolle <strong>${opts.roleLabel}</strong> wurde leider abgelehnt.`)}
    ${reasonBlockDE}
    ${p(`Bei Fragen wenden Sie sich bitte an das Prüfungsamt: <a href="mailto:pruefungsamt@htw-berlin.de" style="color:#006937">pruefungsamt@htw-berlin.de</a>`)}
    ${p("Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung")}
    ${divider()}
    ${p(`Dear ${opts.userName},`)}
    ${p(`Your request for the role <strong>${opts.roleLabel}</strong> has been declined.`)}
    ${reasonBlockEN}
    ${p(`If you have questions, please contact the examination office: <a href="mailto:pruefungsamt@htw-berlin.de" style="color:#006937">pruefungsamt@htw-berlin.de</a>`)}
    ${p("Kind regards,<br>HTW Berlin – Examination Office")}
  `;
  return {
    subject,
    html: htmlWrapper(body),
    text: `Ihre Rollenanfrage als ${opts.roleLabel} wurde abgelehnt.${opts.reason ? " Begründung: " + opts.reason : ""}\n\nYour role request as ${opts.roleLabel} was declined.${opts.reason ? " Reason: " + opts.reason : ""}`,
  };
}

// ─── Zweitgutachter: Bestätigung ─────────────────────────────────────────────
export function buildSecondExaminerConfirmedEmail(opts: {
  recipientName?: string | null;
  recipientRole: "first" | "student";
  secondExaminerName: string;
  thesisTitle: string;
}): { subject: string; html: string; text: string } {
  const subject = `Zweitgutachter:in bestätigt / Second Examiner Confirmed – ${opts.thesisTitle}`;
  const baseUrl = process.env.SITE_URL ?? process.env.FRONTEND_URL ?? "https://thesis.htw-berlin.com";

  const bodyDE = opts.recipientRole === "student"
    ? `${p(`Sehr geehrte/r ${opts.recipientName ?? "Studierende/r"},`)}
       ${p(`<strong>${opts.secondExaminerName}</strong> hat die Zweitbetreuung Ihrer Abschlussarbeit <strong>&bdquo;${opts.thesisTitle}&ldquo;</strong> bestätigt. Ihr Prüfungsteam ist nun vollständig.`)}
       ${p("Sie können jetzt Ihr aktualisiertes Anmeldedokument (mit Zweitgutachter:in) herunterladen.")}
       <p style="margin:20px 0 12px 0"><a href="${baseUrl}" style="background:#006937;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">Zum Dashboard</a></p>
       ${p("Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung")}`
    : `${p(`Sehr geehrte/r ${opts.recipientName ?? "Prüfer:in"},`)}
       ${p(`<strong>${opts.secondExaminerName}</strong> hat die Zweitbetreuung für folgende Abschlussarbeit bestätigt: <strong>&bdquo;${opts.thesisTitle}&ldquo;</strong>`)}
       <p style="margin:20px 0 12px 0"><a href="${baseUrl}" style="background:#006937;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">Zum Dashboard</a></p>
       ${p("Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung")}`;

  const bodyEN = opts.recipientRole === "student"
    ? `${p(`Dear ${opts.recipientName ?? "Student"},`)}
       ${p(`<strong>${opts.secondExaminerName}</strong> has confirmed the second supervision for your thesis <strong>&ldquo;${opts.thesisTitle}&rdquo;</strong>. Your examination team is now complete.`)}
       ${p("You can now download your updated registration document (including the second examiner).")}
       <p style="margin:20px 0 12px 0"><a href="${baseUrl}" style="background:#006937;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">Go to Dashboard</a></p>
       ${p("Kind regards,<br>HTW Berlin – Examination Office")}`
    : `${p(`Dear ${opts.recipientName ?? "Examiner"},`)}
       ${p(`<strong>${opts.secondExaminerName}</strong> has confirmed the second supervision for the thesis: <strong>&ldquo;${opts.thesisTitle}&rdquo;</strong>`)}
       <p style="margin:20px 0 12px 0"><a href="${baseUrl}" style="background:#006937;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">Go to Dashboard</a></p>
       ${p("Kind regards,<br>HTW Berlin – Examination Office")}`;

  const body = `${bodyDE}${divider()}${bodyEN}`;
  const text = opts.recipientRole === "student"
    ? `${opts.secondExaminerName} hat die Zweitbetreuung Ihrer Abschlussarbeit "${opts.thesisTitle}" bestätigt.\n\nDashboard: ${baseUrl}`
    : `${opts.secondExaminerName} hat die Zweitbetreuung für "${opts.thesisTitle}" bestätigt.\n\nDashboard: ${baseUrl}`;
  return { subject, html: htmlWrapper(body), text };
}

// ─── Zweitgutachter: Ablehnung ────────────────────────────────────────────────
export function buildSecondExaminerRejectedEmail(opts: {
  recipientName?: string | null;
  secondExaminerName: string;
  thesisTitle: string;
  rejectionReason?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Zweitgutachter:in hat abgelehnt / Second Examiner Declined – ${opts.thesisTitle}`;
  const baseUrl = process.env.SITE_URL ?? process.env.FRONTEND_URL ?? "https://thesis.htw-berlin.com";
  const reasonDE = opts.rejectionReason ? p(`<strong>Begründung:</strong> ${opts.rejectionReason}`) : "";
  const reasonEN = opts.rejectionReason ? p(`<strong>Reason:</strong> ${opts.rejectionReason}`) : "";

  const body = `
    ${p(`Sehr geehrte/r ${opts.recipientName ?? "Studierende/r"},`)}
    ${p(`<strong>${opts.secondExaminerName}</strong> hat die Zweitbetreuung Ihrer Abschlussarbeit <strong>&bdquo;${opts.thesisTitle}&ldquo;</strong> leider abgelehnt.`)}
    ${reasonDE}
    ${p("Bitte wählen Sie in Ihrem Dashboard eine andere Zweitgutachter:in aus.")}
    <p style="margin:20px 0 12px 0"><a href="${baseUrl}" style="background:#006937;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">Zum Dashboard</a></p>
    ${p("Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung")}

    ${divider()}

    ${p(`Dear ${opts.recipientName ?? "Student"},`)}
    ${p(`<strong>${opts.secondExaminerName}</strong> has unfortunately declined the second supervision for your thesis <strong>&ldquo;${opts.thesisTitle}&rdquo;</strong>.`)}
    ${reasonEN}
    ${p("Please select a different second examiner in your dashboard.")}
    <p style="margin:20px 0 12px 0"><a href="${baseUrl}" style="background:#006937;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">Go to Dashboard</a></p>
    ${p("Kind regards,<br>HTW Berlin – Examination Office")}
  `;
  const text = `${opts.secondExaminerName} hat die Zweitbetreuung Ihrer Abschlussarbeit "${opts.thesisTitle}" abgelehnt.${opts.rejectionReason ? `\nBegründung: ${opts.rejectionReason}` : ""}\n\nBitte wählen Sie eine andere Person.\n\nDashboard: ${baseUrl}`;
  return { subject, html: htmlWrapper(body), text };
}

// ─── Zweitgutachter: Anfrage ──────────────────────────────────────────────────
export function buildSecondExaminerRequestEmail(opts: {
  examinerName?: string | null;
  studentName: string;
  thesisTitle: string;
  semester?: string;
  personalNote?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Anfrage als Zweitgutachter:in / Request as Second Examiner – ${opts.thesisTitle}`;
  const baseUrl = process.env.SITE_URL ?? process.env.FRONTEND_URL ?? "https://thesis.htw-berlin.com";
  const personalNoteBlockDE = opts.personalNote
    ? `<div style="margin:16px 0;padding:16px;background:#f0fdf4;border-left:4px solid #006937;border-radius:4px;">
        <p style="margin:0 0 4px 0;font-size:12px;color:#6b7280;font-weight:600;">Persönliche Nachricht der/des Studierenden:</p>
        <p style="margin:0;color:#1f2937;font-size:14px;white-space:pre-wrap;">${opts.personalNote.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
       </div>`
    : "";
  const personalNoteBlockEN = opts.personalNote
    ? `<div style="margin:16px 0;padding:16px;background:#f0fdf4;border-left:4px solid #006937;border-radius:4px;">
        <p style="margin:0 0 4px 0;font-size:12px;color:#6b7280;font-weight:600;">Personal message from the student:</p>
        <p style="margin:0;color:#1f2937;font-size:14px;white-space:pre-wrap;">${opts.personalNote.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
       </div>`
    : "";

  const body = `
    ${p(`Sehr geehrte/r ${opts.examinerName ?? "Prüfer:in"},`)}
    ${p(`<strong>${opts.studentName}</strong> hat Sie als Zweitgutachter:in für folgende Abschlussarbeit ausgewählt:`)}
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:10px 16px;color:#6b7280;font-size:13px;">Thema</td><td style="padding:10px 16px;font-weight:600;">${opts.thesisTitle}</td></tr>
      <tr style="background:#fff;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;">Studierende:r</td><td style="padding:10px 16px;">${opts.studentName}</td></tr>
      ${opts.semester ? `<tr><td style="padding:10px 16px;color:#6b7280;font-size:13px;">Semester</td><td style="padding:10px 16px;">${opts.semester}</td></tr>` : ""}
    </table>
    ${personalNoteBlockDE}
    ${p("Bitte melden Sie sich in Ihrem Dashboard an und bestätigen oder lehnen Sie die Anfrage ab.")}
    <p style="margin:20px 0 12px 0"><a href="${baseUrl}" style="background:#006937;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">Zum Dashboard – Anfrage beantworten</a></p>
    ${p("Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung")}

    ${divider()}

    ${p(`Dear ${opts.examinerName ?? "Examiner"},`)}
    ${p(`<strong>${opts.studentName}</strong> has selected you as second examiner for the following thesis:`)}
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:10px 16px;color:#6b7280;font-size:13px;">Title</td><td style="padding:10px 16px;font-weight:600;">${opts.thesisTitle}</td></tr>
      <tr style="background:#fff;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;">Student</td><td style="padding:10px 16px;">${opts.studentName}</td></tr>
      ${opts.semester ? `<tr><td style="padding:10px 16px;color:#6b7280;font-size:13px;">Semester</td><td style="padding:10px 16px;">${opts.semester}</td></tr>` : ""}
    </table>
    ${personalNoteBlockEN}
    ${p("Please log in to your dashboard and accept or decline the request.")}
    <p style="margin:20px 0 12px 0"><a href="${baseUrl}" style="background:#006937;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">Go to Dashboard – Respond to Request</a></p>
    ${p("Kind regards,<br>HTW Berlin – Examination Office")}
  `;
  const text = `${opts.studentName} hat Sie als Zweitgutachter:in für "${opts.thesisTitle}" ausgewählt.\n\nBitte melden Sie sich an und beantworten Sie die Anfrage: ${baseUrl}`;
  return { subject, html: htmlWrapper(body), text };
}

// ─── Erinnerungsmail an Gutachter:in ─────────────────────────────────────────
export function buildExaminerReminderEmail(opts: {
  examinerName?: string | null;
  role: "first" | "second";
  thesisTitle: string;
  studentName?: string | null;
  studiengang?: string | null;
  semester?: string | null;
  requestedAt?: string | null;
  acceptUrl?: string;
  declineUrl?: string;
  dashboardUrl?: string;
}): { subject: string; html: string; text: string } {
  const roleDE = opts.role === "first" ? "Erstgutachter:in" : "Zweitgutachter:in";
  const roleEN = opts.role === "first" ? "first examiner" : "second examiner";
  const subject = `HTW Berlin – Erinnerung: Ausstehende Anfrage als ${roleDE} / Reminder: Pending request as ${roleEN}`;

  const ctaDE = opts.acceptUrl && opts.declineUrl
    ? `<p style="margin:20px 0 12px 0">
        <a href="${opts.acceptUrl}" style="background:#76B900;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;margin-right:8px;display:inline-block">Anfrage annehmen</a>
        <a href="${opts.declineUrl}" style="background:#dc2626;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">Anfrage ablehnen</a>
       </p>`
    : opts.dashboardUrl
    ? `<p style="margin:20px 0 12px 0"><a href="${opts.dashboardUrl}" style="background:#76B900;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">Zum Dashboard – Anfrage beantworten</a></p>`
    : "";

  const ctaEN = opts.acceptUrl && opts.declineUrl
    ? `<p style="margin:20px 0 12px 0">
        <a href="${opts.acceptUrl}" style="background:#76B900;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;margin-right:8px;display:inline-block">Accept request</a>
        <a href="${opts.declineUrl}" style="background:#dc2626;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">Decline request</a>
       </p>`
    : opts.dashboardUrl
    ? `<p style="margin:20px 0 12px 0"><a href="${opts.dashboardUrl}" style="background:#76B900;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">Go to Dashboard – Respond to Request</a></p>`
    : "";

  const requestedNote = opts.requestedAt
    ? `<p style="color:#92400e;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:10px 14px;font-size:13px;margin:12px 0;">
        ⏰ Diese Anfrage wurde am ${new Date(opts.requestedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })} gestellt und wartet noch auf Ihre Antwort.
       </p>`
    : "";
  const requestedNoteEN = opts.requestedAt
    ? `<p style="color:#92400e;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:10px 14px;font-size:13px;margin:12px 0;">
        ⏰ This request was sent on ${new Date(opts.requestedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })} and is still awaiting your response.
       </p>`
    : "";

  const body = `
    ${p(`Sehr geehrte/r ${opts.examinerName ?? "Prüfer:in"},`)}
    ${p(`dies ist eine freundliche Erinnerung: Sie wurden als ${strong(roleDE)} für folgende Abschlussarbeit angefragt und haben die Anfrage noch nicht beantwortet.`)}
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:10px 16px;color:#6b7280;font-size:13px;">Thema</td><td style="padding:10px 16px;font-weight:600;">${opts.thesisTitle}</td></tr>
      ${opts.studentName ? `<tr style="background:#fff;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;">Studierende:r</td><td style="padding:10px 16px;">${opts.studentName}</td></tr>` : ""}
      ${opts.studiengang ? `<tr><td style="padding:10px 16px;color:#6b7280;font-size:13px;">Studiengang</td><td style="padding:10px 16px;">${opts.studiengang}</td></tr>` : ""}
      ${opts.semester ? `<tr style="background:#fff;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;">Semester</td><td style="padding:10px 16px;">${opts.semester}</td></tr>` : ""}
    </table>
    ${requestedNote}
    ${p("Bitte nehmen Sie die Anfrage an oder lehnen Sie sie ab:")}
    ${ctaDE}
    ${p("Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung")}

    ${divider()}

    ${p(`Dear ${opts.examinerName ?? "Examiner"},`)}
    ${p(`This is a friendly reminder: you have been requested as ${strong(roleEN)} for the following thesis and have not yet responded.`)}
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:10px 16px;color:#6b7280;font-size:13px;">Title</td><td style="padding:10px 16px;font-weight:600;">${opts.thesisTitle}</td></tr>
      ${opts.studentName ? `<tr style="background:#fff;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;">Student</td><td style="padding:10px 16px;">${opts.studentName}</td></tr>` : ""}
      ${opts.studiengang ? `<tr><td style="padding:10px 16px;color:#6b7280;font-size:13px;">Programme</td><td style="padding:10px 16px;">${opts.studiengang}</td></tr>` : ""}
      ${opts.semester ? `<tr style="background:#fff;"><td style="padding:10px 16px;color:#6b7280;font-size:13px;">Semester</td><td style="padding:10px 16px;">${opts.semester}</td></tr>` : ""}
    </table>
    ${requestedNoteEN}
    ${p("Please accept or decline the request:")}
    ${ctaEN}
    ${p("Kind regards,<br>HTW Berlin – Examination Office")}
  `;

  const text = `Erinnerung: Ausstehende Anfrage als ${roleDE} für "${opts.thesisTitle}"${opts.studentName ? ` von ${opts.studentName}` : ""}.\n\nBitte beantworten Sie die Anfrage über das Portal.`;

  return { subject, html: htmlWrapper(body), text };
}
