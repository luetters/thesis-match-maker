import PDFDocument from "pdfkit";

const GREEN = "#76B900";
const DARK = "#1A1A2E";
const GRAY = "#4B5563";

export async function buildExaminerQuickGuidePdf(): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: "Kompaktleitfaden für Prüfer:innen – HTW Berlin", Author: "Thesis Match Maker" } });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  const title = (value: string) => { doc.moveDown(0.7).font("Helvetica-Bold").fontSize(15).fillColor(DARK).text(value); doc.moveDown(0.25); };
  const paragraph = (value: string) => { doc.font("Helvetica").fontSize(10).fillColor(GRAY).text(value, { lineGap: 3 }); doc.moveDown(0.48); };
  const bullet = (value: string) => { doc.font("Helvetica").fontSize(10).fillColor(GRAY).text(`•  ${value}`, { indent: 12, lineGap: 3 }); doc.moveDown(0.14); };
  const step = (number: number, headline: string, description: string) => {
    doc.font("Helvetica-Bold").fontSize(10).fillColor(GREEN).text(`${number}. ${headline}`);
    paragraph(description);
  };

  doc.rect(0, 0, 595, 12).fill(GREEN);
  doc.moveDown(1.1).font("Helvetica-Bold").fontSize(24).fillColor(DARK).text("Kompaktleitfaden für Prüfer:innen");
  doc.font("Helvetica").fontSize(13).fillColor(GRAY).text("Thesis Match Maker · HTW Berlin");
  doc.moveDown(0.4).fontSize(9).text(`Stand: ${new Date().toLocaleDateString("de-DE")}`);

  title("Wofür das Portal da ist");
  paragraph("Thesis Match unterstützt die strukturierte Suche, Abstimmung und Dokumentation rund um Abschlussarbeiten. Es ergänzt die geltenden Regeln und etablierten Systeme der HTW Berlin; diese bleiben verbindlich.");

  title("Die ersten fünf Schritte");
  step(1, "Profil vervollständigen", "Hinterlegen Sie fachliche Schwerpunkte, verfügbare Betreuungskapazitäten und freiwillige öffentliche Links. Damit erreichen Sie passendere Anfragen.");
  step(2, "Anfragen regelmäßig prüfen", "Im Dashboard sehen Sie neue Anfragen mit Thema, Studiengang und vorgesehenem Ablauf. Entscheiden Sie nachvollziehbar: zusagen, ablehnen oder – soweit vorgesehen – unter Vorbehalt behandeln.");
  step(3, "Rolle verstehen", "Erstprüfer:innen besitzen automatisch auch Rechte für Zweitprüfungen. Reine Zweitprüfer:innen verwalten keine eigenen Themenangebote, können aber Kapazitäten und Schwerpunkte pflegen.");
  step(4, "Fristen und Kommission im Blick behalten", "Nach der Kommissionsbildung bleiben Status, Abgabetermine und Beteiligte sichtbar. Abweichende Abgabetermine werden nachvollziehbar dokumentiert.");
  step(5, "Kolloquium abstimmen", "Bei verteidigungsfähigen Studierenden unterstützt das Portal die dreiseitige Terminfindung. Kalenderdateien können bestätigte Termine übernehmen.");

  title("Für eine gute Zusammenarbeit");
  bullet("Antworten Sie auf Anfragen zeitnah – auch eine begründete Absage hilft Studierenden bei der Planung.");
  bullet("Halten Sie Kapazitäten aktuell, damit Anfragen realistisch gesteuert werden können.");
  bullet("Nutzen Sie private Notizen nur für notwendige Arbeitsinformationen; sie sind nicht für Noten oder sensible Leistungsdaten bestimmt.");
  bullet("Verwenden Sie ein eigenes Portalpasswort und aktivieren Sie bei Bedarf die Zwei-Faktor-Authentifizierung.");

  title("Unterstützung");
  paragraph("Die öffentliche FAQ erläutert Rollen, Prozessschritte und häufige Fragen. Bei technischen oder organisatorischen Problemen wenden Sie sich bitte an die zuständige Verwaltung Ihres Fachbereichs.");
  doc.moveDown(1).font("Helvetica").fontSize(8).fillColor("#6B7280").text("Thesis Match Maker · HTW Berlin · Kompaktleitfaden für Prüfer:innen", 48, 795, { width: 500, align: "center" });
  doc.end();
  return done;
}
