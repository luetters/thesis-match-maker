/**
 * Thesis-Anmeldedokument PDF-Generator
 * Erzeugt ein zweisprachiges (DE/EN) PDF mit Verifikations-QR-Code.
 */
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

export interface ThesisPdfData {
  // Inhaltsdaten
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
  // Verifikation
  verifyUrl: string;
  verifyToken: string;
  createdAt: Date;
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
  if (!type) return "–";
  return type === "master" ? "Master" : "Bachelor";
}

export async function generateThesisPdf(data: ThesisPdfData): Promise<Buffer> {
  // QR-Code als PNG-Buffer erzeugen
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

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 120; // usable width

    // ── Header-Balken ──────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 8).fill(HTW_GREEN);

    // ── Logo-Bereich ───────────────────────────────────────────────────────────
    doc.moveDown(0.5);
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .fillColor(HTW_GREEN)
      .text("HTW Berlin", 60, 28);
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(GRAY)
      .text("Hochschule für Technik und Wirtschaft Berlin", 60, 52);

    // ── Titel ──────────────────────────────────────────────────────────────────
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor(HTW_DARK)
      .text("Anmeldung zur Abschlussarbeit", 60, 90);
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor(GRAY)
      .text("Thesis Registration Document", 60, 112);

    // Trennlinie
    doc.moveTo(60, 132).lineTo(60 + pageWidth, 132).strokeColor(HTW_GREEN).lineWidth(1.5).stroke();

    // ── Thema ──────────────────────────────────────────────────────────────────
    doc.moveDown(0.5);
    let y = 148;

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
        .text(`${labelDe} / ${labelEn}`, 64, currentY);
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor(HTW_DARK)
        .text(value || "–", 64, currentY + 11, { width: pageWidth - 8 });
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
        .text(`${labelDe} / ${labelEn}`, 64, currentY);
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(HTW_DARK)
        .text(value || "–", 64, currentY + 11, { width: halfW });

      if (col2) {
        const x2 = 64 + halfW + 12;
        doc
          .fontSize(7.5)
          .font("Helvetica-Bold")
          .fillColor(HTW_GREEN)
          .text(`${col2.labelDe} / ${col2.labelEn}`, x2, currentY);
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor(HTW_DARK)
          .text(col2.value || "–", x2, currentY + 11, { width: halfW });
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
        value: data.matrikelNr ?? "–",
      }
    );

    // Studiengang + Abschluss
    y = drawRow(
      "Studiengang",
      "Programme",
      data.programmeName ?? "–",
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
      data.firstExaminerName ?? "–",
      y,
      {
        labelDe: "Zweitgutachter:in",
        labelEn: "Second Supervisor",
        value: data.secondExaminerName ?? "–",
      }
    );

    // Semester + Sprache
    y = drawRow(
      "Semester der Thesis",
      "Semester of Thesis",
      data.targetSemester ?? "–",
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

    // ── Trennlinie vor Verifikation ────────────────────────────────────────────
    doc.moveTo(60, y + 4).lineTo(60 + pageWidth, y + 4).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
    y += 16;

    // ── Verifikations-Abschnitt ────────────────────────────────────────────────
    // QR-Code rechts
    const qrX = 60 + pageWidth - 120;
    const qrY = y;
    doc.image(qrBuffer, qrX, qrY, { width: 100, height: 100 });

    // Text links
    doc
      .fontSize(8.5)
      .font("Helvetica-Bold")
      .fillColor(HTW_DARK)
      .text("Echtheitsprüfung / Document Verification", 64, y);
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(GRAY)
      .text(
        "Dieses Dokument kann durch Scannen des QR-Codes oder über folgenden Link verifiziert werden:\n" +
          "This document can be verified by scanning the QR code or via the following link:",
        64,
        y + 14,
        { width: qrX - 80 }
      );
    doc
      .fontSize(7.5)
      .font("Helvetica")
      .fillColor(HTW_GREEN)
      .text(data.verifyUrl, 64, y + 50, { width: qrX - 80 });

    // Token-Anzeige
    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor(GRAY)
      .text(`Verifikations-Token: ${data.verifyToken}`, 64, y + 66, { width: qrX - 80 });

    // ── Footer-Balken ──────────────────────────────────────────────────────────
    const footerY = doc.page.height - 40;
    doc.rect(0, footerY, doc.page.width, 40).fill(HTW_DARK);
    doc
      .fontSize(7.5)
      .font("Helvetica")
      .fillColor("#ffffff")
      .text(
        "HTW Berlin – Hochschule für Technik und Wirtschaft Berlin  |  FB 3 Wirtschaftswissenschaften  |  thesis.htw-berlin.com",
        60,
        footerY + 14,
        { align: "center", width: pageWidth }
      );

    doc.end();
  });
}
