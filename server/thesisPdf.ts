/**
 * Thesis-Anmeldedokument PDF-Generator
 * Erzeugt ein zweisprachiges (DE/EN) PDF mit Verifikations-QR-Code.
 * Immer genau eine Seite – kein automatischer Seitenumbruch.
 */
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { readFileSync } from "fs";
import { join } from "path";

// Logo als Buffer einlesen (einmalig beim Modulstart)
let logoBuffer: Buffer | null = null;
const logoCandidates = ["HTW_Berlin_Logo.jpg", "ThesisMatchMaker.jpg"];
for (const candidate of logoCandidates) {
  try {
    logoBuffer = readFileSync(join(__dirname, candidate));
    break;
  } catch {
    // nächste Datei versuchen
  }
}

export interface ThesisPdfData {
  studentName: string;
  matrikelNr?: string | null;
  programmeName?: string | null;
  degreeType?: string | null;
  title: string;
  titleEn?: string | null;
  firstExaminerName?: string | null;
  secondExaminerName?: string | null;
  targetSemester?: string | null;
  language?: string | null;
  verifyUrl: string;
  verifyToken: string;
  createdAt: Date;
  disclaimerDe?: string | null;
  disclaimerEn?: string | null;
}

const HTW_GREEN = "#76B900";
const HTW_DARK = "#1a1a2e";
const GRAY = "#6b7280";
const LIGHT_GRAY = "#f3f4f6";

