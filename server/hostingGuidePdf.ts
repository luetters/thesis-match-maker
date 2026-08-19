import PDFDocument from "pdfkit";

const GREEN = "#76B900";
const DARK = "#1A1A2E";
const GRAY = "#4B5563";

type GuideSection = {
  title: string;
  intro: string;
  points: string[];
};

const SECTIONS: GuideSection[] = [
  {
    title: "1. Vor dem Start",
    intro: "Benennen Sie eine technische verantwortliche Person und vereinbaren Sie ein Wartungsfenster. Zugangsschlüssel dürfen nicht per E-Mail oder Ticket im Klartext weitergegeben werden.",
    points: [
      "Server-IP, SSH-Schlüssel und DNS-Zugriff bereitstellen.",
      "SMTP-Zugang sowie S3-Endpunkt, Bucket, Access Key und Secret Key sicher hinterlegen.",
      "Datenbankzugang und einen abgestimmten Rückfallplan bereitstellen.",
    ],
  },
  {
    title: "2. Server bereitstellen und absichern",
    intro: "Richten Sie bei IONOS oder Hetzner einen Linux-Server mit mindestens 2 vCPU, 4 GB RAM und 40 GB SSD ein. Empfohlen wird Ubuntu Server 24.04 LTS.",
    points: [
      "SSH-Schlüssel verwenden und Passwortanmeldung deaktivieren.",
      "In der Firewall nur SSH aus bekannten Administrationsnetzen sowie HTTP/HTTPS freigeben.",
      "Die Ports 3000 und 3306 nicht öffentlich freigeben.",
      "Betriebssystem aktualisieren sowie Docker und Docker Compose installieren.",
    ],
  },
  {
    title: "3. Privaten S3-Speicher einrichten",
    intro: "Erstellen Sie einen privaten Object-Storage-Bucket. Für Prüfungsakten und Uploads darf keine öffentliche Bucket-Policy aktiv sein.",
    points: [
      "IONOS: Object Storage im DCD berechtigen, Bucket erstellen und Schlüsselpaar erzeugen.",
      "Hetzner: Object Storage in der Console aktivieren, privaten Bucket und S3-Credential erstellen.",
      "Hetzner-Endpunkte: fsn1.your-objectstorage.com, nbg1.your-objectstorage.com oder hel1.your-objectstorage.com.",
      "Im Portal unter Infrastruktur die Werte eintragen und zuerst Verbindung testen.",
    ],
  },
  {
    title: "4. Anwendung und Daten migrieren",
    intro: "Laden Sie im Portal unter Infrastruktur den Migrations-Export herunter. Der Export enthält Projektdateien, Assets, Docker-Konfiguration, Migrationsdateien und Dokumentation.",
    points: [
      "Produktive Daten separat als konsistenten MySQL-Dump mit mysqldump exportieren.",
      "MySQL 8.0 oder kompatibel auf dem Zielsystem bereitstellen.",
      "Datenbankdump importieren und Kennzahlen sowie Dokumentzugriffe stichprobenartig prüfen.",
      "Die .env-Datei ausschließlich auf dem Server erstellen; Geheimnisse nie versionieren.",
    ],
  },
  {
    title: "5. Docker, Domain und HTTPS",
    intro: "Starten Sie die Anwendung mit Docker Compose hinter einem Reverse Proxy. Der Reverse Proxy terminiert HTTPS und leitet intern an Port 3000 weiter.",
    points: [
      "docker compose up -d --build ausführen und Logs prüfen.",
      "Zunächst eine Testdomain verwenden und alle Kernabläufe prüfen.",
      "TLS-Zertifikat aktivieren; HTTP konsequent auf HTTPS umleiten.",
      "Erst nach erfolgreicher Abnahme den DNS-Record der Produktivdomain umstellen.",
    ],
  },
  {
    title: "6. Backups und Abnahme",
    intro: "Konfigurieren Sie im Infrastruktur-Bereich tägliche Backups mit mindestens 30 Tagen Aufbewahrung. Ein Backup gilt erst nach erfolgreicher Wiederherstellungsprobe als belastbar.",
    points: [
      "S3-Bucket privat und Verbindungstest erfolgreich.",
      "Passwort-Login, 2FA, SMTP, Upload/Download und Scheduler testen.",
      "Datenbank nicht öffentlich erreichbar; Firewall-Regeln dokumentiert.",
      "Wiederherstellung mindestens quartalsweise auf einem Testsystem proben.",
    ],
  },
];

export async function buildHostingDeploymentGuidePdf(): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 48,
    info: {
      Title: "Bereitstellungsleitfaden – IONOS und Hetzner",
      Author: "Thesis Match Maker · HTW Berlin",
    },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const footer = () => {
    doc.font("Helvetica").fontSize(8).fillColor("#6B7280")
      .text("Thesis Match Maker · HTW Berlin · Bereitstellungsleitfaden", 48, 795, { width: 500, align: "center" });
  };
  const ensureSpace = (needed: number) => {
    if (doc.y + needed > 735) {
      footer();
      doc.addPage();
      doc.y = 48;
    }
  };
  const heading = (text: string) => {
    ensureSpace(42);
    doc.moveDown(0.45).font("Helvetica-Bold").fontSize(14).fillColor(DARK).text(text);
    doc.moveDown(0.15);
  };
  const paragraph = (text: string) => {
    ensureSpace(42);
    doc.font("Helvetica").fontSize(10).fillColor(GRAY).text(text, { lineGap: 3 });
    doc.moveDown(0.35);
  };
  const bullet = (text: string) => {
    ensureSpace(22);
    doc.font("Helvetica").fontSize(9.5).fillColor(GRAY).text(`•  ${text}`, { indent: 12, lineGap: 2 });
    doc.moveDown(0.08);
  };

  doc.rect(0, 0, 595, 12).fill(GREEN);
  doc.moveDown(1.2).font("Helvetica-Bold").fontSize(23).fillColor(DARK).text("Bereitstellungsleitfaden");
  doc.font("Helvetica").fontSize(13).fillColor(GRAY).text("Thesis Match Maker · HTW Berlin");
  doc.moveDown(0.45).fontSize(9).text(`IONOS oder Hetzner · Stand: ${new Date().toLocaleDateString("de-DE")}`);
  doc.moveDown(0.8).font("Helvetica-Bold").fontSize(11).fillColor(DARK).text("Zweck");
  paragraph("Dieser Leitfaden unterstützt Hochschul-IT und beauftragte Systemadministration bei der autarken Bereitstellung des Portals auf einem eigenen Server. Führen Sie die Migration zuerst auf einem Testsystem durch und wechseln Sie erst nach vollständiger Abnahme in den Produktivbetrieb.");

  for (const section of SECTIONS) {
    heading(section.title);
    paragraph(section.intro);
    for (const point of section.points) bullet(point);
  }

  heading("Referenzen");
  bullet("IONOS Object Storage: docs.ionos.com/cloud/backup-and-storage/ionos-object-storage");
  bullet("IONOS Cloud Server – Getting Started: ionos.com/help/server-cloud-infrastructure/getting-started/cloud-servers-getting-started/");
  bullet("Hetzner Object Storage: docs.hetzner.com/storage/object-storage/overview/");
  paragraph("Die vollständige, zitierte Markdown-Fassung liegt im Projekt unter docs/IONOS_Hetzner_Bereitstellungsleitfaden.md vor.");
  footer();
  doc.end();
  return done;
}
