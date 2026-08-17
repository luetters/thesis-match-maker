import crypto from "crypto";
import { eq } from "drizzle-orm";
import { programmes, thesisRequests } from "../drizzle/schema";
import {
  createThesisDocToken,
  createAuditLogEntry,
  getDb,
  getSystemSetting,
  getThesisRequestById,
  getUserById,
} from "./db";
import { sendEmail } from "./emailHelper";
import { generateThesisPdf } from "./thesisPdf";
import { buildFullName } from "@shared/const";

const COMMISSION_DOCUMENT_STATUSES = new Set([
  "SECOND_EXAMINER_ACCEPTED",
  "MATCHED",
  "REGISTERED",
  "ACCEPTED",
  "COMPLETED",
]);

function getPersonName(user: any, fallback = "Unbekannt") {
  return buildFullName({ firstName: user?.firstName, lastName: user?.lastName, academicTitle: user?.academicTitle, name: user?.name }) || fallback;
}

function getExternalSecondExaminerName(thesis: any) {
  if (!thesis.externalSecondExaminerFirstName) return null;
  return `${thesis.externalSecondExaminerTitle ? `${thesis.externalSecondExaminerTitle} ` : ""}${thesis.externalSecondExaminerFirstName} ${thesis.externalSecondExaminerLastName ?? ""}`.trim();
}

export function hasCompleteCommission(thesis: any): boolean {
  return Boolean(
    thesis?.examinerId
    && (thesis?.secondExaminerId || getExternalSecondExaminerName(thesis))
    && COMMISSION_DOCUMENT_STATUSES.has(thesis?.status),
  );
}

export async function buildOfficialRegistrationDocument(thesisRequestId: number, baseUrl = "https://thesis.htw-berlin.com") {
  const thesis = await getThesisRequestById(thesisRequestId);
  if (!thesis) throw new Error("Anfrage nicht gefunden");
  if (!hasCompleteCommission(thesis)) throw new Error("Das offizielle Anmeldedokument ist erst nach vollständiger Kommissionsbildung verfügbar");

  const student = await getUserById(thesis.studentId);
  const firstExaminer = thesis.examinerId ? await getUserById(thesis.examinerId) : null;
  const secondExaminer = thesis.secondExaminerId ? await getUserById(thesis.secondExaminerId) : null;
  if (!student?.email) throw new Error("E-Mail-Adresse der oder des Studierenden fehlt");

  let programmeName: string | null = null;
  if (student.programmeId) {
    const db = await getDb();
    if (db) {
      const programme = (await db.select({ name: programmes.name, abbreviation: programmes.abbreviation })
        .from(programmes).where(eq(programmes.id, student.programmeId)).limit(1))[0];
      programmeName = programme?.abbreviation ?? programme?.name ?? null;
    }
  }

  const token = crypto.randomBytes(24).toString("hex");
  const verifyUrl = `${baseUrl.replace(/\/$/, "")}/verify/${token}`;
  const studentName = getPersonName(student, "Studierende:r");
  const secondExaminerName = secondExaminer ? getPersonName(secondExaminer) : getExternalSecondExaminerName(thesis);
  await createThesisDocToken({
    token,
    thesisRequestId,
    studentName,
    matrikelNr: (student as any).matrikelNr ?? null,
    programmeName,
    title: thesis.title,
    firstExaminerName: firstExaminer ? getPersonName(firstExaminer) : null,
    secondExaminerName,
    targetSemester: thesis.targetSemester?.trim() || null,
    degreeType: thesis.degreeType?.trim() || null,
    plagiarismConsent: Number((student as any).plagiarismConsent ?? 0),
    aiReviewConsent: Number((student as any).aiReviewConsent ?? 0),
  });
  const disclaimerDe = (await getSystemSetting("pdfDisclaimerDe"))?.value
    ?? "Der Thesis Match Maker unterstützt die Organisation der Thesisbetreuung. Die offizielle Zulassung erfolgt durch die zuständige Verwaltung der HTW Berlin.";
  const disclaimerEn = (await getSystemSetting("pdfDisclaimerEn"))?.value
    ?? "The Thesis Match Maker supports thesis supervision administration. Official admission is handled by the responsible HTW Berlin administration.";
  const pdf = await generateThesisPdf({
    studentName,
    matrikelNr: (student as any).matrikelNr ?? null,
    studentEmail: student.email,
    programmeName,
    degreeType: thesis.degreeType ?? null,
    department: (student as any).department ?? null,
    title: thesis.title,
    titleEn: (thesis as any).titleEn ?? null,
    firstExaminerName: firstExaminer ? getPersonName(firstExaminer) : null,
    secondExaminerName,
    targetSemester: thesis.targetSemester ?? null,
    language: thesis.language ?? "de",
    submissionDeadline: (thesis as any).submissionDeadline ?? (thesis as any).deadline ?? null,
    verifyUrl,
    verifyToken: token,
    createdAt: new Date(),
    plagiarismConsent: Number((student as any).plagiarismConsent ?? 0),
    aiReviewConsent: Number((student as any).aiReviewConsent ?? 0),
    disclaimerDe,
    disclaimerEn,
  });
  const safeName = studentName.replace(/[^\w\säöüÄÖÜß-]/g, "").replace(/\s+/g, "_");
  const safeProgramme = (programmeName ?? "Studiengang").replace(/[^a-zA-Z0-9]/g, "");
  const safeSemester = (thesis.targetSemester ?? "Semester").replace(/[^a-zA-Z0-9]/g, "");
  return { thesis, student, pdf, filename: `${safeName}_${safeProgramme}_${safeSemester}.pdf` };
}

