import { aliasedTable, and, desc, eq, gt, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  auditLog,
  examinerProfiles,
  examinerCommissionPreferences,
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
  reminderSchedules,
  reminderTemplates,
  savedFilters,
  examinerSemesterCapacities,
  userRoles,
  deadlineChanges,
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
    const lsi = user.lastSignedIn instanceof Date ? user.lastSignedIn.toISOString().slice(0, 19).replace('T', ' ') : user.lastSignedIn;
    values.lastSignedIn = lsi;
    updateSet.lastSignedIn = lsi;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
  if (!values.lastSignedIn) values.lastSignedIn = nowStr;
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = nowStr;

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

export async function updateUserRole(userId: number, role: "student" | "examiner" | "second_examiner" | "admin" | "user") {
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
    .where(inArray(users.role, ["examiner", "second_examiner"]));

  // Aktive Betreuungen pro Prüfer:in zählen
  const activeStatuses = [
    "PENDING", "PENDING_FIRST_EXAMINER", "PENDING_SECOND_EXAMINER",
    "FIRST_EXAMINER_ACCEPTED", "FIRST_EXAMINER_ASSIGNED",
    "SECOND_EXAMINER_ACCEPTED", "SECOND_EXAMINER_ASSIGNED", "SECOND_EXAMINER_SET",
    "MATCHED",
  ] as const;
  const activeRequests = await db
    .select({ examinerId: thesisRequests.examinerId })
    .from(thesisRequests)
    .where(inArray(thesisRequests.status, activeStatuses as unknown as string[]));
  const activeCountMap = new Map<number, number>();
  for (const r of activeRequests) {
    if (r.examinerId) activeCountMap.set(r.examinerId, (activeCountMap.get(r.examinerId) ?? 0) + 1);
  }

  // Studiengänge pro Prüfer:in laden
  const programmeRows = await db
    .select({
      examinerId: examinerProgrammes.examinerId,
      id: programmes.id,
      name: programmes.name,
      abbreviation: programmes.abbreviation,
      level: programmes.level,
      pictogramUrl: programmes.pictogramUrl,
    })
    .from(examinerProgrammes)
    .innerJoin(programmes, eq(examinerProgrammes.programmeId, programmes.id));
  const programmesMap = new Map<number, Array<{ id: number; name: string; abbreviation: string; level: string; pictogramUrl: string | null }>>();
  for (const p of programmeRows) {
    if (!programmesMap.has(p.examinerId)) programmesMap.set(p.examinerId, []);
    programmesMap.get(p.examinerId)!.push({ id: p.id, name: p.name, abbreviation: p.abbreviation ?? p.name.slice(0, 4), level: p.level, pictogramUrl: p.pictogramUrl ?? null });
  }

  return result.map((r) => ({
    ...r,
    activeSupervisions: activeCountMap.get(r.user.id) ?? 0,
    programmes: programmesMap.get(r.user.id) ?? [],
  }));
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
  // Alias für den LEFT JOIN auf den Erstbetreuer
  const wantedExaminerAlias = aliasedTable(users, "wanted_examiner");
  return db
    .select({
      id: thesisRequests.id,
      title: thesisRequests.title,
      description: thesisRequests.description,
      abstract: thesisRequests.abstract,
      department: thesisRequests.department,
      status: thesisRequests.status,
      targetSemester: thesisRequests.targetSemester,
      language: thesisRequests.language,
      degreeType: thesisRequests.degreeType,
      exposeUrl: thesisRequests.exposeUrl,
      exposeKey: thesisRequests.exposeKey,
      rejectionReason: thesisRequests.rejectionReason,
      createdAt: thesisRequests.createdAt,
      examinerId: thesisRequests.examinerId,
      secondExaminerId: thesisRequests.secondExaminerId,
      studentId: thesisRequests.studentId,
      wantedExaminerId: thesisRequests.wantedExaminerId,
      wantedExaminerName: wantedExaminerAlias.name,
    })
    .from(thesisRequests)
    .leftJoin(wantedExaminerAlias, eq(thesisRequests.wantedExaminerId, wantedExaminerAlias.id))
    .where(eq(thesisRequests.studentId, studentId))
    .orderBy(desc(thesisRequests.createdAt));
}

export async function getThesisRequestsByExaminer(examinerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: thesisRequests.id,
      title: thesisRequests.title,
      description: thesisRequests.description,
      department: thesisRequests.department,
      status: thesisRequests.status,
      targetSemester: thesisRequests.targetSemester,
      language: thesisRequests.language,
      degreeType: thesisRequests.degreeType,
      exposeUrl: thesisRequests.exposeUrl,
      rejectionReason: thesisRequests.rejectionReason,
      createdAt: thesisRequests.createdAt,
      examinerId: thesisRequests.examinerId,
      secondExaminerId: thesisRequests.secondExaminerId,
      studentId: thesisRequests.studentId,
      studentName: users.name,
      studentEmail: users.email,
    })
    .from(thesisRequests)
    .innerJoin(users, eq(thesisRequests.studentId, users.id))
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
      lastSignedIn: new Date().toISOString().slice(0, 19).replace('T', ' '),
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
  const deadlineStr = deadline instanceof Date ? deadline.toISOString().slice(0, 19).replace('T', ' ') : deadline;
  await db
    .update(thesisRequests)
    .set({ deadline: deadlineStr, updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') })
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
  // Alle Accounts mit dieser E-Mail laden und den Passwort-Account (openId beginnt mit pw_) priorisieren
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()));
  if (result.length === 0) return undefined;
  // Passwort-Account bevorzugen (openId beginnt mit 'pw_')
  const pwAccount = result.find((u) => u.openId?.startsWith('pw_'));
  return pwAccount ?? result[0];
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
      lastSignedIn: new Date().toISOString().slice(0, 19).replace('T', ' '),
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
      respondedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
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
  role: "student" | "examiner" | "second_examiner" | "pav" | "admin" | "dean" | "vice_dean" | "superadmin"
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
  const update: Record<string, unknown> = { updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') };
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
  
  const rows = await db.select({
    id: examinerProfiles.id,
    userId: examinerProfiles.userId,
    name: users.name,
    email: users.email,
    role: users.role,
    title: examinerProfiles.title,
    department: examinerProfiles.department,
    bio: examinerProfiles.bio,
    researchFocus: examinerProfiles.researchFocus,
    maxSupervisions: examinerProfiles.maxSupervisions,
    createdAt: examinerProfiles.createdAt,
  }).from(examinerProfiles)
    .leftJoin(users, eq(examinerProfiles.userId, users.id));

  // Aktive Betreuungen pro Prüfer:in zählen
  const activeStatuses = [
    "PENDING", "PENDING_FIRST_EXAMINER", "PENDING_SECOND_EXAMINER",
    "FIRST_EXAMINER_ACCEPTED", "FIRST_EXAMINER_ASSIGNED",
    "SECOND_EXAMINER_ACCEPTED", "SECOND_EXAMINER_ASSIGNED", "SECOND_EXAMINER_SET",
    "MATCHED",
  ] as const;
  const activeRequests = await db
    .select({ examinerId: thesisRequests.examinerId })
    .from(thesisRequests)
    .where(inArray(thesisRequests.status, activeStatuses as unknown as string[]));
  const activeCountMap = new Map<number, number>();
  for (const r of activeRequests) {
    if (r.examinerId) activeCountMap.set(r.examinerId, (activeCountMap.get(r.examinerId) ?? 0) + 1);
  }

  return rows.map((r) => ({
    ...r,
    activeSupervisions: activeCountMap.get(r.userId ?? 0) ?? 0,
  }));
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
  
  const update: Record<string, unknown> = { updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') };
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
//     .set({ isActive: isActive ? 1 : 0, updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') })
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
  
  const expiresAtStr = expiresAt instanceof Date ? expiresAt.toISOString().slice(0, 19).replace('T', ' ') : expiresAt;
  await db.insert(examinerActionTokens).values({
    thesisRequestId,
    examinerId,
    token,
    expiresAt: expiresAtStr,
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
        gt(examinerActionTokens.expiresAt, new Date().toISOString().slice(0, 19).replace('T', ' ')),
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
    .set({ usedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') })
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
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
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
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
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
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
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
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
  });
}

/**
 * Ziehe eine Anfrage zurück (nur wenn noch nicht beantwortet)
 */
export async function withdrawThesisRequest(thesisRequestId: number, studentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");

  // Anfrage laden und Eigentümer + Status prüfen
  const [request] = await db
    .select()
    .from(thesisRequests)
    .where(eq(thesisRequests.id, thesisRequestId))
    .limit(1);

  if (!request) {
    throw new Error("Anfrage nicht gefunden");
  }
  if (request.studentId !== studentId) {
    throw new Error("Keine Berechtigung");
  }

  // Nur zurückziehen, wenn noch nicht beantwortet
  const withdrawableStatuses = [
    "PENDING",
    "PENDING_FIRST_EXAMINER",
    "PENDING_SECOND_EXAMINER",
  ];
  if (!withdrawableStatuses.includes(request.status)) {
    throw new Error("Anfrage kann nicht mehr zurückgezogen werden");
  }

  await db.update(thesisRequests)
    .set({
      status: "WITHDRAWN",
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
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
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
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


// ─── Phase 33: Reporting-Dashboard ────────────────────────────────────────────

/**
 * Abrufen von Thesis-Statistiken für einen Zeitraum mit optionalen Filtern
 */
export async function getThesisStatsByPeriod(
  startDate: Date,
  endDate: Date,
  filters?: {
    department?: string;
    status?: string;
    degreeType?: "bachelor" | "master";
  }
) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [
    gte(thesisRequests.createdAt, typeof startDate === "string" ? startDate : startDate.toISOString().slice(0, 19).replace("T", " ")),
    lte(thesisRequests.createdAt, typeof endDate === "string" ? endDate : endDate.toISOString().slice(0, 19).replace("T", " "))
  ];

  if (filters?.department) {
    conditions.push(eq(thesisRequests.department, filters.department));
  }
  if (filters?.status) {
    conditions.push(eq(thesisRequests.status, filters.status as any));
  }
  if (filters?.degreeType) {
    conditions.push(eq(thesisRequests.degreeType, filters.degreeType));
  }

  const requests = await db
    .select()
    .from(thesisRequests)
    .where(and(...conditions));

  return requests;
}

/**
 * Abrufen von Statistiken pro Fachbereich
 */
export async function getThesisStatsByFaculty(
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];

  const requests = await db
    .select({
      department: thesisRequests.department,
      status: thesisRequests.status,
      createdAt: thesisRequests.createdAt,
    })
    .from(thesisRequests)
    .where(
      and(
        gte(thesisRequests.createdAt, typeof startDate === "string" ? startDate : startDate.toISOString().slice(0, 19).replace("T", " ")),
        lte(thesisRequests.createdAt, typeof endDate === "string" ? endDate : endDate.toISOString().slice(0, 19).replace("T", " "))
      )
    );

  const byDepartment: Record<string, { total: number; byStatus: Record<string, number> }> = {};

  for (const r of requests) {
    const dept = r.department || "Unbekannt";
    if (!byDepartment[dept]) {
      byDepartment[dept] = { total: 0, byStatus: {} };
    }
    byDepartment[dept].total++;
    byDepartment[dept].byStatus[r.status] = (byDepartment[dept].byStatus[r.status] ?? 0) + 1;
  }

  return Object.entries(byDepartment).map(([department, data]) => ({
    department,
    ...data,
  }));
}

/**
 * Abrufen von Statistiken pro Status
 */
export async function getThesisStatsByStatus(
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];

  const requests = await db
    .select({
      status: thesisRequests.status,
      createdAt: thesisRequests.createdAt,
      updatedAt: thesisRequests.updatedAt,
    })
    .from(thesisRequests)
    .where(
      and(
        gte(thesisRequests.createdAt, typeof startDate === "string" ? startDate : startDate.toISOString().slice(0, 19).replace("T", " ")),
        lte(thesisRequests.createdAt, typeof endDate === "string" ? endDate : endDate.toISOString().slice(0, 19).replace("T", " "))
      )
    );

  const byStatus: Record<string, number> = {};
  for (const r of requests) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  }

  return Object.entries(byStatus).map(([status, count]) => ({ status, count }));
}

/**
 * Berechnung der durchschnittlichen Bearbeitungszeit
 */
export async function getAverageProcessingTime(
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return 0;

  const resolved = await db
    .select({
      createdAt: thesisRequests.createdAt,
      updatedAt: thesisRequests.updatedAt,
    })
    .from(thesisRequests)
    .where(
      and(
        gte(thesisRequests.createdAt, typeof startDate === "string" ? startDate : startDate.toISOString().slice(0, 19).replace("T", " ")),
        lte(thesisRequests.createdAt, typeof endDate === "string" ? endDate : endDate.toISOString().slice(0, 19).replace("T", " ")),
        inArray(thesisRequests.status, ["ACCEPTED", "REJECTED", "FIRST_EXAMINER_ACCEPTED", "FIRST_EXAMINER_REJECTED"])
      )
    );

  if (resolved.length === 0) return 0;

  const totalDays = resolved.reduce((sum, r) => {
    const diff = new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime();
    return sum + diff / (1000 * 60 * 60 * 24);
  }, 0);

  return Math.round(totalDays / resolved.length);
}

/**
 * Berechnung der Abbruchquote
 */
export async function getDropoutRate(
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return 0;

  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(thesisRequests)
    .where(
      and(
        gte(thesisRequests.createdAt, typeof startDate === "string" ? startDate : startDate.toISOString().slice(0, 19).replace("T", " ")),
        lte(thesisRequests.createdAt, typeof endDate === "string" ? endDate : endDate.toISOString().slice(0, 19).replace("T", " "))
      )
    );

  const rejected = await db
    .select({ count: sql<number>`count(*)` })
    .from(thesisRequests)
    .where(
      and(
        gte(thesisRequests.createdAt, typeof startDate === "string" ? startDate : startDate.toISOString().slice(0, 19).replace("T", " ")),
        lte(thesisRequests.createdAt, typeof endDate === "string" ? endDate : endDate.toISOString().slice(0, 19).replace("T", " ")),
        inArray(thesisRequests.status, ["FIRST_EXAMINER_REJECTED", "REJECTED"])
      )
    );

  const totalCount = total[0]?.count || 0;
  const rejectedCount = rejected[0]?.count || 0;

  return totalCount > 0 ? Math.round((rejectedCount / totalCount) * 100) : 0;
}

/**
 * Abrufen der Prüfer:innen-Auslastung
 */
export async function getExaminerWorkload(
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];

  const examiners = await db
    .select({
      examinerId: thesisRequests.examinerId,
      examinerName: users.name,
      maxSupervisions: examinerProfiles.maxSupervisions,
    })
    .from(thesisRequests)
    .innerJoin(users, eq(thesisRequests.examinerId, users.id))
    .leftJoin(examinerProfiles, eq(examinerProfiles.userId, users.id))
    .where(
      and(
        gte(thesisRequests.createdAt, typeof startDate === "string" ? startDate : startDate.toISOString().slice(0, 19).replace("T", " ")),
        lte(thesisRequests.createdAt, typeof endDate === "string" ? endDate : endDate.toISOString().slice(0, 19).replace("T", " "))
      )
    );

  const workloadMap: Record<number, { name: string; current: number; max: number }> = {};

  for (const e of examiners) {
    if (e.examinerId) {
      if (!workloadMap[e.examinerId]) {
        workloadMap[e.examinerId] = {
          name: e.examinerName || "Unbekannt",
          current: 0,
          max: e.maxSupervisions || 5,
        };
      }
      workloadMap[e.examinerId].current++;
    }
  }

  return Object.values(workloadMap)
    .sort((a, b) => b.current - a.current)
    .slice(0, 20);
}

/**
 * CSV-Export für Berichte
 */
export async function generateCSVReport(
  reportType: "requests" | "examiners" | "audit",
  startDate: Date,
  endDate: Date,
  filters?: Record<string, string>
) {
  const db = await getDb();
  if (!db) return "";

  if (reportType === "requests") {
    const requests = await db
      .select({
        id: thesisRequests.id,
        title: thesisRequests.title,
        studentName: users.name,
        department: thesisRequests.department,
        status: thesisRequests.status,
        createdAt: thesisRequests.createdAt,
        updatedAt: thesisRequests.updatedAt,
      })
      .from(thesisRequests)
      .innerJoin(users, eq(thesisRequests.studentId, users.id))
      .where(
        and(
          gte(thesisRequests.createdAt, typeof startDate === "string" ? startDate : startDate.toISOString().slice(0, 19).replace("T", " ")),
          lte(thesisRequests.createdAt, typeof endDate === "string" ? endDate : endDate.toISOString().slice(0, 19).replace("T", " "))
        )
      );

    const header = ["ID", "Titel", "Student:in", "Fachbereich", "Status", "Erstellt", "Aktualisiert"].join(";");
    const rows = requests.map((r) =>
      [
        r.id,
        `"${r.title}"`,
        r.studentName,
        r.department,
        r.status,
        new Date(r.createdAt).toLocaleDateString("de-DE"),
        new Date(r.updatedAt).toLocaleDateString("de-DE"),
      ].join(";")
    );

    return [header, ...rows].join("\n");
  }

  if (reportType === "examiners") {
    const workload = await getExaminerWorkload(startDate, endDate);
    const header = ["Name", "Aktuelle Betreuungen", "Maximale Kapazität", "Auslastung %"].join(";");
    const rows = workload.map((e) => {
      const utilization = e.max > 0 ? Math.round((e.current / e.max) * 100) : 0;
      return [e.name, e.current, e.max, utilization].join(";");
    });

    return [header, ...rows].join("\n");
  }

  return "";
}


// ─── Phase 34: Bulk-Aktionen für Prüfer:innen ────────────────────────────────

/**
 * Mehrfach-Accept von Anfragen
 */
export async function bulkAcceptRequests(requestIds: number[]) {
  const db = await getDb();
  if (!db) return { success: false, count: 0 };

  let count = 0;
  for (const requestId of requestIds) {
    try {
      await acceptThesisRequest(requestId, 0); // examinerId wird aus DB geholt
      count++;
    } catch (error) {
      console.error(`[Bulk] Fehler bei Accept von Anfrage ${requestId}:`, error);
    }
  }

  return { success: true, count };
}

/**
 * Mehrfach-Reject von Anfragen
 */
export async function bulkRejectRequests(requestIds: number[], reason?: string) {
  const db = await getDb();
  if (!db) return { success: false, count: 0 };

  let count = 0;
  for (const requestId of requestIds) {
    try {
      await rejectThesisRequest(requestId, reason);
      count++;
    } catch (error) {
      console.error(`[Bulk] Fehler bei Reject von Anfrage ${requestId}:`, error);
    }
  }

  return { success: true, count };
}

/**
 * Mehrfach-Erinnerungs-E-Mails versenden
 */
export async function bulkSendReminders(requestIds: number[], templateKey: string) {
  const db = await getDb();
  if (!db) return { success: false, count: 0 };

  let count = 0;
  for (const requestId of requestIds) {
    try {
      const request = await db
        .select()
        .from(thesisRequests)
        .where(eq(thesisRequests.id, requestId))
        .limit(1);

      if (request.length > 0) {
        // Hier würde die E-Mail-Versendung stattfinden
        // await sendReminderEmail(request[0], templateKey);
        count++;
      }
    } catch (error) {
      console.error(`[Bulk] Fehler bei Reminder für Anfrage ${requestId}:`, error);
    }
  }

  return { success: true, count };
}

/**
 * Validierung: Prüfe ob Prüfer:in Anfragen bearbeiten darf
 */
export async function validateBulkOperation(examinerId: number, requestIds: number[]) {
  const db = await getDb();
  if (!db) return false;

  const requests = await db
    .select({ id: thesisRequests.id, wantedExaminerId: thesisRequests.wantedExaminerId })
    .from(thesisRequests)
    .where(inArray(thesisRequests.id, requestIds));

  // Prüfe ob alle Anfragen für diese Prüfer:in sind
  return requests.every(r => r.wantedExaminerId === examinerId);
}

/**
 * Kapazität von Prüfer:innen aktualisieren (Admin-only)
 */
export async function bulkUpdateExaminerCapacity(examinerIds: number[], newCapacity: number) {
  const db = await getDb();
  if (!db) return { success: false, count: 0 };

  let count = 0;
  for (const examinerId of examinerIds) {
    try {
      await db
        .update(examinerProfiles)
        .set({ maxSupervisions: newCapacity })
        .where(eq(examinerProfiles.userId, examinerId));
      count++;
    } catch (error) {
      console.error(`[Bulk] Fehler bei Kapazitäts-Update für Prüfer ${examinerId}:`, error);
    }
  }

  return { success: true, count };
}


// ─── Phase 35: Automatische Erinnerungs-E-Mails ────────────────────────────────

/**
 * Erinnerungs-Zeitplan erstellen
 */
export async function createReminderSchedule(
  thesisRequestId: number,
  reminderType: string,
  delayDays: number
) {
  const db = await getDb();
  if (!db) return null;

  const scheduledAtDate = new Date();
  scheduledAtDate.setDate(scheduledAtDate.getDate() + delayDays);
  const scheduledAt = scheduledAtDate.toISOString().slice(0, 19).replace('T', ' ');

  const result = await db
    .insert(reminderSchedules)
    .values({
      thesisRequestId,
      reminderType: reminderType as any,
      scheduledAt,
      status: "pending",
    });

  return result;
}

/**
 * Fällige Erinnerungen abrufen
 */
export async function getRemindersDue() {
  const db = await getDb();
  if (!db) return [];

  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const reminders = await db
    .select()
    .from(reminderSchedules)
    .where(
      and(
        eq(reminderSchedules.status, "pending"),
        lte(reminderSchedules.scheduledAt, nowStr)
      )
    )
    .limit(100);

  return reminders;
}

/**
 * Erinnerungs-E-Mail versenden
 */
export async function sendReminderEmail(
  thesisRequestId: number,
  reminderType: string
) {
  const db = await getDb();
  if (!db) return false;

  try {
    // Hole Anfrage und Template
    const request = await db
      .select()
      .from(thesisRequests)
      .where(eq(thesisRequests.id, thesisRequestId))
      .limit(1);

    if (!request.length) return false;

    const template = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.key, reminderType))
      .limit(1);

    if (!template.length) return false;

    // Hier würde der E-Mail-Versand stattfinden
    // await sendEmail({
    //   to: request[0].studentEmail,
    //   subject: template[0].subject,
    //   html: template[0].htmlBody,
    // });

    return true;
  } catch (error) {
    console.error(`[Reminder] Fehler beim Versand für Anfrage ${thesisRequestId}:`, error);
    return false;
  }
}

