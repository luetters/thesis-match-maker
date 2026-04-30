import { and, desc, eq, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  auditLog,
  examinerProfiles,
  InsertAuditLogEntry,
  InsertExaminerProfile,
  InsertThesisRequest,
  InsertUser,
  thesisRequests,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "student" | "examiner" | "admin" | "user") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ─── Examiner Profiles ────────────────────────────────────────────────────────

export async function upsertExaminerProfile(profile: InsertExaminerProfile) {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(examinerProfiles)
    .where(eq(examinerProfiles.userId, profile.userId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(examinerProfiles)
      .set({ ...profile })
      .where(eq(examinerProfiles.userId, profile.userId));
  } else {
    await db.insert(examinerProfiles).values(profile);
  }
}

export async function getExaminerProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(examinerProfiles)
    .where(eq(examinerProfiles.userId, userId))
    .limit(1);
  return result[0];
}

export async function getAllExaminers() {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      user: users,
      profile: examinerProfiles,
    })
    .from(users)
    .leftJoin(examinerProfiles, eq(users.id, examinerProfiles.userId))
    .where(eq(users.role, "examiner"));
  return result;
}

// ─── Thesis Requests ──────────────────────────────────────────────────────────

export async function createThesisRequest(data: InsertThesisRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(thesisRequests).values(data);
  return result;
}

export async function getThesisRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(thesisRequests)
    .where(eq(thesisRequests.id, id))
    .limit(1);
  return result[0];
}

export async function getThesisRequestsByStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(thesisRequests)
    .where(eq(thesisRequests.studentId, studentId))
    .orderBy(desc(thesisRequests.createdAt));
}

export async function getThesisRequestsByExaminer(examinerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(thesisRequests)
    .where(
      or(
        eq(thesisRequests.examinerId, examinerId),
        eq(thesisRequests.secondExaminerId, examinerId)
      )
    )
    .orderBy(desc(thesisRequests.createdAt));
}

export async function getAllThesisRequests() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(thesisRequests)
    .orderBy(desc(thesisRequests.createdAt));
}

export async function updateThesisRequestStatus(
  id: number,
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "MATCHED",
  extra?: { rejectionReason?: string; examinerId?: number; secondExaminerId?: number }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { status };
  if (extra?.rejectionReason !== undefined) updateData.rejectionReason = extra.rejectionReason;
  if (extra?.examinerId !== undefined) updateData.examinerId = extra.examinerId;
  if (extra?.secondExaminerId !== undefined) updateData.secondExaminerId = extra.secondExaminerId;
  await db.update(thesisRequests).set(updateData).where(eq(thesisRequests.id, id));
}

export async function assignExaminerToThesis(
  thesisId: number,
  examinerId: number,
  slot: "first" | "second"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const field = slot === "first" ? { examinerId } : { secondExaminerId: examinerId };
  await db.update(thesisRequests).set(field).where(eq(thesisRequests.id, thesisId));
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export async function createAuditLogEntry(entry: InsertAuditLogEntry) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLog).values(entry);
}

export async function getAuditLogByThesis(thesisRequestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(auditLog)
    .where(eq(auditLog.thesisRequestId, thesisRequestId))
    .orderBy(desc(auditLog.createdAt));
}

export async function getAllAuditLogs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt));
}
