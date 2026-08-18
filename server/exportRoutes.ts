/**
 * PDF-Export-Endpunkte für das HTW Berlin Thesis-Management-System
 *
 * GET /api/export/theses.pdf       – Admin/PAV: alle Anträge als PDF-Tabelle
 * GET /api/export/examiners.pdf    – Prüfer:innen-Verzeichnis als PDF
 * GET /api/export/profile.pdf      – Eigenes Prüfer:innen-Profil als PDF
 * GET /api/export/thesis/:id/summary.pdf – Einzelantrag-Zusammenfassung
 */
import type { Express, Request, Response } from "express";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify } from "jose";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  getAllThesisRequests,
  getAllExaminers,
  getThesisRequestById,
  getThesisRequestByIdWithNames,
  getAuditLogByThesis,
  getUserByOpenId,
  getProfile,
  getUserRoles,
  searchExaminerComments,
} from "./db";
import { buildFullName, getStatusBadge } from "@shared/const";
import { getThesisHistoryPdfCopy } from "@shared/thesisHistoryPdfLocale";
import { buildSamlIntegrationGuidePdf } from "./samlGuidePdf";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// HTW-Farben
const HTW_GREEN = "#76B900";
const HTW_DARK = "#1a1a2e";
const GRAY = "#6b7280";
const LIGHT_GRAY = "#f3f4f6";
const BORDER = "#e5e7eb";

// Logo einmalig laden
let logoBuffer: Buffer | null = null;
const logoCandidates = ["HTW_Berlin_Logo.png", "HTW_Berlin_Logo.jpg", "ThesisMatchMaker.jpg"];
for (const candidate of logoCandidates) {
  try {
    logoBuffer = readFileSync(join(__dirname, candidate));
    break;
  } catch {
    // nächste Datei versuchen
  }
}

/** Authentifiziert einen Request anhand des Session-Cookies */
async function getUserFromRequest(req: Request) {
  try {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;
    const cookies = parseCookieHeader(cookieHeader);
    const token = cookies["app_session_id"];
    if (!token) return null;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    const openId = payload.openId as string | undefined;
    if (!openId) return null;
    return await getUserByOpenId(openId) ?? null;
  } catch {
    return null;
  }
}

async function exportSamlIntegrationGuidePdf(req: Request, res: Response) {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Nicht angemeldet." });
  const roles = await getUserRoles(user.id);
  if (user.role !== "superadmin" && !roles.includes("superadmin")) {
    return res.status(403).json({ error: "Nur Superadmins dürfen den SAML-Leitfaden herunterladen." });
  }
  const pdf = await buildSamlIntegrationGuidePdf();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="HTW-Berlin_SAML2_Integrationsleitfaden.pdf"');
  res.send(pdf);
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "–";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "–";
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Zeichnet den Standard-HTW-Header auf eine PDF-Seite */
function drawHeader(doc: PDFKit.PDFDocument, title: string, subtitle?: string) {
  const pageWidth = doc.page.width;
  const margin = 50;

  // Grüner Balken oben
  doc.rect(0, 0, pageWidth, 8).fill(HTW_GREEN);

  // Logo (wenn vorhanden)
  let logoRight = margin;
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, margin, 20, { height: 36, fit: [120, 36] });
      logoRight = margin + 130;
    } catch {
      // Logo-Fehler ignorieren
    }
  }

  // Titel rechts vom Logo
  doc
    .fillColor(HTW_DARK)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(title, logoRight, 22, { width: pageWidth - logoRight - margin, align: "right" });

  if (subtitle) {
    doc
      .fillColor(GRAY)
      .font("Helvetica")
      .fontSize(9)
      .text(subtitle, logoRight, 42, { width: pageWidth - logoRight - margin, align: "right" });
  }

  // Trennlinie
  doc
    .moveTo(margin, 65)
    .lineTo(pageWidth - margin, 65)
    .strokeColor(HTW_GREEN)
    .lineWidth(1.5)
    .stroke();
  // KEIN doc.moveDown() – explizite Y-Verwaltung im Aufrufer
}

/** Zeichnet den Standard-Footer auf jeder Seite */
function drawFooter(doc: PDFKit.PDFDocument, pageNum: number, totalPages: number) {
  const pageWidth = doc.page.width;
  const margin = 50;
  const footerY = doc.page.height - 40;

  doc
    .moveTo(margin, footerY - 8)
    .lineTo(pageWidth - margin, footerY - 8)
    .strokeColor(BORDER)
    .lineWidth(0.5)
    .stroke();

  doc
    .fillColor(GRAY)
    .font("Helvetica")
    .fontSize(8)
    .text("HTW Berlin – Thesis-Management-System", margin, footerY, { width: 200 })
    .text(`Seite ${pageNum} von ${totalPages}`, pageWidth - margin - 80, footerY, { width: 80, align: "right" })
    .text(`Erstellt: ${formatDate(new Date())}`, margin, footerY + 12, { width: 200 });
}

