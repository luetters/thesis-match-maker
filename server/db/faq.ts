import { and, desc, eq, sql } from "drizzle-orm";
import { faqFeedback, faqRatingTotals, guideDownloadTotals } from "../../drizzle/schema";
import type { GuideDownloadKey } from "../../shared/guideAssets";
import { sanitizeBiographyText } from "../biographySanitization";
import { getDb } from "../db";

export type FaqAudience = "general" | "student" | "firstExaminer" | "secondExaminer" | "admin";
export type FaqLanguage = "de" | "en";

/** Speichert eine datensparsame, nicht personenbezogene Frage für die FAQ-Redaktion. */
export async function submitFaqFeedback(input: { message: string; audience: FaqAudience; language: FaqLanguage }) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const message = sanitizeBiographyText(input.message).trim().slice(0, 800);
  if (message.length < 15) throw new Error("Bitte formulieren Sie Ihre Frage etwas genauer.");
  await db.insert(faqFeedback).values({ message, audience: input.audience, language: input.language });
  return { success: true };
}

/** Aktualisiert ausschließlich aggregierte Hilfreichkeitswerte, ohne Nutzerkennung zu speichern. */
export async function recordFaqRating(input: { faqKey: string; helpful: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  await db.insert(faqRatingTotals).values({
    faqKey: input.faqKey,
    helpfulCount: input.helpful ? 1 : 0,
    notHelpfulCount: input.helpful ? 0 : 1,
  }).onDuplicateKeyUpdate({
    set: {
      helpfulCount: input.helpful ? sql`${faqRatingTotals.helpfulCount} + 1` : sql`${faqRatingTotals.helpfulCount}`,
      notHelpfulCount: input.helpful ? sql`${faqRatingTotals.notHelpfulCount}` : sql`${faqRatingTotals.notHelpfulCount} + 1`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    },
  });
  const [rating] = await db.select().from(faqRatingTotals).where(eq(faqRatingTotals.faqKey, input.faqKey)).limit(1);
  return { helpfulCount: rating?.helpfulCount ?? 0, notHelpfulCount: rating?.notHelpfulCount ?? 0 };
}

/** Erhöht nur eine anonyme, aggregierte Downloadzahl; es werden keinerlei Abrufmerkmale gespeichert. */
export async function recordGuideDownload(guideKey: GuideDownloadKey) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  await db.insert(guideDownloadTotals).values({ guideKey, downloadCount: 1 }).onDuplicateKeyUpdate({
    set: {
      downloadCount: sql`${guideDownloadTotals.downloadCount} + 1`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    },
  });
  const [total] = await db.select().from(guideDownloadTotals).where(eq(guideDownloadTotals.guideKey, guideKey)).limit(1);
  return { guideKey, downloadCount: total?.downloadCount ?? 0 };
}

/** Liefert die administrative Arbeitsliste und aggregierte Antwortbewertungen. */
export async function getFaqFeedbackOverview() {
  const db = await getDb();
  if (!db) return { newCount: 0, feedback: [], ratings: [], guideDownloads: [] };
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(faqFeedback).where(eq(faqFeedback.status, "NEW"));
  const feedback = await db.select().from(faqFeedback).orderBy(desc(faqFeedback.createdAt)).limit(50);
  const ratings = await db.select().from(faqRatingTotals).orderBy(desc(faqRatingTotals.updatedAt));
  const guideDownloads = await db.select().from(guideDownloadTotals).orderBy(desc(guideDownloadTotals.downloadCount), desc(guideDownloadTotals.updatedAt));
  return { newCount: Number(countRow?.count ?? 0), feedback, ratings, guideDownloads };
}

/** Beantwortet eine Frage und veröffentlicht sie optional als Community-FAQ. */
export async function answerAndPublishFaqFeedback(input: { id: number; answer: string; publish: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const answer = sanitizeBiographyText(input.answer).trim().slice(0, 1600);
  if (answer.length < 15) throw new Error("Bitte formulieren Sie die Antwort etwas ausführlicher.");
  const [feedback] = await db.select().from(faqFeedback).where(eq(faqFeedback.id, input.id)).limit(1);
  if (!feedback) throw new Error("Die FAQ-Rückmeldung wurde nicht gefunden.");
  const publishedFaqKey = input.publish ? `community:${feedback.id}` : null;
  await db.update(faqFeedback).set({
    answer,
    status: input.publish ? "PUBLISHED" : "REVIEWED",
    publishedFaqKey,
    publishedAt: input.publish ? sql`CURRENT_TIMESTAMP` : null,
  }).where(eq(faqFeedback.id, input.id));
  return { success: true, publishedFaqKey };
}

/** Liefert veröffentlichte Community-FAQs in der angeforderten Sprache. */
export async function getPublishedFaqFeedback(language: FaqLanguage) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: faqFeedback.id,
    question: faqFeedback.message,
    answer: faqFeedback.answer,
    audience: faqFeedback.audience,
    faqKey: faqFeedback.publishedFaqKey,
  }).from(faqFeedback).where(and(eq(faqFeedback.status, "PUBLISHED"), eq(faqFeedback.language, language))).orderBy(desc(faqFeedback.publishedAt));
}

/** Liefert die am häufigsten bewerteten FAQ-Schlüssel für öffentliche Widgets. */
export async function getTopFaqRatings(limit = 5) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(faqRatingTotals).orderBy(desc(sql`${faqRatingTotals.helpfulCount} + ${faqRatingTotals.notHelpfulCount}`), desc(faqRatingTotals.updatedAt)).limit(limit);
}