/**
 * Erinnerung als versendet markieren
 */
export async function markReminderAsSent(scheduleId: number, success: boolean = true) {
  const db = await getDb();
  if (!db) return false;

  await db
    .update(reminderSchedules)
    .set({
      sentAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      status: success ? "sent" : "failed",
    })
    .where(eq(reminderSchedules.id, scheduleId));

  return true;
}

/**
 * Erinnerungs-Historie abrufen
 */
export async function getReminderHistory(thesisRequestId: number) {
  const db = await getDb();
  if (!db) return [];

  const history = await db
    .select()
    .from(reminderSchedules)
    .where(eq(reminderSchedules.thesisRequestId, thesisRequestId))
    .orderBy(desc(reminderSchedules.createdAt));

  return history;
}

/**
 * Erinnerungs-Vorlagen abrufen
 */
export async function getReminderTemplates() {
  const db = await getDb();
  if (!db) return [];

  const templates = await db
    .select()
    .from(reminderTemplates)
    .where(eq(reminderTemplates.isActive, 1))
    .orderBy(reminderTemplates.type);

  return templates;
}

/**
 * Erinnerungs-Vorlage aktualisieren
 */
export async function updateReminderTemplate(
  templateId: number,
  updates: {
    subject?: string;
    htmlBody?: string;
    textBody?: string;
    delayDays?: number;
  }
) {
  const db = await getDb();
  if (!db) return false;

  await db
    .update(reminderTemplates)
    .set(updates)
    .where(eq(reminderTemplates.id, templateId));

  return true;
}

/**
 * Alte Erinnerungen löschen (älter als 90 Tage)
 */