/** Hilfsfunktion: Zeichnet eine Tabellenzelle mit optionalem Hintergrund */
function drawCell(
  doc: PDFKit.PDFDocument,
  x: number, y: number, w: number, h: number,
  text: string,
  opts: { bold?: boolean; fontSize?: number; fillColor?: string; bgColor?: string; align?: "left" | "right" | "center" } = {}
) {
  if (opts.bgColor) {
    doc.rect(x, y, w, h).fill(opts.bgColor);
  }
  doc
    .fillColor(opts.fillColor ?? HTW_DARK)
    .font(opts.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(opts.fontSize ?? 8)
    .text(text, x + 4, y + 3, { width: w - 8, height: h - 4, ellipsis: true, align: opts.align ?? "left" });
}

/** Zeichnet eine Schlüssel-Wert-Zeile im Profil-Stil */
function drawField(doc: PDFKit.PDFDocument, label: string, value: string | null | undefined, x: number, y: number, width: number): number {
  const lineH = 18;
  doc
    .fillColor(GRAY)
    .font("Helvetica")
    .fontSize(8)
    .text(label, x, y, { width: width * 0.35 });
  doc
    .fillColor(HTW_DARK)
    .font("Helvetica")
    .fontSize(8)
    .text(value || "–", x + width * 0.37, y, { width: width * 0.63 });
  return y + lineH;
}

// ─── Endpunkt 1: Antrags-Übersicht (Admin/PAV) ────────────────────────────────

async function exportThesesPdf(req: Request, res: Response) {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Nicht angemeldet" });

  const roles = await getUserRoles(user.id);
  const isAllowed = roles.some(r => ["admin", "superadmin", "pav"].includes(r)) || ["admin", "superadmin", "pav"].includes(user.role ?? "");
  if (!isAllowed) return res.status(403).json({ error: "Keine Berechtigung" });

  const theses = await getAllThesisRequests();

  // Status-Filter aus Query-Parameter
  const statusFilter = req.query.status as string | undefined;
  const filtered = statusFilter
    ? theses.filter(t => t.status === statusFilter)
    : theses;

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margins: { top: 80, bottom: 50, left: 40, right: 40 }, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  const pageWidth = doc.page.width;
  const margin = 40;
  const usableWidth = pageWidth - 2 * margin;

  const subtitle = `${filtered.length} Anträge${statusFilter ? ` · Status: ${getStatusBadge(statusFilter).label}` : ""} · Stand: ${formatDate(new Date())}`;
  drawHeader(doc, "Antrags-Übersicht", subtitle);

  // Spaltenbreiten
  const cols = [
    { label: "#", w: 28 },
    { label: "Studierende:r", w: 110 },
    { label: "Thema", w: 180 },
    { label: "Studiengang", w: 80 },
    { label: "Status", w: 90 },
    { label: "Erstgutachter:in", w: 100 },
    { label: "Semester", w: 60 },
    { label: "Eingereicht", w: 62 },
  ];
  const rowH = 18;
  const headerH = 22;

  let currentY = 80;

  const drawTableHeader = () => {
    let cx = margin;
    for (const col of cols) {
      drawCell(doc, cx, currentY, col.w, headerH, col.label, { bold: true, bgColor: HTW_GREEN, fillColor: "#ffffff", fontSize: 8 });
      cx += col.w;
    }
    currentY += headerH;
  };

  drawTableHeader();

  let rowIdx = 0;
  for (const thesis of filtered) {
    // Seitenumbruch prüfen
    if (currentY + rowH > doc.page.height - 60) {
      doc.addPage();
      currentY = 80;
      drawHeader(doc, "Antrags-Übersicht (Fortsetzung)", subtitle);
      drawTableHeader();
    }

    const bg = rowIdx % 2 === 0 ? "#ffffff" : LIGHT_GRAY;
    const statusInfo = getStatusBadge(thesis.status ?? "");
    let cx = margin;

    drawCell(doc, cx, currentY, cols[0].w, rowH, String(thesis.id), { bgColor: bg });
    cx += cols[0].w;
    drawCell(doc, cx, currentY, cols[1].w, rowH, thesis.studentName ?? "–", { bgColor: bg });
    cx += cols[1].w;
    drawCell(doc, cx, currentY, cols[2].w, rowH, thesis.title ?? "–", { bgColor: bg });
    cx += cols[2].w;
    drawCell(doc, cx, currentY, cols[3].w, rowH, thesis.programmeName ?? thesis.department ?? "–", { bgColor: bg });
    cx += cols[3].w;
    drawCell(doc, cx, currentY, cols[4].w, rowH, statusInfo.label, { bgColor: bg });
    cx += cols[4].w;
    drawCell(doc, cx, currentY, cols[5].w, rowH, thesis.firstExaminerName ?? "–", { bgColor: bg });
    cx += cols[5].w;
    drawCell(doc, cx, currentY, cols[6].w, rowH, thesis.targetSemester ?? "–", { bgColor: bg });
    cx += cols[6].w;
    drawCell(doc, cx, currentY, cols[7].w, rowH, formatDate(thesis.createdAt), { bgColor: bg });

    currentY += rowH;
    rowIdx++;
  }

  // Footer auf allen Seiten
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    drawFooter(doc, i + 1, range.count);
  }

  doc.end();
  await new Promise<void>(resolve => doc.on("end", resolve));

  const pdfBuffer = Buffer.concat(chunks);
  const filename = `HTW_Antraege_${new Date().toISOString().slice(0, 10)}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(pdfBuffer);
}

// ─── Endpunkt 2: Prüfer:innen-Verzeichnis ─────────────────────────────────────

async function exportExaminersPdf(req: Request, res: Response) {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Nicht angemeldet" });

  const roles = await getUserRoles(user.id);
  const isAllowed = roles.some(r => ["admin", "superadmin", "pav", "examiner", "second_examiner"].includes(r))
    || ["admin", "superadmin", "pav", "examiner", "second_examiner"].includes(user.role ?? "");
  if (!isAllowed) return res.status(403).json({ error: "Keine Berechtigung" });

  const examiners = await getAllExaminers();

  // Fachbereich-Filter aus Query-Parameter
  const deptFilter = req.query.department as string | undefined;
  const filtered = deptFilter
    ? examiners.filter(e => e.allowedDepartments?.includes(deptFilter) || e.user.department === deptFilter)
    : examiners;

  const doc = new PDFDocument({ size: "A4", margins: { top: 80, bottom: 50, left: 50, right: 50 }, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  const pageWidth = doc.page.width;
  const margin = 50;
  const usableWidth = pageWidth - 2 * margin;

  const subtitle = `${filtered.length} Prüfer:innen${deptFilter ? ` · Fachbereich: ${deptFilter}` : ""} · Stand: ${formatDate(new Date())}`;
  drawHeader(doc, "Prüfer:innen-Verzeichnis", subtitle);

  let currentY = 80;

  for (const examiner of filtered) {
    const name = buildFullName({
      firstName: examiner.user.firstName,
      lastName: examiner.user.lastName,
      academicTitle: examiner.profile?.title,
      name: examiner.user.name,
    });
    const cardH = 80;

    // Seitenumbruch prüfen
    if (currentY + cardH > doc.page.height - 60) {
      doc.addPage();
      currentY = 80;
      drawHeader(doc, "Prüfer:innen-Verzeichnis (Fortsetzung)", subtitle);
    }

    // Karte zeichnen
    doc.rect(margin, currentY, usableWidth, cardH - 4).fill(LIGHT_GRAY);
    doc
      .moveTo(margin, currentY)
      .lineTo(margin + 4, currentY)
      .lineTo(margin + 4, currentY + cardH - 4)
      .lineTo(margin, currentY + cardH - 4)
      .fillColor(HTW_GREEN)
      .fill();

    // Name + Rolle
    doc
      .fillColor(HTW_DARK)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(name || "–", margin + 12, currentY + 8, { width: usableWidth * 0.55 });

    const roleLabel = examiner.user.role === "examiner" ? "Erstprüfer:in" : "Zweitprüfer:in";
    doc
      .fillColor(HTW_GREEN)
      .font("Helvetica")
      .fontSize(8)
      .text(roleLabel, margin + 12, currentY + 24);

    // E-Mail
    doc
      .fillColor(GRAY)
      .font("Helvetica")
      .fontSize(8)
      .text(examiner.user.email ?? "–", margin + 12, currentY + 36);

    // Fachbereiche
    const depts = examiner.allowedDepartments?.join(", ") || examiner.user.department || "–";
    doc
      .fillColor(GRAY)
      .fontSize(8)
      .text(`Fachbereich: ${depts}`, margin + 12, currentY + 48);

    // Rechte Spalte: Auslastung + Studiengänge
    const rightX = margin + usableWidth * 0.6;
    const maxSup = examiner.profile?.maxSupervisions ?? 5;
    const activeSup = examiner.activeSupervisions ?? 0;

    doc
      .fillColor(HTW_DARK)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(`Betreuungen: ${activeSup} / ${maxSup}`, rightX, currentY + 8, { width: usableWidth * 0.38 });

    const progs = examiner.programmes?.map(p => p.abbreviation).join(", ") || "–";
    doc
      .fillColor(GRAY)
      .font("Helvetica")
      .fontSize(8)
      .text(`Studiengänge: ${progs}`, rightX, currentY + 24, { width: usableWidth * 0.38 });

    const langs = Array.isArray(examiner.profile?.languages)
      ? (examiner.profile!.languages as string[]).join(", ")
      : "–";
    doc
      .fillColor(GRAY)
      .fontSize(8)
      .text(`Sprachen: ${langs}`, rightX, currentY + 40, { width: usableWidth * 0.38 });

    currentY += cardH + 4;
  }

  // Footer auf allen Seiten
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    drawFooter(doc, i + 1, range.count);
  }

  doc.end();
  await new Promise<void>(resolve => doc.on("end", resolve));

  const pdfBuffer = Buffer.concat(chunks);
  const filename = `HTW_Pruefer_Verzeichnis_${new Date().toISOString().slice(0, 10)}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(pdfBuffer);
}

