import { aliasedTable, and, desc, eq, isNull } from "drizzle-orm";
import { deadlineChanges, programmeSemesterDeadlines, programmes, thesisRequests, users } from "../../drizzle/schema";
import { resolveProgrammeSemesterDeadline, type ProgrammeSemesterDeadlineRule } from "../../shared/programmeSemesterDeadline";
import { getDb } from "../db";

/** Abgabefrist verlängern und die Änderung revisionssicher protokollieren. */
export async function extendDeadline(thesisRequestId: number, actorId: number, newDeadline: string, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const [thesis] = await db.select({ submissionDeadline: thesisRequests.submissionDeadline }).from(thesisRequests).where(eq(thesisRequests.id, thesisRequestId)).limit(1);
  const previousDeadline = thesis?.submissionDeadline ?? null;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db.update(thesisRequests).set({ submissionDeadline: newDeadline }).where(eq(thesisRequests.id, thesisRequestId));
  await db.insert(deadlineChanges).values({ thesisRequestId, previousDeadline: previousDeadline ?? undefined, newDeadline, reason, changedBy: actorId, changedAt: now });
}

export async function setDefenseDate(thesisRequestId: number, actorId: number, defenseDate: string) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db.update(thesisRequests).set({ defenseDate, defenseDateSetAt: now, defenseDateSetBy: actorId }).where(eq(thesisRequests.id, thesisRequestId));
}

export async function closeCase(thesisRequestId: number, actorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db.update(thesisRequests).set({ officialRegistrationStatus: "case_closed", caseClosedAt: now, caseClosedBy: actorId }).where(eq(thesisRequests.id, thesisRequestId));
}

export async function getDeadlineChanges(thesisRequestId: number) {
  const db = await getDb();
  if (!db) return [];
  const changedByUser = aliasedTable(users, "changed_by_user");
  return db.select({ id: deadlineChanges.id, previousDeadline: deadlineChanges.previousDeadline, newDeadline: deadlineChanges.newDeadline, reason: deadlineChanges.reason, changedAt: deadlineChanges.changedAt, changedByName: changedByUser.name }).from(deadlineChanges).leftJoin(changedByUser, eq(deadlineChanges.changedBy, changedByUser.id)).where(eq(deadlineChanges.thesisRequestId, thesisRequestId)).orderBy(desc(deadlineChanges.changedAt));
}

/** Liefert die fachliche Zuordnung einer Thesis für fristbezogene Verwaltungsrechte. */
export async function getThesisDeadlineScope(thesisRequestId: number) {
  const db = await getDb();
  if (!db) return null;
  const student = aliasedTable(users, "deadline_scope_student");
  const [row] = await db.select({ thesisRequestId: thesisRequests.id, studentId: thesisRequests.studentId, programmeId: student.programmeId, department: programmes.fachbereich, targetSemester: thesisRequests.targetSemester, submissionDeadline: thesisRequests.submissionDeadline }).from(thesisRequests).innerJoin(student, eq(thesisRequests.studentId, student.id)).leftJoin(programmes, eq(student.programmeId, programmes.id)).where(eq(thesisRequests.id, thesisRequestId)).limit(1);
  return row ?? null;
}

export async function getProgrammeSemesterDeadlines(scopeDepartment?: string | null) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: programmeSemesterDeadlines.id, department: programmeSemesterDeadlines.department, programmeId: programmeSemesterDeadlines.programmeId, semester: programmeSemesterDeadlines.semester, registrationDeadline: programmeSemesterDeadlines.registrationDeadline, submissionDeadline: programmeSemesterDeadlines.submissionDeadline, updatedAt: programmeSemesterDeadlines.updatedAt, programmeName: programmes.name, programmeAbbreviation: programmes.abbreviation }).from(programmeSemesterDeadlines).leftJoin(programmes, eq(programmeSemesterDeadlines.programmeId, programmes.id)).where(scopeDepartment ? eq(programmeSemesterDeadlines.department, scopeDepartment) : undefined).orderBy(desc(programmeSemesterDeadlines.semester), programmeSemesterDeadlines.department);
}

export async function upsertProgrammeSemesterDeadline(input: { department: string; programmeId: number | null; semester: string; registrationDeadline: string; submissionDeadline: string; updatedBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const programmeCondition = input.programmeId === null ? isNull(programmeSemesterDeadlines.programmeId) : eq(programmeSemesterDeadlines.programmeId, input.programmeId);
  const [existing] = await db.select({ id: programmeSemesterDeadlines.id }).from(programmeSemesterDeadlines).where(and(eq(programmeSemesterDeadlines.department, input.department), eq(programmeSemesterDeadlines.semester, input.semester), programmeCondition)).limit(1);
  const values = { department: input.department, programmeId: input.programmeId, semester: input.semester, registrationDeadline: input.registrationDeadline, submissionDeadline: input.submissionDeadline, updatedBy: input.updatedBy };
  if (existing) { await db.update(programmeSemesterDeadlines).set(values).where(eq(programmeSemesterDeadlines.id, existing.id)); return { id: existing.id, created: false }; }
  const [inserted] = await db.insert(programmeSemesterDeadlines).values(values);
  return { id: inserted.insertId, created: true };
}

export async function getEffectiveProgrammeSemesterDeadline(input: { department: string; programmeId?: number | null; semester: string }) {
  const rules = await getProgrammeSemesterDeadlines(input.department) as ProgrammeSemesterDeadlineRule[];
  return resolveProgrammeSemesterDeadline(rules, input);
}
