import { and, desc, eq, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  auditLog,
  examinerProfiles,
  InsertAuditLogEntry,
  InsertExaminerProfile,
  InsertNotification,
  InsertPavExaminerProposal,
  InsertThesisRequest,
  InsertUser,
  notifications,
  pavExaminerProposals,
  pavProgrammes,
  programmes,
  examinerProgrammes,
  thesisRequests,
  users,
  emailTemplates,
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

// --- Users --------------------------------------------------------------------

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

// --- Examiner Profiles --------------------------------------------------------

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
  if (!db) return null;
  const result = await db
    .select()
    .from(examinerProfiles)
    .where(eq(examinerProfiles.userId, userId))
    .limit(1);
  return result[0] || null;
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

// --- Thesis Requests ----------------------------------------------------------

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

export async function updateThesisExpose(
  id: number,
  exposeUrl: string,
  exposeKey: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(thesisRequests).set({ exposeUrl, exposeKey }).where(eq(thesisRequests.id, id));
}

// --- Audit Log ----------------------------------------------------------------

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

// --- Notifications ----------------------------------------------------------------

export async function createNotification(entry: InsertNotification) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(entry);
}

export async function getNotificationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function getUnreadCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, 0)));
  return rows.length;
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ read: 1 })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ read: 1 })
    .where(eq(notifications.userId, userId));
}

/**
 * Erstellt Benachrichtigungen für alle Beteiligten einer Anfrage.
 * Wird bei Statuswechseln und Prüfer-Zuweisungen aufgerufen.
 */
export async function notifyThesisParticipants({
  thesisRequestId,
  studentId,
  examinerId,
  secondExaminerId,
  title,
  message,
  type,
}: {
  thesisRequestId: number;
  studentId: number;
  examinerId?: number | null;
  secondExaminerId?: number | null;
  title: string;
  message: string;
  type: InsertNotification["type"];
}) {
  const recipientSet = new Set<number>([studentId]);
  if (examinerId) recipientSet.add(examinerId);
  if (secondExaminerId) recipientSet.add(secondExaminerId);
  const recipientIds = Array.from(recipientSet);

  for (const userId of recipientIds) {
    await createNotification({ userId, title, message, type, thesisRequestId });
  }
}

// --- Admin: Prüfer-Verwaltung -------------------------------------------------

/**
 * Legt einen neuen Prüfer-User an und erstellt gleichzeitig ein Profil.
 * Wird vom Admin verwendet, um Prüfer:innen direkt einzurichten.
 */
export async function createExaminerByAdmin(data: {
  name: string;
  email: string;
  title?: string;
  department?: string;
  bio?: string;
  maxSupervisions?: number;
  tags?: string[];
  languages?: string[];
  studyPrograms?: string[];
}): Promise<{ userId: number; profileId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");

  const openId = `magic:${data.email}`;

  await db
    .insert(users)
    .values({
      openId,
      email: data.email,
      name: data.name,
      loginMethod: "admin_created",
      role: "examiner",
      lastSignedIn: new Date(),
    })
    .onDuplicateKeyUpdate({ set: { name: data.name, role: "examiner" } });

  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  if (userRows.length === 0) throw new Error("User konnte nicht angelegt werden");
  const userId = userRows[0].id;

  const profileData = {
    userId,
    title: data.title ?? null,
    department: data.department ?? null,
    bio: data.bio ?? null,
    maxSupervisions: data.maxSupervisions ?? 5,
    tags: data.tags ?? [],
    languages: data.languages ?? ["Deutsch"],
    studyPrograms: data.studyPrograms ?? [],
  };

  const existingProfile = await db
    .select()
    .from(examinerProfiles)
    .where(eq(examinerProfiles.userId, userId))
    .limit(1);

  if (existingProfile.length > 0) {
    await db
      .update(examinerProfiles)
      .set(profileData)
      .where(eq(examinerProfiles.userId, userId));
  } else {
    await db.insert(examinerProfiles).values(profileData);
  }

  const profileRows = await db
    .select()
    .from(examinerProfiles)
    .where(eq(examinerProfiles.userId, userId))
    .limit(1);

  return { userId, profileId: profileRows[0]?.id ?? 0 };
}

/**
 * Aktualisiert ein Prüfer-Profil und den zugehörigen User (Admin-Aktion).
 */
export async function updateExaminerByAdmin(
  userId: number,
  data: {
    name?: string;
    title?: string;
    department?: string;
    bio?: string;
    maxSupervisions?: number;
    tags?: string[];
    languages?: string[];
    studyPrograms?: string[];
    role?: "examiner" | "admin" | "student" | "user";
  }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");

  if (data.name || data.role) {
    const userUpdate: Record<string, unknown> = {};
    if (data.name) userUpdate.name = data.name;
    if (data.role) userUpdate.role = data.role;
    await db.update(users).set(userUpdate).where(eq(users.id, userId));
  }

  const profileUpdate: Record<string, unknown> = {};
  if (data.title !== undefined) profileUpdate.title = data.title;
  if (data.department !== undefined) profileUpdate.department = data.department;
  if (data.bio !== undefined) profileUpdate.bio = data.bio;
  if (data.maxSupervisions !== undefined) profileUpdate.maxSupervisions = data.maxSupervisions;
  if (data.tags !== undefined) profileUpdate.tags = data.tags;
  if (data.languages !== undefined) profileUpdate.languages = data.languages;
  if (data.studyPrograms !== undefined) profileUpdate.studyPrograms = data.studyPrograms;

  if (Object.keys(profileUpdate).length > 0) {
    const existing = await db
      .select()
      .from(examinerProfiles)
      .where(eq(examinerProfiles.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(examinerProfiles)
        .set(profileUpdate)
        .where(eq(examinerProfiles.userId, userId));
    } else {
      await db.insert(examinerProfiles).values({ userId, ...profileUpdate } as InsertExaminerProfile);
    }
  }
}

/**
 * Gibt alle Nutzer mit ihren Examiner-Profilen zurück (Admin-Ansicht).
 */
export async function getAllUsersWithProfiles() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      user: users,
      profile: examinerProfiles,
    })
    .from(users)
    .leftJoin(examinerProfiles, eq(users.id, examinerProfiles.userId))
    .orderBy(desc(users.createdAt));

  return result;
}