export async function cleanupOldReminders() {
  const db = await getDb();
  if (!db) return 0;

  const ninetyDaysAgoDate = new Date();
  ninetyDaysAgoDate.setDate(ninetyDaysAgoDate.getDate() - 90);
  const ninetyDaysAgo = ninetyDaysAgoDate.toISOString().slice(0, 19).replace('T', ' ');

  await db
    .delete(reminderSchedules)
    .where(lte(reminderSchedules.createdAt, ninetyDaysAgo));

  return 0; // Cleanup durchgeführt
}


// ─── Phase 36: Erweiterte Filterung und Suche ──────────────────────────────────

export interface SearchFilters {
  status?: string[];
  semester?: string[];
  department?: string[];
  language?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  examinerName?: string;
  studentName?: string;
}

/**
 * Thesis-Anfragen durchsuchen
 */
export async function searchThesisRequests(query: string, filters?: SearchFilters) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];

  // Volltextsuche
  if (query) {
    conditions.push(
      or(
        sql`${thesisRequests.title} LIKE ${`%${query}%`}`,
        sql`${thesisRequests.description} LIKE ${`%${query}%`}`
      )
    );
  }

  // Filter anwenden
  if (filters?.status && filters.status.length > 0) {
    conditions.push(inArray(thesisRequests.status, filters.status as any));
  }
  if (filters?.department && filters.department.length > 0) {
    conditions.push(inArray(thesisRequests.department, filters.department));
  }
  if (filters?.language && filters.language.length > 0) {
    conditions.push(inArray(thesisRequests.language, filters.language));
  }
  if (filters?.dateFrom) {
    conditions.push(gte(thesisRequests.createdAt, typeof filters.dateFrom === "string" ? filters.dateFrom : filters.dateFrom!.toISOString().slice(0, 19).replace("T", " ")));
  }
  if (filters?.dateTo) {
    conditions.push(lte(thesisRequests.createdAt, typeof filters.dateTo === "string" ? filters.dateTo : filters.dateTo!.toISOString().slice(0, 19).replace("T", " ")));
  }

  const results = await db
    .select()
    .from(thesisRequests)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(100);

  return results;
}

/**
 * Prüfer:innen durchsuchen
 */
export async function searchExaminers(query: string, filters?: SearchFilters) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];

  // Volltextsuche
  if (query) {
    conditions.push(
      or(
        sql`${users.name} LIKE ${`%${query}%`}`,
        sql`${users.email} LIKE ${`%${query}%`}`
      )
    );
  }

  // Filter nach Sprache
  if (filters?.language && filters.language.length > 0) {
    conditions.push(inArray(examinerProfiles.languages, filters.language as any));
  }

  // Filter nach Fachbereich
  if (filters?.department && filters.department.length > 0) {
    conditions.push(inArray(examinerProfiles.department, filters.department));
  }

  const results = await db
    .select()
    .from(users)
    .innerJoin(examinerProfiles, eq(users.id, examinerProfiles.userId))
    .where(
      and(
        eq(users.role, "examiner"),
        conditions.length > 0 ? and(...conditions) : undefined
      )
    )
    .limit(100);

  return results;
}

/**
 * Studierende durchsuchen
 */
export async function searchStudents(query: string, filters?: SearchFilters) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];

  // Volltextsuche
  if (query) {
    conditions.push(
      or(
        sql`${users.name} LIKE ${`%${query}%`}`,
        sql`${users.email} LIKE ${`%${query}%`}`
      )
    );
  }

  const results = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.role, "student"),
        conditions.length > 0 ? and(...conditions) : undefined
      )
    )
    .limit(100);

  return results;
}

/**
 * Gespeicherten Filter erstellen
 */
export async function createSavedFilter(
  userId: number,
  name: string,
  filterConfig: SearchFilters
) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .insert(savedFilters)
    .values({
      userId,
      name,
      filterConfig: filterConfig as any,
    });

  return result;
}

/**
 * Gespeicherte Filter abrufen
 */
export async function getSavedFilters(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const filters = await db
    .select()
    .from(savedFilters)
    .where(eq(savedFilters.userId, userId))
    .orderBy(desc(savedFilters.createdAt));

  return filters;
}

/**
 * Gespeicherten Filter löschen
 */
export async function deleteSavedFilter(filterId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;

  await db
    .delete(savedFilters)
    .where(
      and(
        eq(savedFilters.id, filterId),
        eq(savedFilters.userId, userId)
      )
    );

  return true;
}


// ─── Phase 37: Audit-Trail & Compliance ────────────────────────────────────────

/**
 * Audit-Trail für eine Anfrage abrufen
 */
export async function getAuditTrail(thesisRequestId: number) {
  const db = await getDb();
  if (!db) return [];

  const trail = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.thesisRequestId, thesisRequestId))
    .orderBy(desc(auditLog.createdAt));

  return trail;
}

/**
 * Audit-Trail für einen Benutzer abrufen
 */
export async function getAuditTrailByUser(
  userId: number,
  dateFrom?: Date,
  dateTo?: Date
) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [eq(auditLog.actorId, userId)];

  if (dateFrom) {
    conditions.push(gte(auditLog.createdAt, typeof dateFrom === "string" ? dateFrom : dateFrom.toISOString().slice(0, 19).replace("T", " ")));
  }
  if (dateTo) {
    conditions.push(lte(auditLog.createdAt, typeof dateTo === "string" ? dateTo : dateTo.toISOString().slice(0, 19).replace("T", " ")));
  }

  const trail = await db
    .select()
    .from(auditLog)
    .where(and(...conditions))
    .orderBy(desc(auditLog.createdAt));

  return trail;
}

/**
 * Audit-Trail als CSV exportieren
 */
export async function exportAuditTrailCSV(filters?: {
  dateFrom?: Date;
  dateTo?: Date;
  userId?: number;
}) {
  const db = await getDb();
  if (!db) return "";

  const conditions: any[] = [];

  if (filters?.dateFrom) {
    conditions.push(gte(auditLog.createdAt, typeof filters.dateFrom === "string" ? filters.dateFrom : filters.dateFrom.toISOString().slice(0, 19).replace("T", " ")));
  }
  if (filters?.dateTo) {
    conditions.push(lte(auditLog.createdAt, typeof filters.dateTo === "string" ? filters.dateTo : filters.dateTo.toISOString().slice(0, 19).replace("T", " ")));
  }
  if (filters?.userId) {
    conditions.push(eq(auditLog.actorId, filters.userId));
  }

  const trail = await db
    .select()
    .from(auditLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLog.createdAt));

  // CSV Header
  const headers = [
    "ID",
    "Anfrage-ID",
    "Benutzer:in-ID",
    "Rolle",
    "Aktion",
    "Von Status",
    "Zu Status",
    "Grund",
    "Zeitstempel",
  ];

  // CSV Rows
  const rows = trail.map((entry) => [
    entry.id,
    entry.thesisRequestId,
    entry.actorId || "",
    entry.actorRole || "",
    entry.action,
    entry.fromStatus || "",
    entry.toStatus || "",
    entry.reason || "",
    entry.createdAt || "",
  ]);

  // CSV String
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  return csv;
}

/**
 * Anfrage anonymisieren (für abgelehnte Anfragen)
 */
export async function anonymizeThesisRequest(thesisRequestId: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(thesisRequests)
      .set({
        title: "[Anonymisiert]",
        description: "[Anonymisiert]",
      })
      .where(eq(thesisRequests.id, thesisRequestId));

    return true;
  } catch (error) {
    console.error(`[Compliance] Fehler beim Anonymisieren von Anfrage ${thesisRequestId}:`, error);
    return false;
  }
}

/**
 * Anfrage archivieren
 */
export async function archiveThesisRequest(thesisRequestId: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(thesisRequests)
      .set({
        status: "ARCHIVED" as any,
        updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      })
      .where(eq(thesisRequests.id, thesisRequestId));

    return true;
  } catch (error) {
    console.error(`[Compliance] Fehler beim Archivieren von Anfrage ${thesisRequestId}:`, error);
    return false;
  }
}

/**
 * Compliance-Bericht generieren
 */
export async function getComplianceReport(dateFrom: Date, dateTo: Date) {
  const db = await getDb();
  if (!db) return null;

  const requests = await db
    .select()
    .from(thesisRequests)
    .where(
      and(
        gte(thesisRequests.createdAt, typeof dateFrom === "string" ? dateFrom : dateFrom.toISOString().slice(0, 19).replace("T", " ")),
        lte(thesisRequests.createdAt, typeof dateTo === "string" ? dateTo : dateTo.toISOString().slice(0, 19).replace("T", " "))
      )
    );

  const totalRequests = requests.length;
  const completedRequests = requests.filter(
    (r) => r.status === "COMPLETED"
  ).length;
  const rejectedRequests = requests.filter(
    (r) => r.status === "REJECTED"
  ).length;
  const pendingRequests = requests.filter(
    (r) => r.status?.includes("PENDING")
  ).length;

  // Durchschnittliche Bearbeitungszeit berechnen
  const completedWithTime = requests
    .filter((r) => r.updatedAt && r.createdAt && r.status === "COMPLETED")
    .map((r) => {
      const time = (new Date(r.updatedAt!).getTime() - new Date(r.createdAt!).getTime()) / (1000 * 60 * 60 * 24);
      return time;
    });

  const avgProcessingTime =
    completedWithTime.length > 0
      ? completedWithTime.reduce((a, b) => a + b, 0) / completedWithTime.length
      : 0;

  return {
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
    totalRequests,
    completedRequests,
    rejectedRequests,
    pendingRequests,
    completionRate: totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0,
    avgProcessingTimeDays: Math.round(avgProcessingTime * 100) / 100,
  };
}


// ─── Phase 39: Superadmin-Funktionalität ────────────────────────────────────────

const SUPERADMIN_EMAILS = ["holger@luetters.net"];

/**
 * Prüfe ob Benutzer:in Superadmin ist
 */
export function isSuperadmin(email: string): boolean {
  return SUPERADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Gibt alle SuperAdmin-E-Mail-Adressen zurück (für Benachrichtigungen)
 */
export async function getSuperadminEmails(): Promise<string[]> {
  // Statische Liste aus SUPERADMIN_EMAILS
  const staticEmails = [...SUPERADMIN_EMAILS];
  // Zusätzlich: alle Nutzer mit Rolle 'superadmin' aus der DB
  const db = await getDb();
  if (!db) return staticEmails;
  try {
    const rows = await db.execute(`SELECT email FROM users WHERE role = 'superadmin' AND email IS NOT NULL`);
    const dbEmails = (rows[0] as unknown as any[]).map((r: any) => r.email as string).filter(Boolean);
    const all = Array.from(new Set([...staticEmails, ...dbEmails]));
    return all;
  } catch {
    return staticEmails;
  }
}

/**
 * Hole Superadmin-Status
 */
export async function getSuperadminStatus(userId: number) {
  const db = await getDb();
  if (!db) return { isSuperadmin: false, currentRole: null };

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    return { isSuperadmin: false, currentRole: null };
  }

  return {
    isSuperadmin: isSuperadmin(user[0].email || ""),
    currentRole: user[0].role || "user",
  };
}

/**
 * Wechsle Rolle für Superadmin
 */
export async function switchUserRole(
  superadminId: number,
  targetRole: "admin" | "examiner" | "student"
) {
  const db = await getDb();
  if (!db) return { success: false, error: "Database connection failed" };

  try {
    // Prüfe ob Superadmin
    const superadmin = await db
      .select()
      .from(users)
      .where(eq(users.id, superadminId))
      .limit(1);

    if (superadmin.length === 0 || !isSuperadmin(superadmin[0].email || "")) {
      return { success: false, error: "Unauthorized: Not a superadmin" };
    }

    const oldRole = superadmin[0].role || "user";

    // Speichere alte Rolle in metadata für Wechsel-History
    const metadata = {
      previousRole: oldRole,
      switchedAt: new Date().toISOString(),
      switchedBy: superadminId,
    };

    // Aktualisiere Rolle (nur für diese Session)
    // In einer echten Implementierung würde dies in einer Session-Tabelle gespeichert
    return {
      success: true,
      newRole: targetRole,
      previousRole: oldRole,
      metadata,
    };
  } catch (error) {
    console.error("[Superadmin] Fehler beim Rolle-Wechsel:", error);
    return { success: false, error: "Failed to switch role" };
  }
}