// ─── Endpunkt 3: Eigenes Prüfer:innen-Profil ──────────────────────────────────

async function exportProfilePdf(req: Request, res: Response) {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Nicht angemeldet" });

  const profile = await getProfile(user.id);
  if (!profile) return res.status(404).json({ error: "Profil nicht gefunden" });

  // ── Hilfsfunktion: Text mit expliziter Y-Position, KEIN automatischer Cursor-Vorschub ──
  // Alle Texte werden mit absolutem x/y platziert, damit PDFKit keinen internen
  // Cursor-Zustand aufbaut, der zu ungewollten Seitenumbrüchen führt.
  const PAGE_H = 841.89; // A4 Höhe in pt
  const PAGE_BOTTOM = PAGE_H - 50; // untere Grenze (Margin)

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 0, bottom: 0, left: 0, right: 0 }, // Margins deaktiviert – wir verwalten alles selbst
    bufferPages: true,
    autoFirstPage: true,
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  const pageWidth = doc.page.width; // 595.28 pt
  const margin = 50;
  const usableWidth = pageWidth - 2 * margin;

  const fullName = buildFullName({
    firstName: (profile as any).firstName,
    lastName: (profile as any).lastName,
    academicTitle: profile.academicTitle,
    name: profile.name,
  });

  // ── Interne Hilfsfunktion: Seite hinzufügen und Header zeichnen ──
  let currentPage = 0;
  const addNewPage = (title = "Profil-Übersicht (Fortsetzung)") => {
    doc.addPage({ size: "A4", margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    currentPage++;
    drawPageHeader(title);
  };

  const drawPageHeader = (title: string) => {
    // Grüner Balken oben
    doc.rect(0, 0, pageWidth, 8).fill(HTW_GREEN);
    // Logo
    if (logoBuffer) {
      try { doc.image(logoBuffer, margin, 18, { height: 36, fit: [120, 36] }); } catch { /* ignore */ }
    }
    // Titel
    doc.fillColor(HTW_DARK).font("Helvetica-Bold").fontSize(16)
      .text(title, margin + 130, 22, { width: pageWidth - margin - 130 - margin, align: "right", lineBreak: false });
    // Untertitel
    doc.fillColor(GRAY).font("Helvetica").fontSize(9)
      .text("HTW Berlin · Thesis-Management", margin + 130, 42, { width: pageWidth - margin - 130 - margin, align: "right", lineBreak: false });
    // Trennlinie
    doc.moveTo(margin, 65).lineTo(pageWidth - margin, 65).strokeColor(HTW_GREEN).lineWidth(1.5).stroke();
  };

  // Erste Seite Header
  drawPageHeader("Profil-Übersicht");
  let y = 78;

  // ── Hilfsfunktion: Seitenumbruch prüfen ──
  const ensureSpace = (needed: number, newPageTitle?: string) => {
    if (y + needed > PAGE_BOTTOM - 30) {
      addNewPage(newPageTitle);
      y = 78;
    }
  };

  // ── Hilfsfunktion: Abschnittsüberschrift ──
  const drawSection = (title: string) => {
    ensureSpace(30);
    doc.fillColor(HTW_DARK).font("Helvetica-Bold").fontSize(11)
      .text(title, margin, y, { width: usableWidth, lineBreak: false });
    doc.moveTo(margin, y + 14).lineTo(margin + usableWidth, y + 14).strokeColor(BORDER).lineWidth(0.5).stroke();
    y += 20;
  };

  // ── Hilfsfunktion: Schlüssel-Wert-Zeile ──
  const drawKV = (label: string, value: string | null | undefined) => {
    if (!value) return;
    ensureSpace(18);
    doc.fillColor(GRAY).font("Helvetica").fontSize(8)
      .text(label, margin, y, { width: usableWidth * 0.35, lineBreak: false });
    doc.fillColor(HTW_DARK).font("Helvetica").fontSize(8)
      .text(value || "–", margin + usableWidth * 0.37, y, { width: usableWidth * 0.63, lineBreak: false });
    y += 18;
  };

  // ── Hilfsfunktion: Mehrzeiliger Text (Bio, Forschung) ──
  // Schätzt Höhe anhand von Zeichenanzahl und Zeilenbreite
  const drawMultilineText = (text: string) => {
    const charsPerLine = Math.floor(usableWidth / 5.2); // ~5.2 pt pro Zeichen bei fontSize 9
    const lines = Math.ceil(text.length / charsPerLine) + text.split("\n").length;
    const estimatedH = lines * 13 + 8;
    ensureSpace(Math.min(estimatedH, 120)); // max 120 pt reservieren, Rest läuft auf nächste Seite
    doc.fillColor(HTW_DARK).font("Helvetica").fontSize(9)
      .text(text, margin, y, { width: usableWidth, lineGap: 2, align: "left" });
    y = doc.y + 10;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // INHALT
  // ────────────────────────────────────────────────────────────────────────────

  // ── Profilkopf ──────────────────────────────────────────────────────────────
  ensureSpace(56);
  doc.rect(margin, y, usableWidth, 50).fill(LIGHT_GRAY);
  doc.fillColor(HTW_DARK).font("Helvetica-Bold").fontSize(16)
    .text(fullName || "–", margin + 16, y + 8, { width: usableWidth - 32, lineBreak: false });

  const roleLabels: Record<string, string> = {
    examiner: "Erstprüfer:in",
    second_examiner: "Zweitprüfer:in",
    student: "Studierende:r",
    admin: "Verwaltung",
    superadmin: "Superadmin",
    pav: "PAV",
  };
  doc.fillColor(HTW_GREEN).font("Helvetica").fontSize(10)
    .text(roleLabels[profile.role] ?? profile.role, margin + 16, y + 30, { lineBreak: false });
  y += 58;

  // ── Persönliche Daten ────────────────────────────────────────────────────────
  drawSection("Persönliche Daten");
  drawKV("E-Mail", profile.email);
  if (profile.department) drawKV("Fachbereich", profile.department);
  if (profile.secondEmail) drawKV("Alternative E-Mail", profile.secondEmail);
  if (profile.website) drawKV("Website", profile.website);
  if (profile.linkedIn) drawKV("LinkedIn", profile.linkedIn);
  if (profile.htwProfileUrl) drawKV("HTW-Profil", profile.htwProfileUrl);
  y += 6;

  // ── Prüfer:innen-spezifische Felder ─────────────────────────────────────────
  if (profile.isExaminer) {
    drawSection("Prüfer:innen-Profil");
    if (profile.officeRoom) drawKV("Büro/Raum", profile.officeRoom);
    if (profile.officeHours) drawKV("Sprechstunden", profile.officeHours);
    if (profile.bookingUrl) drawKV("Terminbuchung", profile.bookingUrl);

    const langs = Array.isArray(profile.examinerLanguages)
      ? (profile.examinerLanguages as string[]).join(", ")
      : null;
    drawKV("Prüfungssprachen", langs || "–");

    const depts = Array.isArray(profile.allowedDepartments)
      ? (profile.allowedDepartments as string[]).join(", ")
      : (profile.department ?? null);
    drawKV("Zuständige Fachbereiche", depts || "–");
    y += 6;

    // Kurzbiografie
    if (profile.examinerBio) {
      const bioText = (profile.examinerBio as string).replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
      if (bioText) {
        drawSection("Kurzbiografie");
        drawMultilineText(bioText);
      }
    }

    // Forschungsschwerpunkte
    if (profile.examinerResearchFocus) {
      drawSection("Forschungsschwerpunkte");
      drawMultilineText(profile.examinerResearchFocus as string);
    }

    // Schlagworte
    if (Array.isArray(profile.examinerKeywords) && (profile.examinerKeywords as string[]).length > 0) {
      drawSection("Schlagworte");
      drawMultilineText((profile.examinerKeywords as string[]).join(" · "));
    }
  }

  // ── Studierende-spezifische Felder ───────────────────────────────────────────
  if (profile.role === "student") {
    drawSection("Studium");
    if (profile.matrikelNr) drawKV("Matrikelnummer", profile.matrikelNr);
    if (profile.thesisType) drawKV("Abschlussart", profile.thesisType === "master" ? "Master" : "Bachelor");
    if (profile.enrollmentSemester) drawKV("Immatrikulationssemester", profile.enrollmentSemester);
  }

  // ── Footer auf allen Seiten ──────────────────────────────────────────────────
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const footerY = PAGE_H - 38;
    doc.moveTo(margin, footerY - 8).lineTo(pageWidth - margin, footerY - 8)
      .strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.fillColor(GRAY).font("Helvetica").fontSize(8)
      .text("HTW Berlin – Thesis-Management-System", margin, footerY, { width: 200, lineBreak: false });
    doc.fillColor(GRAY).font("Helvetica").fontSize(8)
      .text(`Seite ${i + 1} von ${range.count}`, pageWidth - margin - 80, footerY, { width: 80, align: "right", lineBreak: false });
    doc.fillColor(GRAY).font("Helvetica").fontSize(8)
      .text(`Erstellt: ${formatDate(new Date())}`, margin, footerY + 12, { width: 200, lineBreak: false });
  }

  doc.end();
  await new Promise<void>(resolve => doc.on("end", resolve));

  const pdfBuffer = Buffer.concat(chunks);
  const safeName = (fullName || "Profil").replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 40);
  const filename = `HTW_Profil_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(pdfBuffer);
}

// ─── Endpunkt 4: Einzelantrag-Zusammenfassung ─────────────────────────────────

async function exportThesisSummaryPdf(req: Request, res: Response) {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Nicht angemeldet" });

  const thesisId = parseInt(req.params.id, 10);
  if (isNaN(thesisId)) return res.status(400).json({ error: "Ungültige Antrags-ID" });

  const thesis = await getThesisRequestByIdWithNames(thesisId);
  if (!thesis) return res.status(404).json({ error: "Antrag nicht gefunden" });

  // Zugriffskontrolle: nur eigener Antrag, Prüfer:in des Antrags, oder Admin/PAV
  const roles = await getUserRoles(user.id);
  const isAdmin = roles.some(r => ["admin", "superadmin", "pav"].includes(r)) || ["admin", "superadmin", "pav"].includes(user.role ?? "");
  const isOwner = thesis.studentId === user.id;
  const isExaminer = thesis.examinerId === user.id || thesis.secondExaminerId === user.id;
  if (!isAdmin && !isOwner && !isExaminer) {
    return res.status(403).json({ error: "Keine Berechtigung" });
  }

  // Hilfsfunktion: vollständigen Namen aus DB-Feldern bauen
  const makeName = (firstName: string | null | undefined, lastName: string | null | undefined, title: string | null | undefined, fallbackName: string | null | undefined): string => {
    return buildFullName({ firstName: firstName ?? undefined, lastName: lastName ?? undefined, academicTitle: title ?? undefined, name: fallbackName ?? undefined });
  };

  const studentDisplay = makeName(thesis.studentFirstName, thesis.studentLastName, null, thesis.studentName)
    || (thesis.studentEmail ?? `ID ${thesis.studentId}`);
  const firstExaminerDisplay = thesis.examinerId
    ? makeName(thesis.firstExaminerFirstName, thesis.firstExaminerLastName, thesis.firstExaminerAcademicTitle, thesis.firstExaminerName)
      || (thesis.firstExaminerEmail ?? `ID ${thesis.examinerId}`)
    : "–";
  const secondExaminerDisplay = thesis.secondExaminerId
    ? makeName(thesis.secondExaminerFirstName, thesis.secondExaminerLastName, thesis.secondExaminerAcademicTitle, thesis.secondExaminerName)
      || (thesis.secondExaminerEmail ?? `ID ${thesis.secondExaminerId}`)
    : null;
  const wantedExaminerDisplay = thesis.wantedExaminerId
    ? makeName(thesis.wantedExaminerFirstName, thesis.wantedExaminerLastName, thesis.wantedExaminerAcademicTitle, thesis.wantedExaminerName)
    : null;
  const wantedSecondExaminerDisplay = (thesis as any).wantedSecondExaminerId
    ? makeName((thesis as any).wantedSecondExaminerFirstName, (thesis as any).wantedSecondExaminerLastName, (thesis as any).wantedSecondExaminerAcademicTitle, (thesis as any).wantedSecondExaminerName)
      || ((thesis as any).wantedSecondExaminerEmail ?? null)
    : null;

  // ── QR-Code erzeugen ─────────────────────────────────────────────────────────
  const origin = (req.headers["x-forwarded-proto"] ? `${req.headers["x-forwarded-proto"]}://${req.headers["x-forwarded-host"] ?? req.headers["host"]}` : `http://${req.headers["host"]}`) as string;
  const summaryUrl = `${origin}/student`;
  let qrBuffer: Buffer | null = null;
  try {
    qrBuffer = await QRCode.toBuffer(summaryUrl, {
      errorCorrectionLevel: "M",
      width: 80,
      margin: 1,
      color: { dark: "#1a1a2e", light: "#ffffff" },
    });
  } catch {
    // QR-Code-Fehler ignorieren
  }

  // ── PDF aufbauen ──────────────────────────────────────────────────────────────
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 80, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
    info: {
      Title: `HTW Berlin – Antrag #${thesis.id}`,
      Author: "HTW Berlin – Thesis-Management-System",
      Subject: thesis.title ?? "Abschlussarbeit",
      Keywords: "HTW Berlin, Abschlussarbeit, Thesis",
      CreationDate: new Date(),
    },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  const pageWidth = doc.page.width;
  const margin = 50;
  const usableWidth = pageWidth - 2 * margin;
  const pageHeight = doc.page.height;
  const bottomLimit = pageHeight - 60; // Platz für Footer

  const statusInfo = getStatusBadge(thesis.status ?? "");
  const generatedAt = new Date();
  drawHeader(doc, `Antrag #${thesis.id}`, `Status: ${statusInfo.label} · ${formatDate(thesis.createdAt)}`);

  let y = 80;

  // Hilfsfunktion: neue Seite wenn nötig
  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = 80;
      drawHeader(doc, `Antrag #${thesis.id} (Fortsetzung)`, `Status: ${statusInfo.label}`);
    }
  };

  // ── Status-Banner (farbig, gut sichtbar) ───────────────────────────────────────────
  ensureSpace(72);
  // Hintergrundfarbe je nach Status
  const statusBgColor = thesis.status === "ACCEPTED" || thesis.status === "COMPLETED" ? "#f0fdf4"
    : thesis.status === "REJECTED" || thesis.status === "WITHDRAWN" ? "#fef2f2"
    : thesis.status?.startsWith("PENDING") ? "#fffbeb"
    : LIGHT_GRAY;
  const statusBorderColor = thesis.status === "ACCEPTED" || thesis.status === "COMPLETED" ? "#86efac"
    : thesis.status === "REJECTED" || thesis.status === "WITHDRAWN" ? "#fca5a5"
    : thesis.status?.startsWith("PENDING") ? "#fcd34d"
    : BORDER;
  const statusTextColor = thesis.status === "ACCEPTED" || thesis.status === "COMPLETED" ? "#166534"
    : thesis.status === "REJECTED" || thesis.status === "WITHDRAWN" ? "#991b1b"
    : thesis.status?.startsWith("PENDING") ? "#92400e"
    : HTW_DARK;

  // Status-Banner Hintergrund
  doc.rect(margin, y, usableWidth, 56).fill(statusBgColor);
  doc.rect(margin, y, 4, 56).fill(statusBorderColor);

  // Thema
  doc
    .fillColor(HTW_DARK)
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(thesis.title ?? "–", margin + 16, y + 8, { width: usableWidth - 24 });

  // Status-Label
  doc
    .fillColor(statusTextColor)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(`●  ${statusInfo.label}`, margin + 16, y + 34);

  // Zeitstempel rechts im Banner
  doc
    .fillColor(GRAY)
    .font("Helvetica")
    .fontSize(7.5)
    .text(
      `Erstellt: ${generatedAt.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} Uhr`,
      margin + 16, y + 46,
      { width: usableWidth - 32 }
    );
  y += 68;

  // ── Rahmendaten ──────────────────────────────────────────────────────────────
  ensureSpace(20 + 5 * 18);
  doc.fillColor(HTW_DARK).font("Helvetica-Bold").fontSize(11).text("Rahmendaten", margin, y);
  doc.moveTo(margin, y + 14).lineTo(margin + usableWidth, y + 14).strokeColor(BORDER).lineWidth(0.5).stroke();
  y += 20;

  y = drawField(doc, "Abschlussart", thesis.degreeType === "master" ? "Master" : "Bachelor", margin, y, usableWidth);
  y = drawField(doc, "Fachbereich", thesis.department ?? "–", margin, y, usableWidth);
  y = drawField(doc, "Zielsemester", thesis.targetSemester ?? "–", margin, y, usableWidth);
  y = drawField(doc, "Sprache", thesis.language === "de" ? "Deutsch" : thesis.language === "en" ? "Englisch" : thesis.language ?? "–", margin, y, usableWidth);
  y = drawField(doc, "Eingereicht am", formatDate(thesis.createdAt), margin, y, usableWidth);
  if (thesis.submissionDeadline) y = drawField(doc, "Abgabefrist", formatDate(thesis.submissionDeadline), margin, y, usableWidth);
  if (thesis.defenseDate) y = drawField(doc, "Verteidigungsdatum", formatDate(thesis.defenseDate), margin, y, usableWidth);
  y += 8;

  // ── Beteiligte Personen – als Übersichtstabelle ─────────────────────────────────────
  type PersonRow = { role: string; name: string; contact: string; note: string };
  const personRows: PersonRow[] = [];

  // Studierende:r
  personRows.push({
    role: "Studierende:r",
    name: studentDisplay,
    contact: thesis.studentEmail ?? "",
    note: (thesis as any).programmeName
      ? ((thesis as any).programmeAbbreviation ?? (thesis as any).programmeName)
      : "",
  });

  // Erstgutachter:in
  if (thesis.examinerId) {
    personRows.push({ role: "Erstgutachter:in", name: firstExaminerDisplay, contact: thesis.firstExaminerEmail ?? "", note: "zugewiesen" });
  } else if (wantedExaminerDisplay) {
    personRows.push({ role: "Erstgutachter:in", name: wantedExaminerDisplay, contact: "", note: "angefragt" });
  } else {
    personRows.push({ role: "Erstgutachter:in", name: "–", contact: "", note: "ausstehend" });
  }

  // Zweitgutachter:in
  if (thesis.secondExaminerId && secondExaminerDisplay) {
    personRows.push({ role: "Zweitgutachter:in", name: secondExaminerDisplay, contact: thesis.secondExaminerEmail ?? "", note: "zugewiesen" });
  } else if (wantedSecondExaminerDisplay) {
    personRows.push({ role: "Zweitgutachter:in", name: wantedSecondExaminerDisplay, contact: (thesis as any).wantedSecondExaminerEmail ?? "", note: "angefragt" });
  } else if (thesis.externalSecondExaminerFirstName) {
    const extName = `${thesis.externalSecondExaminerTitle ? thesis.externalSecondExaminerTitle + " " : ""}${thesis.externalSecondExaminerFirstName} ${thesis.externalSecondExaminerLastName ?? ""}`.trim();
    personRows.push({ role: "Zweitgutachter:in", name: extName, contact: thesis.externalSecondExaminerEmail ?? "", note: "extern" });
  }

  // Tabellen-Layout
  const rowH = 22;
  const headerH = 18;
  const colW = [usableWidth * 0.22, usableWidth * 0.29, usableWidth * 0.34, usableWidth * 0.15];
  const colX = [margin, margin + colW[0], margin + colW[0] + colW[1], margin + colW[0] + colW[1] + colW[2]];
  const tableH = headerH + personRows.length * rowH;

  ensureSpace(tableH + 28);

  // Abschnitts-Überschrift
  doc.fillColor(HTW_DARK).font("Helvetica-Bold").fontSize(11).text("Beteiligte Personen", margin, y);
  doc.moveTo(margin, y + 14).lineTo(margin + usableWidth, y + 14).strokeColor(BORDER).lineWidth(0.5).stroke();
  y += 20;

  // Tabellen-Header
  doc.rect(margin, y, usableWidth, headerH).fill(HTW_GREEN);
  ["Rolle", "Name", "Kontakt / E-Mail", "Status"].forEach((h, i) => {
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8)
      .text(h, colX[i] + 5, y + 5, { width: colW[i] - 10, ellipsis: true });
  });
  y += headerH;

  // Datenzeilen
  personRows.forEach((row, idx) => {
    const rowBg = idx % 2 === 0 ? "#ffffff" : "#f9fafb";
    doc.rect(margin, y, usableWidth, rowH).fill(rowBg);
    doc.moveTo(margin, y).lineTo(margin + usableWidth, y).strokeColor(BORDER).lineWidth(0.3).stroke();

    // Rolle
    doc.fillColor(GRAY).font("Helvetica-Bold").fontSize(7.5)
      .text(row.role, colX[0] + 5, y + 7, { width: colW[0] - 10, ellipsis: true });

    // Name
    doc.fillColor(HTW_DARK).font("Helvetica-Bold").fontSize(8.5)
      .text(row.name || "–", colX[1] + 5, y + 7, { width: colW[1] - 10, ellipsis: true });

    // Kontakt
    doc.fillColor(GRAY).font("Helvetica").fontSize(7.5)
      .text(row.contact || "–", colX[2] + 5, y + 7, { width: colW[2] - 10, ellipsis: true });

    // Status-Pill
    if (row.note) {
      const pillColor = row.note === "zugewiesen" ? HTW_GREEN
        : row.note === "angefragt" ? "#f59e0b"
        : row.note === "extern" ? "#6366f1"
        : row.note === "ausstehend" ? "#ef4444"
        : "#6b7280";
      const pillW = colW[3] - 10;
      const pillH = 12;
      const pillX = colX[3] + 5;
      const pillY = y + (rowH - pillH) / 2;
      doc.rect(pillX, pillY, pillW, pillH).fill(pillColor);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(6.5)
        .text(row.note, pillX, pillY + 3, { width: pillW, align: "center" });
    }

    y += rowH;
  });

  // Rahmen um die gesamte Tabelle
  const tableTop = y - personRows.length * rowH - headerH;
  doc.rect(margin, tableTop, usableWidth, personRows.length * rowH + headerH)
    .strokeColor(BORDER).lineWidth(0.5).stroke();

  y += 10;

  // ── Beschreibung ─────────────────────────────────────────────────────────────
  if (thesis.description && thesis.description.trim() && thesis.description !== "Thema wird noch festgelegt" && thesis.description !== "Studierende:r sucht Betreuung für ein Thema nach Absprache mit der Prüfer:in.") {
    ensureSpace(40);
    doc.fillColor(HTW_DARK).font("Helvetica-Bold").fontSize(11).text("Beschreibung", margin, y);
    doc.moveTo(margin, y + 14).lineTo(margin + usableWidth, y + 14).strokeColor(BORDER).lineWidth(0.5).stroke();
    y += 20;
    doc.fillColor(HTW_DARK).font("Helvetica").fontSize(9).text(thesis.description, margin, y, { width: usableWidth, lineGap: 2 });
    y = doc.y + 12;
  }

  // ── Abstract ─────────────────────────────────────────────────────────────────
  if (thesis.abstract && thesis.abstract.trim()) {
    ensureSpace(40);
    doc.fillColor(HTW_DARK).font("Helvetica-Bold").fontSize(11).text("Abstract", margin, y);
    doc.moveTo(margin, y + 14).lineTo(margin + usableWidth, y + 14).strokeColor(BORDER).lineWidth(0.5).stroke();
    y += 20;
    doc.fillColor(HTW_DARK).font("Helvetica").fontSize(9).text(thesis.abstract, margin, y, { width: usableWidth, lineGap: 2 });
    y = doc.y + 12;
  }

  // ── Ablehnungsgrund (falls vorhanden) ────────────────────────────────────────
  if (thesis.rejectionReason) {
    ensureSpace(40);
    doc.fillColor(HTW_DARK).font("Helvetica-Bold").fontSize(11).text("Ablehnungsgrund", margin, y);
    doc.moveTo(margin, y + 14).lineTo(margin + usableWidth, y + 14).strokeColor(BORDER).lineWidth(0.5).stroke();
    y += 20;
    doc.fillColor("#dc2626").font("Helvetica").fontSize(9).text(thesis.rejectionReason, margin, y, { width: usableWidth });
    y = doc.y + 12;
  }

  // ── Rückzugsgrund (falls vorhanden) ──────────────────────────────────────────
  if (thesis.withdrawalReason) {
    ensureSpace(40);
    doc.fillColor(HTW_DARK).font("Helvetica-Bold").fontSize(11).text("Rückzugsgrund", margin, y);
    doc.moveTo(margin, y + 14).lineTo(margin + usableWidth, y + 14).strokeColor(BORDER).lineWidth(0.5).stroke();
    y += 20;
    doc.fillColor(GRAY).font("Helvetica").fontSize(9).text(thesis.withdrawalReason, margin, y, { width: usableWidth });
    y = doc.y + 12;
  }

  // ── Footer + Wasserzeichen + QR-Code auf jeder Seite ──────────────────────────────
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);

    // Wasserzeichen: diagonal über die Seite
    const wm = thesis.status === "WITHDRAWN" ? "ZURÜCKGEZOGEN"
      : thesis.status === "REJECTED" ? "ABGELEHNT"
      : null;
    if (wm) {
      doc.save();
      doc.opacity(0.07);
      doc.fillColor("#dc2626");
      doc.font("Helvetica-Bold").fontSize(72);
      // Diagonal über die Seite: Mittelpunkt der Seite, rotiert
      const cx = pageWidth / 2;
      const cy = pageHeight / 2;
      doc.rotate(-45, { origin: [cx, cy] });
      doc.text(wm, 0, cy - 36, { width: pageWidth, align: "center" });
      doc.restore();
    }

    // Standard-Footer
    drawFooter(doc, i + 1, range.count);

    // QR-Code + Link in der rechten unteren Ecke des Footers
    if (qrBuffer) {
      const qrSize = 48;
      const qrX = pageWidth - margin - qrSize;
      const qrY = doc.page.height - 40 - qrSize + 8;
      try {
        doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
        doc
          .fillColor(GRAY)
          .font("Helvetica")
          .fontSize(6)
          .text("Thesis-Portal", qrX, qrY + qrSize + 1, { width: qrSize, align: "center" });
      } catch {
        // QR-Code-Rendering ignorieren
      }
    }
  }

  doc.end();
  await new Promise<void>(resolve => doc.on("end", resolve));

  const pdfBuffer = Buffer.concat(chunks);
  const safeTitle = (thesis.title ?? "Antrag").replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 40);
  const filename = `HTW_Antrag_${thesis.id}_${safeTitle}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(pdfBuffer);
}

// ─── Endpunkt 5: Vollständige Fallhistorie für Prüfungsakten ──────────────────

async function exportThesisHistoryPdf(req: Request, res: Response) {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Nicht angemeldet" });
  const requestedLanguage = req.query.lang === "en" || req.query.lang === "de" ? req.query.lang : null;
  const copy = getThesisHistoryPdfCopy(requestedLanguage ?? (user.preferredLanguage === "en" ? "en" : "de"));

  const thesisId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(thesisId)) return res.status(400).json({ error: copy.invalidId });
  const thesis = await getThesisRequestByIdWithNames(thesisId);
  if (!thesis) return res.status(404).json({ error: copy.notFound });

  const roles = await getUserRoles(user.id);
  const isAdmin = roles.some((role) => ["admin", "superadmin", "pav"].includes(role)) || ["admin", "superadmin", "pav"].includes(user.role ?? "");
  const isAssignedExaminer = thesis.examinerId === user.id || thesis.secondExaminerId === user.id;
  if (!isAdmin && !isAssignedExaminer) return res.status(403).json({ error: copy.forbidden });

  const auditEntries = await getAuditLogByThesis(thesisId);
  const doc = new PDFDocument({ size: "A4", margins: { top: 80, bottom: 50, left: 50, right: 50 }, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const margin = 50;
  const width = doc.page.width - margin * 2;
  const bottomLimit = doc.page.height - 60;
  let y = 80;
  const currentStatus = getStatusBadge(thesis.status ?? "").label;
  const subtitle = copy.subtitle(thesis.id, new Date());
  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = 80;
      drawHeader(doc, copy.continuation, subtitle);
    }
  };
  const actionLabels: Record<string, string> = {
    THESIS_CREATED: copy.created,
    THESIS_CREATED_WITH_WANTED_EXAMINER: copy.created,
    STATUS_CHANGED: copy.statusChanged,
    EXAMINER_ACCEPTED: copy.accepted,
    EXAMINER_REJECTED: copy.rejected,
    FIRST_EXAMINER_ASSIGNED: copy.firstAssigned,
    SECOND_EXAMINER_ASSIGNED: copy.secondAssigned,
    DEADLINE_SET: copy.deadline,
    COLLOQUIUM_CREATED: copy.colloquium,
  };

  drawHeader(doc, copy.heading, subtitle);
  doc.fillColor(HTW_DARK).font("Helvetica-Bold").fontSize(14).text(thesis.title ?? copy.noTitle, margin, y, { width });
  y = doc.y + 8;
  doc.fillColor(GRAY).font("Helvetica").fontSize(9).text(`${copy.student}: ${thesis.studentName ?? "–"} · ${copy.programme}: ${(thesis as any).programmeAbbreviation ?? (thesis as any).programmeName ?? "–"}`, margin, y, { width });
  y = doc.y + 4;
  doc.text(`${copy.currentStatus}: ${currentStatus}`, margin, y, { width });
  y = doc.y + 4;
  doc.text(`${copy.firstExaminer}: ${thesis.firstExaminerName ?? copy.unassigned} · ${copy.secondExaminer}: ${thesis.secondExaminerName ?? copy.unassigned}`, margin, y, { width });
  y = doc.y + 18;

  doc.fillColor(HTW_DARK).font("Helvetica-Bold").fontSize(11).text(copy.history, margin, y);
  y += 20;
  for (const entry of auditEntries) {
    const reason = entry.reason ? `${copy.reason}: ${entry.reason}` : "";
    const statusChange = entry.fromStatus && entry.toStatus ? `${getStatusBadge(entry.fromStatus).label} → ${getStatusBadge(entry.toStatus).label}` : "";
    doc.font("Helvetica-Oblique").fontSize(8);
    const height = 40 + doc.heightOfString(reason, { width: width - 28 });
    ensureSpace(height + 10);
    doc.circle(margin + 5, y + 6, 4).fill(HTW_GREEN);
    doc.fillColor(HTW_DARK).font("Helvetica-Bold").fontSize(9).text(actionLabels[entry.action] ?? entry.action, margin + 18, y, { width: width - 18 });
    y = doc.y + 2;
    if (statusChange) { doc.fillColor(GRAY).font("Helvetica").fontSize(8).text(statusChange, margin + 18, y, { width: width - 18 }); y = doc.y + 2; }
    if (reason) { doc.fillColor(GRAY).font("Helvetica-Oblique").fontSize(8).text(reason, margin + 18, y, { width: width - 18 }); y = doc.y + 2; }
    doc.fillColor(GRAY).font("Helvetica").fontSize(7.5).text(new Date(entry.createdAt).toLocaleString(copy.locale), margin + 18, y, { width: width - 18 });
    y = doc.y + 12;
  }

  const pages = doc.bufferedPageRange();
  for (let index = 0; index < pages.count; index++) { doc.switchToPage(pages.start + index); drawFooter(doc, index + 1, pages.count); }
  doc.end();
  await new Promise<void>((resolve) => doc.on("end", resolve));
  const filename = `HTW_Fallhistorie_${thesis.id}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(Buffer.concat(chunks));
}

