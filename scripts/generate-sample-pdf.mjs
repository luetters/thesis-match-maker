/**
 * Generiert ein Beispiel-PDF mit fiktiven Testdaten.
 * Aufruf: node scripts/generate-sample-pdf.mjs
 */
import { createRequire } from "module";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

const HTW_GREEN = "#76B900";
const HTW_DARK = "#1a1a2e";
const GRAY = "#6b7280";
const LIGHT_GRAY = "#f3f4f6";

const data = {
  studentName: "Max Dopatka",
  matrikelNr: "s0123456",
  programmeName: "Betriebswirtschaftslehre (BWL)",
  degreeType: "bachelor",
  title: "Einsatz von Large Language Models in der Kundenbetreuung mittelständischer Unternehmen",
  firstExaminerName: "Prof. Dr. Holger Lütters",
  secondExaminerName: "Prof. Dr. Anna Schmidt",
  targetSemester: "SoSe 2025",
  language: "de",
  verifyUrl: "https://thesis.htw-berlin.com/verify/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
  verifyToken: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
  createdAt: new Date(),
};

function formatDate(d) {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function degreeLabel(type) {
  if (!type) return "–";
  return type === "master" ? "Master" : "Bachelor";
}

async function generate() {
  const qrBuffer = await QRCode.toBuffer(data.verifyUrl, {
    errorCorrectionLevel: "H",
    width: 120,
    margin: 1,
    color: { dark: HTW_DARK, light: "#ffffff" },
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      info: {
        Title: "Thesis-Anmeldedokument / Thesis Registration Document",
        Author: "HTW Berlin – Thesis-Management",
        Subject: data.title,
        Keywords: "HTW Berlin, Abschlussarbeit, Thesis",
      },
    });

    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 120;

    // Header-Balken
    doc.rect(0, 0, doc.page.width, 8).fill(HTW_GREEN);

    // Logo-Platzhalter
    const logoX = 60, logoY = 18, logoW = 110, logoH = 52;
    doc.rect(logoX, logoY, logoW, logoH).strokeColor(HTW_GREEN).lineWidth(1.5).stroke();
    doc.moveTo(logoX, logoY).lineTo(logoX + logoW, logoY + logoH).strokeColor("#d1fae5").lineWidth(0.5).stroke();
    doc.moveTo(logoX + logoW, logoY).lineTo(logoX, logoY + logoH).strokeColor("#d1fae5").lineWidth(0.5).stroke();
    doc.fontSize(7).font("Helvetica").fillColor(HTW_GREEN)
      .text("[Hochschul-Logo]", logoX, logoY + logoH / 2 - 4, { width: logoW, align: "center" });

    // Hochschulname und Fachbereich
    doc.fontSize(18).font("Helvetica-Bold").fillColor(HTW_GREEN)
      .text("HTW Berlin", logoX + logoW + 14, logoY + 2);
    doc.fontSize(8.5).font("Helvetica").fillColor(GRAY)
      .text("Hochschule für Technik und Wirtschaft Berlin", logoX + logoW + 14, logoY + 24);
    doc.fontSize(8.5).font("Helvetica-Bold").fillColor(HTW_DARK)
      .text("Fachbereich 3 – Wirtschafts- und Rechtswissenschaften", logoX + logoW + 14, logoY + 38);

    // Titel
    doc.fontSize(16).font("Helvetica-Bold").fillColor(HTW_DARK).text("Anmeldung zur Abschlussarbeit", 60, 90);
    doc.fontSize(11).font("Helvetica").fillColor(GRAY).text("Thesis Registration Document", 60, 112);
    doc.moveTo(60, 132).lineTo(60 + pageWidth, 132).strokeColor(HTW_GREEN).lineWidth(1.5).stroke();

    let y = 148;

    function drawField(labelDe, labelEn, value, currentY, highlight = false) {
      const bgHeight = highlight ? 44 : 36;
      if (highlight) doc.rect(60, currentY - 4, pageWidth, bgHeight).fill(LIGHT_GRAY);
      doc.fontSize(7.5).font("Helvetica-Bold").fillColor(HTW_GREEN)
        .text(`${labelDe} / ${labelEn}`, 64, currentY);
      doc.fontSize(11).font("Helvetica-Bold").fillColor(HTW_DARK)
        .text(value || "–", 64, currentY + 11, { width: pageWidth - 8 });
      return currentY + bgHeight + 6;
    }

    function drawRow(labelDe, labelEn, value, currentY, col2) {
      const halfW = (pageWidth - 12) / 2;
      doc.fontSize(7.5).font("Helvetica-Bold").fillColor(HTW_GREEN)
        .text(`${labelDe} / ${labelEn}`, 64, currentY);
      doc.fontSize(10).font("Helvetica").fillColor(HTW_DARK)
        .text(value || "–", 64, currentY + 11, { width: halfW });
      if (col2) {
        const x2 = 64 + halfW + 12;
        doc.fontSize(7.5).font("Helvetica-Bold").fillColor(HTW_GREEN)
          .text(`${col2.labelDe} / ${col2.labelEn}`, x2, currentY);
        doc.fontSize(10).font("Helvetica").fillColor(HTW_DARK)
          .text(col2.value || "–", x2, currentY + 11, { width: halfW });
      }
      return currentY + 32;
    }

    y = drawField("Thema der Abschlussarbeit", "Thesis Topic", data.title, y, true);
    y = drawRow("Name der/des Studierenden", "Student Name", data.studentName, y,
      { labelDe: "Matrikelnummer", labelEn: "Matriculation No.", value: data.matrikelNr });
    y = drawRow("Studiengang", "Programme", data.programmeName, y,
      { labelDe: "Abschluss", labelEn: "Degree", value: degreeLabel(data.degreeType) });
    y = drawRow("Erstgutachter:in", "First Supervisor", data.firstExaminerName, y,
      { labelDe: "Zweitgutachter:in", labelEn: "Second Supervisor", value: data.secondExaminerName });
    y = drawRow("Semester der Thesis", "Semester of Thesis", data.targetSemester, y,
      { labelDe: "Sprache der Thesis", labelEn: "Language of Thesis",
        value: data.language === "en" ? "Englisch / English" : "Deutsch / German" });
    y = drawRow("Datum der Erstellung", "Date of Document Production", formatDate(data.createdAt), y);

    doc.moveTo(60, y + 4).lineTo(60 + pageWidth, y + 4).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
    y += 16;

    // QR-Code
    const qrX = 60 + pageWidth - 120;
    const qrY = y;
    doc.image(qrBuffer, qrX, qrY, { width: 100, height: 100 });

    doc.fontSize(8.5).font("Helvetica-Bold").fillColor(HTW_DARK)
      .text("Echtheitsprüfung / Document Verification", 64, y);
    doc.fontSize(8).font("Helvetica").fillColor(GRAY)
      .text(
        "Dieses Dokument kann durch Scannen des QR-Codes oder über folgenden Link verifiziert werden:\n" +
        "This document can be verified by scanning the QR code or via the following link:",
        64, y + 14, { width: qrX - 80 }
      );
    doc.fontSize(7.5).font("Helvetica").fillColor(HTW_GREEN)
      .text(data.verifyUrl, 64, y + 50, { width: qrX - 80 });
    doc.fontSize(7).font("Helvetica").fillColor(GRAY)
      .text(`Verifikations-Token: ${data.verifyToken}`, 64, y + 66, { width: qrX - 80 });

    // Footer
    const footerY = doc.page.height - 40;
    doc.rect(0, footerY, doc.page.width, 40).fill(HTW_DARK);
    doc.fontSize(7.5).font("Helvetica").fillColor("#ffffff")
      .text(
        "HTW Berlin – Hochschule für Technik und Wirtschaft Berlin  |  FB 3 Wirtschafts- und Rechtswissenschaften  |  thesis.htw-berlin.com",
        60, footerY + 14, { align: "center", width: pageWidth }
      );

    doc.end();
  });
}

generate().then((buf) => {
  const outPath = "/home/ubuntu/thesis-anmeldedokument-beispiel.pdf";
  writeFileSync(outPath, buf);
  console.log("PDF gespeichert:", outPath);
}).catch((err) => {
  console.error("Fehler:", err);
  process.exit(1);
});