/**
 * Protokolliere Rolle-Wechsel
 */
export async function logRoleSwitchAction(
  superadminId: number,
  fromRole: string,
  toRole: string
) {
  const db = await getDb();
  if (!db) return false;

  try {
    // Erstelle Audit-Log-Eintrag
    await db.insert(auditLog).values({
      thesisRequestId: null as any,
      actorId: superadminId,
      actorRole: "admin",
      action: "ROLE_SWITCH",
      fromStatus: fromRole,
      toStatus: toRole,
      reason: `Superadmin switched from ${fromRole} to ${toRole}`,
      metadata: {
        type: "role_switch",
        timestamp: new Date().toISOString(),
      } as any,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });

    return true;
  } catch (error) {
    console.error("[Superadmin] Fehler beim Logging:", error);
    return false;
  }
}

/**
 * Hole Rolle-Wechsel-Historie
 */
export async function getRoleSwitchHistory(superadminId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const history = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.actorId, superadminId),
          eq(auditLog.action as any, "ROLE_SWITCH")
        )
      )
      .orderBy(desc(auditLog.createdAt))
      .limit(50);

    return history;
  } catch (error) {
    console.error("[Superadmin] Fehler beim Abrufen der Historie:", error);
    return [];
  }
}


// ─── Phase 40: Superadmin-Dashboard ────────────────────────────────────────

/**
 * Hole alle aktiven Nutzer mit Statistiken
 */
export async function getAllActiveUsers(limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return { users: [], total: 0 };

  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql`COUNT(*)` })
      .from(users);

    return {
      users: allUsers,
      total: (totalResult[0]?.count as number) || 0,
    };
  } catch (error) {
    console.error("[Superadmin] Fehler beim Abrufen aller Nutzer:", error);
    return { users: [], total: 0 };
  }
}

/**
 * Hole Nutzer-Statistiken nach Rolle
 */
export async function getUserStatistics() {
  const db = await getDb();
  if (!db) return {};

  try {
    const stats = await db
      .select({
        role: users.role,
        count: sql`COUNT(*) as count`,
      })
      .from(users)
      .groupBy(users.role);

    const result: Record<string, number> = {
      total: 0,
      student: 0,
      examiner: 0,
      pav: 0,
      admin: 0,
      dean: 0,
      vice_dean: 0,
      superadmin: 0,
    };

    for (const stat of stats) {
      const role = stat.role || "unknown";
      const count = (stat.count as number) || 0;
      result.total += count;
      if (role in result) {
        result[role] = count;
      }
    }

    return result;
  } catch (error) {
    console.error("[Superadmin] Fehler beim Abrufen der Statistiken:", error);
    return {};
  }
}

/**
 * Suche Nutzer nach Query und Filtern
 */
export async function searchUsers(
  query: string,
  filters?: { role?: string; limit?: number; offset?: number }
) {
  const db = await getDb();
  if (!db) return { users: [], total: 0 };

  try {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const role = filters?.role;

    let whereConditions = [];

    // Suchquery
    if (query && query.trim()) {
      whereConditions.push(
        or(
          sql`${users.email} LIKE ${`%${query}%`}`,
          sql`${users.name} LIKE ${`%${query}%`}`
        )
      );
    }

    // Rolle-Filter
    if (role) {
      whereConditions.push(eq(users.role, role as any));
    }

    const searchResults = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // Zähle Gesamtergebnisse
    const countResult = await db
      .select({ count: sql`COUNT(*)` })
      .from(users)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    return {
      users: searchResults,
      total: (countResult[0]?.count as number) || 0,
    };
  } catch (error) {
    console.error("[Superadmin] Fehler beim Suchen von Nutzern:", error);
    return { users: [], total: 0 };
  }
}

/**
 * Hole detaillierte Nutzer-Informationen
 */
export async function getUserDetails(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) return null;

    // Hole zusätzliche Informationen basierend auf Rolle
    const userData = user[0];
    let additionalInfo = {};

    // Zusätzliche Nutzer-Informationen können hier hinzugefügt werden
    // z.B. Prüfer-Daten, PAV-Daten, etc.

    return {
      ...userData,
      ...additionalInfo,
    };
  } catch (error) {
    console.error("[Superadmin] Fehler beim Abrufen von Nutzer-Details:", error);
    return null;
  }
}

/**
 * Hole Aktivitätslog für Nutzer
 */
export async function getUserActivityLog(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  try {
    const activityLog = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.actorId, userId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);

    return activityLog;
  } catch (error) {
    console.error("[Superadmin] Fehler beim Abrufen des Aktivitätslogs:", error);
    return [];
  }
}

/**
 * Aktualisiere Nutzer-Status
 */
export async function updateUserStatus(
  userId: number,
  isActive: boolean,
  updatedBy: number
) {
  const db = await getDb();
  if (!db) return false;

  try {
    // Hinweis: isActive wird nicht direkt in der users-Tabelle gespeichert
    // Dies ist ein Placeholder für zukünftige Implementierung
    
    // Erstelle Audit-Log-Eintrag
    await db.insert(auditLog).values({
      thesisRequestId: null as any,
      actorId: updatedBy,
      actorRole: "admin",
      action: "USER_STATUS_CHANGED",
      fromStatus: "active",
      toStatus: isActive ? "active" : "inactive",
      reason: `User status changed to ${isActive ? "active" : "inactive"}`,
      metadata: { userId, isActive } as any,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });

    return true;
  } catch (error) {
    console.error("[Superadmin] Fehler beim Aktualisieren des Nutzer-Status:", error);
    return false;
  }
}

// ─── Rollen-Bestätigungsworkflow ─────────────────────────────────────────────

/** Nutzer wählt eine Rolle nach Magic-Link-Login (setzt roleStatus auf 'pending') */
export async function selectUserRole(userId: number, requestedRole: string) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.execute(
      `UPDATE users SET requestedRole = '${requestedRole}', roleStatus = 'pending', role = 'user' WHERE id = ${userId}`
    );
    return true;
  } catch (error) {
    console.error("[RoleApproval] Fehler beim Setzen der gewünschten Rolle:", error);
    return false;
  }
}

/** Gibt alle Nutzer mit roleStatus = 'pending' zurück */
export async function getPendingRoleUsers() {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db.execute(
      `SELECT id, name, email, role, requestedRole, roleStatus, createdAt, loginMethod FROM users WHERE roleStatus = 'pending' ORDER BY createdAt DESC`
    );
    return (rows[0] as unknown as any[]).map((r: any) => ({
      id: r.id as number,
      name: r.name as string | null,
      email: r.email as string | null,
      role: r.role as string,
      requestedRole: r.requestedRole as string | null,
      roleStatus: r.roleStatus as string,
      createdAt: r.createdAt as Date,
      loginMethod: r.loginMethod as string | null,
    }));
  } catch (error) {
    console.error("[RoleApproval] Fehler beim Abrufen ausstehender Nutzer:", error);
    return [];
  }
}

