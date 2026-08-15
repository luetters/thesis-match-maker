import nodemailer from "nodemailer";
import { getEmailTemplateByKey } from "./db";

// ─── Platzhalter-Ersetzer ────────────────────────────────────────────────────
/**
 * Ersetzt alle {{platzhalter}} in einem Template-String durch die übergebenen Werte.
 */
function replacePlaceholders(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ─── DB-Vorlagen-Loader ──────────────────────────────────────────────────────
/**
 * Lädt eine E-Mail-Vorlage aus der DB und ersetzt Platzhalter.
 * Gibt null zurück, wenn die Vorlage nicht gefunden wurde (Fallback auf hartkodierten Text).
 */
async function loadTemplate(
  key: string,
  vars: Record<string, string>,
  lang?: "de" | "en"
): Promise<{ subject: string; html: string; text: string } | null> {
  try {
    const tpl = await getEmailTemplateByKey(key);
    if (!tpl) return null;
    // Sprachspezifische Felder bevorzugen, Fallback auf generische Felder
    const subject = lang === "de" && tpl.subjectDe
      ? tpl.subjectDe
      : lang === "en" && tpl.subjectEn
      ? tpl.subjectEn
      : tpl.subject;
    const html = lang === "de" && tpl.htmlBodyDe
      ? tpl.htmlBodyDe
      : lang === "en" && tpl.htmlBodyEn
      ? tpl.htmlBodyEn
      : tpl.htmlBody;
    const text = lang === "de" && tpl.textBodyDe
      ? tpl.textBodyDe
      : lang === "en" && tpl.textBodyEn
      ? tpl.textBodyEn
      : tpl.textBody;
    return {
      subject: replacePlaceholders(subject, vars),
      html: replacePlaceholders(html, vars),
      text: replacePlaceholders(text, vars),
    };
  } catch {
    return null;
  }
}

// - Konfiguration --
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? "Thesis Match HTW Berlin <noreply@htw-berlin.de>";

  if (!host || !user || !pass) {
    console.warn("[Email] SMTP nicht konfiguriert – E-Mails werden nicht versendet.");
    return null;
  }

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465 || port === 993,
      auth: { user, pass },
    }),
    from,
  };
}

// - HTML-Template -
function buildEmailHtml({
  title,
  greeting,
  body,
  ctaAcceptUrl,
  ctaRejectUrl,
  footer,
  lang = "de",
}: {
  title: string;
  greeting: string;
  body: string;
  ctaAcceptUrl?: string;
  ctaRejectUrl?: string;
  footer?: string;
  lang?: "de" | "en";
}): string {
  const HTW_GREEN = "#006937";
  const HTW_NAVY = "#0d1b2a";

  const ctaButtons = ctaAcceptUrl
    ? `
    <div style="margin: 32px 0; display: flex; gap: 12px; flex-wrap: wrap;">
      <a href="${ctaAcceptUrl}"
         style="display: inline-block; padding: 14px 28px; background-color: ${HTW_GREEN};
                color: #ffffff; text-decoration: none; border-radius: 10px;
                font-weight: 600; font-size: 15px; margin-right: 12px;">
        ${lang === "en" ? "✓ Accept request" : "✓ Anfrage annehmen"}
      </a>
      ${
        ctaRejectUrl
          ? `<a href="${ctaRejectUrl}"
               style="display: inline-block; padding: 14px 28px; background-color: #ffffff;
                      color: #dc2626; text-decoration: none; border-radius: 10px;
                      font-weight: 600; font-size: 15px; border: 2px solid #dc2626;">
               ${lang === "en" ? "✕ Decline request" : "✕ Anfrage ablehnen"}
             </a>`
          : ""
      }
    </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${HTW_NAVY}; padding: 28px 40px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 40px; height: 40px; text-align: center; vertical-align: middle;">
                    <img src="https://thesismatch.manus.space/manus-storage/thesis-logo-512_6fcdaa04.png" alt="Logo" width="40" height="40" style="display: block; border-radius: 8px;" />
                  </td>
                  <td style="padding-left: 12px;">
                    <div style="color: #ffffff; font-weight: 700; font-size: 16px;">Thesis Match</div>
                    <div style="color: #94a3b8; font-size: 12px;">HTW Berlin · Fachbereich 3</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 8px 0; color: ${HTW_NAVY}; font-size: 22px; font-weight: 700;">${title}</h1>
              <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px;">${greeting}</p>
              <div style="color: #374151; font-size: 15px; line-height: 1.7;">${body}</div>
              ${ctaButtons}
              ${
                footer
                  ? `<div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; line-height: 1.6;">${footer}</div>`
                  : ""
              }
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                HTW Berlin · ${lang === "en" ? "Department 3" : "Fachbereich 3"}<br/>
                ${lang === "en" ? "This email was generated automatically. Please do not reply." : "Diese E-Mail wurde automatisch generiert. Bitte nicht antworten."}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// - Generische sendEmail-Funktion -