/**
 * Löscht einen User und sein Profil (Admin-Aktion).
 */
export async function deleteUserByAdmin(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");

  // Profil zuerst löschen (FK-Constraint)
  await db.delete(examinerProfiles).where(eq(examinerProfiles.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

/**
 * Setzt oder entfernt die Deadline einer Thesis-Anfrage (Admin-Aktion).
 */
export async function updateThesisDeadline(thesisId: number, deadline: Date | null): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  await db
    .update(thesisRequests)
    .set({ deadline, updatedAt: new Date() })
    .where(eq(thesisRequests.id, thesisId));
}

/**
 * Aktualisiert das Profilfoto eines Prüfers/einer Prüferin.
 */
export async function updateExaminerPhoto(userId: number, photoUrl: string, photoKey: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const existing = await db
    .select()
    .from(examinerProfiles)
    .where(eq(examinerProfiles.userId, userId))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(examinerProfiles)
      .set({ photoUrl, photoKey })
      .where(eq(examinerProfiles.userId, userId));
  } else {
    await db.insert(examinerProfiles).values({ userId, photoUrl, photoKey });
  }
}

// --- Kolloquien ---------------------------------------------------------------

import { colloquiums, InsertColloquium } from "../drizzle/schema";

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

export async function updateColloquiumStatus(
  id: number,
  status: "SCHEDULED" | "CANCELLED" | "COMPLETED"
): Promise<void> {
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
  const db = await getDb();
  if (!db) return [];
  // Kolloquien über Thesis-Anfragen des Prüfers
  const theses = await getThesisRequestsByExaminer(examinerId);
  if (theses.length === 0) return [];
  const thesisIds = theses.map((t) => t.id);
  const all = await getAllColloquiums();
  return all.filter((c) => thesisIds.includes(c.thesisRequestId));
}

export async function getColloquiumsByStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  const theses = await getThesisRequestsByStudent(studentId);
  if (theses.length === 0) return [];
  const thesisIds = theses.map((t) => t.id);
  const all = await getAllColloquiums();
  return all.filter((c) => thesisIds.includes(c.thesisRequestId));
}

// ─── Statistics ──────────────────────────────────────────────────────────────
export async function getThesisStats() {
  const db = await getDb();
  if (!db) return null;
  const all = await db.select().from(thesisRequests);
  const byStatus: Record<string, number> = {};
  const byDepartment: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  for (const r of all) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    const dept = r.department ?? 'Unbekannt';
    byDepartment[dept] = (byDepartment[dept] ?? 0) + 1;
    const month = new Date(r.createdAt).toISOString().slice(0, 7);
    byMonth[month] = (byMonth[month] ?? 0) + 1;
  }
  return {
    total: all.length,
    byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
    byDepartment: Object.entries(byDepartment).map(([name, value]) => ({ name, value })),
    byMonth: Object.entries(byMonth).sort().map(([month, count]) => ({ month, count })),
  };
}

// ─── Password Auth Helpers ────────────────────────────────────────────────────
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return result[0];
}

export async function setUserPasswordHash(userId: number, hash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ passwordHash: hash } as any).where(eq(users.id, userId));
}