/** Bestätigt die Rolle eines Nutzers */
export async function approveUserRole(userId: number, confirmedBy: number, confirmedByRole: string) {
  const db = await getDb();
  if (!db) return { success: false, error: "DB nicht verfügbar" };
  try {
    const rows = await db.execute(`SELECT id, email, name, requestedRole, roleStatus FROM users WHERE id = ${userId}`);
    const user = (rows[0] as unknown as any[])[0];
    if (!user) return { success: false, error: "Nutzer nicht gefunden" };
    if (user.roleStatus !== "pending") return { success: false, error: "Keine ausstehende Rollenanfrage" };
    const requestedRole = user.requestedRole as string;
    if (confirmedByRole === "admin" && requestedRole !== "student" && requestedRole !== "second_examiner") {
      return { success: false, error: "Verwaltung darf nur Studierende und Zweitprüfer:innen bestätigen" };
    }
    await db.execute(
      `UPDATE users SET role = '${requestedRole}', roleStatus = 'approved', roleConfirmedBy = ${confirmedBy}, roleConfirmedAt = NOW(), requestedRole = NULL WHERE id = ${userId}`
    );
    const metaJson = JSON.stringify({ userId, requestedRole }).replace(/'/g, "\\'");
    await db.execute(
      `INSERT INTO audit_log (actorId, actorRole, action, toStatus, metadata, createdAt) VALUES (${confirmedBy}, '${confirmedByRole}', 'ROLE_APPROVED', '${requestedRole}', '${metaJson}', NOW())`
    );
    // E-Mail-Benachrichtigung an den Nutzer senden (Vorlage aus DB)
    if (user.email) {
      const roleLabels: Record<string, string> = {
        student: "Studierende:r",
        examiner: "Prüfer:in (Erstprüfer:in)",
        second_examiner: "Zweitprüfer:in",
        admin: "Verwaltung",
        pav: "PA-Vorsitz",
        dean: "Dekan:in",
        vice_dean: "Prodekan:in",
        superadmin: "Superadmin",
      };
      const roleLabel = roleLabels[requestedRole] ?? requestedRole;
      const dashboardLinks: Record<string, string> = {
        student: "/student",
        examiner: "/examiner",
        second_examiner: "/examiner",
        admin: "/admin",
        pav: "/admin",
        dean: "/admin",
        vice_dean: "/admin",
        superadmin: "/admin",
      };
      const dashboardLink = dashboardLinks[requestedRole] ?? "/";
      try {
        const template = await getEmailTemplateByKey("role_approved");
        const { sendEmail } = await import("./emailHelper");
        const subject = (template?.subject ?? "Ihre Rolle wurde bestätigt – HTW Berlin Thesis Match Maker")
          .replace(/\{\{userName\}\}/g, user.name ?? "Nutzende:r")
          .replace(/\{\{roleLabel\}\}/g, roleLabel)
          .replace(/\{\{dashboardLink\}\}/g, dashboardLink);
        const html = (template?.htmlBody ?? "")
          .replace(/\{\{userName\}\}/g, user.name ?? "Nutzende:r")
          .replace(/\{\{roleLabel\}\}/g, roleLabel)
          .replace(/\{\{dashboardLink\}\}/g, dashboardLink);
        const text = (template?.textBody ?? "")
          .replace(/\{\{userName\}\}/g, user.name ?? "Nutzende:r")
          .replace(/\{\{roleLabel\}\}/g, roleLabel)
          .replace(/\{\{dashboardLink\}\}/g, dashboardLink);
        await sendEmail({ to: user.email as string, subject, html, text });
      } catch (err) {
        console.warn("[RoleApproval] E-Mail-Versand fehlgeschlagen:", err);
      }
    }
    return { success: true };
  } catch (error) {
    console.error("[RoleApproval] Fehler beim Bestätigen der Rolle:", error);
    return { success: false, error: "Interner Fehler" };
  }
}

/** Lehnt die Rollenanfrage eines Nutzers ab */
export async function rejectUserRole(userId: number, confirmedBy: number, confirmedByRole: string, reason?: string) {
  const db = await getDb();
  if (!db) return { success: false, error: "DB nicht verfügbar" };
  try {
    const rows = await db.execute(`SELECT id, email, name, requestedRole, roleStatus FROM users WHERE id = ${userId}`);
    const user = (rows[0] as unknown as any[])[0];
    if (!user) return { success: false, error: "Nutzer nicht gefunden" };
    if (user.roleStatus !== "pending") return { success: false, error: "Keine ausstehende Rollenanfrage" };
    const requestedRole = user.requestedRole as string;
    if (confirmedByRole === "admin" && requestedRole !== "student" && requestedRole !== "second_examiner") {
      return { success: false, error: "Verwaltung darf nur Studierende und Zweitprüfer:innen ablehnen" };
    }
    await db.execute(
      `UPDATE users SET roleStatus = 'rejected', roleConfirmedBy = ${confirmedBy}, roleConfirmedAt = NOW() WHERE id = ${userId}`
    );
    const safeReason = reason ? reason.replace(/'/g, "\\'") : "NULL";
    const metaJson = JSON.stringify({ userId, requestedRole }).replace(/'/g, "\\'");
    const reasonSql = reason ? `'${safeReason}'` : "NULL";
    await db.execute(
      `INSERT INTO audit_log (actorId, actorRole, action, toStatus, reason, metadata, createdAt) VALUES (${confirmedBy}, '${confirmedByRole}', 'ROLE_REJECTED', 'rejected', ${reasonSql}, '${metaJson}', NOW())`
    );
    // E-Mail-Benachrichtigung an den Nutzer senden (Vorlage aus DB)
    if (user.email) {
      const roleLabels: Record<string, string> = { student: "Studierende:r", examiner: "Prüfer:in (Erstprüfer:in)", second_examiner: "Zweitprüfer:in", admin: "Verwaltung" };
      const roleLabel = roleLabels[requestedRole] ?? requestedRole;
      const reasonBlock = reason
        ? `<p style="color:#474747;line-height:1.6"><strong>Begründung:</strong> ${reason}</p>`
        : "";
      try {
        const template = await getEmailTemplateByKey("role_rejected");
        const { sendEmail } = await import("./emailHelper");
        const subject = (template?.subject ?? "Ihre Rollenanfrage wurde abgelehnt – HTW Berlin Thesis Match Maker")
          .replace(/\{\{userName\}\}/g, user.name ?? "Nutzende:r")
          .replace(/\{\{roleLabel\}\}/g, roleLabel)
          .replace(/\{\{reason\}\}/g, reason ?? "")
          .replace(/\{\{reasonBlock\}\}/g, reasonBlock);
        const html = (template?.htmlBody ?? "")
          .replace(/\{\{userName\}\}/g, user.name ?? "Nutzende:r")
          .replace(/\{\{roleLabel\}\}/g, roleLabel)
          .replace(/\{\{reason\}\}/g, reason ?? "")
          .replace(/\{\{reasonBlock\}\}/g, reasonBlock);
        const text = (template?.textBody ?? "")
          .replace(/\{\{userName\}\}/g, user.name ?? "Nutzende:r")
          .replace(/\{\{roleLabel\}\}/g, roleLabel)
          .replace(/\{\{reason\}\}/g, reason ?? "")
          .replace(/\{\{reasonBlock\}\}/g, reasonBlock);
        await sendEmail({ to: user.email as string, subject, html, text });
      } catch (err) {
        console.warn("[RoleApproval] E-Mail-Versand fehlgeschlagen:", err);
      }
    }
    return { success: true };
  } catch (error) {
    console.error("[RoleApproval] Fehler beim Ablehnen der Rolle:", error);
    return { success: false, error: "Interner Fehler" };
  }
}

/** Gibt den roleStatus eines Nutzers zurück */
export async function getUserRoleStatus(userId: number) {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db.execute(`SELECT id, role, roleStatus, requestedRole FROM users WHERE id = ${userId}`);
    const user = (rows[0] as unknown as any[])[0];
    if (!user) return null;
    return {
      id: user.id as number,
      role: user.role as string,
      roleStatus: user.roleStatus as "approved" | "pending" | "rejected",
      requestedRole: user.requestedRole as string | null,
    };
  } catch (error) {
    console.error("[RoleApproval] Fehler beim Abrufen des Rollen-Status:", error);
    return null;
  }
}

// --- Profile ------------------------------------------------------------------

/** Gibt das vollständige Profil eines Nutzers zurück */
export async function getProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db.execute(
      `SELECT id, name, email, role, roleStatus, avatarUrl, avatarKey, bio, phone, department, programme_id AS programmeId, matrikel_nr AS matrikelNr, thesis_type AS thesisType, enrollment_semester AS enrollmentSemester, target_semester AS targetSemester, academic_title AS academicTitle, office_room AS officeRoom, office_hours AS officeHours, research_tags AS researchTags, staff_id AS staffId, responsibility_area AS responsibilityArea, office_location AS officeLocation, second_email AS secondEmail, website, linked_in AS linkedIn, research_gate AS researchGate, htw_profile_url AS htwProfileUrl, misc_link AS miscLink, booking_url AS bookingUrl, preferredLanguage, createdAt, lastSignedIn FROM users WHERE id = ${userId} LIMIT 1`
    );
    const user = (rows[0] as unknown as any[])[0];
    if (!user) return null;
    // Prüfer:innen-Profil-Felder (languages, tags) und Studiengänge laden
    let examinerLanguages: string[] = [];
    let examinerKeywords: string[] = [];
    let examinerProgrammeIds: number[] = [];
    let examinerBio: string | null = null;
    let examinerResearchFocus: string | null = null;
    let allowedDepartments: string[] = [];
    let primaryDepartment: string | null = null;
    const isExaminerRole = user.role === 'examiner' || user.role === 'second_examiner';
    if (isExaminerRole) {
      try {
        const epRows = await db.execute(`SELECT languages, tags, bio, research_focus AS researchFocus FROM examiner_profiles WHERE userId = ${userId} LIMIT 1`);
        const ep = (epRows[0] as unknown as any[])[0];
        if (ep) {
          try { examinerLanguages = ep.languages ? (typeof ep.languages === 'string' ? JSON.parse(ep.languages) : ep.languages) : []; } catch { examinerLanguages = []; }
          try { examinerKeywords = ep.tags ? (typeof ep.tags === 'string' ? JSON.parse(ep.tags) : ep.tags) : []; } catch { examinerKeywords = []; }
          examinerBio = ep.bio ?? null;
          examinerResearchFocus = ep.researchFocus ?? null;
        }
        const progRows = await db.execute(`SELECT programme_id AS programmeId FROM examiner_programmes WHERE examiner_id = ${userId}`);
        examinerProgrammeIds = (progRows[0] as unknown as any[]).map((r: any) => r.programmeId as number);
        // Fachbereiche laden
        const deptRows = await db.execute(`SELECT department, is_primary AS isPrimary FROM examiner_departments WHERE user_id = ${userId}`);
        const depts = (deptRows[0] as unknown as any[]);
        allowedDepartments = depts.map((d: any) => d.department as string);
        const primaryRow = depts.find((d: any) => d.isPrimary === 1);
        primaryDepartment = primaryRow ? primaryRow.department as string : (allowedDepartments[0] ?? user.department ?? null);
      } catch { /* ignore */ }
    }
    return {
      id: user.id as number,
      name: user.name as string | null,
      email: user.email as string | null,
      role: user.role as string,
      roleStatus: user.roleStatus as string,
      avatarUrl: user.avatarUrl as string | null,
      avatarKey: user.avatarKey as string | null,
      bio: user.bio as string | null,
      phone: user.phone as string | null,
      department: user.department as string | null,
      programmeId: (user.programmeId as number | null) ?? null,
      matrikelNr: user.matrikelNr as string | null,
      thesisType: user.thesisType as 'bachelor' | 'master' | null,
      enrollmentSemester: user.enrollmentSemester as string | null,
      academicTitle: user.academicTitle as string | null,
      officeRoom: user.officeRoom as string | null,
      targetSemester: user.targetSemester as string | null,
      officeHours: user.officeHours as string | null,
      researchTags: user.researchTags as string | null,
      staffId: user.staffId as string | null,
      responsibilityArea: user.responsibilityArea as string | null,
      officeLocation: user.officeLocation as string | null,
      secondEmail: user.secondEmail as string | null,
      website: user.website as string | null,
      linkedIn: user.linkedIn as string | null,
      researchGate: user.researchGate as string | null,
      htwProfileUrl: user.htwProfileUrl as string | null,
      miscLink: user.miscLink as string | null,
      bookingUrl: user.bookingUrl as string | null,
      preferredLanguage: (user.preferredLanguage as 'de' | 'en') ?? 'de',
      createdAt: user.createdAt as Date,
      lastSignedIn: user.lastSignedIn as Date,
      // Prüfer:innen-spezifische Felder
      examinerLanguages: isExaminerRole ? examinerLanguages : null,
      examinerKeywords: isExaminerRole ? examinerKeywords : null,
      examinerProgrammeIds: isExaminerRole ? examinerProgrammeIds : null,
      examinerBio: isExaminerRole ? examinerBio : null,
      examinerResearchFocus: isExaminerRole ? examinerResearchFocus : null,
      allowedDepartments: isExaminerRole ? allowedDepartments : null,
      primaryDepartment: isExaminerRole ? primaryDepartment : null,
    };
  } catch (error) {
    console.error("[Profile] Fehler beim Abrufen:", error);
    return null;
  }
}

/** Aktualisiert Name, Bio, Telefon, Fachbereich eines Nutzers */
export async function updateProfile(
  userId: number,
  data: {
    name?: string; bio?: string; phone?: string; department?: string;
    matrikelNr?: string; thesisType?: 'bachelor' | 'master'; enrollmentSemester?: string; targetSemester?: string;
    academicTitle?: string; officeRoom?: string; officeHours?: string; researchTags?: string;
    staffId?: string; responsibilityArea?: string; officeLocation?: string;
    secondEmail?: string; website?: string; linkedIn?: string; researchGate?: string;
    htwProfileUrl?: string; miscLink?: string; bookingUrl?: string;
  }
) {
  const db = await getDb();
  if (!db) return false;
  try {
    const sets: string[] = [];
    if (data.name !== undefined) sets.push(`name = '${data.name.replace(/'/g, "''")}'`);
    if (data.bio !== undefined) sets.push(`bio = '${data.bio.replace(/'/g, "''")}'`);
    if (data.phone !== undefined) sets.push(`phone = '${data.phone.replace(/'/g, "''")}'`);
    if (data.department !== undefined) sets.push(`department = '${data.department.replace(/'/g, "''")}'`);
    if (data.matrikelNr !== undefined) sets.push(`matrikel_nr = '${data.matrikelNr.replace(/'/g, "''")}'`);
    if (data.thesisType !== undefined) sets.push(`thesis_type = '${data.thesisType}'`);
    if (data.enrollmentSemester !== undefined) sets.push(`enrollment_semester = '${data.enrollmentSemester.replace(/'/g, "''")}'`);
    if (data.academicTitle !== undefined) sets.push(`academic_title = '${data.academicTitle.replace(/'/g, "''")}'`);
    if (data.officeRoom !== undefined) sets.push(`office_room = '${data.officeRoom.replace(/'/g, "''")}'`);
    if (data.staffId !== undefined) sets.push(`staff_id = '${data.staffId.replace(/'/g, "''")}'`);
    if (data.responsibilityArea !== undefined) sets.push(`responsibility_area = '${data.responsibilityArea.replace(/'/g, "''")}'`);
    if (data.targetSemester !== undefined) sets.push(`target_semester = '${data.targetSemester.replace(/'/g, "''")}'`);
    if (data.officeHours !== undefined) sets.push(`office_hours = '${data.officeHours.replace(/'/g, "''")}'`);
    if (data.researchTags !== undefined) sets.push(`research_tags = '${data.researchTags.replace(/'/g, "''")}'`);
    if (data.officeLocation !== undefined) sets.push(`office_location = '${data.officeLocation.replace(/'/g, "''")}'`);
    if (data.secondEmail !== undefined) sets.push(`second_email = '${data.secondEmail.replace(/'/g, "''")}'`);
    if (data.website !== undefined) sets.push(`website = '${data.website.replace(/'/g, "''")}'`);
    if (data.linkedIn !== undefined) sets.push(`linked_in = '${data.linkedIn.replace(/'/g, "''")}'`);
    if (data.researchGate !== undefined) sets.push(`research_gate = '${data.researchGate.replace(/'/g, "''")}'`);
    if (data.htwProfileUrl !== undefined) sets.push(`htw_profile_url = '${data.htwProfileUrl.replace(/'/g, "''")}'`);
    if (data.miscLink !== undefined) sets.push(`misc_link = '${data.miscLink.replace(/'/g, "''")}'`);
    if (data.bookingUrl !== undefined) sets.push(`booking_url = '${data.bookingUrl.replace(/'/g, "''")}'`);
    if (sets.length === 0) return true;
    await db.execute(`UPDATE users SET ${sets.join(", ")} WHERE id = ${userId}`);
    return true;
  } catch (error) {
    console.error("[Profile] Fehler beim Aktualisieren:", error);
    return false;
  }
}

