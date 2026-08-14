import PDFDocument from "pdfkit";

const GREEN = "#76B900";
const DARK = "#1A1A2E";
const GRAY = "#4B5563";

export async function buildSamlIntegrationGuidePdf(): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: "SAML-2.0-Integrationsleitfaden – HTW Berlin", Author: "Thesis Match Maker" } });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  const footer = () => {
    doc.font("Helvetica").fontSize(8).fillColor("#6B7280").text("Thesis Match Maker · HTW Berlin · SAML-2.0-Integrationsleitfaden", 48, 795, { width: 500, align: "center" });
  };
  const title = (value: string) => { doc.moveDown(0.6).font("Helvetica-Bold").fontSize(15).fillColor(DARK).text(value); doc.moveDown(0.25); };
  const paragraph = (value: string) => { doc.font("Helvetica").fontSize(10).fillColor(GRAY).text(value, { lineGap: 3 }); doc.moveDown(0.55); };
  const bullet = (value: string) => { doc.font("Helvetica").fontSize(10).fillColor(GRAY).text(`•  ${value}`, { indent: 12, lineGap: 3 }); doc.moveDown(0.15); };
  const keyValue = (key: string, value: string) => { doc.font("Helvetica-Bold").fontSize(9).fillColor(DARK).text(key, { continued: true }); doc.font("Helvetica").fillColor(GRAY).text(`  ${value}`); doc.moveDown(0.18); };

  doc.rect(0, 0, 595, 12).fill(GREEN);
  doc.moveDown(1.1).font("Helvetica-Bold").fontSize(24).fillColor(DARK).text("Optionale SAML-2.0-Anbindung");
  doc.font("Helvetica").fontSize(13).fillColor(GRAY).text("Thesis Match Maker · HTW Berlin");
  doc.moveDown(0.5).fontSize(9).text(`Stand: ${new Date().toLocaleDateString("de-DE")}`);
  title("Zweck");
  paragraph("Der Thesis Match Maker unterstützt die zentrale Anmeldung der HTW Berlin zusätzlich zur lokalen Anmeldung mit E-Mail-Adresse und Portalpasswort. Die lokale Anmeldung bleibt verfügbar. Die SAML-Anmeldung wird erst nach vollständiger Konfiguration, Test und ausdrücklicher Aktivierung durch einen Superadmin freigeschaltet.");
  title("Service-Provider-Daten für die HTW Berlin");
  keyValue("Service-Provider Entity ID:", "https://thesis.htw-berlin.com/saml/metadata");
  keyValue("SP-Metadaten:", "https://thesis.htw-berlin.com/api/auth/saml/metadata");
  keyValue("Assertion Consumer Service (ACS):", "https://thesis.htw-berlin.com/api/auth/saml/acs");
  keyValue("Response-Binding:", "SAML 2.0 HTTP-POST");
  keyValue("Anmeldung starten:", "https://thesis.htw-berlin.com/api/auth/saml/login");
  title("Benötigte Angaben des Identity Managements");
  bullet("IdP-Metadaten-URL oder signierte XML-Metadatendatei für Test und Produktion.");
  bullet("IdP-Entity-ID, SSO-Endpunkt und aktuelles X.509-Signaturzertifikat mit Ablaufdatum.");
  bullet("Freigabe der Attribute NameID und mail; empfohlen: givenName und sn.");
  bullet("Technische Kontaktstelle und abgestimmtes Verfahren für Zertifikatsrotationen.");
  title("Sicherheits- und Zuordnungsprinzip");
  bullet("Das Portal verlangt signierte SAML-Responses und Assertions.");
  bullet("AuthnRequest und Response werden zeitlich korreliert; externe Rücksprungziele werden verworfen.");
  bullet("Eine SAML-Identität wird ausschließlich mit einem bestehenden, freigegebenen Portalkonto verknüpft. Neue Konten werden nicht automatisch erzeugt.");
  bullet("Das IdP-Zertifikat ist ein öffentliches Signaturzertifikat. Private Schlüssel oder Passwörter der HTW Berlin werden nicht benötigt.");
  title("Vorgeschlagener Ablauf");
  bullet("Test-IdP-Metadaten und Testkonten bereitstellen.");
  bullet("IdP-Daten im Superadmin-Bereich hinterlegen, aber SAML zunächst deaktiviert lassen.");
  bullet("Signaturprüfung, Attribute, Kontozuordnung, Rollenstatus und Fehlerfälle gemeinsam testen.");
  bullet("Produktivwerte hinterlegen, Freigabe bestätigen und SAML-Anmeldung aktivieren.");
  title("Abnahmekriterien");
  paragraph("Freigegebene bestehende Konten können sich per HTW-Berlin-Web-Login anmelden. Konten ohne Freigabe erhalten keinen Dashboard-Zugang. Nicht vorhandene Konten werden nicht automatisch erzeugt. Manipulierte, abgelaufene oder unvollständige Antworten werden abgewiesen. Die lokale Anmeldung funktioniert weiterhin parallel.");
  doc.moveDown(0.8).font("Helvetica-Bold").fontSize(10).fillColor(DARK).text("Vollständige Fassung");
  paragraph("Die vollständige, zitierte Markdown-Fassung liegt im Projekt unter docs/HTW-Berlin_SAML2_Integrationsleitfaden.md vor.");
  footer();
  doc.end();
  return done;
}