function getNoteExportFilters(req: Request): { search?: string; priority?: "normal" | "important" | "urgent"; includeCompleted?: boolean } {
  const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 200) : undefined;
  const rawPriority = req.query.priority;
  const priority = rawPriority === "normal" || rawPriority === "important" || rawPriority === "urgent" ? rawPriority : undefined;
  const includeCompleted = req.query.includeCompleted === "1" || req.query.includeCompleted === "true";
  return { search, priority, includeCompleted };
}

function csvCell(value: unknown): string {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}

async function exportMyNotesCsv(req: Request, res: Response) {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Nicht angemeldet." });
  const notes = await searchExaminerComments({ examinerId: user.id, ...getNoteExportFilters(req) });
  const rows = [
    ["Anfrage-ID", "Thema", "Priorität", "Fällig am", "Status", "Notiz", "Erstellt am", "Zuletzt bearbeitet"],
    ...notes.map((note) => [
      note.thesisRequestId,
      note.thesisTitle,
      note.priority,
      note.dueAt ? new Date(note.dueAt).toLocaleDateString("de-DE") : "",
      note.completedAt ? "Erledigt" : "Aktiv",
      note.content,
      new Date(note.createdAt).toLocaleString("de-DE"),
      new Date(note.updatedAt).toLocaleString("de-DE"),
    ]),
  ];
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="HTW-Berlin_Anfragenotizen.csv"');
  res.send(`\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`);
}