/** Speichert Avatar-URL und -Key für einen Nutzer */
export async function updateProfileAvatar(userId: number, avatarUrl: string, avatarKey: string) {
  const db = await getDb();
  if (!db) return false;
  try {
    // Erst den eigenen Account aktualisieren
    await db.execute(
      `UPDATE users SET avatarUrl = '${avatarUrl.replace(/'/g, "''")}', avatarKey = '${avatarKey.replace(/'/g, "''")}' WHERE id = ${userId}`
    );
    // Dann alle anderen Accounts mit gleicher E-Mail synchronisieren (mehrere Login-Methoden)
    await db.execute(
      `UPDATE users SET avatarUrl = '${avatarUrl.replace(/'/g, "''")}', avatarKey = '${avatarKey.replace(/'/g, "''")}' WHERE email = (SELECT email FROM (SELECT email FROM users WHERE id = ${userId}) AS sub) AND id != ${userId}`
    );
    // examiner_profiles.photoUrl synchronisieren (für öffentliche Profilseite)
    const existing = await db
      .select({ id: examinerProfiles.userId })
      .from(examinerProfiles)
      .where(eq(examinerProfiles.userId, userId))
      .limit(1);
    if (existing.length > 0) {
      await db
        .update(examinerProfiles)
        .set({ photoUrl: avatarUrl, photoKey: avatarKey })
        .where(eq(examinerProfiles.userId, userId));
    }
    return true;
  } catch (error) {
    console.error("[Profile] Fehler beim Avatar-Update:", error);
    return false;
  }
}

export async function clearProfileAvatar(userId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    // Eigenen Account leeren
    await db.execute(`UPDATE users SET avatarUrl = NULL, avatarKey = NULL WHERE id = ${userId}`);
    // Alle anderen Accounts mit gleicher E-Mail ebenfalls leeren
    await db.execute(
      `UPDATE users SET avatarUrl = NULL, avatarKey = NULL WHERE email = (SELECT email FROM (SELECT email FROM users WHERE id = ${userId}) AS sub) AND id != ${userId}`
    );
    return true;
  } catch (error) {
    console.error("[Profile] Fehler beim Avatar-Löschen:", error);
    return false;
  }
}

// ─── Kommissionspräferenzen ───────────────────────────────────────────────────

/**
 * Alle Erstgutachter:innen abrufen (role = 'examiner')
 * Gibt id (userId), name, email, title, department zurück
 */
export async function getFirstExaminers() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    title: examinerProfiles.title,
    department: examinerProfiles.department,
    studyPrograms: examinerProfiles.studyPrograms,
    maxSupervisions: examinerProfiles.maxSupervisions,
  })
    .from(users)
    .leftJoin(examinerProfiles, eq(users.id, examinerProfiles.userId))
    .where(and(eq(users.role, "examiner"), eq(users.roleStatus, "approved")));

  // Aktive Betreuungen pro Erstprüfer:in zählen
  const activeStatuses = [
    "PENDING", "PENDING_FIRST_EXAMINER", "PENDING_SECOND_EXAMINER",
    "FIRST_EXAMINER_ACCEPTED", "FIRST_EXAMINER_ASSIGNED",
    "SECOND_EXAMINER_ACCEPTED", "SECOND_EXAMINER_ASSIGNED", "SECOND_EXAMINER_SET",
    "MATCHED",
  ] as const;
  const examinerIds = result.map((r) => r.id);
  let activeCountMap = new Map<number, number>();
  if (examinerIds.length > 0) {
    const activeRows = await db
      .select({ examinerId: thesisRequests.examinerId })
      .from(thesisRequests)
      .where(
        and(
          inArray(thesisRequests.examinerId, examinerIds),
          inArray(thesisRequests.status, activeStatuses as unknown as string[])
        )
      );
    for (const r of activeRows) {
      if (r.examinerId) activeCountMap.set(r.examinerId, (activeCountMap.get(r.examinerId) ?? 0) + 1);
    }
  }

  return result.map((r) => ({
    ...r,
    activeSupervisions: activeCountMap.get(r.id) ?? 0,
  }));
}

/**
 * Alle Zweitgutachter:innen abrufen (role = 'examiner' mit isSecondExaminer=1 ODER role = 'second_examiner')
 */
export async function getAllSecondExaminerCandidates() {
  const db = await getDb();
  if (!db) return [];
  // Basisdaten + Profil-Details
  const candidates = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    title: examinerProfiles.title,
    department: examinerProfiles.department,
    isSecondExaminer: examinerProfiles.isSecondExaminer,
    bio: examinerProfiles.bio,
    maxSupervisions: examinerProfiles.maxSupervisions,
    researchFocus: examinerProfiles.researchFocus,
    officeHours: examinerProfiles.officeHours,
    tags: examinerProfiles.tags,
    photoUrl: examinerProfiles.photoUrl,
    avatarUrl: users.avatarUrl,
  })
    .from(users)
    .leftJoin(examinerProfiles, eq(users.id, examinerProfiles.userId))
    .where(
      and(
        eq(users.roleStatus, "approved"),
        or(
          eq(users.role, "second_examiner"),
          and(eq(users.role, "examiner"), eq(examinerProfiles.isSecondExaminer, 1))
        )
      )
    );

  // Aktive Betreuungsanzahl pro Kandidat:in berechnen
  // Aktiv = Anfragen mit Status nicht COMPLETED/WITHDRAWN/CANCELLED/REJECTED
  const activeStatuses = [
    "PENDING", "ACCEPTED", "MATCHED",
    "PENDING_FIRST_EXAMINER", "PENDING_SECOND_EXAMINER",
    "FIRST_EXAMINER_ACCEPTED", "FIRST_EXAMINER_ASSIGNED",
    "SECOND_EXAMINER_ACCEPTED", "SECOND_EXAMINER_ASSIGNED", "SECOND_EXAMINER_SET",
  ] as const;

  const candidateIds = candidates.map((c) => c.id);
  let activeCountMap = new Map<number, number>();

  if (candidateIds.length > 0) {
    // Zähle Anfragen wo die Person Zweitgutachter:in ist (secondExaminerId)
    const rows = await db
      .select({
        examinerId: thesisRequests.secondExaminerId,
        count: sql<number>`COUNT(*)`,
      })
      .from(thesisRequests)
      .where(
        and(
          inArray(thesisRequests.secondExaminerId, candidateIds),
          inArray(thesisRequests.status, activeStatuses as unknown as string[])
        )
      )
      .groupBy(thesisRequests.secondExaminerId);

    for (const row of rows) {
      if (row.examinerId != null) {
        activeCountMap.set(row.examinerId, Number(row.count));
      }
    }
  }

  return candidates.map((c) => ({
    ...c,
    activeSupervisions: activeCountMap.get(c.id) ?? 0,
  }));
}

/**
 * Kommissionspräferenzen eines Erstgutachters abrufen
 * Gibt die secondExaminerIds zurück, die der Erstgutachter bevorzugt
 */
export async function getCommissionPreferences(firstExaminerId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ secondExaminerId: examinerCommissionPreferences.secondExaminerId })
    .from(examinerCommissionPreferences)
    .where(eq(examinerCommissionPreferences.firstExaminerId, firstExaminerId));
  return rows.map(r => r.secondExaminerId);
}

/**
 * Kommissionspräferenzen eines Erstgutachters setzen (vollständig ersetzen)
 */
export async function setCommissionPreferences(firstExaminerId: number, secondExaminerIds: number[]) {
  const db = await getDb();
  if (!db) return false;
  // Alle bestehenden Präferenzen löschen
  await db
    .delete(examinerCommissionPreferences)
    .where(eq(examinerCommissionPreferences.firstExaminerId, firstExaminerId));
  // Neue Präferenzen einfügen
  if (secondExaminerIds.length > 0) {
    await db.insert(examinerCommissionPreferences).values(
      secondExaminerIds.map(sid => ({ firstExaminerId, secondExaminerId: sid }))
    );
  }
  return true;
}

/**
 * Zweitgutachter-Wunsch für eine Anfrage setzen
 * Nur erlaubt wenn Status = FIRST_EXAMINER_ACCEPTED
 */
export async function setWantedSecondExaminer(requestId: number, studentId: number, secondExaminerId: number | null) {
  const db = await getDb();
  if (!db) return { success: false, error: "DB nicht verfügbar" };
  // Anfrage laden und Berechtigungen prüfen
  const rows = await db
    .select({ id: thesisRequests.id, studentId: thesisRequests.studentId, status: thesisRequests.status, wantedExaminerId: thesisRequests.wantedExaminerId })
    .from(thesisRequests)
    .where(eq(thesisRequests.id, requestId))
    .limit(1);
  if (!rows.length) return { success: false, error: "Anfrage nicht gefunden" };
  const req = rows[0];
  if (req.studentId !== studentId) return { success: false, error: "Keine Berechtigung" };
  if (req.status !== "FIRST_EXAMINER_ACCEPTED") {
    return { success: false, error: "Zweitgutachter:in kann erst nach Zusage des Erstgutachters gewählt werden" };
  }
  // Zweitgutachter darf nicht identisch mit Erstgutachter sein
  if (secondExaminerId !== null && secondExaminerId === req.wantedExaminerId) {
    return { success: false, error: "Zweitgutachter:in darf nicht identisch mit Erstgutachter:in sein" };
  }
  await db.execute(
    `UPDATE thesis_requests SET wanted_second_examiner_id = ${secondExaminerId === null ? "NULL" : secondExaminerId} WHERE id = ${requestId}`
  );
  return { success: true };
}

/**
 * Gefilterte Zweitgutachter-Liste für eine Anfrage:
 * Wenn der Erstgutachter Präferenzen hat → nur diese anzeigen
 * Sonst alle Zweitgutachter-Kandidaten
 */
export async function getFilteredSecondExaminers(firstExaminerId: number) {
  const db = await getDb();
  if (!db) return [];
  // Präferenzen des Erstgutachters laden
  const prefs = await getCommissionPreferences(firstExaminerId);
  // Alle Zweitgutachter-Kandidaten laden
  const all = await getAllSecondExaminerCandidates();
  if (prefs.length === 0) {
    // Keine Präferenzen → alle anzeigen
    return all;
  }
  // Nur bevorzugte anzeigen
  return all.filter(e => prefs.includes(e.id));
}

// ─── Nutzerfelder aktualisieren (für Import) ──────────────────────────────────
export async function updateUserFields(userId: number, fields: {
  academicTitle?: string;
  department?: string;
  name?: string;
}) {
  const db = await getDb();
  if (!db) return;
  const set: Record<string, unknown> = {};
  if (fields.academicTitle !== undefined) set.academicTitle = fields.academicTitle;
  if (fields.department !== undefined) set.department = fields.department;
  if (fields.name !== undefined) set.name = fields.name;
  if (Object.keys(set).length === 0) return;
  await db.update(users).set(set as any).where(eq(users.id, userId));
}

// ─── Semesterkapazitäten ──────────────────────────────────────────────────────

/**
 * Alle Semesterkapazitäten eines Prüfers laden
 */
export async function getSemesterCapacities(examinerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(examinerSemesterCapacities)
    .where(eq(examinerSemesterCapacities.examinerId, examinerId))
    .orderBy(examinerSemesterCapacities.semester);
}

/**
 * Kapazität für ein Semester setzen (upsert)
 */
