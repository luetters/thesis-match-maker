import { and, desc, eq, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  auditLog,
  examinerProfiles,
  InsertAuditLogEntry,
  InsertExaminerProfile,
  InsertNotification,
  InsertThesisRequest,
  InsertUser,
  notifications,
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
  // Import programmes here to avoid circular dependency issues
  const { programmes } = await import('../drizzle/schema');
  const rows = await db
    .select({
      id: thesisRequests.id,
      studentId: thesisRequests.studentId,
      title: thesisRequests.title,
      description: thesisRequests.description,
      department: thesisRequests.department,
      abstract: thesisRequests.abstract,
      targetSemester: thesisRequests.targetSemester,
      language: thesisRequests.language,
      degreeType: thesisRequests.degreeType,
      status: thesisRequests.status,
      examinerId: thesisRequests.examinerId,
      secondExaminerId: thesisRequests.secondExaminerId,
      rejectionReason: thesisRequests.rejectionReason,
      exposeUrl: thesisRequests.exposeUrl,
      deadline: thesisRequests.deadline,
      createdAt: thesisRequests.createdAt,
      updatedAt: thesisRequests.updatedAt,
      programmeName: programmes.name,
      programmeAbbreviation: programmes.abbreviation,
      programmeLevel: programmes.level,
      programmePictogramUrl: programmes.pictogramUrl,
    })
    .from(thesisRequests)
    .leftJoin(users, eq(thesisRequests.studentId, users.id))
    .leftJoin(programmes, eq((users as any).programmeId, programmes.id))
    .where(eq(thesisRequests.studentId, studentId))
    .orderBy(desc(thesisRequests.createdAt));
  return rows;
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


// ─── Programmes ───────────────────────────────────────────────────────────────
import { programmes, examinerProgrammes } from "../drizzle/schema";

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