export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
  bcc,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
  bcc?: string;
}): Promise<boolean> {
  const cfg = getTransporter();
  if (!cfg) {
    console.warn(`[Email] Kein Transporter – E-Mail an ${to} nicht gesendet.`);
    return false;
  }
  try {
    const info = await cfg.transporter.sendMail({ from: cfg.from, to, subject, html, text, attachments, ...(bcc ? { bcc } : {}) });
    console.log(`[Email] Gesendet an ${to} | Betreff: ${subject} | ID: ${info.messageId}`);
    return true;
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; response?: string };
    console.error(`[Email] Fehler beim Senden an ${to}: ${e.message} | Code: ${e.code} | Response: ${e.response}`);
    return false;
  }
}

// - E-Mail-Typen -

/**
 * Sendet einen JWT-gesicherten CTA-Link an eine Prüfer:in. * Kein Login erforderlich – der Link enthält das signierte Token.
 */
export async function sendExaminerCTAEmail({
  to,
  examinerName,
  studentName,
  thesisTitle,
  department,
  acceptUrl,
  rejectUrl,
  lang,
}: {
  to: string;
  examinerName: string;
  studentName: string;
  thesisTitle: string;
  department: string;
  acceptUrl: string;
  rejectUrl: string;
  lang?: "de" | "en";
}): Promise<boolean> {
  const config = getTransporter();
  if (!config) return false;

  const { transporter, from } = config;

  const vars: Record<string, string> = {
    examinerName,
    studentName,
    thesisTitle,
    department,
    actionUrl: acceptUrl,
    rejectUrl,
  };

  // DB-Vorlage laden (Fallback auf hartkodierten Text)
  const tpl = await loadTemplate("examiner_proposal", vars, lang);

  const useEnglish = lang === "en";
  const subject = tpl?.subject ?? (useEnglish ? `Supervision request: ${thesisTitle}` : `Betreuungsanfrage: ${thesisTitle}`);
  const html = tpl?.html ?? buildEmailHtml({
    title: useEnglish ? "New supervision request" : "Neue Betreuungsanfrage",
    greeting: useEnglish ? `Dear ${examinerName},` : `Guten Tag ${examinerName},`,
    body: `
      <p>${useEnglish ? "You have received a new supervision request for a thesis:" : "Sie haben eine neue Betreuungsanfrage für eine Abschlussarbeit erhalten:"}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f9fafb; border-radius: 10px; overflow: hidden;">
        <tr>
          <td style="padding: 12px 16px; color: #6b7280; font-size: 13px; width: 40%;">${useEnglish ? "Title" : "Thema"}</td>
          <td style="padding: 12px 16px; color: #111827; font-weight: 600; font-size: 13px;">${thesisTitle}</td>
        </tr>
        <tr style="background: #ffffff;">
          <td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">${useEnglish ? "Student" : "Studierende:r"}</td>
          <td style="padding: 12px 16px; color: #111827; font-size: 13px;">${studentName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">${useEnglish ? "Department" : "Fachbereich"}</td>
          <td style="padding: 12px 16px; color: #111827; font-size: 13px;">${department}</td>
        </tr>
      </table>
      <p>${useEnglish ? "Please accept or decline the request. <strong>No login required.</strong>" : "Bitte nehmen Sie die Anfrage an oder lehnen Sie sie ab. <strong>Kein Login erforderlich.</strong>"}</p>
    `,
    ctaAcceptUrl: acceptUrl,
    ctaRejectUrl: rejectUrl,
    footer: useEnglish ? `This link is valid for <strong>24 hours</strong>. No action is possible after it expires.` : `Dieser Link ist <strong>24 Stunden</strong> gültig. Nach Ablauf ist keine Aktion mehr möglich.`,
    lang,
  });
  const text = tpl?.text;

  try {
    await transporter.sendMail({ from, to, subject, html, text });
    console.log(`[Email] CTA-E-Mail an ${to} gesendet.`);
    return true;
  } catch (err) {
    console.error("[Email] Fehler beim Senden:", err);
    return false;
  }
}

