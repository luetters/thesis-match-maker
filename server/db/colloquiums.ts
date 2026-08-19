import { eq } from "drizzle-orm";
import { colloquiums, type InsertColloquium } from "../../drizzle/schema";
import { getDb, getThesisRequestsByExaminer, getThesisRequestsByStudent } from "../db";

export async function createColloquium(data: InsertColloquium): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const [result] = await db.insert(colloquiums).values(data);
  return (result as { insertId: number }).insertId;
}

export async function getColloquiumsByThesis(thesisRequestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(colloquiums).where(eq(colloquiums.thesisRequestId, thesisRequestId));
}

export async function getAllColloquiums() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(colloquiums).orderBy(colloquiums.scheduledAt);
}

export async function updateColloquiumStatus(id: number, status: "SCHEDULED" | "CANCELLED" | "COMPLETED"): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  await db.update(colloquiums).set({ status }).where(eq(colloquiums.id, id));
}

export async function deleteColloquium(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  await db.delete(colloquiums).where(eq(colloquiums.id, id));
}

export async function getColloquiumsByExaminer(examinerId: number) {
  const theses = await getThesisRequestsByExaminer(examinerId);
  if (theses.length === 0) return [];
  const thesisMap = new Map<number, number | null>();
  for (const thesis of theses as any[]) thesisMap.set(thesis.id as number, thesis.secondExaminerId ?? null);
  const all = await getAllColloquiums();
  return all.filter((colloquium) => thesisMap.has(colloquium.thesisRequestId)).map((colloquium) => ({ ...colloquium, thesisSecondExaminerId: thesisMap.get(colloquium.thesisRequestId) ?? null }));
}

export async function getColloquiumsByStudent(studentId: number) {
  const theses = await getThesisRequestsByStudent(studentId);
  if (theses.length === 0) return [];
  const thesisIds = theses.map((thesis) => thesis.id);
  const all = await getAllColloquiums();
  return all.filter((colloquium) => thesisIds.includes(colloquium.thesisRequestId));
}