function formatDate(d: Date): string {
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function degreeLabel(type?: string | null): string {
  if (!type) return "-";
  return type === "master" ? "Master" : "Bachelor";
}

export async function generateThesisPdf(data: ThesisPdfData): Promise<Buffer> {
  const qrBuffer = await QRCode.toBuffer(data.verifyUrl, {
    errorCorrectionLevel: "H",
    width: 120,
    margin: 1,
    color: { dark: HTW_DARK, light: "#ffffff" },
  });

  return new Promise((resolve, reject) => {
    // bufferPages: true verhindert, dass PDFKit automatisch neue Seiten erzeugt
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      bufferPages: true,
      autoFirstPage: true,
      info: {
        Title: "Thesis-Anmeldedokument / Thesis Registration Document",
        Author: "HTW Berlin - Thesis-Management",
        Subject: data.title,
        Keywords: "HTW Berlin, Abschlussarbeit, Thesis",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 120;

    // Header-Balken (grüner Streifen oben)
    doc.rect(0, 0, doc.page.width, 8).fill(HTW_GREEN);

    // Logo links – das neue HTW-Logo hat ein Seitenverhältnis ~1:1.2
    const logoX = 60;
    const logoY = 14;
    const logoW = 100;
    const logoH = 68;

    if (logoBuffer) {
      doc.image(logoBuffer, logoX, logoY, { width: logoW, height: logoH, fit: [logoW, logoH] });
    } else {
      doc.rect(logoX, logoY, logoW, logoH).strokeColor(HTW_GREEN).lineWidth(1.5).stroke();
      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor(HTW_GREEN)
        .text("[Logo]", logoX, logoY + logoH / 2 - 4, { width: logoW, align: "center" });
    }

    // Hochschulname und Fachbereich rechts neben dem Logo
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor(HTW_GREEN)
      .text("HTW Berlin", logoX + logoW + 14, logoY + 4, { lineBreak: false });
    doc
      .fontSize(8.5)
      .font("Helvetica")
      .fillColor(GRAY)
      .text("Hochschule für Technik und Wirtschaft Berlin", logoX + logoW + 14, logoY + 28, { lineBreak: false });
    doc
      .fontSize(8.5)
      .font("Helvetica-Bold")
      .fillColor(HTW_DARK)
      .text("Fachbereich 3 – Wirtschafts- und Rechtswissenschaften", logoX + logoW + 14, logoY + 42, { lineBreak: false });

    // Dokumenttitel
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor(HTW_DARK)
      .text("Anmeldung zur Abschlussarbeit", 60, 100, { lineBreak: false });
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor(GRAY)
      .text("Thesis Registration Document", 60, 120, { lineBreak: false });

    // Trennlinie
    doc.moveTo(60, 138).lineTo(60 + pageWidth, 138).strokeColor(HTW_GREEN).lineWidth(1.5).stroke();

    let y = 152;

    function drawField(
      labelDe: string,
      labelEn: string,
      value: string,
      currentY: number,
      highlight = false
    ): number {
      const bgHeight = highlight ? 44 : 36;
      if (highlight) {
        doc.rect(60, currentY - 4, pageWidth, bgHeight).fill(LIGHT_GRAY);
      }
      doc
        .fontSize(7.5)
        .font("Helvetica-Bold")
        .fillColor(HTW_GREEN)
        .text(`${labelDe} / ${labelEn}`, 64, currentY, { lineBreak: false });
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor(HTW_DARK)
        .text(value || "-", 64, currentY + 11, { width: pageWidth - 8, lineBreak: false });
      return currentY + bgHeight + 6;
    }

    function drawRow(
      labelDe: string,
      labelEn: string,
      value: string,
      currentY: number,
      col2?: { labelDe: string; labelEn: string; value: string }
    ): number {
      const halfW = (pageWidth - 12) / 2;
      doc
        .fontSize(7.5)
        .font("Helvetica-Bold")
        .fillColor(HTW_GREEN)
        .text(`${labelDe} / ${labelEn}`, 64, currentY, { lineBreak: false });
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(HTW_DARK)
        .text(value || "-", 64, currentY + 11, { width: halfW, lineBreak: false });

      if (col2) {
        const x2 = 64 + halfW + 12;
        doc
          .fontSize(7.5)
          .font("Helvetica-Bold")
          .fillColor(HTW_GREEN)
          .text(`${col2.labelDe} / ${col2.labelEn}`, x2, currentY, { lineBreak: false });
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor(HTW_DARK)
          .text(col2.value || "-", x2, currentY + 11, { width: halfW, lineBreak: false });
      }
      return currentY + 32;
    }

    // Thema (hervorgehoben)
    y = drawField("Thema der Abschlussarbeit", "Thesis Topic", data.title, y, true);

    // Name + Matrikelnummer
    y = drawRow(
      "Name der/des Studierenden",
      "Student Name",
      data.studentName,
      y,
      {
        labelDe: "Matrikelnummer",
        labelEn: "Matriculation No.",
        value: data.matrikelNr ?? "-",
      }
    );

    // Studiengang + Abschluss
    y = drawRow(
      "Studiengang",
      "Programme",
      data.programmeName ?? "-",
      y,
      {
        labelDe: "Abschluss",
        labelEn: "Degree",
        value: degreeLabel(data.degreeType),
      }
    );

    // Erstgutachter + Zweitgutachter
    y = drawRow(
      "Erstgutachter:in",
      "First Supervisor",
      data.firstExaminerName ?? "-",
      y,
      {
        labelDe: "Zweitgutachter:in",
        labelEn: "Second Supervisor",
        value: data.secondExaminerName?.trim() || (data.language === "en" ? "Not yet assigned" : "Noch nicht festgelegt"),
      }
    );

    // Semester + Sprache
    y = drawRow(
      "Semester der Thesis",
      "Semester of Thesis",
      data.targetSemester ?? "-",
      y,
      {
        labelDe: "Sprache der Thesis",
        labelEn: "Language of Thesis",
        value: data.language === "en" ? "Englisch / English" : "Deutsch / German",
      }
    );

    // Datum der Erstellung
    y = drawRow(
      "Datum der Erstellung",
      "Date of Document Production",
      formatDate(data.createdAt),
      y
    );

    // Trennlinie vor Verifikation
    doc.moveTo(60, y + 4).lineTo(60 + pageWidth, y + 4).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
    y += 16;

    // Verifikations-Abschnitt (QR-Code rechts, Text links)
    const qrX = 60 + pageWidth - 120;
    const qrY = y;
    doc.image(qrBuffer, qrX, qrY, { width: 100, height: 100 });

    doc
      .fontSize(8.5)
      .font("Helvetica-Bold")
      .fillColor(HTW_DARK)
      .text("Echtheitsprüfung / Document Verification", 64, y, { lineBreak: false });
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(GRAY)
      .text(
        "Dieses Dokument kann durch Scannen des QR-Codes oder über folgenden Link verifiziert werden:",
        64,
        y + 14,
        { width: qrX - 80, lineBreak: false }
      );
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(GRAY)
      .text(
        "This document can be verified by scanning the QR code or via the following link:",
        64,
        y + 26,
        { width: qrX - 80, lineBreak: false }
      );
    doc
      .fontSize(7.5)
      .font("Helvetica")
      .fillColor(HTW_GREEN)
      .text(data.verifyUrl, 64, y + 42, { width: qrX - 80, lineBreak: false });
    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor(GRAY)
      .text(`Verifikations-Token: ${data.verifyToken}`, 64, y + 58, { width: qrX - 80, lineBreak: false });

    // Disclaimer-Block – feste absolute Y-Koordinaten, KEIN doc.y verwenden
    // um automatischen Seitenumbruch zu verhindern
    const disclaimerDe = data.disclaimerDe ?? "";
    const disclaimerEn = data.disclaimerEn ?? "";
    if (disclaimerDe || disclaimerEn) {
      const disclaimerY = doc.page.height - 148;
      doc
        .moveTo(60, disclaimerY - 8)
        .lineTo(60 + pageWidth, disclaimerY - 8)
        .strokeColor("#e5e7eb")
        .lineWidth(0.5)
        .stroke();
      doc
        .fontSize(6.5)
        .font("Helvetica-Bold")
        .fillColor(GRAY)
        .text("Hinweis / Disclaimer", 60, disclaimerY, { lineBreak: false });
      if (disclaimerDe) {
        doc
          .fontSize(6)
          .font("Helvetica")
          .fillColor(GRAY)
          .text(disclaimerDe, 60, disclaimerY + 11, { width: pageWidth, lineBreak: false });
      }
      if (disclaimerEn) {
        const enY = disclaimerY + 11 + (disclaimerDe ? 18 : 0);
        doc
          .fontSize(6)
          .font("Helvetica")
          .fillColor(GRAY)
          .text(disclaimerEn, 60, enY, { width: pageWidth, lineBreak: false });
      }
    }

    // Footer-Balken – immer an absoluter Position
    const footerY = doc.page.height - 40;
    doc.rect(0, footerY, doc.page.width, 40).fill(HTW_DARK);
    doc
      .fontSize(7.5)
      .font("Helvetica")
      .fillColor("#ffffff")
      .text(
        "HTW Berlin – Hochschule für Technik und Wirtschaft Berlin  |  FB 3 Wirtschafts- und Rechtswissenschaften  |  thesis.htw-berlin.com",
        60,
        footerY + 14,
        { align: "center", width: pageWidth, lineBreak: false }
      );

    // Nur die erste Seite ausgeben – überschüssige leere Seiten entfernen
    const range = doc.bufferedPageRange();
    for (let i = range.start + 1; i < range.start + range.count; i++) {
      // Leere Folgeseiten werden ignoriert; wir schließen nur nach Seite 1
    }
    doc.flushPages();
    doc.end();
  });
}