/**
 * Benachrichtigt Studierende über eine Statusänderung ihrer Anfrage.
 */
export async function sendStatusChangeEmail({
  to,
  studentName,
  thesisTitle,
  newStatus,
  reason,
  dashboardUrl,
  lang,
}: {
  to: string;
  studentName: string;
  thesisTitle: string;
  newStatus: "ACCEPTED" | "REJECTED" | "MATCHED";
  reason?: string;
  dashboardUrl: string;
  lang?: "de" | "en";
}): Promise<boolean> {
  const config = getTransporter();
  if (!config) return false;
  const { transporter, from } = config;

  const useEnglish = lang === "en";
  const statusLabels: Record<string, { label: string; color: string; emoji: string }> = {
    ACCEPTED: { label: useEnglish ? "Accepted" : "Angenommen", color: "#006937", emoji: "✓" },
    REJECTED: { label: useEnglish ? "Rejected" : "Abgelehnt", color: "#dc2626", emoji: "✕" },
    MATCHED: { label: "Matched", color: "#2563eb", emoji: "🎉" },
  };
  const statusInfo = statusLabels[newStatus] ?? { label: newStatus, color: "#6b7280", emoji: "•" };

  const vars: Record<string, string> = {
    recipientName: studentName,
    studentName,
    thesisTitle,
    newStatus: `${statusInfo.emoji} ${statusInfo.label}`,
    rejectionReason: reason ?? "",
    dashboardUrl,
  };

  // DB-Vorlage laden (Fallback auf hartkodierten Text)
  const tpl = await loadTemplate("status_change", vars, lang);

  const subject = tpl?.subject ?? (useEnglish ? `Thesis Match: Status updated – ${statusInfo.label}` : `Thesis Match: Status geändert – ${statusInfo.label}`);
  const html = tpl?.html ?? buildEmailHtml({
    title: `${useEnglish ? "Status update" : "Statusänderung"}: ${statusInfo.emoji} ${statusInfo.label}`,
    greeting: useEnglish ? `Dear ${studentName},` : `Guten Tag ${studentName},`,
    body: `
      <p>${useEnglish ? "The status of your thesis application has changed:" : "Der Status Ihrer Abschlussarbeits-Anfrage hat sich geändert:"}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f9fafb; border-radius: 10px; overflow: hidden;">
        <tr>
          <td style="padding: 12px 16px; color: #6b7280; font-size: 13px; width: 40%;">${useEnglish ? "Title" : "Thema"}</td>
          <td style="padding: 12px 16px; color: #111827; font-weight: 600; font-size: 13px;">${thesisTitle}</td>
        </tr>
        <tr style="background: #ffffff;">
          <td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">${useEnglish ? "New status" : "Neuer Status"}</td>
          <td style="padding: 12px 16px;">
            <span style="display: inline-block; padding: 4px 10px; background-color: ${statusInfo.color}20; color: ${statusInfo.color}; border-radius: 20px; font-size: 12px; font-weight: 600;">
              ${statusInfo.label}
            </span>
          </td>
        </tr>
        ${reason ? `<tr><td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">${useEnglish ? "Reason" : "Begründung"}</td><td style="padding: 12px 16px; color: #111827; font-size: 13px;">${reason}</td></tr>` : ""}
      </table>
      ${newStatus === "MATCHED" ? `<p>🎉 ${useEnglish ? "Congratulations! Your application has been successfully assigned to an examination team." : "Herzlichen Glückwunsch! Ihre Anfrage wurde erfolgreich einem Prüfer:innen-Team zugewiesen."}</p>` : ""}
    `,
    ctaAcceptUrl: dashboardUrl,
    footer: useEnglish ? "Sign in to your dashboard to view further details." : "Melden Sie sich in Ihrem Dashboard an, um weitere Details einzusehen.",
    lang,
  });
  const text = tpl?.text;

  try {
    await transporter.sendMail({ from, to, subject, html, text });
    return true;
  } catch (err) {
    console.error("[Email] Fehler beim Senden:", err);
    return false;
  }
}


/**
 * Benachrichtigt PAV-Vorsitzende über eine neue Studiengang-Zuweisung durch den Superadmin.
 */
export async function sendPavProgrammeAssignmentEmail({
  to,
  pavName,
  programmeName,
  programmeLevel,
  dashboardUrl,
  removed = false,
  lang,
}: {
  to: string;
  pavName: string;
  programmeName: string;
  programmeLevel: string;
  dashboardUrl: string;
  removed?: boolean;
  lang?: "de" | "en";
}): Promise<boolean> {
  const config = getTransporter();
  if (!config) return false;
  const { transporter, from } = config;
  const useEnglish = lang === "en";
  const action = removed ? (useEnglish ? "removed" : "entfernt") : (useEnglish ? "assigned" : "zugewiesen");
  const emoji = removed ? "🔴" : "🟢";
  const html = buildEmailHtml({
    title: `${useEnglish ? "Programme" : "Studiengang"} ${action}: ${programmeName}`,
    greeting: useEnglish ? `Dear ${pavName},` : `Guten Tag ${pavName},`,
    body: `
      <p>${useEnglish ? "Your responsibilities as examination committee chair have been updated:" : "Ihre Zuständigkeiten als PA-Vorsitzende:r wurden aktualisiert:"}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f9fafb; border-radius: 10px; overflow: hidden;">
        <tr>
          <td style="padding: 12px 16px; color: #6b7280; font-size: 13px; width: 40%;">${useEnglish ? "Programme" : "Studiengang"}</td>
          <td style="padding: 12px 16px; color: #111827; font-weight: 600; font-size: 13px;">${programmeName}</td>
        </tr>
        <tr style="background: #ffffff;">
          <td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">${useEnglish ? "Degree" : "Abschluss"}</td>
          <td style="padding: 12px 16px; color: #111827; font-size: 13px;">${programmeLevel === "master" ? "Master" : "Bachelor"}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">${useEnglish ? "Action" : "Aktion"}</td>
          <td style="padding: 12px 16px; color: #111827; font-size: 13px;">${emoji} ${useEnglish ? "Programme was" : "Studiengang wurde"} ${action}</td>
        </tr>
      </table>
      ${!removed ? `<p>${useEnglish ? "You can now view unassigned students in this programme in the examination committee dashboard and propose examiners." : "Sie können ab sofort im PAV-Dashboard unzugeteilte Studierende dieses Studiengangs einsehen und Prüfer:innen vorschlagen."}</p>` : `<p>${useEnglish ? "This programme is no longer within your responsibilities. Existing proposals remain in place." : "Dieser Studiengang ist nicht mehr in Ihrer Zuständigkeit. Bereits eingereichte Vorschläge bleiben bestehen."}</p>`}
    `,
    ctaAcceptUrl: dashboardUrl,
    footer: useEnglish ? "Sign in to your examination committee dashboard to view your current responsibilities." : "Melden Sie sich in Ihrem PAV-Dashboard an, um Ihre aktuellen Zuständigkeiten einzusehen.",
    lang,
  });
  try {
    await transporter.sendMail({
      from,
      to,
      subject: `${useEnglish ? "Examination committee responsibility" : "PAV-Zuständigkeit"} ${removed ? action : (useEnglish ? "updated" : "aktualisiert")}: ${programmeName}`,
      html,
    });
    console.log(`[Email] PAV-Zuweisung-E-Mail an ${to} gesendet (${action}: ${programmeName}).`);
    return true;
  } catch (err) {
    console.error("[Email] Fehler beim Senden:", err);
    return false;
  }
}
