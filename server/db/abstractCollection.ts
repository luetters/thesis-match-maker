import { and, asc, desc, eq } from "drizzle-orm";
import { colloquiumSchedulingPolls, programmes, publishedThesisAbstracts, thesisRequests, users } from "../../drizzle/schema";
import { sanitizeBiographyText } from "../biographySanitization";
import { getDb } from "../db";

export type AbstractReviewStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "WITHDRAWN";

function toDbDate(value = new Date()) {
  return value.toISOString().slice(0, 19).replace("T", " ");
}

function sanitizeAbstract(value: string) {
  return sanitizeBiographyText(value).replace(/\n{3,}/g, "\n\n").trim().slice(0, 3500);
}

function sanitizeKeywords(values: string[]) {
  return Array.from(new Set(values
    .map((value) => sanitizeBiographyText(value).replace(/\s+/g, " ").trim())
    .filter((value) => value.length >= 2 && value.length <= 64)))
    .slice(0, 15);
}

function parseKeywords(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function fallbackSemester(targetSemester: string | null) {
  if (targetSemester?.trim()) return targetSemester.trim();
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() < 3 || now.getMonth() > 8 ? `WS ${year}/${String(year + 1).slice(-2)}` : `SS ${year}`;
}

async function assertConfirmedColloquium(thesisRequestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const [poll] = await db.select({ id: colloquiumSchedulingPolls.id })
    .from(colloquiumSchedulingPolls)
    .where(and(eq(colloquiumSchedulingPolls.thesisRequestId, thesisRequestId), eq(colloquiumSchedulingPolls.status, "CONFIRMED")))
    .limit(1);
  if (!poll) throw new Error("Der Abstract kann erst nach verbindlicher Vereinbarung des Kolloquiums eingereicht werden.");
}

export async function getAbstractSubmissionPrefill(thesisRequestId: number, studentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const [thesis] = await db.select({
    id: thesisRequests.id,
    title: thesisRequests.title,
    department: thesisRequests.department,
    targetSemester: thesisRequests.targetSemester,
    programme: programmes.name,
    hasConfidentialityNotice: thesisRequests.hasConfidentialityNotice,
  }).from(thesisRequests)
    .innerJoin(users, eq(thesisRequests.studentId, users.id))
    .leftJoin(programmes, eq(users.programmeId, programmes.id))
    .where(and(eq(thesisRequests.id, thesisRequestId), eq(thesisRequests.studentId, studentId))).limit(1);
  if (!thesis) throw new Error("Die Abschlussarbeit wurde nicht gefunden oder gehört nicht zu Ihrem Konto.");
  if (Number(thesis.hasConfidentialityNotice) === 1) throw new Error("Für Arbeiten mit aktivem Sperrvermerk ist keine öffentliche Abstract-Freigabe möglich.");
  return {
    title: thesis.title,
    department: thesis.department,
    programme: thesis.programme ?? null,
    submissionSemester: fallbackSemester(thesis.targetSemester),
  };
}

/** Speichert ausschließlich eine vom Studierenden eingereichte, noch nicht öffentliche Abstract-Fassung. */
export async function submitThesisAbstract(input: {
  thesisRequestId: number;
  studentId: number;
  abstractDe: string;
  abstractEn: string;
  keywords: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  await assertConfirmedColloquium(input.thesisRequestId);
	  const [thesis] = await db.select({
	    id: thesisRequests.id,
	    title: thesisRequests.title,
	    department: thesisRequests.department,
	    targetSemester: thesisRequests.targetSemester,
	    programme: programmes.name,
	    studentId: thesisRequests.studentId,
	    hasConfidentialityNotice: thesisRequests.hasConfidentialityNotice,
	  }).from(thesisRequests)
	    .innerJoin(users, eq(thesisRequests.studentId, users.id))
	    .leftJoin(programmes, eq(users.programmeId, programmes.id))
	    .where(and(eq(thesisRequests.id, input.thesisRequestId), eq(thesisRequests.studentId, input.studentId))).limit(1);
	  if (!thesis) throw new Error("Die Abschlussarbeit wurde nicht gefunden oder gehört nicht zu Ihrem Konto.");
	  if (Number(thesis.hasConfidentialityNotice) === 1) throw new Error("Für Arbeiten mit aktivem Sperrvermerk ist keine öffentliche Abstract-Freigabe möglich.");

	  const abstractDe = sanitizeAbstract(input.abstractDe);
	  const abstractEn = sanitizeAbstract(input.abstractEn);
	  const keywords = sanitizeKeywords(input.keywords);
	  if (abstractDe.length < 80 || abstractEn.length < 80) throw new Error("Bitte reichen Sie Abstracts in Deutsch und Englisch mit jeweils mindestens 80 Zeichen ein.");
	  if (keywords.length === 0) throw new Error("Bitte geben Sie mindestens ein Schlagwort an.");
	  const submissionSemester = fallbackSemester(thesis.targetSemester);
	  const now = toDbDate();
	  await db.insert(publishedThesisAbstracts).values({
	    thesisRequestId: thesis.id,
	    submittedByUserId: input.studentId,
	    submissionSemester,
	    title: thesis.title,
	    department: thesis.department,
	    programme: thesis.programme ?? null,
	    abstract: abstractDe,
	    abstractDe,
	    abstractEn,
	    keywords: JSON.stringify(keywords),
    publicationConsent: 1,
    consentedAt: now,
    status: "PENDING_REVIEW",
  }).onDuplicateKeyUpdate({
    set: {
	      submissionSemester,
	      title: thesis.title,
	      department: thesis.department,
	      programme: thesis.programme ?? null,
	      abstract: abstractDe,
	      abstractDe,
	      abstractEn,
	      keywords: JSON.stringify(keywords),
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
	    abstractDe: publishedThesisAbstracts.abstractDe,
	    abstractEn: publishedThesisAbstracts.abstractEn,
	    keywords: publishedThesisAbstracts.keywords,
    status: publishedThesisAbstracts.status,
    reviewNote: publishedThesisAbstracts.reviewNote,
  }).from(publishedThesisAbstracts).where(and(eq(publishedThesisAbstracts.thesisRequestId, thesisRequestId), eq(publishedThesisAbstracts.submittedByUserId, studentId))).limit(1);
	  if (!entry) return null;
	  return { ...entry, keywords: parseKeywords(entry.keywords) };
}

/** Liefert nur die vier explizit freigegebenen SEO-Felder – niemals Nutzer- oder Thesis-IDs. */
export async function getPublicThesisAbstracts(input: { department?: string; semester?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
	  const conditions = [eq(publishedThesisAbstracts.status, "APPROVED"), eq(publishedThesisAbstracts.publicationConsent, 1), eq(thesisRequests.hasConfidentialityNotice, 0)];
  if (input.department) conditions.push(eq(publishedThesisAbstracts.department, input.department));
  if (input.semester) conditions.push(eq(publishedThesisAbstracts.submissionSemester, input.semester));
  return db.select({
    submissionSemester: publishedThesisAbstracts.submissionSemester,
	    title: publishedThesisAbstracts.title,
	    department: publishedThesisAbstracts.department,
	    programme: publishedThesisAbstracts.programme,
	    abstractDe: publishedThesisAbstracts.abstractDe,
	    abstractEn: publishedThesisAbstracts.abstractEn,
	    legacyAbstract: publishedThesisAbstracts.abstract,
	    keywords: publishedThesisAbstracts.keywords,
	}).from(publishedThesisAbstracts).innerJoin(thesisRequests, eq(publishedThesisAbstracts.thesisRequestId, thesisRequests.id)).where(and(...conditions)).orderBy(asc(publishedThesisAbstracts.department), desc(publishedThesisAbstracts.publishedAt)).limit(Math.min(input.limit ?? 60, 100)).then((entries) => entries.map((entry) => ({
	  submissionSemester: entry.submissionSemester,
	  title: entry.title,
	  department: entry.department,
	  programme: entry.programme,
	  abstractDe: entry.abstractDe ?? entry.legacyAbstract,
	  abstractEn: entry.abstractEn,
	  keywords: parseKeywords(entry.keywords),
	})));
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
	    programme: publishedThesisAbstracts.programme,
	    abstractDe: publishedThesisAbstracts.abstractDe,
	    abstractEn: publishedThesisAbstracts.abstractEn,
	    keywords: publishedThesisAbstracts.keywords,
    status: publishedThesisAbstracts.status,
    reviewNote: publishedThesisAbstracts.reviewNote,
    createdAt: publishedThesisAbstracts.createdAt,
  }).from(publishedThesisAbstracts).where(eq(publishedThesisAbstracts.status, "PENDING_REVIEW")).orderBy(desc(publishedThesisAbstracts.createdAt)).then((entries) => entries.map((entry) => ({
    ...entry,
    keywords: parseKeywords(entry.keywords),
  })));
}

export async function reviewThesisAbstract(input: { id: number; reviewerId: number; approve: boolean; note?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
	  const [entry] = await db.select({ id: publishedThesisAbstracts.id, hasConfidentialityNotice: thesisRequests.hasConfidentialityNotice }).from(publishedThesisAbstracts).innerJoin(thesisRequests, eq(publishedThesisAbstracts.thesisRequestId, thesisRequests.id)).where(eq(publishedThesisAbstracts.id, input.id)).limit(1);
	  if (!entry) throw new Error("Der Abstract wurde nicht gefunden.");
	  if (input.approve && Number(entry.hasConfidentialityNotice) === 1) throw new Error("Abstracts mit aktivem Sperrvermerk dürfen nicht veröffentlicht werden.");
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
