import { and, desc, eq, isNull, like } from "drizzle-orm";
import { examinerComments, thesisRequests } from "../../drizzle/schema";
import { getDb } from "../db";

export type ExaminerCommentPriority = "normal" | "important" | "urgent";

/** Gibt alle privaten Notizen einer prüfenden Person zu einem Thesis-Antrag zurück. */
export async function getExaminerComments(thesisRequestId: number, examinerId: number, includeCompleted = false) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(examinerComments)
    .where(
      and(
        eq(examinerComments.thesisRequestId, thesisRequestId),
        eq(examinerComments.examinerId, examinerId),
        ...(includeCompleted ? [] : [isNull(examinerComments.completedAt)])
      )
    )
    .orderBy(examinerComments.createdAt);
}

/** Erstellt eine neue private Notiz. */
export async function createExaminerComment(params: {
  thesisRequestId: number;
  examinerId: number;
  content: string;
  priority?: ExaminerCommentPriority;
  dueAt?: string | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(examinerComments).values({
    thesisRequestId: params.thesisRequestId,
    examinerId: params.examinerId,
    content: params.content,
    priority: params.priority ?? "normal",
    dueAt: params.priority === "urgent" ? params.dueAt ?? null : null,
  });
  return (result[0] as { insertId: number }).insertId;
}

/** Aktualisiert Inhalt und Priorisierung einer privaten Notiz des Erstellers. */
export async function updateExaminerComment(params: {
  id: number;
  examinerId: number;
  content: string;
  priority?: ExaminerCommentPriority;
  dueAt?: string | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const rows = await db
    .select({ id: examinerComments.id, examinerId: examinerComments.examinerId })
    .from(examinerComments)
    .where(eq(examinerComments.id, params.id))
    .limit(1);
  if (!rows[0]) throw new Error("Kommentar nicht gefunden.");
  if (rows[0].examinerId !== params.examinerId) throw new Error("Keine Berechtigung.");
  await db
    .update(examinerComments)
    .set({
      content: params.content,
      updatedAt: now,
      ...(params.priority ? { priority: params.priority } : {}),
      ...(params.priority ? { dueAt: params.priority === "urgent" ? params.dueAt ?? null : null } : {}),
    })
    .where(eq(examinerComments.id, params.id));
}

/** Markiert eine eigene dringende Notiz als erledigt oder stellt sie wieder her. */
export async function setExaminerCommentCompletion(params: { id: number; examinerId: number; completed: boolean }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const rows = await db
    .select({ id: examinerComments.id, examinerId: examinerComments.examinerId, priority: examinerComments.priority })
    .from(examinerComments)
    .where(eq(examinerComments.id, params.id))
    .limit(1);
  if (!rows[0]) throw new Error("Kommentar nicht gefunden.");
  if (rows[0].examinerId !== params.examinerId) throw new Error("Keine Berechtigung.");
  if (rows[0].priority !== "urgent") throw new Error("Nur dringende Notizen können als erledigt markiert werden.");
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db.update(examinerComments).set({ completedAt: params.completed ? now : null, updatedAt: now }).where(eq(examinerComments.id, params.id));
}

/** Durchsucht ausschließlich private Notizen einer prüfenden Person und ergänzt den Anfragetitel. */
export async function searchExaminerComments(params: {
  examinerId: number;
  search?: string;
  priority?: ExaminerCommentPriority;
  includeCompleted?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];
  const filters = [eq(examinerComments.examinerId, params.examinerId)];
  const term = params.search?.trim();
  if (term) filters.push(like(examinerComments.content, `%${term}%`));
  if (params.priority) filters.push(eq(examinerComments.priority, params.priority));
  if (!params.includeCompleted) filters.push(isNull(examinerComments.completedAt));
  return db
    .select({
      id: examinerComments.id,
      thesisRequestId: examinerComments.thesisRequestId,
      thesisTitle: thesisRequests.title,
      content: examinerComments.content,
      priority: examinerComments.priority,
      dueAt: examinerComments.dueAt,
      completedAt: examinerComments.completedAt,
      createdAt: examinerComments.createdAt,
      updatedAt: examinerComments.updatedAt,
    })
    .from(examinerComments)
    .innerJoin(thesisRequests, eq(examinerComments.thesisRequestId, thesisRequests.id))
    .where(and(...filters))
    .orderBy(desc(examinerComments.createdAt));
}

/** Löscht eine private Notiz ausschließlich für ihren Ersteller. */
export async function deleteExaminerComment(params: { id: number; examinerId: number }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const rows = await db
    .select({ id: examinerComments.id, examinerId: examinerComments.examinerId })
    .from(examinerComments)
    .where(eq(examinerComments.id, params.id))
    .limit(1);
  if (!rows[0]) throw new Error("Kommentar nicht gefunden.");
  if (rows[0].examinerId !== params.examinerId) throw new Error("Keine Berechtigung.");
  await db.delete(examinerComments).where(eq(examinerComments.id, params.id));
}