export async function sendOfficialRegistrationDocument(thesisRequestId: number) {
  const thesis = await getThesisRequestById(thesisRequestId);
  if (!thesis || !hasCompleteCommission(thesis)) return { sent: false, reason: "commission_incomplete" as const };
  if ((thesis as any).registrationDocumentSentAt) return { sent: false, reason: "already_sent" as const };
  try {
    const { student, pdf, filename } = await buildOfficialRegistrationDocument(thesisRequestId);
    const lang = student?.preferredLanguage === "en" ? "en" : "de";
    const studentName = getPersonName(student, lang === "en" ? "Student" : "Studierende:r");
    const sent = await sendEmail({
      to: student.email!,
      subject: lang === "en" ? "Your official thesis registration document" : "Ihr offizielles Anmeldedokument zur Abschlussarbeit",
      html: lang === "en"
        ? `<p>Dear ${studentName},</p><p>Your examination committee is complete. Please find the official registration document with verification QR code attached.</p><p>Please use this document for the remaining administrative steps and do not submit the email alone.</p><p>Kind regards<br>HTW Berlin – Examination Office</p>`
        : `<p>Sehr geehrte:r ${studentName},</p><p>Ihre Prüfungskommission ist vollständig. Das offizielle Anmeldedokument mit Verifikations-QR-Code erhalten Sie im Anhang.</p><p>Bitte verwenden Sie dieses Dokument für die weiteren administrativen Schritte und reichen Sie nicht lediglich die E-Mail ein.</p><p>Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung</p>`,
      text: lang === "en"
        ? "Your examination committee is complete. The official registration document with verification QR code is attached. Please use this document for the remaining administrative steps."
        : "Ihre Prüfungskommission ist vollständig. Das offizielle Anmeldedokument mit Verifikations-QR-Code finden Sie im Anhang. Bitte verwenden Sie dieses Dokument für die weiteren administrativen Schritte.",
      attachments: [{ filename, content: pdf, contentType: "application/pdf" }],
    });
    if (!sent) return { sent: false, reason: "email_failed" as const };
    await createAuditLogEntry({
      thesisRequestId,
      actorId: 0,
      action: "OFFICIAL_REGISTRATION_DOCUMENT_SENT",
      metadata: { recipientEmail: student.email, emailLanguage: lang },
    } as any);
    const db = await getDb();
    if (db) await db.update(thesisRequests).set({ registrationDocumentSentAt: new Date().toISOString().slice(0, 19).replace("T", " ") } as any).where(eq(thesisRequests.id, thesisRequestId));
    return { sent: true as const, filename };
  } catch (error) {
    console.error("[RegistrationDocument] Versand fehlgeschlagen:", error);
    return { sent: false, reason: "generation_failed" as const };
  }
}
