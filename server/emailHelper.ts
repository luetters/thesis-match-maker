import nodemailer from "nodemailer";

// ─── Konfiguration ────────────────────────────────────────────────────────────
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
      secure: port === 465,
      auth: { user, pass },
    }),
    from,
  };
}

// ─── HTML-Template ────────────────────────────────────────────────────────────
function buildEmailHtml({
  title,
  greeting,
  body,
  ctaAcceptUrl,
  ctaRejectUrl,
  footer,
}: {
  title: string;
  greeting: string;
  body: string;
  ctaAcceptUrl?: string;
  ctaRejectUrl?: string;
  footer?: string;
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
        ✓ Anfrage annehmen
      </a>
      ${
        ctaRejectUrl
          ? `<a href="${ctaRejectUrl}"
               style="display: inline-block; padding: 14px 28px; background-color: #ffffff;
                      color: #dc2626; text-decoration: none; border-radius: 10px;
                      font-weight: 600; font-size: 15px; border: 2px solid #dc2626;">
               ✕ Anfrage ablehnen
             </a>`
          : ""
      }
    </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="de">
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
                  <td style="width: 40px; height: 40px; background-color: ${HTW_GREEN}; border-radius: 10px; text-align: center; vertical-align: middle;">
                    <span style="color: #ffffff; font-weight: 800; font-size: 18px;">T</span>
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
                Hochschule für Technik und Wirtschaft Berlin · Fachbereich 3<br/>
                Diese E-Mail wurde automatisch generiert. Bitte nicht antworten.
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

// ─── Generische sendEmail-Funktion ──────────────────────────────────────────────────────────────────

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const cfg = getTransporter();
  if (!cfg) {
    console.warn(`[Email] Kein Transporter – E-Mail an ${to} nicht gesendet.`);
    return;
  }
  await cfg.transporter.sendMail({ from: cfg.from, to, subject, html });
}

// ─── E-Mail-Typen ──────────────────────────────────────────────────────────────────

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
}: {
  to: string;
  examinerName: string;
  studentName: string;
  thesisTitle: string;
  department: string;
  acceptUrl: string;
  rejectUrl: string;
}): Promise<boolean> {
  const config = getTransporter();
  if (!config) return false;

  const { transporter, from } = config;

  const html = buildEmailHtml({
    title: "Neue Betreuungsanfrage",
    greeting: `Guten Tag ${examinerName},`,
    body: `
      <p>Sie haben eine neue Betreuungsanfrage für eine Abschlussarbeit erhalten:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f9fafb; border-radius: 10px; overflow: hidden;">
        <tr>
          <td style="padding: 12px 16px; color: #6b7280; font-size: 13px; width: 40%;">Thema</td>
          <td style="padding: 12px 16px; color: #111827; font-weight: 600; font-size: 13px;">${thesisTitle}</td>
        </tr>
        <tr style="background: #ffffff;">
          <td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">Studierende:r</td>
          <td style="padding: 12px 16px; color: #111827; font-size: 13px;">${studentName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">Fachbereich</td>
          <td style="padding: 12px 16px; color: #111827; font-size: 13px;">${department}</td>
        </tr>
      </table>
      <p>Bitte nehmen Sie die Anfrage an oder lehnen Sie sie ab. <strong>Kein Login erforderlich.</strong></p>
    `,
    ctaAcceptUrl: acceptUrl,
    ctaRejectUrl: rejectUrl,
    footer: `Dieser Link ist <strong>24 Stunden</strong> gültig. Nach Ablauf ist keine Aktion mehr möglich.
             Für weitere Verwaltung melden Sie sich im <a href="${acceptUrl.split("/examiner")[0]}/examiner" style="color: #006937;">Prüfer:innen-Dashboard</a> an.`,
  });

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `Betreuungsanfrage: ${thesisTitle}`,
      html,
    });
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
}: {
  to: string;
  studentName: string;
  thesisTitle: string;
  newStatus: "ACCEPTED" | "REJECTED" | "MATCHED";
  reason?: string;
  dashboardUrl: string;
}): Promise<boolean> {
  const config = getTransporter();
  if (!config) return false;

  const { transporter, from } = config;

  const statusLabels: Record<string, { label: string; color: string; emoji: string }> = {
    ACCEPTED: { label: "Angenommen", color: "#006937", emoji: "✓" },
    REJECTED: { label: "Abgelehnt", color: "#dc2626", emoji: "✕" },
    MATCHED: { label: "Matched", color: "#2563eb", emoji: "🎉" },
  };

  const statusInfo = statusLabels[newStatus] ?? { label: newStatus, color: "#6b7280", emoji: "•" };

  const html = buildEmailHtml({
    title: `Statusänderung: ${statusInfo.emoji} ${statusInfo.label}`,
    greeting: `Guten Tag ${studentName},`,
    body: `
      <p>Der Status Ihrer Abschlussarbeits-Anfrage hat sich geändert:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f9fafb; border-radius: 10px; overflow: hidden;">
        <tr>
          <td style="padding: 12px 16px; color: #6b7280; font-size: 13px; width: 40%;">Thema</td>
          <td style="padding: 12px 16px; color: #111827; font-weight: 600; font-size: 13px;">${thesisTitle}</td>
        </tr>
        <tr style="background: #ffffff;">
          <td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">Neuer Status</td>
          <td style="padding: 12px 16px;">
            <span style="display: inline-block; padding: 4px 10px; background-color: ${statusInfo.color}20; color: ${statusInfo.color}; border-radius: 20px; font-size: 12px; font-weight: 600;">
              ${statusInfo.label}
            </span>
          </td>
        </tr>
        ${reason ? `<tr><td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">Begründung</td><td style="padding: 12px 16px; color: #111827; font-size: 13px;">${reason}</td></tr>` : ""}
      </table>
      ${newStatus === "MATCHED" ? "<p>🎉 Herzlichen Glückwunsch! Ihre Anfrage wurde erfolgreich einem Prüfer:innen-Team zugewiesen.</p>" : ""}
    `,
    ctaAcceptUrl: dashboardUrl,
    footer: "Melden Sie sich in Ihrem Dashboard an, um weitere Details einzusehen.",
  });

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `Thesis Match: Status geändert – ${statusInfo.label}`,
      html,
    });
    return true;
  } catch (err) {
    console.error("[Email] Fehler beim Senden:", err);
    return false;
  }
}