async function exportMyNotesPdf(req: Request, res: Response) {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Nicht angemeldet." });
  const notes = await searchExaminerComments({ examinerId: user.id, ...getNoteExportFilters(req) });
  const doc = new PDFDocument({ size: "A4", margins: { top: 80, bottom: 50, left: 50, right: 50 }, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const margin = 50;
  const width = doc.page.width - margin * 2;
  const subtitle = `${user.name ?? "HTW Berlin"} · ${new Date().toLocaleDateString("de-DE")}`;
  const priorityLabels: Record<string, string> = { normal: "Normal", important: "Wichtig", urgent: "Dringend" };
  const priorityColors: Record<string, string> = { normal: GRAY, important: "#B45309", urgent: "#B91C1C" };
  drawHeader(doc, "Private Anfragenotizen", subtitle);
  doc.fillColor(GRAY).font("Helvetica").fontSize(9).text("Dieser Export enthält ausschließlich Ihre eigenen privaten Notizen.", margin, 82, { width });
  let y = doc.y + 18;
  for (const note of notes) {
    doc.font("Helvetica").fontSize(9);
    const bodyHeight = doc.heightOfString(note.content, { width: width - 20 });
    if (y + bodyHeight + 96 > doc.page.height - 55) {
      doc.addPage();
      drawHeader(doc, "Private Anfragenotizen", subtitle);
      y = 82;
    }
    doc.fillColor(HTW_DARK).font("Helvetica-Bold").fontSize(10).text(`#${note.thesisRequestId} · ${note.thesisTitle}`, margin, y, { width });
    y = doc.y + 2;
    doc.fillColor(priorityColors[note.priority] ?? GRAY).font("Helvetica-Bold").fontSize(8).text(priorityLabels[note.priority] ?? "Normal", margin, y);
    doc.fillColor(GRAY).font("Helvetica").fontSize(8).text(new Date(note.createdAt).toLocaleString("de-DE"), margin + 90, y, { width: width - 90 });
    y = doc.y + 2;
    if (note.dueAt) {
      doc.fillColor(priorityColors[note.priority] ?? GRAY).font("Helvetica-Bold").fontSize(8).text(`Fällig am: ${new Date(note.dueAt).toLocaleDateString("de-DE")}`, margin, y, { width });
      y = doc.y + 4;
    } else {
      y += 4;
    }
    if (note.completedAt) {
      doc.fillColor("#15803D").font("Helvetica-Bold").fontSize(8).text(`Erledigt am: ${new Date(note.completedAt).toLocaleDateString("de-DE")}`, margin, y, { width });
      y = doc.y + 4;
    }
    doc.fillColor(HTW_DARK).font("Helvetica").fontSize(9).text(note.content, margin, y, { width });
    y = doc.y + 14;
  }
  if (notes.length === 0) doc.fillColor(GRAY).font("Helvetica-Oblique").fontSize(10).text("Keine Notizen für die gewählten Filter gefunden.", margin, y);
  const pages = doc.bufferedPageRange();
  for (let index = 0; index < pages.count; index++) { doc.switchToPage(pages.start + index); drawFooter(doc, index + 1, pages.count); }
  doc.end();
  await new Promise<void>((resolve) => doc.on("end", resolve));
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="HTW-Berlin_Anfragenotizen.pdf"');
  res.send(Buffer.concat(chunks));
}

// ─── Registrierung ────────────────────────────────────────────────────────────

export function registerExportRoutes(app: Express) {
  app.get("/api/export/theses.pdf", exportThesesPdf);
  app.get("/api/export/examiners.pdf", exportExaminersPdf);
  app.get("/api/export/profile.pdf", exportProfilePdf);
  app.get("/api/export/thesis/:id/summary.pdf", exportThesisSummaryPdf);
  app.get("/api/export/thesis/:id/history.pdf", exportThesisHistoryPdf);
  app.get("/api/export/saml-integration-guide.pdf", exportSamlIntegrationGuidePdf);
  app.get("/api/export/my-notes.csv", exportMyNotesCsv);
  app.get("/api/export/my-notes.pdf", exportMyNotesPdf);
}
