import { and, desc, eq } from "drizzle-orm";
import { publishedThesisAbstracts, thesisRequests } from "../../drizzle/schema";
import { sanitizeBiographyText } from "../biographySanitization";
import { getDb } from "../db";

export type AbstractReviewStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "WITHDRAWN";

function toDbDate(value = new Date()) {
  return value.toISOString().slice(0, 19).replace("T", " ");
}

function sanitizeAbstract(value: string) {
  return sanitizeBiographyText(value).replace(/\n{3,}/g, "\n\n").trim().slice(0, 3500);
}

/** Speichert ausschließlich eine vom Studierenden eingereichte, noch nicht öffentliche Abstract-Fassung. */
export async function submitThesisAbstract(input: {
  thesisRequestId: number;
  studentId: number;
  submissionSemester: string;
  abstract: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const [thesis] = await db.select({
    id: thesisRequests.id,
    title: thesisRequests.title,
    department: thesisRequests.department,
    studentId: thesisRequests.studentId,
  }).from(thesisRequests).where(and(eq(thesisRequests.id, input.thesisRequestId), eq(thesisRequests.studentId, input.studentId))).limit(1);
  if (!thesis) throw new Error("Die Abschlussarbeit wurde nicht gefunden oder gehört nicht zu Ihrem Konto.");

  const abstract = sanitizeAbstract(input.abstract);
  if (abstract.length < 80) throw new Error("Bitte reichen Sie einen Abstract mit mindestens 80 Zeichen ein.");
  const now = toDbDate();
  await db.insert(publishedThesisAbstracts).values({
    thesisRequestId: thesis.id,
    submittedByUserId: input.studentId,
    submissionSemester: input.submissionSemester.trim(),
    title: thesis.title,
    department: thesis.department,
    abstract,
    publicationConsent: 1,
    consentedAt: now,
    status: "PENDING_REVIEW",
  }).onDuplicateKeyUpdate({
    set: {
      submissionSemester: input.submissionSemester.trim(),
      title: thesis.title,
      department: thesis.department,
      abstract,
      publicationConsent: 1,
      consentedAt: now,
      status: "PENDING_REVIEW",
      reviewedByUserId: null,
      reviewedAt: null,
      reviewNote: null,
      publishedAt: null,
      withdrawnAt: null,
    },
  });
  return { success: true };
}

/** Ein Studierender kann seine Zustimmung jederzeit zurückziehen; der öffentliche Eintrag verschwindet sofort. */
export async function withdrawThesisAbstract(input: { thesisRequestId: number; studentId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const result = await db.update(publishedThesisAbstracts).set({
    publicationConsent: 0,
    status: "WITHDRAWN",
    withdrawnAt: toDbDate(),
  }).where(and(eq(publishedThesisAbstracts.thesisRequestId, input.thesisRequestId), eq(publishedThesisAbstracts.submittedByUserId, input.studentId)));
  if (!result[0]?.affectedRows) throw new Error("Für diese Abschlussarbeit liegt keine Abstract-Freigabe vor.");
  return { success: true };
}

export async function getMyThesisAbstract(thesisRequestId: number, studentId: number) {
  const db = await getDb();
  if (!db) return null;
  const [entry] = await db.select({
    thesisRequestId: publishedThesisAbstracts.thesisRequestId,
    submissionSemester: publishedThesisAbstracts.submissionSemester,
    abstract: publishedThesisAbstracts.abstract,
    status: publishedThesisAbstracts.status,
    reviewNote: publishedThesisAbstracts.reviewNote,
  }).from(publishedThesisAbstracts).where(and(eq(publishedThesisAbstracts.thesisRequestId, thesisRequestId), eq(publishedThesisAbstracts.submittedByUserId, studentId))).limit(1);
  return entry ?? null;
}

/** Liefert nur die vier explizit freigegebenen SEO-Felder – niemals Nutzer- oder Thesis-IDs. */
export async function getPublicThesisAbstracts(input: { department?: string; semester?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(publishedThesisAbstracts.status, "APPROVED"), eq(publishedThesisAbstracts.publicationConsent, 1)];
  if (input.department) conditions.push(eq(publishedThesisAbstracts.department, input.department));
  if (input.semester) conditions.push(eq(publishedThesisAbstracts.submissionSemester, input.semester));
  return db.select({
    submissionSemester: publishedThesisAbstracts.submissionSemester,
    title: publishedThesisAbstracts.title,
    department: publishedThesisAbstracts.department,
    abstract: publishedThesisAbstracts.abstract,
  }).from(publishedThesisAbstracts).where(and(...conditions)).orderBy(desc(publishedThesisAbstracts.publishedAt)).limit(Math.min(input.limit ?? 60, 100));
}

export async function getAbstractReviewQueue() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: publishedThesisAbstracts.id,
    thesisRequestId: publishedThesisAbstracts.thesisRequestId,
    submissionSemester: publishedThesisAbstracts.submissionSemester,
    title: publishedThesisAbstracts.title,
    department: publishedThesisAbstracts.department,
    abstract: publishedThesisAbstracts.abstract,
    status: publishedThesisAbstracts.status,
    reviewNote: publishedThesisAbstracts.reviewNote,
    createdAt: publishedThesisAbstracts.createdAt,
  }).from(publishedThesisAbstracts).where(eq(publishedThesisAbstracts.status, "PENDING_REVIEW")).orderBy(desc(publishedThesisAbstracts.createdAt));
}

export async function reviewThesisAbstract(input: { id: number; reviewerId: number; approve: boolean; note?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const [entry] = await db.select({ id: publishedThesisAbstracts.id }).from(publishedThesisAbstracts).where(eq(publishedThesisAbstracts.id, input.id)).limit(1);
  if (!entry) throw new Error("Der Abstract wurde nicht gefunden.");
  const now = toDbDate();
  await db.update(publishedThesisAbstracts).set({
    status: input.approve ? "APPROVED" : "REJECTED",
    reviewedByUserId: input.reviewerId,
    reviewedAt: now,
    reviewNote: input.note?.trim().slice(0, 1000) || null,
    publishedAt: input.approve ? now : null,
  }).where(eq(publishedThesisAbstracts.id, input.id));
  return { success: true };
}