export async function createUserWithPassword(data: {
  email: string;
  name: string;
  role: "student" | "examiner" | "admin" | "user";
  passwordHash: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `pw_${data.email.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
  await db
    .insert(users)
    .values({
      openId,
      email: data.email.toLowerCase(),
      name: data.name,
      role: data.role,
      loginMethod: "password",
      passwordHash: data.passwordHash,
      lastSignedIn: new Date(),
    } as any)
    .onDuplicateKeyUpdate({
      set: {
        name: data.name,
        role: data.role,
        passwordHash: data.passwordHash,
        loginMethod: "password",
      } as any,
    });
  return getUserByEmail(data.email);
}

// ─── System Settings ──────────────────────────────────────────────────────────
import { systemSettings, InsertSystemSetting } from "../drizzle/schema";

export async function getSystemSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(systemSettings).orderBy(systemSettings.key);
}

export async function getSystemSetting(key: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertSystemSetting(key: string, value: string, updatedById?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getSystemSetting(key);
  if (existing) {
    await db
      .update(systemSettings)
      .set({ value, updatedById: updatedById ?? null } as Partial<InsertSystemSetting>)
      .where(eq(systemSettings.key, key));
  } else {
    await db.insert(systemSettings).values({ key, value, updatedById: updatedById ?? null } as InsertSystemSetting);
  }
  return getSystemSetting(key);
}

// ─── Password Reset Tokens ────────────────────────────────────────────────────
import { passwordResetTokens, InsertPasswordResetToken } from "../drizzle/schema";

export async function createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(passwordResetTokens).values({
    token,
    userId,
    expiresAt,
    used: 0,
  } as InsertPasswordResetToken);
}

export async function getPasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .limit(1);
  return rows[0] ?? null;
}

export async function markPasswordResetTokenUsed(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(passwordResetTokens)
    .set({ used: 1 })
    .where(eq(passwordResetTokens.token, token));
}

// ─── Programmes ────────────────────────────────────────────────────────────────
export async function getAllProgrammes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(programmes).orderBy(programmes.sortOrder);
}

export async function getProgrammeById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(programmes).where(eq(programmes.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function setStudentProgramme(userId: number, programmeId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  // Check if already set (immutable after first set)
  const rows = await db.select({ programmeId: (users as any).programmeId }).from(users).where(eq(users.id, userId)).limit(1);
  if (rows[0]?.programmeId) return false; // already set, immutable
  // Use raw mysql2 connection for non-schema column
  const mysql2 = await import('mysql2/promise');
  const conn = await mysql2.createConnection(process.env.DATABASE_URL!);
  await conn.execute('UPDATE users SET programme_id = ? WHERE id = ?', [programmeId, userId]);
  await conn.end();
  return true;
}

export async function getExaminerProgrammes(examinerId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ programme: programmes })
    .from(examinerProgrammes)
    .innerJoin(programmes, eq(examinerProgrammes.programmeId, programmes.id))
    .where(eq(examinerProgrammes.examinerId, examinerId));
  return rows.map(r => r.programme);
}

export async function setExaminerProgrammes(examinerId: number, programmeIds: number[]): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(examinerProgrammes).where(eq(examinerProgrammes.examinerId, examinerId));
  if (programmeIds.length > 0) {
    await db.insert(examinerProgrammes).values(
      programmeIds.map(pid => ({ examinerId, programmeId: pid }))
    );
  }
}

// ─── Examiner Alternative Email ───────────────────────────────────────────────
export async function updateExaminerAlternativeEmail(userId: number, alternativeEmail: string | null): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select({ id: examinerProfiles.id })
    .from(examinerProfiles)
    .where(eq(examinerProfiles.userId, userId))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(examinerProfiles)
      .set({ alternativeEmail: alternativeEmail ?? null })
      .where(eq(examinerProfiles.userId, userId));
  } else {
    // Profil noch nicht vorhanden → erstellen
    await db.insert(examinerProfiles).values({ userId, alternativeEmail: alternativeEmail ?? null });
  }
}

// ─── Examiner Second Examiner Flag ────────────────────────────────────────────
export async function updateExaminerSecondExaminerFlag(userId: number, isSecondExaminer: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select({ id: examinerProfiles.id })
    .from(examinerProfiles)
    .where(eq(examinerProfiles.userId, userId))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(examinerProfiles)
      .set({ isSecondExaminer: isSecondExaminer ? 1 : 0 })
      .where(eq(examinerProfiles.userId, userId));
  } else {
    await db.insert(examinerProfiles).values({ userId, isSecondExaminer: isSecondExaminer ? 1 : 0 });
  }
}

// ─── Resolve Examiner Email (alternativeEmail bevorzugen) ─────────────────────
/**
 * Gibt die E-Mail-Adresse zurück, an die Benachrichtigungen für eine Prüfer:in gesendet werden sollen.
 * Wenn eine alternativeEmail im Profil hinterlegt ist, wird diese bevorzugt.
 * Andernfalls wird die Anmelde-E-Mail (users.email) verwendet.
 */
export async function resolveExaminerEmail(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const profile = await db
    .select({ alternativeEmail: examinerProfiles.alternativeEmail })
    .from(examinerProfiles)
    .where(eq(examinerProfiles.userId, userId))
    .limit(1);
  if (profile.length > 0 && profile[0].alternativeEmail) {
    return profile[0].alternativeEmail;
  }
  const user = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user[0]?.email ?? null;
}

// ─── Complete Examiner Onboarding ─────────────────────────────────────────────
/**
 * Setzt isSecondExaminer, optional alternativeEmail und onboardingCompleted=1 in einem Schritt.
 */
export async function completeExaminerOnboarding(
  userId: number,
  isSecondExaminer: boolean,
  alternativeEmail?: string | null
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select({ id: examinerProfiles.id })
    .from(examinerProfiles)
    .where(eq(examinerProfiles.userId, userId))
    .limit(1);
  const updateData = {
    isSecondExaminer: isSecondExaminer ? 1 : 0,
    alternativeEmail: alternativeEmail ?? null,
    onboardingCompleted: 1,
  };
  if (existing.length > 0) {
    await db.update(examinerProfiles).set(updateData).where(eq(examinerProfiles.userId, userId));
  } else {
    await db.insert(examinerProfiles).values({ userId, ...updateData });
  }
}

// ─── PAV Helpers ──────────────────────────────────────────────────────────────

/** Gibt alle Studierende zurück, die noch keinen Erst- oder Zweitprüfer:in haben */
export async function getUnassignedStudents() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      request: thesisRequests,
      student: users,
    })
    .from(thesisRequests)
    .innerJoin(users, eq(thesisRequests.studentId, users.id))
    .where(
      and(
        or(isNull(thesisRequests.examinerId), eq(thesisRequests.examinerId, 0)),
        ne(thesisRequests.status, "REJECTED")
      )
    )
    .orderBy(desc(thesisRequests.createdAt));
}

/** Zählt offene (pending) PAV-Vorschläge für einen bestimmten Antrag */
export async function countOpenPavProposals(thesisRequestId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(pavExaminerProposals)
    .where(
      and(
        eq(pavExaminerProposals.thesisRequestId, thesisRequestId),
        eq(pavExaminerProposals.status, "pending")
      )
    );
  return Number(rows[0]?.count ?? 0);
}

/** Erstellt einen neuen PAV-Vorschlag */
export async function createPavProposal(data: InsertPavExaminerProposal) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(pavExaminerProposals).values(data);
  return result;
}

/** Gibt alle Vorschläge eines PAV zurück (mit Antrag- und Prüfer-Infos) */
export async function getPavProposalsByPav(pavUserId: number) {
  const db = await getDb();
  if (!db) return [];
  const examinerAlias = users;
  const rows = await db
    .select({
      proposal: pavExaminerProposals,
      request: thesisRequests,
    })
    .from(pavExaminerProposals)
    .innerJoin(thesisRequests, eq(pavExaminerProposals.thesisRequestId, thesisRequests.id))
    .where(eq(pavExaminerProposals.proposedByPavId, pavUserId))
    .orderBy(desc(pavExaminerProposals.createdAt));
  return rows;
}

/** Gibt einen Vorschlag anhand des Action-Tokens zurück */
export async function getPavProposalByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(pavExaminerProposals)
    .where(eq(pavExaminerProposals.actionToken, token))
    .limit(1);
  return rows[0] ?? null;
}

/** Aktualisiert den Status eines PAV-Vorschlags */
export async function updatePavProposalStatus(
  id: number,
  status: "accepted" | "declined",
  declineReason?: string
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(pavExaminerProposals)
    .set({
      status,
      respondedAt: new Date(),
      declineReason: declineReason ?? null,
    })
    .where(eq(pavExaminerProposals.id, id));
}

/** Weist Prüfer:in einem Antrag zu (nach Annahme eines PAV-Vorschlags) */
export async function assignExaminerFromProposal(
  thesisRequestId: number,
  examinerId: number,
  role: "first" | "second"
) {
  const db = await getDb();
  if (!db) return;
  if (role === "first") {
    await db
      .update(thesisRequests)
      .set({ examinerId, status: "MATCHED" })
      .where(eq(thesisRequests.id, thesisRequestId));
  } else {
    await db
      .update(thesisRequests)
      .set({ secondExaminerId: examinerId })
      .where(eq(thesisRequests.id, thesisRequestId));
  }
}


// --- Dekanat / SuperAdmin Helpers ---

/** Alle Thesis-Requests (für Dekan/Prodekan/SuperAdmin) */
export async function getAllThesisRequestsForDean() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      request: thesisRequests,
      student: users,
    })
    .from(thesisRequests)
    .innerJoin(users, eq(thesisRequests.studentId, users.id))
    .orderBy(desc(thesisRequests.createdAt));
}

/** Alle Nutzer:innen mit Rollen (für SuperAdmin) */
export async function getAllUsersWithRoles() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
}

/** Rolle eines Nutzers setzen (SuperAdmin) */
export async function setUserRole(
  userId: number,
  role: "student" | "examiner" | "pav" | "admin" | "dean" | "vice_dean" | "superadmin"
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role } as any).where(eq(users.id, userId));
}

/** Onboarding-Reset für Prüfer:in (Admin) */
export async function resetExaminerOnboarding(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(examinerProfiles)
    .set({ onboardingCompleted: 0 })
    .where(eq(examinerProfiles.userId, userId));
}

// ─── PAV-Studiengang-Zuordnung ────────────────────────────────────────────────

/** Alle Studiengänge abrufen, denen ein PAV zugeordnet ist */
export async function getPavProgrammes(pavUserId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ programmeId: pavProgrammes.programmeId, name: programmes.name, level: programmes.level })
    .from(pavProgrammes)
    .innerJoin(programmes, eq(pavProgrammes.programmeId, programmes.id))
    .where(eq(pavProgrammes.pavUserId, pavUserId));
  return rows;
}

/** PAV einem Studiengang zuordnen */
export async function addPavProgramme(pavUserId: number, programmeId: number) {
  const db = await getDb();
  if (!db) return;
  // Duplikat ignorieren
  await db.execute(
    `INSERT IGNORE INTO pav_programmes (pav_user_id, programme_id) VALUES (${pavUserId}, ${programmeId})`
  );
}

/** PAV-Studiengang-Zuordnung entfernen */
export async function removePavProgramme(pavUserId: number, programmeId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(pavProgrammes)
    .where(
      and(
        eq(pavProgrammes.pavUserId, pavUserId),
        eq(pavProgrammes.programmeId, programmeId)
      )
    );
}

/** Unzugeteilte Studierende – gefiltert nach PAV-Studiengängen */
export async function getUnassignedStudentsByPavProgrammes(pavUserId: number) {
  const db = await getDb();
  if (!db) return [];
  // PAV-Studiengänge ermitteln
  const pavProgs = await getPavProgrammes(pavUserId);
  if (pavProgs.length === 0) {
    // Keine Zuordnung → alle unzugeteilten Studierenden zeigen
    return getUnassignedStudents();
  }
  const progNames = pavProgs.map((p) => p.name);
  const rows = await db
    .select({
      id: thesisRequests.id,
      title: thesisRequests.title,
      department: thesisRequests.department,
      degreeType: thesisRequests.degreeType,
      hasOwnTopic: thesisRequests.hasOwnTopic,
      createdAt: thesisRequests.createdAt,
      studentId: thesisRequests.studentId,
      studentName: users.name,
      studentEmail: users.email,
    })
    .from(thesisRequests)
    .innerJoin(users, eq(thesisRequests.studentId, users.id))
    .where(
      and(
        eq(thesisRequests.status, "PENDING"),
        isNull(thesisRequests.examinerId),
        inArray(thesisRequests.department, progNames)
      )
    )
    .orderBy(thesisRequests.createdAt);
  return rows;
}

/** Alle Anträge für Dekanat-CSV-Export */
export async function getAllThesisRequestsForCsv() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: thesisRequests.id,
      title: thesisRequests.title,
      department: thesisRequests.department,
      degreeType: thesisRequests.degreeType,
      status: thesisRequests.status,
      language: thesisRequests.language,
      hasOwnTopic: thesisRequests.hasOwnTopic,
      createdAt: thesisRequests.createdAt,
      deadline: thesisRequests.deadline,
      studentName: users.name,
      studentEmail: users.email,
    })
    .from(thesisRequests)
    .innerJoin(users, eq(thesisRequests.studentId, users.id))
    .orderBy(thesisRequests.createdAt);

  // Statushistorie-Daten aus auditLog anreichern
  const enriched = await Promise.all(rows.map(async (r) => {
    const logs = await db
      .select({ createdAt: auditLog.createdAt, action: auditLog.action })
      .from(auditLog)
      .where(and(eq(auditLog.thesisRequestId, r.id), sql`${auditLog.action} LIKE 'STATUS_%'`))
      .orderBy(auditLog.createdAt);
    const lastStatusChange = logs.length > 0 ? logs[logs.length - 1].createdAt : null;
    const statusChangeCount = logs.length;
    return { ...r, lastStatusChange, statusChangeCount };
  }));
  return enriched;
}

// --- Superadmin: PAV-Studiengang-Verwaltung ---

/** Alle PAV-Nutzer:innen mit ihren zugeordneten Studiengaengen */
export async function getAllPavUsersWithProgrammes() {
  const db = await getDb();
  if (!db) return [];
  const pavUsers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.role, "pav"));
  const result = [];
  for (const u of pavUsers) {
    const progs = await db
      .select({ programmeId: pavProgrammes.programmeId, programmeName: programmes.name })
      .from(pavProgrammes)
      .innerJoin(programmes, eq(pavProgrammes.programmeId, programmes.id))
      .where(eq(pavProgrammes.pavUserId, u.id));
    result.push({ user: u, programmes: progs });
  }
  return result;
}

/** Superadmin weist PAV einem Studiengang zu */
export async function superadminAssignPavProgramme(userId: number, programmeId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(pavProgrammes).ignore().values({ pavUserId: userId, programmeId });
}

/** Superadmin entfernt PAV-Studiengang-Zuweisung */
export async function superadminRemovePavProgramme(userId: number, programmeId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pavProgrammes).where(
    and(eq(pavProgrammes.pavUserId, userId), eq(pavProgrammes.programmeId, programmeId))
  );
}

// --- Dekanat: Detailansicht pro Antrag ---

/** Einzelner Antrag mit Pruefer:innen, Statushistorie und Kolloquium fuer Dekanat */
export async function getThesisRequestDetailForDean(requestId: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select({
      request: thesisRequests,
      student: { id: users.id, name: users.name, email: users.email },
    })
    .from(thesisRequests)
    .innerJoin(users, eq(thesisRequests.studentId, users.id))
    .where(eq(thesisRequests.id, requestId))
    .limit(1);
  if (!row) return null;

  // Erstpruefer:in
  const firstExaminer = row.request.examinerId
    ? await db.select({ id: users.id, name: users.name, email: users.email })
        .from(users).where(eq(users.id, row.request.examinerId)).limit(1)
    : [];
  // Zweitpruefer:in
  const secondExaminer = row.request.secondExaminerId
    ? await db.select({ id: users.id, name: users.name, email: users.email })
        .from(users).where(eq(users.id, row.request.secondExaminerId)).limit(1)
    : [];

  // Statushistorie
  const history = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.thesisRequestId, requestId))
    .orderBy(auditLog.createdAt);

  // Kolloquium (erstes gefundenes)
  const [colloquium] = await db
    .select()
    .from(colloquiums)
    .where(eq(colloquiums.thesisRequestId, requestId))
    .limit(1);

  return {
    request: row.request,
    student: row.student,
    firstExaminer: firstExaminer[0] ?? null,
    secondExaminer: secondExaminer[0] ?? null,
    history,
    colloquium: colloquium ?? null,
  };
}

// ─── Dekanat-Statistiken ──────────────────────────────────────────────────────
export async function getDeanStats() {
  const db = await getDb();
  if (!db) return null;

  const allRequests = await db
    .select({
      id: thesisRequests.id,
      status: thesisRequests.status,
      department: thesisRequests.department,
      degreeType: thesisRequests.degreeType,
      createdAt: thesisRequests.createdAt,
      updatedAt: thesisRequests.updatedAt,
    })
    .from(thesisRequests);

  const byStatus: Record<string, number> = {};
  for (const r of allRequests) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  }

  const byDepartment: Record<string, number> = {};
  for (const r of allRequests) {
    const dept = r.department || "Unbekannt";
    byDepartment[dept] = (byDepartment[dept] ?? 0) + 1;
  }

  const now = new Date();
  const monthlyData: { month: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
    const count = allRequests.filter((r) => {
      const created = new Date(r.createdAt);
      return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth();
    }).length;
    monthlyData.push({ month: label, count });
  }

  const examinerLoad = await db
    .select({
      examinerName: users.name,
      examinerId: users.id,
      maxSupervisions: examinerProfiles.maxSupervisions,
    })
    .from(examinerProfiles)
    .innerJoin(users, eq(examinerProfiles.userId, users.id))
    .where(eq(examinerProfiles.isSecondExaminer, 0))
    .limit(20);

  const examinerStats = await Promise.all(
    examinerLoad.map(async (e) => {
      const current = await db
        .select({ id: thesisRequests.id })
        .from(thesisRequests)
        .where(eq(thesisRequests.examinerId, e.examinerId));
      return {
        name: e.examinerName ?? "Unbekannt",
        current: current.length,
        max: e.maxSupervisions ?? 5,
      };
    })
  );

  const total = allRequests.length;
  const open = (byStatus["PENDING"] ?? 0) + (byStatus["MATCHED"] ?? 0);
  const accepted = byStatus["ACCEPTED"] ?? 0;
  const completionRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

  const resolved = allRequests.filter((r) => r.status === "ACCEPTED" || r.status === "REJECTED");
  const avgDays = resolved.length > 0
    ? Math.round(
        resolved.reduce((sum, r) => {
          const diff = new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime();
          return sum + diff / (1000 * 60 * 60 * 24);
        }, 0) / resolved.length
      )
    : 0;

  return {
    kpis: { total, open, accepted, completionRate, avgDays },
    byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    byDepartment: Object.entries(byDepartment)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([department, count]) => ({ department, count })),
    monthly: monthlyData,
    examinerLoad: examinerStats.sort((a, b) => b.current - a.current).slice(0, 10),
  };
}

// --- E-Mail-Vorlagen ---
export async function getAllEmailTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emailTemplates).orderBy(emailTemplates.key);
}
export async function getEmailTemplateByKey(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(emailTemplates).where(eq(emailTemplates.key, key)).limit(1);
  return rows[0];
}
export async function updateEmailTemplate(
  key: string,
  data: { subject?: string; htmlBody?: string; textBody?: string },
  updatedByUserId?: number
) {
  const db = await getDb();
  if (!db) throw new Error('Datenbank nicht verfügbar');
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (data.subject !== undefined) update.subject = data.subject;
  if (data.htmlBody !== undefined) update.htmlBody = data.htmlBody;
  if (data.textBody !== undefined) update.textBody = data.textBody;
  if (updatedByUserId !== undefined) update.updatedByUserId = updatedByUserId;
  await db.update(emailTemplates).set(update).where(eq(emailTemplates.key, key));
}

// ─── Sprach-Präferenz ─────────────────────────────────────────────────────────
export async function setPreferredLanguage(userId: number, lang: "de" | "en") {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  await db.update(users).set({ preferredLanguage: lang }).where(eq(users.id, userId));
}

// ─── SuperAdmin: Prüferinnen-Verwaltung ──────────────────────────────────────
export async function listExaminers(filters?: { isActive?: boolean }) {
  const db = await getDb();
  if (!db) return [];
  
  let baseQuery = db.select({
    id: examinerProfiles.id,
    userId: examinerProfiles.userId,
    name: users.name,
    email: users.email,
    title: examinerProfiles.title,
    department: examinerProfiles.department,
    bio: examinerProfiles.bio,
    researchFocus: examinerProfiles.researchFocus,
    maxSupervisions: examinerProfiles.maxSupervisions,
    createdAt: examinerProfiles.createdAt,
  }).from(examinerProfiles)
    .leftJoin(users, eq(examinerProfiles.userId, users.id));
  
  return baseQuery;
}

export async function updateExaminerProfileByAdmin(
  examinerId: number,
  data: {
    title?: string;
    department?: string;
    bio?: string;
    researchFocus?: string;
    maxSupervisions?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title !== undefined) update.title = data.title;
  if (data.department !== undefined) update.department = data.department;
  if (data.bio !== undefined) update.bio = data.bio;
  if (data.researchFocus !== undefined) update.researchFocus = data.researchFocus;
  if (data.maxSupervisions !== undefined) update.maxSupervisions = data.maxSupervisions;
  
  await db.update(examinerProfiles)
    .set(update)
    .where(eq(examinerProfiles.id, examinerId));
}

// isActive-Spalte wurde entfernt – Status-Toggle ist derzeit nicht verfügbar
// export async function toggleExaminerStatus(examinerId: number, isActive: boolean) {
//   const db = await getDb();
//   if (!db) throw new Error("Datenbank nicht verfügbar");
//   
//   await db.update(examinerProfiles)
//     .set({ isActive: isActive ? 1 : 0, updatedAt: new Date() })
//     .where(eq(examinerProfiles.id, examinerId));
// }


// ─── Phase 27: Anfrageprozess-Verbesserungen ──────────────────────────────────

/**
 * Hole alle qualifizierten Gutachter:innen für einen Studiengang
 * Filtert nach studyPrograms JSON-Array
 */
export async function getQualifiedExaminers(department: string) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    id: examinerProfiles.id,
    userId: examinerProfiles.userId,
    name: users.name,
    email: users.email,
    title: examinerProfiles.title,
    department: examinerProfiles.department,
    studyPrograms: examinerProfiles.studyPrograms,
  }).from(examinerProfiles)
    .leftJoin(users, eq(examinerProfiles.userId, users.id));
  
  // Filtere nach department in studyPrograms JSON
  return result.filter(examiner => {
    const programs = examiner.studyPrograms as string[] | null;
    return programs && programs.includes(department);
  });
}

/**
 * Hole alle Zweitgutachter:innen für einen Studiengang
 * Kategorisiere in intern (isSecondExaminer=1) und extern
 */
export async function getSecondExaminers(department: string) {
  const db = await getDb();
  if (!db) return { internal: [], external: [] };
  
  const result = await db.select({
    id: examinerProfiles.id,
    userId: examinerProfiles.userId,
    name: users.name,
    email: users.email,
    title: examinerProfiles.title,
    department: examinerProfiles.department,
    isSecondExaminer: examinerProfiles.isSecondExaminer,
    studyPrograms: examinerProfiles.studyPrograms,
  }).from(examinerProfiles)
    .leftJoin(users, eq(examinerProfiles.userId, users.id));
  
  // Filtere nach department und kategorisiere
  const filtered = result.filter(examiner => {
    const programs = examiner.studyPrograms as string[] | null;
    return programs && programs.includes(department);
  });
  
  return {
    internal: filtered.filter(e => e.isSecondExaminer === 1),
    external: filtered.filter(e => e.isSecondExaminer === 0),
  };
}

/**
 * Prüfe ob Student eine offene Anfrage hat
 */
export async function hasOpenThesisRequest(studentId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select({ id: thesisRequests.id })
    .from(thesisRequests)
    .where(
      and(
        eq(thesisRequests.studentId, studentId),
        inArray(thesisRequests.status, ["PENDING", "PENDING_FIRST_EXAMINER", "PENDING_SECOND_EXAMINER"])
      )
    )
    .limit(1);
  
  return result.length > 0;
}

/**
 * Generiere einen eindeutigen Token für Accept/Reject-Links
 */
export function generateExaminerActionToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) +
         Date.now().toString(36);
}

/**
 * Speichere einen Examiner Action Token
 */
export async function createExaminerActionToken(
  thesisRequestId: number,
  examinerId: number,
  expiresAt: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  
  const token = generateExaminerActionToken();
  
  // Importiere examinerActionTokens aus schema
  const { examinerActionTokens } = await import("../drizzle/schema");
  
  await db.insert(examinerActionTokens).values({
    thesisRequestId,
    examinerId,
    token,
    expiresAt,
  });
  
  return token;
}

/**
 * Validiere einen Examiner Action Token
 */
export async function verifyExaminerActionToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  
  const { examinerActionTokens } = await import("../drizzle/schema");
  
  const result = await db.select()
    .from(examinerActionTokens)
    .where(
      and(
        eq(examinerActionTokens.token, token),
        gt(examinerActionTokens.expiresAt, new Date()),
        isNull(examinerActionTokens.usedAt)
      )
    )
    .limit(1);
  
  return result[0] || null;
}

/**
 * Markiere einen Token als verwendet
 */
export async function markTokenAsUsed(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  
  const { examinerActionTokens } = await import("../drizzle/schema");
  
  await db.update(examinerActionTokens)
    .set({ usedAt: new Date() })
    .where(eq(examinerActionTokens.token, token));
}

/**
 * Aktualisiere Anfrage-Status auf FIRST_EXAMINER_ACCEPTED
 */
export async function acceptThesisRequest(thesisRequestId: number, examinerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  
  // Get thesis request details
  const thesisResult = await (db as any).query.thesisRequests.findFirst({
    where: eq(thesisRequests.id, thesisRequestId),
  });
  
  if (!thesisResult) throw new Error("Anfrage nicht gefunden");
  
  // Update thesis status
  await db.update(thesisRequests)
    .set({
      status: "FIRST_EXAMINER_ACCEPTED",
      examinerId,
      updatedAt: new Date(),
    })
    .where(eq(thesisRequests.id, thesisRequestId));
  
  // Create notification for student
  const examinerProfile = await (db as any).query.examinerProfiles.findFirst({
    where: eq(examinerProfiles.userId, examinerId),
  });
  
  const notificationTitle = "Anfrage akzeptiert";
  const notificationContent = `Ihre Anfrage wurde von ${examinerProfile?.title || "einer Gutachter:in"} akzeptiert. Sie können nun einen Zweitgutachter wählen.`;
  
  await db.insert(notifications).values({
    userId: thesisResult.studentId,
    title: notificationTitle,
    message: notificationContent,
    type: "status_change",
    thesisRequestId: thesisRequestId,
    read: 0,
    createdAt: new Date(),
  });
}

/**
 * Aktualisiere Anfrage-Status auf FIRST_EXAMINER_REJECTED
 */
export async function rejectThesisRequest(thesisRequestId: number, rejectionReason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  
  // Get thesis request details
  const thesisResult = await (db as any).query.thesisRequests.findFirst({
    where: eq(thesisRequests.id, thesisRequestId),
  });
  
  if (!thesisResult) throw new Error("Anfrage nicht gefunden");
  
  // Update thesis status
  await db.update(thesisRequests)
    .set({
      status: "FIRST_EXAMINER_REJECTED",
      rejectionReason: rejectionReason || null,
      updatedAt: new Date(),
    })
    .where(eq(thesisRequests.id, thesisRequestId));
  
  // Create notification for student
  const notificationTitle = "Anfrage abgelehnt";
  const notificationContent = rejectionReason 
    ? `Ihre Anfrage wurde leider abgelehnt. Grund: ${rejectionReason}`
    : "Ihre Anfrage wurde leider abgelehnt. Sie können eine neue Anfrage einreichen.";
  
  await db.insert(notifications).values({
    userId: thesisResult.studentId,
    title: notificationTitle,
    message: notificationContent,
    type: "status_change",
    thesisRequestId: thesisRequestId,
    read: 0,
    createdAt: new Date(),
  });
}

/**
 * Ziehe eine Anfrage zurück
 */
export async function withdrawThesisRequest(thesisRequestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  
  await db.update(thesisRequests)
    .set({
      withdrawnAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(thesisRequests.id, thesisRequestId));
}

/**
 * Speichere Zweitgutachter für Anfrage
 */
export async function setSecondExaminer(thesisRequestId: number, secondExaminerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  
  await db.update(thesisRequests)
    .set({
      secondExaminerId,
      status: "PENDING_SECOND_EXAMINER",
      updatedAt: new Date(),
    })
    .where(eq(thesisRequests.id, thesisRequestId));
}


// ─── Phase 27 Sprint 2: E-Mail-Versand ────────────────────────────────────────
export async function sendExaminerConfirmationEmail(
  thesisRequestId: number,
  examinerEmail: string,
  examinerName: string,
  studentName: string,
  thesisTitle: string,
  department: string,
  acceptToken: string,
  rejectToken: string
): Promise<boolean> {
  const { sendExaminerCTAEmail } = await import("./emailHelper");
  
  // Generiere Accept/Reject-URLs mit Tokens
  const baseUrl = process.env.FRONTEND_URL || "https://thesis.htw-berlin.com";
  const acceptUrl = `${baseUrl}/api/thesis/accept?token=${acceptToken}`;
  const rejectUrl = `${baseUrl}/api/thesis/reject?token=${rejectToken}`;
  
  return sendExaminerCTAEmail({
    to: examinerEmail,
    examinerName,
    studentName,
    thesisTitle,
    department,
    acceptUrl,
    rejectUrl,
  });
}

// Phase 28: Examiner-Dashboard für Anfrage-Verwaltung

export async function getExaminerPendingRequests(examinerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: thesisRequests.id,
      title: thesisRequests.title,
      description: thesisRequests.description,
      studentId: thesisRequests.studentId,
      department: thesisRequests.department,
      targetSemester: thesisRequests.targetSemester,
      language: thesisRequests.language,
      status: thesisRequests.status,
      createdAt: thesisRequests.createdAt,
      studentName: users.name,
      studentEmail: users.email,
    })
    .from(thesisRequests)
    .leftJoin(users, eq(thesisRequests.studentId, users.id))
    .where(
      and(
        eq(thesisRequests.wantedExaminerId, examinerId),
        eq(thesisRequests.status, "PENDING_FIRST_EXAMINER")
      )
    )
    .orderBy(desc(thesisRequests.createdAt));
}

export async function getExaminerAcceptedRequests(examinerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: thesisRequests.id,
      title: thesisRequests.title,
      description: thesisRequests.description,
      studentId: thesisRequests.studentId,
      department: thesisRequests.department,
      targetSemester: thesisRequests.targetSemester,
      language: thesisRequests.language,
      status: thesisRequests.status,
      createdAt: thesisRequests.createdAt,
      studentName: users.name,
      studentEmail: users.email,
    })
    .from(thesisRequests)
    .leftJoin(users, eq(thesisRequests.studentId, users.id))
    .where(
      and(
        eq(thesisRequests.wantedExaminerId, examinerId),
        eq(thesisRequests.status, "FIRST_EXAMINER_ACCEPTED")
      )
    )
    .orderBy(desc(thesisRequests.createdAt));
}

export async function getExaminerRejectedRequests(examinerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: thesisRequests.id,
      title: thesisRequests.title,
      description: thesisRequests.description,
      studentId: thesisRequests.studentId,
      department: thesisRequests.department,
      targetSemester: thesisRequests.targetSemester,
      language: thesisRequests.language,
      status: thesisRequests.status,
      rejectionReason: thesisRequests.rejectionReason,
      createdAt: thesisRequests.createdAt,
      studentName: users.name,
      studentEmail: users.email,
    })
    .from(thesisRequests)
    .leftJoin(users, eq(thesisRequests.studentId, users.id))
    .where(
      and(
        eq(thesisRequests.wantedExaminerId, examinerId),
        eq(thesisRequests.status, "FIRST_EXAMINER_REJECTED")
      )
    )
    .orderBy(desc(thesisRequests.createdAt));
}

export async function getExaminerSecondExaminerRequests(examinerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: thesisRequests.id,
      title: thesisRequests.title,
      description: thesisRequests.description,
      studentId: thesisRequests.studentId,
      department: thesisRequests.department,
      targetSemester: thesisRequests.targetSemester,
      language: thesisRequests.language,
      status: thesisRequests.status,
      createdAt: thesisRequests.createdAt,
      studentName: users.name,
      studentEmail: users.email,
    })
    .from(thesisRequests)
    .leftJoin(users, eq(thesisRequests.studentId, users.id))
    .where(
      and(
        eq(thesisRequests.secondExaminerId, examinerId),
        eq(thesisRequests.status, "PENDING_SECOND_EXAMINER")
      )
    )
    .orderBy(desc(thesisRequests.createdAt));
}

export async function getExaminerRequestStats(examinerId: number) {
  const db = await getDb();
  if (!db) return { pendingAsFirstExaminer: 0, acceptedAsFirstExaminer: 0, rejectedAsFirstExaminer: 0, pendingAsSecondExaminer: 0 };
  
  const pending = await db
    .select({ count: sql<number>`count(*)` })
    .from(thesisRequests)
    .where(
      and(
        eq(thesisRequests.wantedExaminerId, examinerId),
        eq(thesisRequests.status, "PENDING_FIRST_EXAMINER")
      )
    );

  const accepted = await db
    .select({ count: sql<number>`count(*)` })
    .from(thesisRequests)
    .where(
      and(
        eq(thesisRequests.wantedExaminerId, examinerId),
        eq(thesisRequests.status, "FIRST_EXAMINER_ACCEPTED")
      )
    );

  const rejected = await db
    .select({ count: sql<number>`count(*)` })
    .from(thesisRequests)
    .where(
      and(
        eq(thesisRequests.wantedExaminerId, examinerId),
        eq(thesisRequests.status, "FIRST_EXAMINER_REJECTED")
      )
    );

  const secondExaminer = await db
    .select({ count: sql<number>`count(*)` })
    .from(thesisRequests)
    .where(
      and(
        eq(thesisRequests.secondExaminerId, examinerId),
        eq(thesisRequests.status, "PENDING_SECOND_EXAMINER")
      )
    );

  return {
    pendingAsFirstExaminer: pending[0]?.count || 0,
    acceptedAsFirstExaminer: accepted[0]?.count || 0,
    rejectedAsFirstExaminer: rejected[0]?.count || 0,
    pendingAsSecondExaminer: secondExaminer[0]?.count || 0,
  };
}


/**
 * Phase 32: Betreuungs-Übersicht pro Semester
 * Hole alle Betreuungen eines Gutachters für ein bestimmtes Semester
 */
export async function getExaminerSupervisionsBySemester(examinerId: number, semester: string) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");

  // Hole alle Anfragen, bei denen dieser Gutachter Erst- oder Zweitgutachter ist
  const supervisions = await (db as any).query.thesisRequests.findMany({
    where: and(
      or(
        eq(thesisRequests.examinerId, examinerId),
        eq(thesisRequests.secondExaminerId, examinerId)
      ),
      eq(thesisRequests.targetSemester, semester),
      ne(thesisRequests.status, "FIRST_EXAMINER_REJECTED")
    ),
    with: {
      student: {
        columns: { name: true, email: true },
      },
    },
  });

  return supervisions
    .map((s: any) => ({
      id: s.id,
      studentName: s.student?.name || "Unbekannt",
      studentEmail: s.student?.email || "",
      matrikelNumber: s.studentId, // TODO: Matrikel-Nummer aus User-Profil holen
      title: s.title,
      degreeType: s.degreeType,
      semester: s.targetSemester,
      status: s.status,
      role: s.examinerId === examinerId ? "Erstgutachter:in" : "Zweitgutachter:in",
      createdAt: s.createdAt,
    }));
}

/**
 * Hole alle Semester, in denen ein Gutachter Betreuungen hat
 */
export async function getExaminerSemesters(examinerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");

  const semesters = await (db as any).query.thesisRequests.findMany({
    where: or(
      eq(thesisRequests.examinerId, examinerId),
      eq(thesisRequests.secondExaminerId, examinerId)
    ),
    columns: { targetSemester: true },
    distinct: ["targetSemester"],
  });

  return semesters
    .map((s: any) => s.targetSemester)
    .filter((s: any) => s)
    .sort()
    .reverse(); // Neueste Semester zuerst
}

/**
 * Hole Statistiken für Betreuungen pro Semester
 */
export async function getExaminerSupervisionStats(examinerId: number, semester: string) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");

  const supervisions = await (db as any).query.thesisRequests.findMany({
    where: and(
      or(
        eq(thesisRequests.examinerId, examinerId),
        eq(thesisRequests.secondExaminerId, examinerId)
      ),
      eq(thesisRequests.targetSemester, semester)
    ),
    columns: { degreeType: true, status: true },
  });

  return {
    total: supervisions.length,
    active: supervisions.filter((s: any) => s.status === "FIRST_EXAMINER_ACCEPTED").length,
    rejected: supervisions.filter((s: any) => s.status === "FIRST_EXAMINER_REJECTED").length,
    byDegreeType: {
      bachelor: supervisions.filter((s: any) => s.degreeType === "BACHELOR").length,
      master: supervisions.filter((s: any) => s.degreeType === "MASTER").length,
    },
  };
}