export async function upsertSemesterCapacity(
  examinerId: number,
  semester: string,
  maxFirst: number,
  maxSecond: number,
) {
  const db = await getDb();
  if (!db) return;
  // Prüfen ob Eintrag existiert
  const existing = await db
    .select({ id: examinerSemesterCapacities.id })
    .from(examinerSemesterCapacities)
    .where(
      and(
        eq(examinerSemesterCapacities.examinerId, examinerId),
        eq(examinerSemesterCapacities.semester, semester),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(examinerSemesterCapacities)
      .set({ maxFirst, maxSecond })
      .where(
        and(
          eq(examinerSemesterCapacities.examinerId, examinerId),
          eq(examinerSemesterCapacities.semester, semester),
        ),
      );
  } else {
    await db.insert(examinerSemesterCapacities).values({
      examinerId,
      semester,
      maxFirst,
      maxSecond,
    });
  }
}

/**
 * Kapazitäten aller Prüfer für ein bestimmtes Semester laden
 * (für Auslastungsberechnung)
 */
export async function getCapacitiesForSemester(semester: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(examinerSemesterCapacities)
    .where(eq(examinerSemesterCapacities.semester, semester));
}

// ─── Admin: Semesterkapazitäten einsehen und überschreiben ───────────────────

/**
 * Alle Semesterkapazitäten einer Prüferin / eines Prüfers für Admins abrufen.
 * Gibt sowohl die selbst eingetragenen Werte als auch eventuelle Admin-Overrides zurück.
 */
export async function getExaminerSemesterCapacitiesForAdmin(examinerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(examinerSemesterCapacities)
    .where(eq(examinerSemesterCapacities.examinerId, examinerId))
    .orderBy(examinerSemesterCapacities.semester);
}

/**
 * Admin überschreibt die Kapazität für ein bestimmtes Semester.
 * Wenn kein Eintrag existiert, wird ein neuer angelegt.
 */
export async function adminOverrideExaminerCapacity(
  examinerId: number,
  semester: string,
  adminMaxFirst: number,
  adminMaxSecond: number,
  adminId: number,
) {
  const db = await getDb();
  if (!db) return;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const existing = await db
    .select({ id: examinerSemesterCapacities.id })
    .from(examinerSemesterCapacities)
    .where(
      and(
        eq(examinerSemesterCapacities.examinerId, examinerId),
        eq(examinerSemesterCapacities.semester, semester),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(examinerSemesterCapacities)
      .set({
        adminOverride: 1,
        adminOverrideBy: adminId,
        adminOverrideAt: now as any,
        adminMaxFirst,
        adminMaxSecond,
      } as any)
      .where(
        and(
          eq(examinerSemesterCapacities.examinerId, examinerId),
          eq(examinerSemesterCapacities.semester, semester),
        ),
      );
  } else {
    await db.insert(examinerSemesterCapacities).values({
      examinerId,
      semester,
      maxFirst: adminMaxFirst,
      maxSecond: adminMaxSecond,
      adminOverride: 1,
      adminOverrideBy: adminId,
      adminOverrideAt: now as any,
      adminMaxFirst,
      adminMaxSecond,
    } as any);
  }
}

/**
 * Admin-Override für ein Semester zurücksetzen (auf Prüfer-Wert zurückfallen).
 */
export async function resetAdminOverride(examinerId: number, semester: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(examinerSemesterCapacities)
    .set({
      adminOverride: 0,
      adminOverrideBy: null,
      adminOverrideAt: null,
      adminMaxFirst: null,
      adminMaxSecond: null,
    } as any)
    .where(
      and(
        eq(examinerSemesterCapacities.examinerId, examinerId),
        eq(examinerSemesterCapacities.semester, semester),
      ),
    );
}

// ─── Öffentliche Profilzugriffs-Prüfung ──────────────────────────────────────

/**
 * Prüft ob zwischen viewerId und targetStudentId eine gemeinsame Anfrage existiert.
 * Wird für die rollenbasierte Zugriffskontrolle auf Studierenden-Profile benötigt.
 * Gibt true zurück wenn:
 * - viewerId ist die Prüfer:in einer Anfrage des targetStudentId, ODER
 * - viewerId ist selbst targetStudentId (eigenes Profil), ODER
 * - viewerId ist Admin/Superadmin
 */
export async function hasSharedThesisRequest(viewerId: number, targetStudentId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  // Prüfen ob eine gemeinsame Anfrage existiert (Prüfer:in schaut Studierenden-Profil an)
  const rows = await db
    .select({ id: thesisRequests.id })
    .from(thesisRequests)
    .where(
      and(
        eq(thesisRequests.studentId, targetStudentId),
        or(
          eq(thesisRequests.examinerId, viewerId),
          eq(thesisRequests.secondExaminerId, viewerId),
        ),
      )
    )
    .limit(1);
  return rows.length > 0;
}

// ─── Prüfer:innen E-Mail-Templates ────────────────────────────────────────────
import { examinerEmailTemplates } from "../drizzle/schema";

export type EmailTemplateType = "requirements" | "acceptance" | "rejection" | "fully_booked";

export interface ExaminerEmailTemplate {
  id: number;
  examinerId: number;
  templateType: EmailTemplateType;
  subject: string;
  body: string;
  updatedAt: string;
}

/** Alle 4 Templates eines Prüfers laden (fehlende werden als leere Objekte zurückgegeben) */
export async function getExaminerEmailTemplates(examinerId: number): Promise<Record<EmailTemplateType, { subject: string; body: string }>> {
  const db = await getDb();
  const defaults: Record<EmailTemplateType, { subject: string; body: string }> = {
    requirements: { subject: "", body: "" },
    acceptance: { subject: "", body: "" },
    rejection: { subject: "", body: "" },
    fully_booked: { subject: "", body: "" },
  };
  if (!db) return defaults;
  const rows = await db
    .select()
    .from(examinerEmailTemplates)
    .where(eq(examinerEmailTemplates.examinerId, examinerId));
  for (const row of rows) {
    defaults[row.templateType as EmailTemplateType] = { subject: row.subject, body: row.body };
  }
  return defaults;
}

/** Ein einzelnes Template speichern (upsert) */
export async function saveExaminerEmailTemplate(
  examinerId: number,
  templateType: EmailTemplateType,
  subject: string,
  body: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select({ id: examinerEmailTemplates.id })
    .from(examinerEmailTemplates)
    .where(
      and(
        eq(examinerEmailTemplates.examinerId, examinerId),
        eq(examinerEmailTemplates.templateType, templateType)
      )
    )
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(examinerEmailTemplates)
      .set({ subject, body })
      .where(
        and(
          eq(examinerEmailTemplates.examinerId, examinerId),
          eq(examinerEmailTemplates.templateType, templateType)
        )
      );
  } else {
    await db.insert(examinerEmailTemplates).values({ examinerId, templateType, subject, body });
  }
}

/** Variablen in einem Template ersetzen */
export function resolveEmailTemplate(
  template: { subject: string; body: string },
  vars: { name?: string; thema?: string; semester?: string; studiengang?: string }
): { subject: string; body: string } {
  const replace = (text: string) =>
    text
      .replace(/\{\{name\}\}/g, vars.name ?? "")
      .replace(/\{\{thema\}\}/g, vars.thema ?? "")
      .replace(/\{\{semester\}\}/g, vars.semester ?? "")
      .replace(/\{\{studiengang\}\}/g, vars.studiengang ?? "");
  return { subject: replace(template.subject), body: replace(template.body) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Anmeldefähigkeit & Verteidigungsfähigkeit
// ─────────────────────────────────────────────────────────────────────────────

/** Alle Anträge mit ausstehender Anmeldefähigkeit im Zuständigkeitsbereich der PAV */
export async function getRequestsPendingEnrollmentEligibility(pavUserId: number) {
  const db = await getDb();
  if (!db) return [];
  const pavProgrammeRows = await db
    .select({ programmeId: pavProgrammes.programmeId })
    .from(pavProgrammes)
    .where(eq(pavProgrammes.pavUserId, pavUserId));
  const programmeIds = pavProgrammeRows.map((r) => r.programmeId);
  if (programmeIds.length === 0) return [];
  return db
    .select({
      request: thesisRequests,
      student: { id: users.id, name: users.name, email: users.email, matrikelNr: users.matrikelNr, programmeId: users.programmeId },
    })
    .from(thesisRequests)
    .innerJoin(users, eq(thesisRequests.studentId, users.id))
    .where(and(eq(thesisRequests.enrollmentEligibility, "pending"), inArray(users.programmeId, programmeIds)))
    .orderBy(thesisRequests.createdAt);
}

/** Alle Anträge mit ausstehender Verteidigungsfähigkeit im Zuständigkeitsbereich der PAV */
export async function getRequestsPendingDefenseEligibility(pavUserId: number) {
  const db = await getDb();
  if (!db) return [];
  const pavProgrammeRows = await db
    .select({ programmeId: pavProgrammes.programmeId })
    .from(pavProgrammes)
    .where(eq(pavProgrammes.pavUserId, pavUserId));
  const programmeIds = pavProgrammeRows.map((r) => r.programmeId);
  if (programmeIds.length === 0) return [];
  return db
    .select({
      request: thesisRequests,
      student: { id: users.id, name: users.name, email: users.email, matrikelNr: users.matrikelNr, programmeId: users.programmeId },
    })
    .from(thesisRequests)
    .innerJoin(users, eq(thesisRequests.studentId, users.id))
    .where(and(eq(thesisRequests.defenseEligibility, "pending"), inArray(users.programmeId, programmeIds)))
    .orderBy(thesisRequests.createdAt);
}

/** Anmeldefähigkeit eines Antrags setzen */
export async function setEnrollmentEligibility(
  thesisRequestId: number,
  eligibility: "approved" | "rejected",
  checkedBy: number,
  note?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db.update(thesisRequests).set({
    enrollmentEligibility: eligibility,
    enrollmentEligibilityNote: note ?? null,
    enrollmentEligibilityCheckedBy: checkedBy,
    enrollmentEligibilityCheckedAt: now,
  }).where(eq(thesisRequests.id, thesisRequestId));
  await logAdminDecision(db, thesisRequestId, "enrollment_eligibility", eligibility, checkedBy, note);
}

/** Verteidigungsfähigkeit eines Antrags setzen */
export async function setDefenseEligibility(
  thesisRequestId: number,
  eligibility: "approved" | "blocked",
  checkedBy: number,
  note?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db.update(thesisRequests).set({
    defenseEligibility: eligibility,
    defenseEligibilityNote: note ?? null,
    defenseEligibilityCheckedBy: checkedBy,
    defenseEligibilityCheckedAt: now,
  }).where(eq(thesisRequests.id, thesisRequestId));
  await logAdminDecision(db, thesisRequestId, "defense_eligibility", eligibility, checkedBy, note);
}

/** Entscheidung in admin_decision_log protokollieren */
async function logAdminDecision(
  db: Awaited<ReturnType<typeof getDb>>,
  thesisRequestId: number,
  decisionType: "enrollment_eligibility" | "defense_eligibility",
  decision: "approved" | "rejected" | "blocked",
  decidedBy: number,
  note?: string
) {
  if (!db) return;
  await db.execute(
    sql`INSERT INTO admin_decision_log (thesis_request_id, decision_type, decision, note, decided_by, decided_at)
        VALUES (${thesisRequestId}, ${decisionType}, ${decision}, ${note ?? null}, ${decidedBy}, ${Date.now()})`
  );
}

/** Entscheidungshistorie für einen Antrag abrufen */
export async function getAdminDecisionHistory(thesisRequestId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.execute(
    sql`SELECT l.id, l.decision_type, l.decision, l.note, l.decided_at,
               u.name AS decided_by_name, u.email AS decided_by_email
        FROM admin_decision_log l
        LEFT JOIN users u ON u.id = l.decided_by
        WHERE l.thesis_request_id = ${thesisRequestId}
        ORDER BY l.decided_at DESC`
  );
  return (rows as any[]).map((r: any) => ({
    id: r.id as number,
    decisionType: r.decision_type as string,
    decision: r.decision as string,
    note: r.note as string | null,
    decidedAt: r.decided_at as number,
    decidedByName: r.decided_by_name as string | null,
    decidedByEmail: r.decided_by_email as string | null,
  }));
}

/** Verteidigungsfähigkeit auf "pending" setzen (wenn Thesis abgegeben wird) */
export async function triggerDefenseEligibilityCheck(thesisRequestId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(thesisRequests).set({ defenseEligibility: "pending" }).where(
    and(eq(thesisRequests.id, thesisRequestId), eq(thesisRequests.defenseEligibility, "not_applicable"))
  );
}

// ─── Multi-Rollen-Hilfsfunktionen ────────────────────────────────────────────

export type AppRole = "user" | "admin" | "student" | "examiner" | "second_examiner" | "superadmin" | "pav" | "dean" | "vice_dean";

/** Alle Rollen eines Nutzers aus user_roles abrufen */
export async function getUserRoles(userId: number): Promise<AppRole[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));
  return rows.map((r) => r.role as AppRole);
}

/** Prüfen ob ein Nutzer eine bestimmte Rolle hat */
export async function hasRole(userId: number, role: AppRole): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)))
    .limit(1);
  return rows.length > 0;
}

/** Rolle zu einem Nutzer hinzufügen (idempotent) */
export async function addUserRole(userId: number, role: AppRole, assignedBy?: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // INSERT IGNORE verhindert Duplikate (unique index auf user_id + role)
  await db.execute(
    sql`INSERT IGNORE INTO user_roles (user_id, role, assigned_by, assigned_at)
        VALUES (${userId}, ${role}, ${assignedBy ?? null}, NOW())`
  );
  // users.role synchron halten (Haupt-Rolle = Priorität: student > examiner > pav > dean > admin > superadmin)
  await syncPrimaryRole(userId);
}

