import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const templates = [
  {
    key: "thesis_submitted",
    label: "Antrag eingereicht (Bestätigung an Studierende:n)",
    subject: "Ihr Antrag auf Betreuung wurde eingereicht – HTW Berlin",
    html_body: "<p>Sehr geehrte:r {{studentName}},</p><p>Ihr Antrag zur Abschlussarbeit <strong>\"{{thesisTitle}}\"</strong> wurde erfolgreich eingereicht und wird nun bearbeitet.</p><p>Sie werden benachrichtigt, sobald eine Prüfer:in zugewiesen wurde.</p><p>Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsamt</p>",
    text_body: "Sehr geehrte:r {{studentName}},\n\nIhr Antrag zur Abschlussarbeit \"{{thesisTitle}}\" wurde erfolgreich eingereicht und wird nun bearbeitet.\n\nSie werden benachrichtigt, sobald eine Prüfer:in zugewiesen wurde.\n\nMit freundlichen Grüßen\nHTW Berlin – Prüfungsamt",
    placeholders: JSON.stringify(["{{studentName}}", "{{thesisTitle}}", "{{submissionDate}}"]),
  },
  {
    key: "examiner_proposal",
    label: "Betreuungsanfrage an Prüfer:in",
    subject: "Betreuungsanfrage: {{thesisTitle}} – HTW Berlin",
    html_body: "<p>Sehr geehrte:r {{examinerName}},</p><p>Sie wurden als mögliche Betreuungsperson für die Abschlussarbeit <strong>\"{{thesisTitle}}\"</strong> von {{studentName}} vorgeschlagen.</p><p>Bitte nehmen Sie die Anfrage über folgenden Link an oder ab:<br><a href=\"{{actionUrl}}\">Anfrage bearbeiten</a></p><p>Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsamt</p>",
    text_body: "Sehr geehrte:r {{examinerName}},\n\nSie wurden als mögliche Betreuungsperson für die Abschlussarbeit \"{{thesisTitle}}\" von {{studentName}} vorgeschlagen.\n\nBitte nehmen Sie die Anfrage über folgenden Link an oder ab:\n{{actionUrl}}\n\nMit freundlichen Grüßen\nHTW Berlin – Prüfungsamt",
    placeholders: JSON.stringify(["{{examinerName}}", "{{thesisTitle}}", "{{studentName}}", "{{actionUrl}}"]),
  },
  {
    key: "thesis_accepted",
    label: "Antrag angenommen (Benachrichtigung an Studierende:n)",
    subject: "Ihre Abschlussarbeit wurde angenommen – HTW Berlin",
    html_body: "<p>Sehr geehrte:r {{studentName}},</p><p>Wir freuen uns, Ihnen mitteilen zu können, dass Ihre Abschlussarbeit <strong>\"{{thesisTitle}}\"</strong> angenommen wurde.</p><p>Ihre Betreuung: {{examinerName}}</p><p>Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsamt</p>",
    text_body: "Sehr geehrte:r {{studentName}},\n\nWir freuen uns, Ihnen mitteilen zu können, dass Ihre Abschlussarbeit \"{{thesisTitle}}\" angenommen wurde.\n\nIhre Betreuung: {{examinerName}}\n\nMit freundlichen Grüßen\nHTW Berlin – Prüfungsamt",
    placeholders: JSON.stringify(["{{studentName}}", "{{thesisTitle}}", "{{examinerName}}", "{{acceptedDate}}"]),
  },
  {
    key: "thesis_rejected",
    label: "Antrag abgelehnt (Benachrichtigung an Studierende:n)",
    subject: "Ihre Betreuungsanfrage wurde abgelehnt – HTW Berlin",
    html_body: "<p>Sehr geehrte:r {{studentName}},</p><p>Leider wurde Ihre Betreuungsanfrage für die Abschlussarbeit <strong>\"{{thesisTitle}}\"</strong> abgelehnt.</p><p>Begründung: {{rejectionReason}}</p><p>Bitte wenden Sie sich an das Prüfungsamt für weitere Informationen.</p><p>Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsamt</p>",
    text_body: "Sehr geehrte:r {{studentName}},\n\nLeider wurde Ihre Betreuungsanfrage für die Abschlussarbeit \"{{thesisTitle}}\" abgelehnt.\n\nBegründung: {{rejectionReason}}\n\nBitte wenden Sie sich an das Prüfungsamt für weitere Informationen.\n\nMit freundlichen Grüßen\nHTW Berlin – Prüfungsamt",
    placeholders: JSON.stringify(["{{studentName}}", "{{thesisTitle}}", "{{rejectionReason}}"]),
  },
  {
    key: "colloquium_invitation",
    label: "Kolloquium-Einladung",
    subject: "Einladung zum Kolloquium: {{thesisTitle}} – HTW Berlin",
    html_body: "<p>Sehr geehrte:r {{recipientName}},</p><p>Sie sind herzlich zum Kolloquium der Abschlussarbeit <strong>\"{{thesisTitle}}\"</strong> eingeladen.</p><p><strong>Datum:</strong> {{colloquiumDate}}<br><strong>Uhrzeit:</strong> {{colloquiumTime}}<br><strong>Ort:</strong> {{colloquiumLocation}}</p><p>Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsamt</p>",
    text_body: "Sehr geehrte:r {{recipientName}},\n\nSie sind herzlich zum Kolloquium der Abschlussarbeit \"{{thesisTitle}}\" eingeladen.\n\nDatum: {{colloquiumDate}}\nUhrzeit: {{colloquiumTime}}\nOrt: {{colloquiumLocation}}\n\nMit freundlichen Grüßen\nHTW Berlin – Prüfungsamt",
    placeholders: JSON.stringify(["{{recipientName}}", "{{thesisTitle}}", "{{colloquiumDate}}", "{{colloquiumTime}}", "{{colloquiumLocation}}"]),
  },
  {
    key: "status_change",
    label: "Statusänderung (allgemein)",
    subject: "Statusänderung Ihrer Abschlussarbeit – HTW Berlin",
    html_body: "<p>Sehr geehrte:r {{recipientName}},</p><p>Der Status Ihrer Abschlussarbeit <strong>\"{{thesisTitle}}\"</strong> hat sich geändert.</p><p>Neuer Status: <strong>{{newStatus}}</strong></p><p>Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsamt</p>",
    text_body: "Sehr geehrte:r {{recipientName}},\n\nDer Status Ihrer Abschlussarbeit \"{{thesisTitle}}\" hat sich geändert.\n\nNeuer Status: {{newStatus}}\n\nMit freundlichen Grüßen\nHTW Berlin – Prüfungsamt",
    placeholders: JSON.stringify(["{{recipientName}}", "{{thesisTitle}}", "{{newStatus}}", "{{changeDate}}"]),
  },
];

for (const t of templates) {
  await conn.execute(
    "INSERT INTO email_templates (`key`, label, subject, html_body, text_body, placeholders) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE label=VALUES(label), subject=VALUES(subject), html_body=VALUES(html_body), text_body=VALUES(text_body), placeholders=VALUES(placeholders)",
    [t.key, t.label, t.subject, t.html_body, t.text_body, t.placeholders]
  );
  console.log("Inserted:", t.key);
}

await conn.end();
console.log("Done – 6 E-Mail-Vorlagen eingefügt.");
