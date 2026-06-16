/**
 * Sendet eine Test-Registrierungs-E-Mail an die angegebene Adresse.
 * Verwendung: node scripts/sendTestEmail.mjs
 */
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.error("SMTP-Konfiguration fehlt in .env");
  process.exit(1);
}

const port = parseInt(SMTP_PORT ?? "587");
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port,
  secure: port === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  tls: { rejectUnauthorized: false },
});

const siteOrigin = "https://thesis.htw-berlin.com";
const adminUrl = `${siteOrigin}/admin`;
const logoUrl = `${siteOrigin}/manus-storage/ThesisMatchMaker_e15e6348.jpg`;

const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
      <!-- Header -->
      <tr><td style="background:#76B900;padding:24px 32px;text-align:center">
        <img src="${logoUrl}" alt="Thesis Match Maker" width="120" style="display:block;margin:0 auto 8px auto;border-radius:8px" />
        <span style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:0.5px">Thesis Match Maker</span><br>
        <span style="color:#e8f5d0;font-size:13px">HTW Berlin &ndash; Fachbereich 3</span>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:32px">
        <h2 style="color:#1a1a2e;font-size:20px;margin:0 0 16px 0">Neue Registrierung wartet auf Freischaltung</h2>
        <p style="color:#374151;font-size:14px;margin:0 0 20px 0">Eine neue Person hat sich registriert und wartet auf Ihre Freischaltung:</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden">
          <tr><td style="padding:12px 16px;font-weight:bold;color:#6b7280;font-size:13px;width:40%;border-bottom:1px solid #e5e7eb">Name</td><td style="padding:12px 16px;color:#111827;font-size:14px;border-bottom:1px solid #e5e7eb">Max Mustermann (Test)</td></tr>
          <tr><td style="padding:12px 16px;font-weight:bold;color:#6b7280;font-size:13px;width:40%;border-bottom:1px solid #e5e7eb">E-Mail</td><td style="padding:12px 16px;font-size:14px;border-bottom:1px solid #e5e7eb"><a href="mailto:max.mustermann@student.htw-berlin.de" style="color:#76B900;text-decoration:none">max.mustermann@student.htw-berlin.de</a></td></tr>
          <tr><td style="padding:12px 16px;font-weight:bold;color:#6b7280;font-size:13px;width:40%">Gewünschte Rolle</td><td style="padding:12px 16px;color:#111827;font-size:14px">Studierende:r</td></tr>
        </table>
        <p style="color:#374151;font-size:14px;margin:24px 0 20px 0">Bitte melden Sie sich im Admin-Dashboard an, um den Zugang freizuschalten oder abzulehnen.</p>
        <p style="margin:0 0 32px 0">
          <a href="${adminUrl}" style="background:#76B900;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-size:14px;font-weight:bold">Zum Admin-Dashboard</a>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px 0">
        <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.6">⚠️ <strong>Hinweis:</strong> Dies ist ein nicht offizielles Tool an der HTW Berlin, welches zu Testzwecken installiert wurde. Diese Nachricht wurde automatisch generiert &ndash; bitte antworten Sie nicht direkt auf diese E-Mail.</p>
        <p style="color:#d1d5db;font-size:11px;margin:12px 0 0 0;text-align:center">— TEST-E-MAIL —</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

try {
  // IONOS akzeptiert im SMTP-Envelope nur die reine E-Mail-Adresse (kein "Name <email>")
  const rawFrom = SMTP_FROM ?? SMTP_USER ?? "";
  const emailMatch = rawFrom.match(/<(.+?)>/);
  const envelopeFrom = emailMatch ? emailMatch[1] : rawFrom;

  const info = await transporter.sendMail({
    from: rawFrom,           // Anzeigename im Header (für E-Mail-Client)
    envelope: { from: envelopeFrom, to: "holger.luetters@htw-berlin.de" }, // reiner SMTP-Envelope
    to: "holger.luetters@htw-berlin.de",
    subject: "[HTW Berlin Thesis Match Maker] TEST – Neue Registrierung: Max Mustermann (Studierende:r)",
    html,
    text: `TEST-E-MAIL\n\nNeue Registrierung wartet auf Freischaltung\n\nName: Max Mustermann (Test)\nE-Mail: max.mustermann@student.htw-berlin.de\nGewünschte Rolle: Studierende:r\n\nBitte melden Sie sich im Admin-Dashboard an:\n${adminUrl}\n\nHinweis: Dies ist ein nicht offizielles Tool an der HTW Berlin, welches zu Testzwecken installiert wurde.`,
  });
  console.log("✅ Test-E-Mail erfolgreich gesendet:", info.messageId);
} catch (err) {
  console.error("❌ Fehler beim Senden:", err.message);
  console.error("Details:", JSON.stringify(err, null, 2));
  process.exit(1);
}