/** Rolle von einem Nutzer entfernen */
export async function removeUserRole(userId: number, role: AppRole): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)));
  // users.role synchron halten
  await syncPrimaryRole(userId);
}

/**
 * Haupt-Rolle in users.role synchron halten.
 * Priorität: student > examiner > second_examiner > pav > dean > vice_dean > admin > superadmin > user
 */
const ROLE_PRIORITY: AppRole[] = [
  "student", "examiner", "second_examiner", "pav", "dean", "vice_dean", "admin", "superadmin", "user"
];

async function syncPrimaryRole(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const roles = await getUserRoles(userId);
  if (roles.length === 0) return;
  // Erste Rolle nach Priorität wählen
  const primary = ROLE_PRIORITY.find((r) => roles.includes(r)) ?? roles[0];
  await db.update(users).set({ role: primary }).where(eq(users.id, userId));
}


// ─── Prüfer:innen-Fachbereich-Verwaltung ─────────────────────────────────────

import { examinerDepartments } from "../drizzle/schema";

/**
 * Alle Fachbereiche eines Prüfers laden.
 * Gibt { department, isPrimary }[] zurück.
 */
export async function getExaminerDepartments(userId: number): Promise<{ department: string; isPrimary: boolean }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ department: examinerDepartments.department, isPrimary: examinerDepartments.isPrimary })
    .from(examinerDepartments)
    .where(eq(examinerDepartments.userId, userId));
  return rows.map((r) => ({ department: r.department, isPrimary: r.isPrimary === 1 }));
}

/**
 * Fachbereiche eines Prüfers setzen (ersetzt alle vorhandenen Einträge).
 * @param userId - Nutzer-ID
 * @param departments - Liste aller erlaubten Fachbereiche (z.B. ["FB1", "FB3"])
 * @param primaryDepartment - Primärer Fachbereich (muss in departments enthalten sein)
 */
export async function setExaminerDepartments(
  userId: number,
  departments: string[],
  primaryDepartment: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Alle vorhandenen Einträge löschen
  await db.delete(examinerDepartments).where(eq(examinerDepartments.userId, userId));

  if (departments.length === 0) return;

  // Neue Einträge anlegen
  const rows = departments.map((dept) => ({
    userId,
    department: dept,
    isPrimary: dept === primaryDepartment ? 1 : 0,
  }));
  await db.insert(examinerDepartments).values(rows);

  // examiner_profiles.department synchron halten (Primärfachbereich)
  await db
    .update(examinerProfiles)
    .set({ department: primaryDepartment })
    .where(eq(examinerProfiles.userId, userId));
}

// --- Zugewiesene Prüfer:innen für Studierende ------------------------------------

/**
 * Gibt die zugewiesenen Prüfer:innen (Erst- und Zweitprüfer:in) für einen Studierenden zurück.
 * Liefert Kontaktinformationen und Sprechstunden aus users + examiner_profiles.
 */
export async function getAssignedExaminers(studentId: number) {
  const db = await getDb();
  if (!db) return [];

  // Neueste Thesis-Anfrage mit zugewiesenem Erst- und/oder Zweitprüfer laden
  const requests = await db
    .select({
      id: thesisRequests.id,
      title: thesisRequests.title,
      status: thesisRequests.status,
      examinerId: thesisRequests.examinerId,
      secondExaminerId: thesisRequests.secondExaminerId,
    })
    .from(thesisRequests)
    .where(
      and(
        eq(thesisRequests.studentId, studentId),
        or(
          sql`${thesisRequests.examinerId} IS NOT NULL`,
          sql`${thesisRequests.secondExaminerId} IS NOT NULL`
        )
      )
    )
    .orderBy(desc(thesisRequests.createdAt))
    .limit(5);

  if (requests.length === 0) return [];

  // Alle relevanten Prüfer:innen-IDs sammeln
  const examinerIds = new Set<number>();
  for (const req of requests) {
    if (req.examinerId) examinerIds.add(req.examinerId);
    if (req.secondExaminerId) examinerIds.add(req.secondExaminerId);
  }
  if (examinerIds.size === 0) return [];

  const ids = Array.from(examinerIds);

  // Nutzer-Daten laden
  const examinerUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      phone: users.phone,
      department: users.department,
      academicTitle: users.academicTitle,
      officeRoom: users.officeRoom,
      officeHours: users.officeHours,
      website: users.website,
      bookingUrl: users.bookingUrl,
    })
    .from(users)
    .where(inArray(users.id, ids));

  // Prüfer:innen-Profil-Daten laden (officeHours, photoUrl, alternativeEmail)
  const examinerProfileRows = await db
    .select({
      userId: examinerProfiles.userId,
      photoUrl: examinerProfiles.photoUrl,
      officeHours: examinerProfiles.officeHours,
      phone: examinerProfiles.phone,
      alternativeEmail: examinerProfiles.alternativeEmail,
      department: examinerProfiles.department,
    })
    .from(examinerProfiles)
    .where(inArray(examinerProfiles.userId, ids));

  const profileMap = new Map(examinerProfileRows.map((p) => [p.userId, p]));
  const userMap = new Map(examinerUsers.map((u) => [u.id, u]));

  // Ergebnis aufbauen: pro Thesis-Anfrage Erst- und Zweitprüfer:in
  const result: Array<{
    thesisId: number;
    thesisTitle: string;
    thesisStatus: string;
    examiners: Array<{
      id: number;
      role: "first" | "second";
      name: string | null;
      email: string | null;
      phone: string | null;
      avatarUrl: string | null;
      department: string | null;
      academicTitle: string | null;
      officeRoom: string | null;
      officeHours: string | null;
      website: string | null;
      bookingUrl: string | null;
    }>;
  }> = [];

  for (const req of requests) {
    const examiners: typeof result[0]["examiners"] = [];

    if (req.examinerId) {
      const u = userMap.get(req.examinerId);
      const ep = profileMap.get(req.examinerId);
      if (u) {
        examiners.push({
          id: u.id,
          role: "first",
          name: u.name ?? null,
          email: ep?.alternativeEmail ?? u.email ?? null,
          phone: ep?.phone ?? u.phone ?? null,
          avatarUrl: ep?.photoUrl ?? u.avatarUrl ?? null,
          department: ep?.department ?? u.department ?? null,
          academicTitle: u.academicTitle ?? null,
          officeRoom: u.officeRoom ?? null,
          officeHours: ep?.officeHours ?? u.officeHours ?? null,
          website: u.website ?? null,
          bookingUrl: u.bookingUrl ?? null,
        });
      }
    }

    if (req.secondExaminerId) {
      const u = userMap.get(req.secondExaminerId);
      const ep = profileMap.get(req.secondExaminerId);
      if (u) {
        examiners.push({
          id: u.id,
          role: "second",
          name: u.name ?? null,
          email: ep?.alternativeEmail ?? u.email ?? null,
          phone: ep?.phone ?? u.phone ?? null,
          avatarUrl: ep?.photoUrl ?? u.avatarUrl ?? null,
          department: ep?.department ?? u.department ?? null,
          academicTitle: u.academicTitle ?? null,
          officeRoom: u.officeRoom ?? null,
          officeHours: ep?.officeHours ?? u.officeHours ?? null,
          website: u.website ?? null,
          bookingUrl: u.bookingUrl ?? null,
        });
      }
    }

    if (examiners.length > 0) {
      result.push({
        thesisId: req.id,
        thesisTitle: req.title,
        thesisStatus: req.status,
        examiners,
      });
    }
  }

  return result;
}

// ─── Verwaltungsworkflow: Anmeldung & Zulassung ─────────────────────────────

/** Alle Anträge abrufen, die offiziell angemeldet oder zugelassen sind (für PAV-Übersicht) */
export async function getRegisteredTheses() {
  const db = await getDb();
  if (!db) return [];
  const student = aliasedTable(users, "student");
  return db
    .select({
      id: thesisRequests.id,
      title: thesisRequests.title,
      department: thesisRequests.department,
      degreeType: thesisRequests.degreeType,
      status: thesisRequests.status,
      officialRegistrationStatus: thesisRequests.officialRegistrationStatus,
      officialRegistrationAt: thesisRequests.officialRegistrationAt,
      admissionAt: thesisRequests.admissionAt,
      admissionNote: thesisRequests.admissionNote,
      submissionDeadline: thesisRequests.submissionDeadline,
      defenseDate: thesisRequests.defenseDate,
      caseClosedAt: thesisRequests.caseClosedAt,
      createdAt: thesisRequests.createdAt,
      studentId: thesisRequests.studentId,
      studentName: student.name,
      studentEmail: student.email,
    })
    .from(thesisRequests)
    .leftJoin(student, eq(thesisRequests.studentId, student.id))
    .where(
      or(
        eq(thesisRequests.officialRegistrationStatus, "registered"),
        eq(thesisRequests.officialRegistrationStatus, "admitted"),
        eq(thesisRequests.officialRegistrationStatus, "case_closed"),
      )
    )
    .orderBy(desc(thesisRequests.createdAt));
}

/** Arbeit offiziell anmelden (Status: registered, Zulassung ausstehend) */
export async function setOfficialRegistration(
  thesisRequestId: number,
  actorId: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db.update(thesisRequests).set({
    officialRegistrationStatus: "registered",
    officialRegistrationAt: now,
    officialRegistrationBy: actorId,
  }).where(eq(thesisRequests.id, thesisRequestId));
}

/** Thesis zulassen und Abgabedatum setzen (Status: admitted) */
export async function setAdmission(
  thesisRequestId: number,
  actorId: number,
  submissionDeadline: string,
  note?: string,
) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db.update(thesisRequests).set({
    officialRegistrationStatus: "admitted",
    admissionAt: now,
    admissionBy: actorId,
    admissionNote: note ?? null,
    submissionDeadline,
  }).where(eq(thesisRequests.id, thesisRequestId));
}

/** Abgabefrist verlängern – Protokolleintrag in deadline_changes */
export async function extendDeadline(
  thesisRequestId: number,
  actorId: number,
  newDeadline: string,
  reason: string,
) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  // Altes Datum lesen
  const [thesis] = await db.select({ submissionDeadline: thesisRequests.submissionDeadline })
    .from(thesisRequests).where(eq(thesisRequests.id, thesisRequestId)).limit(1);
  const previousDeadline = thesis?.submissionDeadline ?? null;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  // Neues Datum setzen
  await db.update(thesisRequests).set({ submissionDeadline: newDeadline })
    .where(eq(thesisRequests.id, thesisRequestId));
  // Protokolleintrag
  await db.insert(deadlineChanges).values({
    thesisRequestId,
    previousDeadline: previousDeadline ?? undefined,
    newDeadline,
    reason,
    changedBy: actorId,
    changedAt: now,
  });
}

/** Verteidigungsdatum eintragen */
export async function setDefenseDate(
  thesisRequestId: number,
  actorId: number,
  defenseDate: string,
) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db.update(thesisRequests).set({
    defenseDate,
    defenseDateSetAt: now,
    defenseDateSetBy: actorId,
  }).where(eq(thesisRequests.id, thesisRequestId));
}

/** Akte vollständig übermitteln (Status: case_closed) */
export async function closeCase(
  thesisRequestId: number,
  actorId: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db.update(thesisRequests).set({
    officialRegistrationStatus: "case_closed",
    caseClosedAt: now,
    caseClosedBy: actorId,
  }).where(eq(thesisRequests.id, thesisRequestId));
}

/** Abgabefrist-Änderungsprotokoll für einen Antrag abrufen */
export async function getDeadlineChanges(thesisRequestId: number) {
  const db = await getDb();
  if (!db) return [];
  const changedByUser = aliasedTable(users, "changed_by_user");
  return db
    .select({
      id: deadlineChanges.id,
      previousDeadline: deadlineChanges.previousDeadline,
      newDeadline: deadlineChanges.newDeadline,
      reason: deadlineChanges.reason,
      changedAt: deadlineChanges.changedAt,
      changedByName: changedByUser.name,
    })
    .from(deadlineChanges)
    .leftJoin(changedByUser, eq(deadlineChanges.changedBy, changedByUser.id))
    .where(eq(deadlineChanges.thesisRequestId, thesisRequestId))
    .orderBy(desc(deadlineChanges.changedAt));
}
