import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { HTW_LOGO_BASE64 } from "./htwLogo";

export interface LvvoEntry {
  id: number;
  studentName: string;
  studyProgram: string;
  title: string;
  language: string;
  degreeType: string;
  role: "first" | "second";
  status: string;
}

export interface LvvoExaminer {
  id: number;
  name: string | null;
  email: string | null;
  academicTitle: string | null;
  department: string | null;
}

function semesterLabel(s: string): string {
  if (s.startsWith("WS")) {
    const y = parseInt(s.slice(2));
    return `WS ${y}/${y + 1}`;
  }
  if (s.startsWith("SoSe")) return `SoSe ${s.slice(4)}`;
  return s;
}

export function generateLvvoPdf(
  semester: string,
  examiner: LvvoExaminer | null,
  entries: LvvoEntry[],
  lang: "de" | "en" = "de",
  mode: "download" | "base64" = "download"
): string | void {
  const de = lang === "de";
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;

  // ─── Farben ────────────────────────────────────────────────────────────────
  const GREEN = "#006937"; // HTW-Grün
  const GRAY = "#6B7280";
  const LIGHT_GRAY = "#F3F4F6";
  const DARK = "#111827";

  // ─── Logo ──────────────────────────────────────────────────────────────────
  try {
    doc.addImage(HTW_LOGO_BASE64, "JPEG", margin, 12, 38, 14);
  } catch {
    // Logo-Fehler ignorieren
  }

  // ─── Kopfzeile rechts ──────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setTextColor(GRAY);
  doc.text("HTW Berlin", pageW - margin, 16, { align: "right" });
  doc.text(de ? "Hochschule für Technik und Wirtschaft Berlin" : "Berlin University of Applied Sciences", pageW - margin, 20, { align: "right" });

  // ─── Trennlinie ────────────────────────────────────────────────────────────
  doc.setDrawColor(GREEN);
  doc.setLineWidth(0.8);
  doc.line(margin, 30, pageW - margin, 30);

  // ─── Titel ─────────────────────────────────────────────────────────────────
  doc.setFontSize(16);
  doc.setTextColor(DARK);
  doc.setFont("helvetica", "bold");
  const title = de
    ? "Nachweis Betreuungsleistungen"
    : "Supervision Activities Report";
  doc.text(title, margin, 40);

  doc.setFontSize(11);
  doc.setTextColor(GREEN);
  doc.setFont("helvetica", "normal");
  const subtitle = de
    ? `Lehrverpflichtungsverordnung (LVVO) · ${semesterLabel(semester)}`
    : `Teaching Obligation Regulation (LVVO) · ${semesterLabel(semester)}`;
  doc.text(subtitle, margin, 47);

  // ─── Betreuer-Daten ────────────────────────────────────────────────────────
  let y = 57;
  doc.setFontSize(9);
  doc.setTextColor(GRAY);
  doc.setFont("helvetica", "bold");
  doc.text(de ? "BETREUER:IN" : "SUPERVISOR", margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(DARK);
  const examinerTitle = examiner?.academicTitle ? `${examiner.academicTitle} ` : "";
  const examinerName = examiner?.name ? `${examinerTitle}${examiner.name}` : (de ? "Unbekannt" : "Unknown");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(examinerName, margin, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GRAY);
  if (examiner?.department) {
    doc.text(examiner.department, margin, y);
    y += 4;
  }
  if (examiner?.email) {
    doc.text(examiner.email, margin, y);
    y += 4;
  }

  // ─── Semester-Box ──────────────────────────────────────────────────────────
  const boxX = pageW - margin - 55;
  const boxY = 57;
  doc.setFillColor(LIGHT_GRAY);
  doc.roundedRect(boxX, boxY, 55, 22, 2, 2, "F");
  doc.setFontSize(8);
  doc.setTextColor(GRAY);
  doc.text(de ? "Semester" : "Semester", boxX + 27.5, boxY + 6, { align: "center" });
  doc.setFontSize(13);
  doc.setTextColor(GREEN);
  doc.setFont("helvetica", "bold");
  doc.text(semesterLabel(semester), boxX + 27.5, boxY + 14, { align: "center" });
  doc.setFont("helvetica", "normal");

  y = Math.max(y, boxY + 26) + 6;

  // ─── Statistik-Zeile ───────────────────────────────────────────────────────
  const bachelor = entries.filter((e) => e.degreeType === "bachelor");
  const master = entries.filter((e) => e.degreeType === "master");
  const firstCount = entries.filter((e) => e.role === "first").length;
  const secondCount = entries.filter((e) => e.role === "second").length;

  const statBoxW = (contentW - 9) / 4;
  const stats = [
    { label: de ? "Gesamt" : "Total", value: String(entries.length) },
    { label: de ? "Erstbetreuung" : "First Supervisor", value: String(firstCount) },
    { label: de ? "Zweitbetreuung" : "Second Supervisor", value: String(secondCount) },
    { label: de ? "Bachelor / Master" : "Bachelor / Master", value: `${bachelor.length} / ${master.length}` },
  ];
  stats.forEach((s, i) => {
    const bx = margin + i * (statBoxW + 3);
    doc.setFillColor("#EFF6FF");
    doc.roundedRect(bx, y, statBoxW, 14, 2, 2, "F");
    doc.setFontSize(14);
    doc.setTextColor(GREEN);
    doc.setFont("helvetica", "bold");
    doc.text(s.value, bx + statBoxW / 2, y + 8, { align: "center" });
    doc.setFontSize(7);
    doc.setTextColor(GRAY);
    doc.setFont("helvetica", "normal");
    doc.text(s.label, bx + statBoxW / 2, y + 12.5, { align: "center" });
  });
  y += 20;

  // ─── Tabellen-Hilfsfunktion ────────────────────────────────────────────────
  const drawTable = (
    sectionTitle: string,
    rows: LvvoEntry[],
    startY: number
  ): number => {
    if (rows.length === 0) return startY;

    doc.setFontSize(10);
    doc.setTextColor(DARK);
    doc.setFont("helvetica", "bold");
    doc.text(sectionTitle, margin, startY);
    startY += 4;

    const tableRows = rows.map((e, idx) => [
      String(idx + 1),
      e.studentName,
      e.studyProgram,
      e.title.length > 60 ? e.title.slice(0, 57) + "…" : e.title,
      e.language?.toUpperCase() === "EN" ? "EN" : "DE",
      de
        ? e.role === "first" ? "Erst" : "Zweit"
        : e.role === "first" ? "1st" : "2nd",
    ]);

    autoTable(doc, {
      startY,
      head: [[
        "#",
        de ? "Name" : "Name",
        de ? "Studiengang" : "Study Programme",
        de ? "Thema der Arbeit" : "Thesis Title",
        de ? "Spr." : "Lang.",
        de ? "Rolle" : "Role",
      ]],
      body: tableRows,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: DARK,
        lineColor: "#E5E7EB",
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: GREEN,
        textColor: "#FFFFFF",
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: "#F9FAFB",
      },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 32 },
        2: { cellWidth: 30 },
        3: { cellWidth: contentW - 8 - 32 - 30 - 12 - 14 },
        4: { cellWidth: 12, halign: "center" },
        5: { cellWidth: 14, halign: "center" },
      },
      didDrawPage: () => {
        // Seitennummer
        doc.setFontSize(8);
        doc.setTextColor(GRAY);
        doc.text(
          `${de ? "Seite" : "Page"} ${(doc as any).internal.getCurrentPageInfo().pageNumber}`,
          pageW / 2,
          pageH - 8,
          { align: "center" }
        );
      },
    });

    return (doc as any).lastAutoTable.finalY + 8;
  };

  // ─── Bachelorarbeiten ──────────────────────────────────────────────────────
  y = drawTable(
    de ? `Bachelorarbeiten (${bachelor.length})` : `Bachelor Theses (${bachelor.length})`,
    bachelor,
    y
  );

  // ─── Masterarbeiten ────────────────────────────────────────────────────────
  y = drawTable(
    de ? `Masterarbeiten (${master.length})` : `Master Theses (${master.length})`,
    master,
    y
  );

  // ─── Unterschriftsfeld ─────────────────────────────────────────────────────
  // Neue Seite falls nicht genug Platz
  if (y > pageH - 55) {
    doc.addPage();
    y = 25;
  }

  y += 6;
  doc.setDrawColor("#D1D5DB");
  doc.setLineWidth(0.3);
  doc.line(margin, y + 18, margin + 75, y + 18);
  doc.line(pageW - margin - 55, y + 18, pageW - margin, y + 18);

  doc.setFontSize(8);
  doc.setTextColor(GRAY);
  doc.setFont("helvetica", "normal");
  doc.text(de ? "Ort, Datum" : "Place, Date", margin, y + 22);
  doc.text(de ? "Unterschrift Betreuer:in" : "Supervisor Signature", pageW - margin - 55, y + 22);

  // ─── Fußzeile ──────────────────────────────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor("#E5E7EB");
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
    doc.setFontSize(7);
    doc.setTextColor(GRAY);
    const createdLabel = de ? "Erstellt am" : "Generated on";
    const now = new Date().toLocaleDateString(de ? "de-DE" : "en-GB", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
    doc.text(`HTW Berlin · Thesis Match · ${createdLabel}: ${now}`, margin, pageH - 9);
    doc.text(
      `${de ? "Seite" : "Page"} ${i} ${de ? "von" : "of"} ${totalPages}`,
      pageW - margin,
      pageH - 9,
      { align: "right" }
    );
  }

  // ─── Download / Base64 ────────────────────────────────────────────────────
  const filename = `LVVO_${semester}_${(examiner?.name ?? "Betreuer").replace(/\s+/g, "_")}.pdf`;
  if (mode === "base64") {
    // Gibt den reinen Base64-String zurück (ohne data-URI-Prefix)
    return doc.output("datauristring").split(",")[1];
  }
  doc.save(filename);
}
