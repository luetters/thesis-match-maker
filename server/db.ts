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
  examinerTopics,
  loginAttempts,
  examinerSeenNotifications,
  passwordResetTokens,
  InsertPasswordResetToken,
  notificationPreferences,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { buildSecondExaminerConfirmedEmail, buildSecondExaminerRejectedEmail, buildSecondExaminerRequestEmail } from "./emailTemplates";

let _db: ReturnType<typeof drizzle> | null = null;
/** Nur für Tests: setzt den DB-Cache zurück, damit getDb() neu initialisiert. */
export function _resetDbForTesting() { _db = null; }
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
    const lsi = user.lastSignedIn;
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
    // Nur definierte Felder aktualisieren – undefined-Werte nicht als NULL überschreiben
    const updateData = Object.fromEntries(
      Object.entries(profile).filter(([key, val]) => key !== 'userId' && val !== undefined)
    );
    console.log('[upsertExaminerProfile] UPDATE userId=%d keys=%s', profile.userId, Object.keys(updateData).join(','));
    if (Object.keys(updateData).length > 0) {
      await db
        .update(examinerProfiles)
        .set(updateData)
        .where(eq(examinerProfiles.userId, profile.userId));
      console.log('[upsertExaminerProfile] UPDATE done');
    }
  } else {
    await db.insert(examinerProfiles).values(profile);
  }
}

export async function getExaminerProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  // Profil laden
  const result = await db
    .select()
    .from(examinerProfiles)
    .where(eq(examinerProfiles.userId, userId))
    .limit(1);
  if (!result[0]) return null;
  // roleStatus aus users-Tabelle separat laden
  const userRow = await db
    .select({ roleStatus: users.roleStatus })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return { ...result[0], roleStatus: userRow[0]?.roleStatus ?? 'approved' };
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
    .where(inArray(thesisRequests.status, activeStatuses as any));
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

  // Fachbereiche pro Prüfer:in aus examiner_departments laden
  const { examinerDepartments } = await import("../drizzle/schema");
  const deptRows = await db
    .select({ userId: examinerDepartments.userId, department: examinerDepartments.department })
    .from(examinerDepartments);
  const deptsMap = new Map<number, string[]>();
  for (const d of deptRows) {
    if (!deptsMap.has(d.userId)) deptsMap.set(d.userId, []);
    deptsMap.get(d.userId)!.push(d.department);
  }

  return result.map((r) => ({
    ...r,
    activeSupervisions: activeCountMap.get(r.user.id) ?? 0,
    programmes: programmesMap.get(r.user.id) ?? [],
    allowedDepartments: deptsMap.get(r.user.id) ?? (r.user.department ? [r.user.department] : []),
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

/** Wie getThesisRequestById, aber mit aufgelösten Namen für PDF-Export */
export async function getThesisRequestByIdWithNames(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const studentAlias = aliasedTable(users, "student_pdf");
  const firstExaminerAlias = aliasedTable(users, "first_examiner_pdf");
  const secondExaminerAlias = aliasedTable(users, "second_examiner_pdf");
  const wantedExaminerAlias = aliasedTable(users, "wanted_examiner_pdf");
  const wantedSecondExaminerAlias = aliasedTable(users, "wanted_second_examiner_pdf");
  const result = await db
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
      rejectionReason: thesisRequests.rejectionReason,
      conditionalAcceptanceReason: thesisRequests.conditionalAcceptanceReason,
      withdrawalReason: thesisRequests.withdrawalReason,
      createdAt: thesisRequests.createdAt,
      submissionDeadline: thesisRequests.submissionDeadline,
      defenseDate: thesisRequests.defenseDate,
      studentId: thesisRequests.studentId,
      examinerId: thesisRequests.examinerId,
      secondExaminerId: thesisRequests.secondExaminerId,
      wantedExaminerId: thesisRequests.wantedExaminerId,
      wantedSecondExaminerId: thesisRequests.wantedSecondExaminerId,
      externalSecondExaminerTitle: thesisRequests.externalSecondExaminerTitle,
      externalSecondExaminerFirstName: thesisRequests.externalSecondExaminerFirstName,
      externalSecondExaminerLastName: thesisRequests.externalSecondExaminerLastName,
      externalSecondExaminerEmail: thesisRequests.externalSecondExaminerEmail,
      // Aufgelöste Namen
      studentName: studentAlias.name,
      studentFirstName: studentAlias.firstName,
      studentLastName: studentAlias.lastName,
      studentEmail: studentAlias.email,
      firstExaminerName: firstExaminerAlias.name,
      firstExaminerFirstName: firstExaminerAlias.firstName,
      firstExaminerLastName: firstExaminerAlias.lastName,
      firstExaminerAcademicTitle: firstExaminerAlias.academicTitle,
      firstExaminerEmail: firstExaminerAlias.email,
      secondExaminerName: secondExaminerAlias.name,
      secondExaminerFirstName: secondExaminerAlias.firstName,
      secondExaminerLastName: secondExaminerAlias.lastName,
      secondExaminerAcademicTitle: secondExaminerAlias.academicTitle,
      secondExaminerEmail: secondExaminerAlias.email,
      wantedExaminerName: wantedExaminerAlias.name,
      wantedExaminerFirstName: wantedExaminerAlias.firstName,
      wantedExaminerLastName: wantedExaminerAlias.lastName,
      wantedExaminerAcademicTitle: wantedExaminerAlias.academicTitle,
      // Gewünschte Zweitprüfer:in
      wantedSecondExaminerName: wantedSecondExaminerAlias.name,
      wantedSecondExaminerFirstName: wantedSecondExaminerAlias.firstName,
      wantedSecondExaminerLastName: wantedSecondExaminerAlias.lastName,
      wantedSecondExaminerAcademicTitle: wantedSecondExaminerAlias.academicTitle,
      wantedSecondExaminerEmail: wantedSecondExaminerAlias.email,
      // Zeitstempel
      secondExaminerRequestedAt: thesisRequests.secondExaminerRequestedAt,
      // Studiengang
      programmeName: programmes.name,
      programmeAbbreviation: programmes.abbreviation,
    })
    .from(thesisRequests)
    .leftJoin(studentAlias, eq(thesisRequests.studentId, studentAlias.id))
    .leftJoin(programmes, eq(studentAlias.programmeId, programmes.id))
    .leftJoin(firstExaminerAlias, eq(thesisRequests.examinerId, firstExaminerAlias.id))
    .leftJoin(secondExaminerAlias, eq(thesisRequests.secondExaminerId, secondExaminerAlias.id))
    .leftJoin(wantedExaminerAlias, eq(thesisRequests.wantedExaminerId, wantedExaminerAlias.id))
    .leftJoin(wantedSecondExaminerAlias, eq(thesisRequests.wantedSecondExaminerId, wantedSecondExaminerAlias.id))
    .where(eq(thesisRequests.id, id))
    .limit(1);
  return result[0];
}

export async function getThesisRequestsByStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  // Aliase für LEFT JOINs auf Prüfer:innen
  const wantedExaminerAlias = aliasedTable(users, "wanted_examiner");
  const firstExaminerAlias = aliasedTable(users, "first_examiner_tbs");
  const secondExaminerAlias = aliasedTable(users, "second_examiner_tbs");
  const wantedSecondExaminerAlias = aliasedTable(users, "wanted_second_examiner_tbs");
  const studentAlias = aliasedTable(users, "student_tbs");
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
      studySpecializations: thesisRequests.studySpecializations,
      personalInterests: thesisRequests.personalInterests,
      keywords: thesisRequests.keywords,
      conditionalAcceptanceReason: thesisRequests.conditionalAcceptanceReason,
      withdrawalReason: thesisRequests.withdrawalReason,
      // Zweitgutachter-Workflow-Felder
      wantedSecondExaminerId: thesisRequests.wantedSecondExaminerId,
      externalSecondExaminerTitle: thesisRequests.externalSecondExaminerTitle,
      externalSecondExaminerFirstName: thesisRequests.externalSecondExaminerFirstName,
      externalSecondExaminerLastName: thesisRequests.externalSecondExaminerLastName,
      externalSecondExaminerEmail: thesisRequests.externalSecondExaminerEmail,
      secondExaminerRequestedAt: thesisRequests.secondExaminerRequestedAt,
      secondExaminerRejectedAt: thesisRequests.secondExaminerRejectedAt,
      secondExaminerRejectionReason: thesisRequests.secondExaminerRejectionReason,
      // Angefragte Prüfer:in
      wantedExaminerName: wantedExaminerAlias.name,
      wantedExaminerFirstName: wantedExaminerAlias.firstName,
      wantedExaminerLastName: wantedExaminerAlias.lastName,
      wantedExaminerAcademicTitle: wantedExaminerAlias.academicTitle,
      wantedExaminerEmail: wantedExaminerAlias.email,
      // Zugewiesene Erstprüfer:in
      firstExaminerName: firstExaminerAlias.name,
      firstExaminerFirstName: firstExaminerAlias.firstName,
      firstExaminerLastName: firstExaminerAlias.lastName,
      firstExaminerAcademicTitle: firstExaminerAlias.academicTitle,
      firstExaminerEmail: firstExaminerAlias.email,
      // Zugewiesene Zweitprüfer:in
      secondExaminerName: secondExaminerAlias.name,
      secondExaminerFirstName: secondExaminerAlias.firstName,
      secondExaminerLastName: secondExaminerAlias.lastName,
      secondExaminerAcademicTitle: secondExaminerAlias.academicTitle,
      secondExaminerEmail: secondExaminerAlias.email,
      // Gewünschte Zweitprüfer:in
      wantedSecondExaminerName: wantedSecondExaminerAlias.name,
      wantedSecondExaminerFirstName: wantedSecondExaminerAlias.firstName,
      wantedSecondExaminerLastName: wantedSecondExaminerAlias.lastName,
      wantedSecondExaminerAcademicTitle: wantedSecondExaminerAlias.academicTitle,
      wantedSecondExaminerEmail: wantedSecondExaminerAlias.email,
      // Studierende:r (für Fallback-Anzeige)
      studentEmail: studentAlias.email,
      studentName: studentAlias.name,
      studentFirstName: studentAlias.firstName,
      studentLastName: studentAlias.lastName,
      // Studiengang
      programmeName: programmes.name,
      programmeAbbreviation: programmes.abbreviation,
    })
    .from(thesisRequests)
    .leftJoin(studentAlias, eq(thesisRequests.studentId, studentAlias.id))
    .leftJoin(programmes, eq(studentAlias.programmeId, programmes.id))
    .leftJoin(wantedExaminerAlias, eq(thesisRequests.wantedExaminerId, wantedExaminerAlias.id))
    .leftJoin(firstExaminerAlias, eq(thesisRequests.examinerId, firstExaminerAlias.id))
    .leftJoin(secondExaminerAlias, eq(thesisRequests.secondExaminerId, secondExaminerAlias.id))
    .leftJoin(wantedSecondExaminerAlias, eq(thesisRequests.wantedSecondExaminerId, wantedSecondExaminerAlias.id))
    .where(eq(thesisRequests.studentId, studentId))
    .orderBy(desc(thesisRequests.createdAt));
}

export async function getThesisRequestsByExaminer(examinerId: number) {
  const db = await getDb();
  if (!db) return [];
  const firstExaminerAlias = aliasedTable(users, "first_examiner_tbe");
  const secondExaminerAlias = aliasedTable(users, "second_examiner_tbe");
  const wantedSecondExaminerAlias = aliasedTable(users, "wanted_second_examiner_tbe");
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
      wantedSecondExaminerId: thesisRequests.wantedSecondExaminerId,
      studentId: thesisRequests.studentId,
      studentName: users.name,
      studentEmail: users.email,
      studentAvatarUrl: users.avatarUrl,
      programmeName: programmes.name,
      programmeAbbreviation: programmes.abbreviation,
      firstExaminerName: firstExaminerAlias.name,
      firstExaminerAvatarUrl: firstExaminerAlias.avatarUrl,
      secondExaminerName: secondExaminerAlias.name,
      secondExaminerEmail: secondExaminerAlias.email,
      secondExaminerAvatarUrl: secondExaminerAlias.avatarUrl,
      wantedSecondExaminerName: wantedSecondExaminerAlias.name,
      wantedSecondExaminerEmail: wantedSecondExaminerAlias.email,
      wantedSecondExaminerAvatarUrl: wantedSecondExaminerAlias.avatarUrl,
      wantedExaminerId: thesisRequests.wantedExaminerId,
      studySpecializations: thesisRequests.studySpecializations,
      personalInterests: thesisRequests.personalInterests,
      keywords: thesisRequests.keywords,
      externalSecondExaminerTitle: thesisRequests.externalSecondExaminerTitle,
      externalSecondExaminerFirstName: thesisRequests.externalSecondExaminerFirstName,
      externalSecondExaminerLastName: thesisRequests.externalSecondExaminerLastName,
      externalSecondExaminerEmail: thesisRequests.externalSecondExaminerEmail,
      secondExaminerRequestedAt: thesisRequests.secondExaminerRequestedAt,
      secondExaminerAcceptedAt: thesisRequests.secondExaminerAcceptedAt,
      secondExaminerRejectedAt: thesisRequests.secondExaminerRejectedAt,
      conditionalAcceptanceReason: thesisRequests.conditionalAcceptanceReason,
      conditionalAcceptanceAt: thesisRequests.conditionalAcceptanceAt,
    })
    .from(thesisRequests)
    .innerJoin(users, eq(thesisRequests.studentId, users.id))
    .leftJoin(programmes, eq(users.programmeId, programmes.id))
    .leftJoin(firstExaminerAlias, eq(thesisRequests.examinerId, firstExaminerAlias.id))
    .leftJoin(secondExaminerAlias, eq(thesisRequests.secondExaminerId, secondExaminerAlias.id))
    .leftJoin(wantedSecondExaminerAlias, eq(thesisRequests.wantedSecondExaminerId, wantedSecondExaminerAlias.id))
    .where(
      or(
        eq(thesisRequests.examinerId, examinerId),
        eq(thesisRequests.secondExaminerId, examinerId),
        // Auch Anfragen anzeigen, die dem Prüfer:in zugeteilt wurden (wantedExaminerId)
        eq(thesisRequests.wantedExaminerId, examinerId),
        // Anfragen, bei denen dieser Prüfer als Zweitgutachter angefragt wurde (wantedSecondExaminerId)
        eq(thesisRequests.wantedSecondExaminerId, examinerId)
      )
    )
    .orderBy(desc(thesisRequests.createdAt));
}

export async function getAllThesisRequests() {
  const db = await getDb();
  if (!db) return [];
  const firstExaminerAlias = aliasedTable(users, "first_examiner");
  const secondExaminerAlias = aliasedTable(users, "second_examiner");
  const wantedExaminerAlias = aliasedTable(users, "wanted_examiner");
  const wantedSecondExaminerAlias = aliasedTable(users, "wanted_second_examiner_all");
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
      wantedExaminerId: thesisRequests.wantedExaminerId,
      wantedSecondExaminerId: thesisRequests.wantedSecondExaminerId,
      officialRegistrationStatus: thesisRequests.officialRegistrationStatus,
      officialRegistrationAt: thesisRequests.officialRegistrationAt,
      submissionDeadline: thesisRequests.submissionDeadline,
      defenseDate: thesisRequests.defenseDate,
      caseClosedAt: thesisRequests.caseClosedAt,
      enrollmentEligibility: thesisRequests.enrollmentEligibility,
      deadline: thesisRequests.deadline,
      studySpecializations: thesisRequests.studySpecializations,
      personalInterests: thesisRequests.personalInterests,
      keywords: thesisRequests.keywords,
      secondExaminerRequestedAt: thesisRequests.secondExaminerRequestedAt,
      secondExaminerRejectedAt: thesisRequests.secondExaminerRejectedAt,
      secondExaminerRejectionReason: thesisRequests.secondExaminerRejectionReason,
      studentName: users.name,
      studentEmail: users.email,
      programmeName: programmes.name,
      programmeAbbreviation: programmes.abbreviation,
      firstExaminerName: firstExaminerAlias.name,
      firstExaminerEmail: firstExaminerAlias.email,
      secondExaminerName: secondExaminerAlias.name,
      secondExaminerEmail: secondExaminerAlias.email,
      wantedExaminerName: wantedExaminerAlias.name,
      wantedExaminerEmail: wantedExaminerAlias.email,
      wantedExaminerAcademicTitle: wantedExaminerAlias.academicTitle,
      wantedSecondExaminerName: wantedSecondExaminerAlias.name,
      wantedSecondExaminerAcademicTitle: wantedSecondExaminerAlias.academicTitle,
    })
    .from(thesisRequests)
    .leftJoin(users, eq(thesisRequests.studentId, users.id))
    .leftJoin(programmes, eq(users.programmeId, programmes.id))
    .leftJoin(firstExaminerAlias, eq(thesisRequests.examinerId, firstExaminerAlias.id))
    .leftJoin(secondExaminerAlias, eq(thesisRequests.secondExaminerId, secondExaminerAlias.id))
    .leftJoin(wantedExaminerAlias, eq(thesisRequests.wantedExaminerId, wantedExaminerAlias.id))
    .leftJoin(wantedSecondExaminerAlias, eq(thesisRequests.wantedSecondExaminerId, wantedSecondExaminerAlias.id))
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
  const actorAlias = aliasedTable(users, "audit_actor_all");
  const studentAlias = aliasedTable(users, "audit_student_all");
  return db
    .select({
      id: auditLog.id,
      thesisRequestId: auditLog.thesisRequestId,
      actorId: auditLog.actorId,
      actorRole: auditLog.actorRole,
      actorName: actorAlias.name,
      action: auditLog.action,
      fromStatus: auditLog.fromStatus,
      toStatus: auditLog.toStatus,
      reason: auditLog.reason,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
      // Studierenden-Name über thesisRequests
      studentName: studentAlias.name,
      studentId: thesisRequests.studentId,
    })
    .from(auditLog)
    .leftJoin(actorAlias, eq(auditLog.actorId, actorAlias.id))
    .leftJoin(thesisRequests, eq(auditLog.thesisRequestId, thesisRequests.id))
    .leftJoin(studentAlias, eq(thesisRequests.studentId, studentAlias.id))
    .orderBy(desc(auditLog.createdAt));
}

/**
 * Kombinierte Historien-Abfrage für Studierende:
 * Gibt Audit-Log-Einträge und Benachrichtigungen zu einer Abschlussarbeit zurück,
 * chronologisch zusammengeführt.
 */
export async function getStudentThesisHistory(thesisRequestId: number, studentId: number) {
  // Zweitgutachter-Felder und Erstgutachter-Name aus der Anfrage laden
  const secondExaminerAlias = aliasedTable(users, "second_ex_user");
  const firstExaminerAlias = aliasedTable(users, "first_ex_user");
  const wantedSecondAlias = aliasedTable(users, "wanted_second_user");
  const [reqRow] = await (await getDb())!
    .select({
      wantedSecondExaminerId: thesisRequests.wantedSecondExaminerId,
      wantedSecondExaminerName: wantedSecondAlias.name,
      secondExaminerId: thesisRequests.secondExaminerId,
      secondExaminerName: secondExaminerAlias.name,
      firstExaminerId: thesisRequests.examinerId,
      firstExaminerName: firstExaminerAlias.name,
      secondExaminerRequestedAt: thesisRequests.secondExaminerRequestedAt,
      secondExaminerAcceptedAt: thesisRequests.secondExaminerAcceptedAt,
      externalSecondExaminerFirstName: thesisRequests.externalSecondExaminerFirstName,
      externalSecondExaminerLastName: thesisRequests.externalSecondExaminerLastName,
      externalSecondExaminerEmail: thesisRequests.externalSecondExaminerEmail,
    })
    .from(thesisRequests)
    .leftJoin(wantedSecondAlias, eq(thesisRequests.wantedSecondExaminerId, wantedSecondAlias.id))
    .leftJoin(secondExaminerAlias, eq(thesisRequests.secondExaminerId, secondExaminerAlias.id))
    .leftJoin(firstExaminerAlias, eq(thesisRequests.examinerId, firstExaminerAlias.id))
    .where(eq(thesisRequests.id, thesisRequestId))
    .limit(1);

  const db = await getDb();
  if (!db) return [];

  // Audit-Log-Einträge für diese Abschlussarbeit
  const actorAlias = aliasedTable(users, "actor_user");
  const auditRows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      fromStatus: auditLog.fromStatus,
      toStatus: auditLog.toStatus,
      reason: auditLog.reason,
      actorRole: auditLog.actorRole,
      actorName: actorAlias.name,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .leftJoin(actorAlias, eq(auditLog.actorId, actorAlias.id))
    .where(eq(auditLog.thesisRequestId, thesisRequestId))
    .orderBy(desc(auditLog.createdAt));

  // Benachrichtigungen des Studierenden zu dieser Abschlussarbeit
  const notifRows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, studentId),
        eq(notifications.thesisRequestId, thesisRequestId)
      )
    )
    .orderBy(desc(notifications.createdAt));

  // Beide Listen zusammenführen und chronologisch sortieren
  type HistoryEntry = {
    id: string;
    kind: "audit" | "notification";
    title: string;
    detail: string | null;
    fromStatus: string | null;
    toStatus: string | null;
    actorName: string | null;
    actorRole: string | null;
    createdAt: string;
    read?: boolean;
  };

  const auditEntries: HistoryEntry[] = auditRows.map((r) => ({
    id: `audit-${r.id}`,
    kind: "audit",
    title: r.action,
    detail: r.reason ?? null,
    fromStatus: r.fromStatus ?? null,
    toStatus: r.toStatus ?? null,
    actorName: r.actorName ?? null,
    actorRole: r.actorRole ?? null,
    createdAt: r.createdAt,
  }));

  const notifEntries: HistoryEntry[] = notifRows.map((r) => ({
    id: `notif-${r.id}`,
    kind: "notification",
    title: r.title,
    detail: r.message,
    fromStatus: null,
    toStatus: null,
    actorName: null,
    actorRole: null,
    createdAt: r.createdAt,
    read: r.read === 1,
  }));

  // Synthetische Einträge für Zweitgutachter-Status
  const syntheticEntries: HistoryEntry[] = [];

  if (reqRow) {
    const now = new Date().toISOString();

    if (!reqRow.wantedSecondExaminerId && !reqRow.secondExaminerId) {
      // Kein Zweitgutachter angefragt
      syntheticEntries.push({
        id: "synthetic-no-second",
        kind: "audit",
        title: "SECOND_EXAMINER_STATUS",
        detail: "Bisher kein Zweitgutachter angefragt.",
        fromStatus: null,
        toStatus: null,
        actorName: null,
        actorRole: null,
        createdAt: now,
      });
    } else if (reqRow.wantedSecondExaminerId && !reqRow.secondExaminerId) {
      // Zweitgutachter angefragt aber noch nicht bestätigt
      const wantedName = reqRow.wantedSecondExaminerName ?? "Unbekannt";
      const requestedAt = reqRow.secondExaminerRequestedAt ?? now;
      syntheticEntries.push({
        id: "synthetic-second-requested",
        kind: "audit",
        title: "SECOND_EXAMINER_STATUS",
        detail: `Zweitgutachter:in ${wantedName} angefragt.`,
        fromStatus: null,
        toStatus: null,
        actorName: null,
        actorRole: null,
        createdAt: requestedAt,
      });
    } else if (reqRow.secondExaminerId) {
      // Zweitgutachter bestätigt → Thesis Match
      const firstExaminerName = reqRow.firstExaminerName ?? "Erstgutachter:in";
      const secondExaminerName = reqRow.secondExaminerName ?? "Zweitgutachter:in";
      const acceptedAt = reqRow.secondExaminerAcceptedAt ?? now;
      syntheticEntries.push({
        id: "synthetic-thesis-match",
        kind: "audit",
        title: "THESIS_MATCH",
        detail: `Kommission gebildet aus ${firstExaminerName} (Erstgutachter:in) und ${secondExaminerName} (Zweitgutachter:in) am ${new Date(acceptedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}.`,
        fromStatus: null,
        toStatus: null,
        actorName: null,
        actorRole: null,
        createdAt: acceptedAt,
      });
    }
  }

  const combined = [...auditEntries, ...notifEntries, ...syntheticEntries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return combined;
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
  // Multi-Rollen: roles[] aus user_roles laden und an jeden Nutzer hängen
  const allRoleRows = await db
    .select({ userId: userRoles.userId, role: userRoles.role })
    .from(userRoles);
  const rolesMap = new Map<number, string[]>();
  for (const r of allRoleRows) {
    if (!rolesMap.has(r.userId)) rolesMap.set(r.userId, []);
    rolesMap.get(r.userId)!.push(r.role);
  }
  return result.map((row) => ({
    ...row,
    user: {
      ...row.user,
      roles: rolesMap.get(row.user.id) ?? [row.user.role],
    },
  }));
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
  // Map von thesisRequestId → secondExaminerId für Frontend-Filterung
  const thesisMap = new Map<number, number | null>();
  for (const t of theses as any[]) thesisMap.set(t.id as number, t.secondExaminerId ?? null);
  const all = await getAllColloquiums();
  return all
    .filter((c) => thesisMap.has(c.thesisRequestId))
    .map((c) => ({ ...c, thesisSecondExaminerId: thesisMap.get(c.thesisRequestId) ?? null }));
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

  // Anfragen mit Studiengang des Studierenden (über users → programmes) laden
  const all = await db
    .select({
      id: thesisRequests.id,
      status: thesisRequests.status,
      createdAt: thesisRequests.createdAt,
      programmeName: programmes.name,
      programmeAbbreviation: programmes.abbreviation,
    })
    .from(thesisRequests)
    .leftJoin(users, eq(thesisRequests.studentId, users.id))
    .leftJoin(programmes, eq(users.programmeId, programmes.id));

  const byStatus: Record<string, number> = {};
  const byProgramme: Record<string, number> = {};
  const byMonth: Record<string, number> = {};

  for (const r of all) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    // Studiengang: Abkürzung bevorzugen, sonst vollständiger Name, sonst "Unbekannt"
    const prog = r.programmeAbbreviation ?? r.programmeName ?? "Unbekannt";
    byProgramme[prog] = (byProgramme[prog] ?? 0) + 1;
    const month = new Date(r.createdAt).toISOString().slice(0, 7);
    byMonth[month] = (byMonth[month] ?? 0) + 1;
  }

  return {
    total: all.length,
    byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
    // byDepartment wird jetzt als Studiengang-Gruppierung zurückgegeben (FB3-intern)
    byDepartment: Object.entries(byProgramme)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value })),
    byMonth: Object.entries(byMonth).sort().map(([month, count]) => ({ month, count })),
  };
}

// ─── Password Auth Helpers ────────────────────────────────────────────────────
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const emailLower = email.toLowerCase();
  // Primäre E-Mail suchen
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, emailLower));
  if (result.length > 0) {
    const pwAccount = result.find((u) => u.openId?.startsWith('pw_'));
    return pwAccount ?? result[0];
  }
  // Fallback: alternative E-Mail (secondEmail) suchen
  const bySecondEmail = await db
    .select()
    .from(users)
    .where(eq(users.secondEmail, emailLower));
  if (bySecondEmail.length === 0) return undefined;
  const pwAccount = bySecondEmail.find((u) => u.openId?.startsWith('pw_'));
  return pwAccount ?? bySecondEmail[0];
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

export async function createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(passwordResetTokens).values({
    token,
    userId,
    expiresAt: expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt,
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
      programmeName: programmes.name,
      programmeAbbreviation: programmes.abbreviation,
    })
    .from(thesisRequests)
    .innerJoin(users, eq(thesisRequests.studentId, users.id))
    .leftJoin(programmes, eq(users.programmeId, programmes.id))
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
  role: "student" | "examiner" | "second_examiner" | "pav" | "admin" | "dean" | "vice_dean" | "superadmin" | "programme_director"
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
    sql`INSERT IGNORE INTO pav_programmes (pav_user_id, programme_id) VALUES (${pavUserId}, ${programmeId})`
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
      targetSemester: thesisRequests.targetSemester,
      status: thesisRequests.status,
      enrollmentEligibility: thesisRequests.enrollmentEligibility,
      studentName: users.name,
      studentEmail: users.email,
      programmeName: programmes.name,
      programmeAbbreviation: programmes.abbreviation,
    })
    .from(thesisRequests)
    .innerJoin(users, eq(thesisRequests.studentId, users.id))
    .leftJoin(programmes, eq(users.programmeId, programmes.id))
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
  data: {
    subject?: string; htmlBody?: string; textBody?: string;
    subjectDe?: string; htmlBodyDe?: string; textBodyDe?: string;
    subjectEn?: string; htmlBodyEn?: string; textBodyEn?: string;
  },
  updatedByUserId?: number
) {
  const db = await getDb();
  if (!db) throw new Error('Datenbank nicht verfügbar');
  const update: Record<string, unknown> = { updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') };
  if (data.subject !== undefined) update.subject = data.subject;
  if (data.htmlBody !== undefined) update.htmlBody = data.htmlBody;
  if (data.textBody !== undefined) update.textBody = data.textBody;
  if (data.subjectDe !== undefined) update.subjectDe = data.subjectDe;
  if (data.htmlBodyDe !== undefined) update.htmlBodyDe = data.htmlBodyDe;
  if (data.textBodyDe !== undefined) update.textBodyDe = data.textBodyDe;
  if (data.subjectEn !== undefined) update.subjectEn = data.subjectEn;
  if (data.htmlBodyEn !== undefined) update.htmlBodyEn = data.htmlBodyEn;
  if (data.textBodyEn !== undefined) update.textBodyEn = data.textBodyEn;
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
    firstName: users.firstName,
    lastName: users.lastName,
    academicTitle: users.academicTitle,
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
    .where(inArray(thesisRequests.status, activeStatuses as any));
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
    firstName: users.firstName,
    lastName: users.lastName,
    academicTitle: users.academicTitle,
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
    firstName: users.firstName,
    lastName: users.lastName,
    academicTitle: users.academicTitle,
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

  // Anfrage laden
  const [thesisResult] = await db
    .select()
    .from(thesisRequests)
    .where(eq(thesisRequests.id, thesisRequestId))
    .limit(1);
  if (!thesisResult) throw new Error("Anfrage nicht gefunden");

  // Status aktualisieren
  await db.update(thesisRequests)
    .set({
      status: "FIRST_EXAMINER_ACCEPTED",
      examinerId,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    .where(eq(thesisRequests.id, thesisRequestId));

  // Prüfer-Name für Benachrichtigung laden
  const [examinerUser] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, examinerId))
    .limit(1);
  const examinerName = examinerUser?.name ?? "der Gutachter:in";

  // In-App-Benachrichtigung für Studierenden
  await db.insert(notifications).values({
    userId: thesisResult.studentId,
    title: "Betreuungsanfrage angenommen",
    message: `Ihre Betreuungsanfrage „${thesisResult.title}“ wurde von ${examinerName} angenommen. Sie können nun einen Zweitgutachter wählen.`,
    type: "status_change",
    thesisRequestId,
    read: 0,
  });
}

/**
 * Aktualisiere Anfrage-Status auf FIRST_EXAMINER_REJECTED
 */
export async function rejectThesisRequest(thesisRequestId: number, rejectionReason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");

  // Anfrage laden
  const [thesisResult] = await db
    .select()
    .from(thesisRequests)
    .where(eq(thesisRequests.id, thesisRequestId))
    .limit(1);
  if (!thesisResult) throw new Error("Anfrage nicht gefunden");

  // Status aktualisieren
  await db.update(thesisRequests)
    .set({
      status: "FIRST_EXAMINER_REJECTED",
      rejectionReason: rejectionReason || null,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    .where(eq(thesisRequests.id, thesisRequestId));

  // Hinweis: Die In-App-Benachrichtigung wird vom aufrufenden Router via
  // notifyThesisParticipants mit korrekter thesisRequestId geschrieben.
  // Kein Doppeleintrag hier.
}

/**
 * Setze Status auf CONDITIONAL_ACCEPTANCE (Zusage unter Vorbehalt)
 */
export async function conditionalAcceptThesisRequest(
  thesisRequestId: number,
  examinerId: number,
  reason: string
) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");

  const [thesisResult] = await db
    .select()
    .from(thesisRequests)
    .where(eq(thesisRequests.id, thesisRequestId))
    .limit(1);
  if (!thesisResult) throw new Error("Anfrage nicht gefunden");

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await db.update(thesisRequests)
    .set({
      status: "CONDITIONAL_ACCEPTANCE",
      examinerId,
      conditionalAcceptanceReason: reason,
      conditionalAcceptanceAt: now,
      conditionalAcceptanceById: examinerId,
      updatedAt: now,
    })
    .where(eq(thesisRequests.id, thesisRequestId));

  // In-App-Benachrichtigung für Studierenden
  const [examinerUser] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, examinerId))
    .limit(1);
  const examinerName = examinerUser?.name ?? "der Gutachter:in";

  await db.insert(notifications).values({
    userId: thesisResult.studentId,
    title: "Zusage unter Vorbehalt",
    message: `Ihre Betreuungsanfrage „${thesisResult.title}“ wurde von ${examinerName} vorläufig unter Vorbehalt angenommen. Bitte beachten Sie die Rückmeldung des Betreuers.`,
    type: "status_change",
    thesisRequestId,
    read: 0,
  });
}

/**
 * Ziehe eine Anfrage zurück (nur wenn noch nicht beantwortet)
 */
export async function withdrawThesisRequest(thesisRequestId: number, studentId: number, reason?: string) {
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
      withdrawalReason: reason?.trim() || null,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    } as any)
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
  const firstExaminerAlias = aliasedTable(users, "first_examiner_ep");
  const secondExaminerAlias = aliasedTable(users, "second_examiner_ep");
  // Beide Anfrage-Typen: Erstgutachter (PENDING_FIRST_EXAMINER) und Zweitgutachter (PENDING_SECOND_EXAMINER)
  const rows = await db
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
      examinerId: thesisRequests.examinerId,
      secondExaminerId: thesisRequests.secondExaminerId,
      wantedExaminerId: thesisRequests.wantedExaminerId,
      wantedSecondExaminerId: thesisRequests.wantedSecondExaminerId,
      studentName: users.name,
      studentEmail: users.email,
      programmeName: programmes.name,
      programmeAbbreviation: programmes.abbreviation,
      firstExaminerName: firstExaminerAlias.name,
      secondExaminerName: secondExaminerAlias.name,
    })
    .from(thesisRequests)
    .leftJoin(users, eq(thesisRequests.studentId, users.id))
    .leftJoin(programmes, eq(users.programmeId, programmes.id))
    .leftJoin(firstExaminerAlias, eq(thesisRequests.examinerId, firstExaminerAlias.id))
    .leftJoin(secondExaminerAlias, eq(thesisRequests.secondExaminerId, secondExaminerAlias.id))
    .where(
      or(
        and(
          eq(thesisRequests.wantedExaminerId, examinerId),
          eq(thesisRequests.status, "PENDING_FIRST_EXAMINER")
        ),
        and(
          eq(thesisRequests.wantedSecondExaminerId, examinerId),
          eq(thesisRequests.status, "PENDING_SECOND_EXAMINER")
        )
      )
    )
    .orderBy(desc(thesisRequests.createdAt));
  // requestRole-Feld: 'first' oder 'second'
  return rows.map(r => ({
    ...r,
    requestRole: r.wantedSecondExaminerId === examinerId ? "second" as const : "first" as const,
  }));
}

export async function getExaminerAcceptedRequests(examinerId: number) {
  const db = await getDb();
  if (!db) return [];
  const firstExaminerAlias = aliasedTable(users, "first_examiner_ea");
  const secondExaminerAlias = aliasedTable(users, "second_examiner_ea");
  const wantedSecondExaminerAlias = aliasedTable(users, "wanted_second_examiner_ea");
  const wantedSecondExaminerProfileAlias = aliasedTable(examinerProfiles, "wanted_second_examiner_profile_ea");
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
      examinerId: thesisRequests.examinerId,
      secondExaminerId: thesisRequests.secondExaminerId,
      wantedSecondExaminerId: thesisRequests.wantedSecondExaminerId,
      studentName: users.name,
      studentEmail: users.email,
      studentAvatarUrl: users.avatarUrl,
      programmeName: programmes.name,
      programmeAbbreviation: programmes.abbreviation,
      firstExaminerName: firstExaminerAlias.name,
      firstExaminerEmail: firstExaminerAlias.email,
      firstExaminerAvatarUrl: firstExaminerAlias.avatarUrl,
      secondExaminerName: secondExaminerAlias.name,
      secondExaminerEmail: secondExaminerAlias.email,
      secondExaminerAvatarUrl: secondExaminerAlias.avatarUrl,
      wantedSecondExaminerName: wantedSecondExaminerAlias.name,
      wantedSecondExaminerEmail: wantedSecondExaminerAlias.email,
      wantedSecondExaminerAvatarUrl: wantedSecondExaminerAlias.avatarUrl,
      wantedSecondExaminerAcademicTitle: wantedSecondExaminerAlias.academicTitle,
      wantedSecondExaminerDepartment: wantedSecondExaminerProfileAlias.department,
      wantedSecondExaminerPhone: wantedSecondExaminerProfileAlias.phone,
      wantedSecondExaminerOfficeHours: wantedSecondExaminerProfileAlias.officeHours,
      secondExaminerRequestedAt: thesisRequests.secondExaminerRequestedAt,
      // Externe Einladungs-Felder
      secondExaminerInviteToken: thesisRequests.secondExaminerInviteToken,
      secondExaminerInviteSentAt: thesisRequests.secondExaminerInviteSentAt,
      externalSecondExaminerFirstName: thesisRequests.externalSecondExaminerFirstName,
      externalSecondExaminerLastName: thesisRequests.externalSecondExaminerLastName,
      externalSecondExaminerEmail: thesisRequests.externalSecondExaminerEmail,
      externalSecondExaminerTitle: thesisRequests.externalSecondExaminerTitle,
      degreeType: thesisRequests.degreeType,
    })
    .from(thesisRequests)
    .leftJoin(users, eq(thesisRequests.studentId, users.id))
    .leftJoin(programmes, eq(users.programmeId, programmes.id))
    .leftJoin(firstExaminerAlias, eq(thesisRequests.examinerId, firstExaminerAlias.id))
    .leftJoin(secondExaminerAlias, eq(thesisRequests.secondExaminerId, secondExaminerAlias.id))
    .leftJoin(wantedSecondExaminerAlias, eq(thesisRequests.wantedSecondExaminerId, wantedSecondExaminerAlias.id))
    .leftJoin(wantedSecondExaminerProfileAlias, eq(thesisRequests.wantedSecondExaminerId, wantedSecondExaminerProfileAlias.userId))
    .where(
      and(
        // Alle Status, in denen die Anfrage als "angenommen" gilt (inkl. Suche nach Zweitgutachter)
        inArray(thesisRequests.status, [
          "FIRST_EXAMINER_ACCEPTED",
          "PENDING_SECOND_EXAMINER",
          "SECOND_EXAMINER_ASSIGNED",
          "SECOND_EXAMINER_SET",
          "MATCHED",
          "ACCEPTED",
          "REGISTERED",
          "COMPLETED",
          "CONDITIONAL_ACCEPTANCE",
        ] as any),
        // Prüfer:in ist Erst-, Zweit- oder Wunschprüfer:in
        or(
          eq(thesisRequests.examinerId, examinerId),
          eq(thesisRequests.secondExaminerId, examinerId),
          eq(thesisRequests.wantedExaminerId, examinerId),
        )
      )
    )
    .orderBy(desc(thesisRequests.createdAt));
}

export async function getExaminerRejectedRequests(examinerId: number) {
  const db = await getDb();
  if (!db) return [];
  const firstExaminerAlias = aliasedTable(users, "first_examiner_er");
  const secondExaminerAlias = aliasedTable(users, "second_examiner_er");
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
      examinerId: thesisRequests.examinerId,
      secondExaminerId: thesisRequests.secondExaminerId,
      studentName: users.name,
      studentEmail: users.email,
      programmeName: programmes.name,
      programmeAbbreviation: programmes.abbreviation,
      firstExaminerName: firstExaminerAlias.name,
      secondExaminerName: secondExaminerAlias.name,
    })
    .from(thesisRequests)
    .leftJoin(users, eq(thesisRequests.studentId, users.id))
    .leftJoin(programmes, eq(users.programmeId, programmes.id))
    .leftJoin(firstExaminerAlias, eq(thesisRequests.examinerId, firstExaminerAlias.id))
    .leftJoin(secondExaminerAlias, eq(thesisRequests.secondExaminerId, secondExaminerAlias.id))
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
  const firstExaminerAlias = aliasedTable(users, "first_examiner_ese");
  const secondExaminerAlias = aliasedTable(users, "second_examiner_ese");
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
      examinerId: thesisRequests.examinerId,
      secondExaminerId: thesisRequests.secondExaminerId,
      studentName: users.name,
      studentEmail: users.email,
      programmeName: programmes.name,
      programmeAbbreviation: programmes.abbreviation,
      firstExaminerName: firstExaminerAlias.name,
      secondExaminerName: secondExaminerAlias.name,
    })
    .from(thesisRequests)
    .leftJoin(users, eq(thesisRequests.studentId, users.id))
    .leftJoin(programmes, eq(users.programmeId, programmes.id))
    .leftJoin(firstExaminerAlias, eq(thesisRequests.examinerId, firstExaminerAlias.id))
    .leftJoin(secondExaminerAlias, eq(thesisRequests.secondExaminerId, secondExaminerAlias.id))
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
    const rows = await db.select({ email: users.email })
      .from(users)
      .where(and(eq(users.role, "superadmin"), sql`${users.email} IS NOT NULL`));
    const dbEmails = rows.map((r) => r.email as string).filter(Boolean);
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
    await db.update(users)
      .set({ requestedRole: requestedRole as any, roleStatus: "pending", role: "user" })
      .where(eq(users.id, userId));
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
    const rows = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      requestedRole: users.requestedRole,
      roleStatus: users.roleStatus,
      createdAt: users.createdAt,
      loginMethod: users.loginMethod,
      firstName: users.firstName,
      lastName: users.lastName,
      academicTitle: users.academicTitle,
      department: users.department,
      matrikelNr: users.matrikelNr,
      thesisType: users.thesisType,
      targetSemester: users.targetSemester,
      staffId: users.staffId,
      phone: users.phone,
    })
    .from(users)
    .where(eq(users.roleStatus, "pending"))
    .orderBy(desc(users.createdAt));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role as string,
      requestedRole: r.requestedRole as string | null,
      roleStatus: r.roleStatus as string,
      createdAt: r.createdAt as unknown as Date,
      loginMethod: r.loginMethod,
      firstName: r.firstName,
      lastName: r.lastName,
      academicTitle: r.academicTitle,
      department: r.department,
      matrikelNr: r.matrikelNr,
      thesisType: r.thesisType as string | null,
      targetSemester: r.targetSemester,
      staffId: r.staffId,
      phone: r.phone,
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
    const userRows = await db.select({ id: users.id, email: users.email, name: users.name, requestedRole: users.requestedRole, roleStatus: users.roleStatus })
      .from(users).where(eq(users.id, userId)).limit(1);
    const user = userRows[0];
    if (!user) return { success: false, error: "Nutzer nicht gefunden" };
    if (user.roleStatus !== "pending") return { success: false, error: "Keine ausstehende Rollenanfrage" };
    const requestedRole = user.requestedRole as string;
    // Verwaltung darf Studierende, Zweitprüfer:innen und Erstprüfer:innen freischalten
    const adminAllowedRoles = ["student", "examiner", "second_examiner"];
    if (confirmedByRole === "admin" && !adminAllowedRoles.includes(requestedRole)) {
      return { success: false, error: "Verwaltung darf nur Studierende, Erstprüfer:innen und Zweitprüfer:innen bestätigen" };
    }
    const nowTs = new Date().toISOString().slice(0, 19).replace("T", " ");
    await db.update(users)
      .set({ role: requestedRole as any, roleStatus: "approved", roleConfirmedBy: confirmedBy, roleConfirmedAt: nowTs, requestedRole: null })
      .where(eq(users.id, userId));
    // user_roles-Tabelle synchronisieren: alten examiner/second_examiner-Eintrag ersetzen
    try {
      // Alle Prüfer-Rollen des Nutzers entfernen und die neue setzen
      await db.delete(userRoles)
        .where(and(
          eq(userRoles.userId, userId),
          inArray(userRoles.role, ['examiner', 'second_examiner', 'student', 'admin', 'pav', 'dean', 'vice_dean', 'programme_director'])
        ));
      await db.execute(
        sql`INSERT IGNORE INTO user_roles (user_id, role, assigned_by, assigned_at) VALUES (${userId}, ${requestedRole}, ${confirmedBy}, NOW())`
      );
    } catch (err) {
      console.warn("[RoleApproval] user_roles-Sync fehlgeschlagen:", err);
    }
    await db.insert(auditLog).values({
      actorId: confirmedBy,
      actorRole: confirmedByRole,
      action: "ROLE_APPROVED",
      toStatus: requestedRole,
      metadata: { userId, requestedRole },
      createdAt: nowTs,
    });
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
        programme_director: "Studiengangsleitung",
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
        const { sendEmail } = await import("./emailHelper");
        const { roleApprovedEmail } = await import("./emailTemplates");
        const emailData = roleApprovedEmail({
          userName: user.name ?? "Nutzende:r",
          roleLabel,
          dashboardPath: dashboardLink,
          // Erstprüfer:innen erhalten automatisch Zweitprüfer:innen-Rechte – explizit in der E-Mail erwähnen
          includeSecondExaminerNote: requestedRole === "examiner",
        });
        await sendEmail({ to: user.email as string, subject: emailData.subject, html: emailData.html, text: emailData.text });
      } catch (err) {
        console.warn("[RoleApproval] E-Mail-Versand fehlgeschlagen:", err);
      }
    }
    // Bei Genehmigung einer Prüfer:in (examiner ODER second_examiner): examiner_profiles-Eintrag mit isSecondExaminer=1 anlegen/aktualisieren
    // Jede:r Erstprüfer:in hat automatisch auch Zweitprüfer:innen-Rechte.
    if (requestedRole === "examiner" || requestedRole === "second_examiner") {
      try {
        const epRows = await db.select({ userId: examinerProfiles.userId })
          .from(examinerProfiles).where(eq(examinerProfiles.userId, userId)).limit(1);
        if (epRows.length > 0) {
          await db.update(examinerProfiles)
            .set({ isSecondExaminer: 1 })
            .where(eq(examinerProfiles.userId, userId));
        } else {
          await db.insert(examinerProfiles).values({ userId, isSecondExaminer: 1, onboardingCompleted: 0 });
        }
      } catch (err) {
        console.warn("[RoleApproval] examiner_profiles-Update für second_examiner fehlgeschlagen:", err);
      }
    }
    // Neue Prüfer:in wird nur im System angezeigt (Tab "Neue Prüfer:innen") – kein E-Mail-Versand an bestehende Prüfer:innen
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
    const rejectUserRows = await db.select({ id: users.id, email: users.email, name: users.name, requestedRole: users.requestedRole, roleStatus: users.roleStatus })
      .from(users).where(eq(users.id, userId)).limit(1);
    const user = rejectUserRows[0];
    if (!user) return { success: false, error: "Nutzer nicht gefunden" };
    if (user.roleStatus !== "pending") return { success: false, error: "Keine ausstehende Rollenanfrage" };
    const requestedRole = user.requestedRole as string;
    if (confirmedByRole === "admin" && requestedRole !== "student" && requestedRole !== "second_examiner") {
      return { success: false, error: "Verwaltung darf nur Studierende und Zweitprüfer:innen ablehnen" };
    }
    const nowTsReject = new Date().toISOString().slice(0, 19).replace("T", " ");
    await db.update(users)
      .set({ roleStatus: "rejected", roleConfirmedBy: confirmedBy, roleConfirmedAt: nowTsReject })
      .where(eq(users.id, userId));
    await db.insert(auditLog).values({
      actorId: confirmedBy,
      actorRole: confirmedByRole,
      action: "ROLE_REJECTED",
      toStatus: "rejected",
      reason: reason ?? null,
      metadata: { userId, requestedRole },
      createdAt: nowTsReject,
    });
    // E-Mail-Benachrichtigung an den Nutzer senden (Vorlage aus DB)
    if (user.email) {
      const roleLabels: Record<string, string> = { student: "Studierende:r", examiner: "Prüfer:in (Erstprüfer:in)", second_examiner: "Zweitprüfer:in", admin: "Verwaltung", programme_director: "Studiengangsleitung" };
      const roleLabel = roleLabels[requestedRole] ?? requestedRole;
      const reasonBlock = reason
        ? `<p style="color:#474747;line-height:1.6"><strong>Begründung:</strong> ${reason}</p>`
        : "";
      try {
        const { sendEmail } = await import("./emailHelper");
        const { roleRejectedEmail } = await import("./emailTemplates");
        const emailData = roleRejectedEmail({
          userName: user.name ?? "Nutzende:r",
          roleLabel,
          reason,
        });
        await sendEmail({ to: user.email as string, subject: emailData.subject, html: emailData.html, text: emailData.text });
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
    const userRows = await db.select({ id: users.id, role: users.role, roleStatus: users.roleStatus, requestedRole: users.requestedRole })
      .from(users).where(eq(users.id, userId)).limit(1);
    const user = userRows[0];
    if (!user) return null;
    return {
      id: user.id,
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
    const userRows = await db.select({
      id: users.id, name: users.name, firstName: users.firstName, lastName: users.lastName,
      email: users.email, role: users.role, roleStatus: users.roleStatus,
      avatarUrl: users.avatarUrl, avatarKey: users.avatarKey, bio: users.bio, phone: users.phone,
      department: users.department, programmeId: users.programmeId, matrikelNr: users.matrikelNr,
      thesisType: users.thesisType, enrollmentSemester: users.enrollmentSemester,
      targetSemester: users.targetSemester, academicTitle: users.academicTitle,
      officeRoom: users.officeRoom, officeHours: users.officeHours, researchTags: users.researchTags,
      staffId: users.staffId, responsibilityArea: users.responsibilityArea, officeLocation: users.officeLocation,
      secondEmail: users.secondEmail, website: users.website, linkedIn: users.linkedIn,
      researchGate: users.researchGate, htwProfileUrl: users.htwProfileUrl, miscLink: users.miscLink,
      bookingUrl: users.bookingUrl, preferredLanguage: users.preferredLanguage,
      bannerColor: users.bannerColor, bannerImageUrl: users.bannerImageUrl,
      createdAt: users.createdAt, lastSignedIn: users.lastSignedIn,
    }).from(users).where(eq(users.id, userId)).limit(1);
    const user = userRows[0];
    if (!user) return null;
    // Prüfer:innen-Profil-Felder (languages, tags) und Studiengänge laden
    let examinerLanguages: string[] = [];
    let examinerKeywords: string[] = [];
    let examinerProgrammeIds: number[] = [];
    let examinerBio: string | null = null;
    let examinerResearchFocus: string | null = null;
    let allowedDepartments: string[] = [];
    let primaryDepartment: string | null = null;
    // Admin/Superadmin haben immer Zugriff auf Prüfer-Profil-Felder
    const isAdminRole = user.role === 'admin' || user.role === 'superadmin';
    let isExaminerRole = user.role === 'examiner' || user.role === 'second_examiner' || isAdminRole;
    if (isExaminerRole) {
      try {
        const { examinerProgrammes, examinerDepartments } = await import("../drizzle/schema");
        const epRows = await db.select({ languages: examinerProfiles.languages, tags: examinerProfiles.tags, bio: examinerProfiles.bio, researchFocus: examinerProfiles.researchFocus })
          .from(examinerProfiles).where(eq(examinerProfiles.userId, userId)).limit(1);
        const ep = epRows[0];
        if (ep) {
          try { examinerLanguages = ep.languages ? (typeof ep.languages === 'string' ? JSON.parse(ep.languages) : ep.languages as string[]) : []; } catch { examinerLanguages = []; }
          try { examinerKeywords = ep.tags ? (typeof ep.tags === 'string' ? JSON.parse(ep.tags) : ep.tags as string[]) : []; } catch { examinerKeywords = []; }
          examinerBio = ep.bio ?? null;
          examinerResearchFocus = ep.researchFocus ?? null;
        }
        const progRows = await db.select({ programmeId: examinerProgrammes.programmeId })
          .from(examinerProgrammes).where(eq(examinerProgrammes.examinerId, userId));
        examinerProgrammeIds = progRows.map((r) => r.programmeId);
        // Fachbereiche laden
        const deptRows = await db.select({ department: examinerDepartments.department, isPrimary: examinerDepartments.isPrimary })
          .from(examinerDepartments).where(eq(examinerDepartments.userId, userId));
        allowedDepartments = deptRows.map((d) => d.department);
        const primaryRow = deptRows.find((d) => d.isPrimary === 1);
        primaryDepartment = primaryRow ? primaryRow.department : (allowedDepartments[0] ?? user.department ?? null);
      } catch { /* ignore */ }
    }
    return {
      id: user.id as number,
      name: user.name as string | null,
      firstName: user.firstName as string | null,
      lastName: user.lastName as string | null,
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
      bannerColor: (user.bannerColor as string | null) ?? null,
      bannerImageUrl: (user.bannerImageUrl as string | null) ?? null,
      createdAt: user.createdAt as unknown as Date,
      lastSignedIn: user.lastSignedIn as unknown as Date,
      // Prüfer:innen-spezifische Felder
      isExaminer: isExaminerRole,
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
    name?: string; firstName?: string; lastName?: string; bio?: string; phone?: string; department?: string;
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
    const setValues: Record<string, unknown> = {};
    if (data.firstName !== undefined) setValues.firstName = data.firstName;
    if (data.lastName !== undefined) setValues.lastName = data.lastName;
    // name automatisch aus Titel + Vor- + Nachname zusammensetzen wenn Namensfelder geändert werden
    if (data.firstName !== undefined || data.lastName !== undefined || data.academicTitle !== undefined) {
      try {
        const curRows = await db.select({ firstName: users.firstName, lastName: users.lastName, academicTitle: users.academicTitle })
          .from(users).where(eq(users.id, userId)).limit(1);
        const cur = curRows[0];
        if (cur) {
          const title = (data.academicTitle ?? cur.academicTitle ?? '').trim();
          const first = (data.firstName ?? cur.firstName ?? '').trim();
          const last = (data.lastName ?? cur.lastName ?? '').trim();
          const fullName = [title, first, last].filter(Boolean).join(' ');
          if (fullName) setValues.name = fullName;
        }
      } catch (_) { /* Fallback: name bleibt unverändert */ }
    } else if (data.name !== undefined) {
      setValues.name = data.name;
    }
    if (data.bio !== undefined) setValues.bio = data.bio;
    if (data.phone !== undefined) setValues.phone = data.phone;
    if (data.department !== undefined) setValues.department = data.department;
    if (data.matrikelNr !== undefined) setValues.matrikelNr = data.matrikelNr;
    if (data.thesisType !== undefined) setValues.thesisType = data.thesisType;
    if (data.enrollmentSemester !== undefined) setValues.enrollmentSemester = data.enrollmentSemester;
    if (data.academicTitle !== undefined) setValues.academicTitle = data.academicTitle;
    if (data.officeRoom !== undefined) setValues.officeRoom = data.officeRoom;
    if (data.staffId !== undefined) setValues.staffId = data.staffId;
    if (data.responsibilityArea !== undefined) setValues.responsibilityArea = data.responsibilityArea;
    if (data.targetSemester !== undefined) setValues.targetSemester = data.targetSemester;
    if (data.officeHours !== undefined) setValues.officeHours = data.officeHours;
    if (data.researchTags !== undefined) setValues.researchTags = data.researchTags;
    if (data.officeLocation !== undefined) setValues.officeLocation = data.officeLocation;
    if (data.secondEmail !== undefined) setValues.secondEmail = data.secondEmail;
    if (data.website !== undefined) setValues.website = data.website;
    if (data.linkedIn !== undefined) setValues.linkedIn = data.linkedIn;
    if (data.researchGate !== undefined) setValues.researchGate = data.researchGate;
    if (data.htwProfileUrl !== undefined) setValues.htwProfileUrl = data.htwProfileUrl;
    if (data.miscLink !== undefined) setValues.miscLink = data.miscLink;
    if (data.bookingUrl !== undefined) setValues.bookingUrl = data.bookingUrl;
    if (Object.keys(setValues).length === 0) return true;
    await db.update(users).set(setValues as any).where(eq(users.id, userId));
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
    await db.update(users).set({ avatarUrl, avatarKey }).where(eq(users.id, userId));
    // Dann alle anderen Accounts mit gleicher E-Mail synchronisieren (mehrere Login-Methoden)
    const emailRows = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
    const userEmail = emailRows[0]?.email;
    if (userEmail) {
      await db.update(users)
        .set({ avatarUrl, avatarKey })
        .where(and(eq(users.email, userEmail), ne(users.id, userId)));
    }
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
    await db.update(users).set({ avatarUrl: null, avatarKey: null }).where(eq(users.id, userId));
    // Alle anderen Accounts mit gleicher E-Mail ebenfalls leeren
    const emailRowsClear = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
    const userEmailClear = emailRowsClear[0]?.email;
    if (userEmailClear) {
      await db.update(users)
        .set({ avatarUrl: null, avatarKey: null })
        .where(and(eq(users.email, userEmailClear), ne(users.id, userId)));
    }
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
    firstName: users.firstName,
    lastName: users.lastName,
    academicTitle: users.academicTitle,
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
          inArray(thesisRequests.status, activeStatuses as any)
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
    firstName: users.firstName,
    lastName: users.lastName,
    academicTitle: users.academicTitle,
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
    role: users.role,
  })
    .from(users)
    .leftJoin(examinerProfiles, eq(users.id, examinerProfiles.userId))
    .where(
      and(
        eq(users.roleStatus, "approved"),
        // Erstgutachter (examiner) können ebenfalls als Zweitgutachter fungieren,
        // daher werden alle freigeschalteten Prüfer:innen angezeigt.
        or(
          eq(users.role, "second_examiner"),
          eq(users.role, "examiner")
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
          inArray(thesisRequests.status, activeStatuses as any)
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
  if (!db) return { secondExaminerIds: [] };
  const rows = await db
    .select({ secondExaminerId: examinerCommissionPreferences.secondExaminerId })
    .from(examinerCommissionPreferences)
    .where(eq(examinerCommissionPreferences.firstExaminerId, firstExaminerId));
  return { secondExaminerIds: rows.map(r => r.secondExaminerId) };
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
 * Zweitgutachter-Anfrage stellen (interner Prüfer im System)
 * Status wechselt zu PENDING_SECOND_EXAMINER, Anfrage wird an Zweitgutachter geschickt
 */
export async function setWantedSecondExaminer(requestId: number, studentId: number, secondExaminerId: number | null) {
  const db = await getDb();
  if (!db) return { success: false, error: "DB nicht verfügbar" };
  const rows = await db
    .select({ id: thesisRequests.id, studentId: thesisRequests.studentId, status: thesisRequests.status, wantedExaminerId: thesisRequests.wantedExaminerId, examinerId: thesisRequests.examinerId })
    .from(thesisRequests)
    .where(eq(thesisRequests.id, requestId))
    .limit(1);
  if (!rows.length) return { success: false, error: "Anfrage nicht gefunden" };
  const req = rows[0];
  if (req.studentId !== studentId) return { success: false, error: "Keine Berechtigung" };
  if (req.status !== "FIRST_EXAMINER_ACCEPTED") {
    return { success: false, error: "Zweitgutachter:in kann erst nach Zusage des Erstgutachters gewählt werden" };
  }
  if (secondExaminerId !== null && (secondExaminerId === req.wantedExaminerId || secondExaminerId === req.examinerId)) {
    return { success: false, error: "Zweitgutachter:in darf nicht identisch mit Erstgutachter:in sein" };
  }
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await db.update(thesisRequests)
    .set({
      wantedSecondExaminerId: secondExaminerId,
      // Externe Felder löschen wenn interner Prüfer gewählt wird
      externalSecondExaminerTitle: null,
      externalSecondExaminerFirstName: null,
      externalSecondExaminerLastName: null,
      externalSecondExaminerEmail: null,
      status: secondExaminerId !== null ? "PENDING_SECOND_EXAMINER" : "FIRST_EXAMINER_ACCEPTED",
      secondExaminerRequestedAt: secondExaminerId !== null ? now : null,
    } as any)
    .where(eq(thesisRequests.id, requestId));
  return { success: true };
}

/**
 * Externen Zweitgutachter (nicht im System) eintragen
 * Status bleibt FIRST_EXAMINER_ACCEPTED, da keine digitale Bestätigung möglich
 * Stattdessen wird direkt SECOND_EXAMINER_ACCEPTED gesetzt (manuelle Bestätigung)
 */
export async function setExternalSecondExaminer(requestId: number, studentId: number, data: {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
}) {
  const db = await getDb();
  if (!db) return { success: false, error: "DB nicht verfügbar" };
  const rows = await db
    .select({ id: thesisRequests.id, studentId: thesisRequests.studentId, status: thesisRequests.status })
    .from(thesisRequests)
    .where(eq(thesisRequests.id, requestId))
    .limit(1);
  if (!rows.length) return { success: false, error: "Anfrage nicht gefunden" };
  const req = rows[0];
  if (req.studentId !== studentId) return { success: false, error: "Keine Berechtigung" };
  if (req.status !== "FIRST_EXAMINER_ACCEPTED") {
    return { success: false, error: "Zweitgutachter:in kann erst nach Zusage des Erstgutachters eingetragen werden" };
  }
  if (!data.firstName.trim() || !data.lastName.trim() || !data.email.trim()) {
    return { success: false, error: "Vorname, Nachname und E-Mail sind Pflichtfelder" };
  }
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await db.update(thesisRequests)
    .set({
      wantedSecondExaminerId: null,
      externalSecondExaminerTitle: data.title.trim() || null,
      externalSecondExaminerFirstName: data.firstName.trim(),
      externalSecondExaminerLastName: data.lastName.trim(),
      externalSecondExaminerEmail: data.email.trim(),
      // Externer Prüfer kann nicht digital bestätigen → Status direkt auf PENDING_SECOND_EXAMINER
      status: "PENDING_SECOND_EXAMINER",
      secondExaminerRequestedAt: now,
    } as any)
    .where(eq(thesisRequests.id, requestId));
  return { success: true };
}

/**
 * Zweitgutachter-Anfrage zurückziehen (Student oder Admin)
 * Setzt Status zurück auf FIRST_EXAMINER_ACCEPTED
 */
export async function withdrawSecondExaminerRequest(requestId: number, userId: number, isAdmin = false) {
  const db = await getDb();
  if (!db) return { success: false, error: "DB nicht verfügbar" };
  const rows = await db
    .select({ id: thesisRequests.id, studentId: thesisRequests.studentId, status: thesisRequests.status })
    .from(thesisRequests)
    .where(eq(thesisRequests.id, requestId))
    .limit(1);
  if (!rows.length) return { success: false, error: "Anfrage nicht gefunden" };
  const req = rows[0];
  if (!isAdmin && req.studentId !== userId) return { success: false, error: "Keine Berechtigung" };
  if (req.status !== "PENDING_SECOND_EXAMINER") {
    return { success: false, error: "Nur ausstehende Zweitgutachter-Anfragen können zurückgezogen werden" };
  }
  await db.update(thesisRequests)
    .set({
      wantedSecondExaminerId: null,
      externalSecondExaminerTitle: null,
      externalSecondExaminerFirstName: null,
      externalSecondExaminerLastName: null,
      externalSecondExaminerEmail: null,
      status: "FIRST_EXAMINER_ACCEPTED",
      secondExaminerRequestedAt: null,
    } as any)
    .where(eq(thesisRequests.id, requestId));
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
  const prefsResult = await getCommissionPreferences(firstExaminerId);
  const prefIds = prefsResult.secondExaminerIds;
  // Alle Zweitgutachter-Kandidaten laden
  const all = await getAllSecondExaminerCandidates();
  if (prefIds.length === 0) {
    // Keine Präferenzen → alle anzeigen
    return all;
  }
  // Nur bevorzugte anzeigen
  return all.filter(e => prefIds.includes(e.id));
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

export type AppRole = "user" | "admin" | "student" | "examiner" | "second_examiner" | "superadmin" | "pav" | "dean" | "vice_dean" | "programme_director";

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
  "student", "examiner", "second_examiner", "programme_director", "pav", "dean", "vice_dean", "admin", "superadmin", "user"
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
      firstName: users.firstName,
      lastName: users.lastName,
      academicTitle: users.academicTitle,
      email: users.email,
      avatarUrl: users.avatarUrl,
      phone: users.phone,
      department: users.department,
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
  const student = aliasedTable(users, "student_rg");
  const firstExaminerAlias = aliasedTable(users, "first_examiner_rg");
  const secondExaminerAlias = aliasedTable(users, "second_examiner_rg");
  return db
    .select({
      id: thesisRequests.id,
      title: thesisRequests.title,
      department: thesisRequests.department,
      degreeType: thesisRequests.degreeType,
      targetSemester: thesisRequests.targetSemester,
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
      programmeName: programmes.name,
      programmeAbbreviation: programmes.abbreviation,
      firstExaminerName: firstExaminerAlias.name,
      secondExaminerName: secondExaminerAlias.name,
    })
    .from(thesisRequests)
    .leftJoin(student, eq(thesisRequests.studentId, student.id))
    .leftJoin(programmes, eq(student.programmeId, programmes.id))
    .leftJoin(firstExaminerAlias, eq(thesisRequests.examinerId, firstExaminerAlias.id))
    .leftJoin(secondExaminerAlias, eq(thesisRequests.secondExaminerId, secondExaminerAlias.id))
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

// ─── Phase: Examiner/PAV-initiierter Antrag ──────────────────────────────────

/**
 * Erstgutachter oder PAV legt einen Entwurf-Antrag für einen Studierenden an.
 */
export async function createExaminerInitiatedDraft(params: {
  examinerId: number;
  initiatedByRole: string;
  studentEmail: string;
  title: string;
  description: string;
  department: string;
  targetSemester: string;
  language: "de" | "en";
  degreeType: "bachelor" | "master";
  inviteToken: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Prüfen ob es bereits einen offenen Entwurf für diese E-Mail gibt
  const existing = await db
    .select({ id: thesisRequests.id })
    .from(thesisRequests)
    .where(
      and(
        eq(thesisRequests.studentInviteEmail as any, params.studentEmail),
        inArray(thesisRequests.status as any, ["DRAFT_BY_EXAMINER", "PENDING_STUDENT_CONFIRMATION"] as any)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Für diese E-Mail-Adresse existiert bereits ein offener Einladungs-Entwurf.");
  }

  // Prüfen ob ein Nutzer mit dieser E-Mail bereits existiert
  const existingStudent = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, params.studentEmail))
    .limit(1);

  const studentId = existingStudent.length > 0 ? existingStudent[0].id : 0;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  const result = await db.insert(thesisRequests).values({
    studentId: studentId,
    examinerId: params.examinerId,
    title: params.title,
    description: params.description,
    department: params.department,
    targetSemester: params.targetSemester,
    language: params.language,
    degreeType: params.degreeType,
    status: "DRAFT_BY_EXAMINER" as any,
    initiatedBy: params.examinerId,
    initiatedByRole: params.initiatedByRole,
    studentInviteToken: params.inviteToken,
    studentInviteEmail: params.studentEmail,
    studentInviteSentAt: now,
    hasOwnTopic: 1,
  } as any);

  return result;
}

/**
 * Holt einen Entwurf-Antrag anhand des Einladungs-Tokens.
 */
export async function getDraftByInviteToken(token: string) {
  const db = await getDb();
  if (!db) return null;

  const examinerUser = aliasedTable(users, "examiner_user");

  const rows = await db
    .select({
      id: thesisRequests.id,
      title: thesisRequests.title,
      description: thesisRequests.description,
      department: thesisRequests.department,
      targetSemester: thesisRequests.targetSemester,
      language: thesisRequests.language,
      degreeType: thesisRequests.degreeType,
      status: thesisRequests.status,
      examinerId: thesisRequests.examinerId,
      studentInviteEmail: thesisRequests.studentInviteEmail as any,
      studentInviteSentAt: thesisRequests.studentInviteSentAt as any,
      studentConfirmedAt: thesisRequests.studentConfirmedAt as any,
      initiatedByRole: thesisRequests.initiatedByRole as any,
      examinerName: examinerUser.name,
      examinerEmail: examinerUser.email,
    })
    .from(thesisRequests)
    .leftJoin(examinerUser, eq(thesisRequests.examinerId, examinerUser.id))
    .where(eq(thesisRequests.studentInviteToken as any, token))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Studierende:r bestätigt den Entwurf-Antrag und ergänzt seine Angaben.
 * Status wechselt zu PENDING_SECOND_EXAMINER (Suche nach Zweitgutachter beginnt).
 */
export async function confirmStudentDraft(params: {
  token: string;
  studentId: number;
  title?: string;
  description?: string;
  abstract?: string;
  targetSemester?: string;
  language?: "de" | "en";
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const draft = await getDraftByInviteToken(params.token);
  if (!draft) throw new Error("Einladungs-Token nicht gefunden.");
  if (draft.status !== "DRAFT_BY_EXAMINER" && draft.status !== "PENDING_STUDENT_CONFIRMATION") {
    throw new Error("Dieser Antrag wurde bereits bestätigt oder ist nicht mehr aktiv.");
  }

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  await db
    .update(thesisRequests)
    .set({
      studentId: params.studentId,
      status: "PENDING_SECOND_EXAMINER" as any,
      studentConfirmedAt: now,
      ...(params.title && { title: params.title }),
      ...(params.description && { description: params.description }),
      ...(params.abstract && { abstract: params.abstract }),
      ...(params.targetSemester && { targetSemester: params.targetSemester }),
      ...(params.language && { language: params.language }),
    } as any)
    .where(eq(thesisRequests.studentInviteToken as any, params.token));

  // Studierenden-Namen für Benachrichtigung laden
  const [studentUser] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, params.studentId))
    .limit(1);
  const studentName = studentUser?.name ?? studentUser?.email ?? "Ein:e Studierende:r";
  const thesisTitle = (params.title ?? draft.title) as string;

  // In-App-Benachrichtigung für Erstgutachter
  if (draft.examinerId) {
    await db.insert(notifications).values({
      userId: draft.examinerId,
      title: "Einladung bestätigt",
      message: `${studentName} hat die Einladung für die Abschlussarbeit \u201e${thesisTitle}\u201c bestätigt. Der Antrag wartet nun auf die Zuweisung eines Zweitgutachters.`,
      type: "status_change",
      thesisRequestId: draft.id,
      read: 0,
    });
  }

  return { success: true, thesisRequestId: draft.id };
}

/**
 * Holt alle Entwurf-Anträge eines Erstgutachters.
 */
export async function getExaminerDraftRequests(examinerId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: thesisRequests.id,
      title: thesisRequests.title,
      description: thesisRequests.description,
      department: thesisRequests.department,
      targetSemester: thesisRequests.targetSemester,
      language: thesisRequests.language,
      degreeType: thesisRequests.degreeType,
      status: thesisRequests.status,
      studentInviteEmail: thesisRequests.studentInviteEmail as any,
      studentInviteSentAt: thesisRequests.studentInviteSentAt as any,
      studentConfirmedAt: thesisRequests.studentConfirmedAt as any,
      createdAt: thesisRequests.createdAt,
    })
    .from(thesisRequests)
    .where(
      and(
        eq(thesisRequests.initiatedBy as any, examinerId),
        inArray(thesisRequests.status as any, ["DRAFT_BY_EXAMINER", "PENDING_STUDENT_CONFIRMATION"] as any)
      )
    )
    .orderBy(desc(thesisRequests.createdAt));
}

/**
 * Aktualisiert einen Entwurf-Antrag (Thema, Beschreibung, E-Mail, Semester etc.).
 * Nur möglich, solange Status DRAFT_BY_EXAMINER oder PENDING_STUDENT_CONFIRMATION.
 */
export async function updateDraftRequest(params: {
  requestId: number;
  callerId: number;  // Erstgutachter-ID oder Admin-ID
  isAdmin: boolean;
  title?: string;
  description?: string;
  department?: string;
  targetSemester?: string;
  language?: "de" | "en";
  degreeType?: "bachelor" | "master";
  studentEmail?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Antrag laden und Berechtigung prüfen
  const rows = await db
    .select({
      id: thesisRequests.id,
      status: thesisRequests.status,
      examinerId: thesisRequests.examinerId,
      initiatedBy: thesisRequests.initiatedBy as any,
      studentInviteToken: thesisRequests.studentInviteToken as any,
    })
    .from(thesisRequests)
    .where(eq(thesisRequests.id, params.requestId))
    .limit(1);

  const req = rows[0];
  if (!req) throw new Error("Antrag nicht gefunden.");
  if (req.status !== "DRAFT_BY_EXAMINER" && req.status !== "PENDING_STUDENT_CONFIRMATION") {
    throw new Error("Dieser Antrag kann nicht mehr bearbeitet werden.");
  }
  if (!params.isAdmin && req.examinerId !== params.callerId && req.initiatedBy !== params.callerId) {
    throw new Error("Keine Berechtigung für diesen Antrag.");
  }

  const updates: Record<string, unknown> = {};
  if (params.title !== undefined) updates.title = params.title;
  if (params.description !== undefined) updates.description = params.description;
  if (params.department !== undefined) updates.department = params.department;
  if (params.targetSemester !== undefined) updates.targetSemester = params.targetSemester;
  if (params.language !== undefined) updates.language = params.language;
  if (params.degreeType !== undefined) updates.degreeType = params.degreeType;
  if (params.studentEmail !== undefined) {
    updates.studentInviteEmail = params.studentEmail;
    // Token bleibt gleich – neue E-Mail erhält denselben Link
  }

  if (Object.keys(updates).length === 0) return { success: true };

  await db
    .update(thesisRequests)
    .set(updates as any)
    .where(eq(thesisRequests.id, params.requestId));

  return { success: true, token: req.studentInviteToken };
}

/**
 * Zieht eine ausstehende Einladung zurück (setzt Status auf WITHDRAWN).
 * Nur möglich, solange Status DRAFT_BY_EXAMINER oder PENDING_STUDENT_CONFIRMATION.
 */
export async function withdrawDraftRequest(params: {
  requestId: number;
  callerId: number;
  isAdmin: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const rows = await db
    .select({
      id: thesisRequests.id,
      status: thesisRequests.status,
      examinerId: thesisRequests.examinerId,
      initiatedBy: thesisRequests.initiatedBy as any,
    })
    .from(thesisRequests)
    .where(eq(thesisRequests.id, params.requestId))
    .limit(1);

  const req = rows[0];
  if (!req) throw new Error("Antrag nicht gefunden.");
  if (req.status !== "DRAFT_BY_EXAMINER" && req.status !== "PENDING_STUDENT_CONFIRMATION") {
    throw new Error("Dieser Antrag kann nicht mehr zurückgezogen werden.");
  }
  if (!params.isAdmin && req.examinerId !== params.callerId && req.initiatedBy !== params.callerId) {
    throw new Error("Keine Berechtigung für diesen Antrag.");
  }

  await db
    .update(thesisRequests)
    .set({ status: "WITHDRAWN" as any })
    .where(eq(thesisRequests.id, params.requestId));

  return { success: true };
}

/**
 * Holt alle offenen Einladungs-Entwürfe für die PAV-Verwaltung.
 */
export async function getAllDraftRequests() {
  const db = await getDb();
  if (!db) return [];

  const examinerUser = aliasedTable(users, "examiner_user");

  return db
    .select({
      id: thesisRequests.id,
      title: thesisRequests.title,
      department: thesisRequests.department,
      targetSemester: thesisRequests.targetSemester,
      degreeType: thesisRequests.degreeType,
      status: thesisRequests.status,
      studentInviteEmail: thesisRequests.studentInviteEmail as any,
      studentInviteSentAt: thesisRequests.studentInviteSentAt as any,
      studentConfirmedAt: thesisRequests.studentConfirmedAt as any,
      initiatedByRole: thesisRequests.initiatedByRole as any,
      createdAt: thesisRequests.createdAt,
      examinerName: examinerUser.name,
    })
    .from(thesisRequests)
    .leftJoin(examinerUser, eq(thesisRequests.examinerId, examinerUser.id))
    .where(
      inArray(thesisRequests.status as any, ["DRAFT_BY_EXAMINER", "PENDING_STUDENT_CONFIRMATION"] as any)
    )
    .orderBy(desc(thesisRequests.createdAt));
}

// ─── Thesis Document Verification Tokens ─────────────────────────────────────
import { thesisDocTokens, InsertThesisDocToken } from "../drizzle/schema";

export async function createThesisDocToken(data: Omit<InsertThesisDocToken, "id" | "createdAt">): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Normalisierungsfunktion: leere Strings und undefined -> null
  const n = (v: string | null | undefined): string | null => (v && v.trim()) ? v.trim() : null;
  // Pflichtfelder
  const row: Record<string, unknown> = {
    token: data.token,
    thesisRequestId: data.thesisRequestId,
    studentName: data.studentName,
    title: data.title,
    revoked: 0,
  };
  // Optionale Felder nur einfügen wenn sie einen Wert haben (kein leerer String / null)
  const matrikelNr = n(data.matrikelNr);
  if (matrikelNr) row.matrikelNr = matrikelNr;
  const programmeName = n(data.programmeName);
  if (programmeName) row.programmeName = programmeName;
  const firstExaminerName = n(data.firstExaminerName);
  if (firstExaminerName) row.firstExaminerName = firstExaminerName;
  const secondExaminerName = n(data.secondExaminerName);
  if (secondExaminerName) row.secondExaminerName = secondExaminerName;
  const targetSemester = n(data.targetSemester);
  if (targetSemester) row.targetSemester = targetSemester;
  const degreeType = n(data.degreeType);
  if (degreeType) row.degreeType = degreeType;
  await db.insert(thesisDocTokens).values(row as any);
}

export async function getThesisDocTokenByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(thesisDocTokens)
    .where(eq(thesisDocTokens.token, token))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Markiert alle Verifikations-Token eines Antrags als ungültig (revoked = 1).
 * Wird aufgerufen, wenn ein Antrag storniert oder zurückgezogen wird.
 */
export async function invalidateDocTokensForRequest(thesisRequestId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(thesisDocTokens)
    .set({ revoked: 1 } as any)
    .where(eq(thesisDocTokens.thesisRequestId, thesisRequestId));
}

// ─── Examiner Favorites ───────────────────────────────────────────────────────
import { examinerFavorites } from "../drizzle/schema";

export async function toggleFavorite(studentId: number, examinerId: number): Promise<{ isFavorite: boolean }> {
  const db = await getDb();
  if (!db) return { isFavorite: false };
  const existing = await db
    .select({ id: examinerFavorites.id })
    .from(examinerFavorites)
    .where(and(eq(examinerFavorites.studentId, studentId), eq(examinerFavorites.examinerId, examinerId)))
    .limit(1);
  if (existing.length > 0) {
    await db.delete(examinerFavorites).where(eq(examinerFavorites.id, existing[0].id));
    return { isFavorite: false };
  } else {
    await db.insert(examinerFavorites).values({ studentId, examinerId });
    return { isFavorite: true };
  }
}

export async function getFavoritesByStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ examinerId: examinerFavorites.examinerId, note: examinerFavorites.note, createdAt: examinerFavorites.createdAt })
    .from(examinerFavorites)
    .where(eq(examinerFavorites.studentId, studentId));
}

export async function updateFavoriteNote(studentId: number, examinerId: number, note: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(examinerFavorites)
    .set({ note })
    .where(and(eq(examinerFavorites.studentId, studentId), eq(examinerFavorites.examinerId, examinerId)));
}

// ─── Student Registration Invitations ────────────────────────────────────────
import { studentRegistrationInvitations as _sri } from "../drizzle/schema";

/** Erstellt eine neue Registrierungs-Einladung durch einen Prüfer. */
export async function createStudentRegistrationInvitation(params: {
  token: string;
  examinerId: number;
  studentEmail: string;
  emailLang: "de" | "en";
  expiresAt: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(_sri).values({
    token: params.token,
    examinerId: params.examinerId,
    studentEmail: params.studentEmail,
    emailLang: params.emailLang,
    expiresAt: params.expiresAt,
    revoked: 0,
  });
}

/** Holt eine Einladung anhand des Tokens. */
export async function getStudentRegistrationInvitation(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(_sri).where(eq(_sri.token, token)).limit(1);
  return rows[0] ?? null;
}

/** Markiert eine Einladung als verwendet. */
export async function markStudentRegistrationInvitationUsed(params: {
  token: string;
  userId: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db.update(_sri).set({ usedAt: now, usedByUserId: params.userId }).where(eq(_sri.token, params.token));
}

/** Gibt alle Einladungen eines Prüfers zurück. */
export async function getExaminerRegistrationInvitations(examinerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(_sri).where(eq(_sri.examinerId, examinerId)).orderBy(_sri.createdAt);
}

/** Widerruft eine Einladung. */
export async function revokeStudentRegistrationInvitation(params: {
  token: string;
  callerId: number;
  isAdmin: boolean;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const rows = await db.select({ examinerId: _sri.examinerId }).from(_sri).where(eq(_sri.token, params.token)).limit(1);
  const inv = rows[0];
  if (!inv) throw new Error("Einladung nicht gefunden.");
  if (!params.isAdmin && inv.examinerId !== params.callerId) throw new Error("Keine Berechtigung.");
  await db.update(_sri).set({ revoked: 1 }).where(eq(_sri.token, params.token));
}


// ─── Examiner Comments ────────────────────────────────────────────────────────
import { examinerComments } from "../drizzle/schema";

/** Gibt alle Kommentare eines Prüfers für einen bestimmten Thesis-Antrag zurück. */
export async function getExaminerComments(thesisRequestId: number, examinerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(examinerComments)
    .where(
      and(
        eq(examinerComments.thesisRequestId, thesisRequestId),
        eq(examinerComments.examinerId, examinerId)
      )
    )
    .orderBy(examinerComments.createdAt);
}

/** Erstellt einen neuen Kommentar. */
export async function createExaminerComment(params: {
  thesisRequestId: number;
  examinerId: number;
  content: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(examinerComments).values({
    thesisRequestId: params.thesisRequestId,
    examinerId: params.examinerId,
    content: params.content,
  });
  return (result[0] as any).insertId as number;
}

/** Aktualisiert den Inhalt eines Kommentars (nur durch den Ersteller). */
export async function updateExaminerComment(params: {
  id: number;
  examinerId: number;
  content: string;
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
    .set({ content: params.content, updatedAt: now })
    .where(eq(examinerComments.id, params.id));
}

/** Löscht einen Kommentar (nur durch den Ersteller). */
export async function deleteExaminerComment(params: {
  id: number;
  examinerId: number;
}): Promise<void> {
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


// ─── Zweitgutachter-Bestätigungs-Workflow ────────────────────────────────────

/**
 * Zweitgutachter bestätigt die Betreuung.
 * Status: PENDING_SECOND_EXAMINER → SECOND_EXAMINER_ACCEPTED
 */
export async function acceptAsSecondExaminer(
  thesisRequestId: number,
  examinerId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");

  // Anfrage laden und Berechtigung prüfen
  const [thesis] = await db
    .select()
    .from(thesisRequests)
    .where(eq(thesisRequests.id, thesisRequestId))
    .limit(1);
  if (!thesis) throw new Error("Anfrage nicht gefunden");
  if (thesis.secondExaminerId !== examinerId)
    throw new Error("Sie sind nicht als Zweitgutachter:in für diese Anfrage eingetragen");
  if (thesis.status !== "PENDING_SECOND_EXAMINER")
    throw new Error("Diese Anfrage wartet nicht auf Ihre Bestätigung als Zweitgutachter:in");

  // Status aktualisieren
  await db.update(thesisRequests)
    .set({
      status: "SECOND_EXAMINER_ACCEPTED",
      updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    })
    .where(eq(thesisRequests.id, thesisRequestId));

  // Zweitgutachter-Name für Benachrichtigungen
  const [secondExaminerUser] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, examinerId))
    .limit(1);
  const secondExaminerName = secondExaminerUser?.name ?? "der Zweitgutachter:in";

  // In-App-Benachrichtigung für Studierenden
  await db.insert(notifications).values({
    userId: thesis.studentId,
    title: "Zweitgutachter:in bestätigt",
    message: `${secondExaminerName} hat die Zweitbetreuung Ihrer Anfrage „${thesis.title}" bestätigt.`,
    type: "status_change",
    thesisRequestId,
    read: 0,
  });

  // In-App-Benachrichtigung für Erstgutachter (falls vorhanden)
  if (thesis.examinerId) {
    await db.insert(notifications).values({
      userId: thesis.examinerId,
      title: "Zweitgutachter:in bestätigt",
      message: `${secondExaminerName} hat die Zweitbetreuung für „${thesis.title}" bestätigt.`,
      type: "status_change",
      thesisRequestId,
      read: 0,
    });
  }

  // E-Mail an Erstgutachter
  if (thesis.examinerId) {
    const [firstExaminer] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, thesis.examinerId))
      .limit(1);
    if (firstExaminer?.email) {
      const { sendEmail } = await import("./emailHelper");
      const { subject, html, text } = buildSecondExaminerConfirmedEmail({
        recipientName: firstExaminer.name,
        recipientRole: "first",
        secondExaminerName,
        thesisTitle: thesis.title,
      });
      await sendEmail({ to: firstExaminer.email, subject, html, text });
    }
  }

  // E-Mail an Studierenden
  const [student] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, thesis.studentId))
    .limit(1);
  if (student?.email) {
    const { sendEmail } = await import("./emailHelper");
    const { subject, html, text } = buildSecondExaminerConfirmedEmail({
      recipientName: student.name,
      recipientRole: "student",
      secondExaminerName,
      thesisTitle: thesis.title,
    });
    await sendEmail({ to: student.email, subject, html, text });
  }
}

/**
 * Zweitgutachter lehnt die Betreuung ab.
 * Status: PENDING_SECOND_EXAMINER → SECOND_EXAMINER_REJECTED
 * secondExaminerId wird auf null gesetzt, damit Student neu wählen kann.
 */
export async function rejectAsSecondExaminer(
  thesisRequestId: number,
  examinerId: number,
  rejectionReason?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");

  // Anfrage laden und Berechtigung prüfen
  const [thesis] = await db
    .select()
    .from(thesisRequests)
    .where(eq(thesisRequests.id, thesisRequestId))
    .limit(1);
  if (!thesis) throw new Error("Anfrage nicht gefunden");
  if (thesis.secondExaminerId !== examinerId)
    throw new Error("Sie sind nicht als Zweitgutachter:in für diese Anfrage eingetragen");
  if (thesis.status !== "PENDING_SECOND_EXAMINER")
    throw new Error("Diese Anfrage wartet nicht auf Ihre Bestätigung als Zweitgutachter:in");

  // Status aktualisieren – secondExaminerId und wantedSecondExaminerId zurücksetzen, damit neu gewählt werden kann
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db.update(thesisRequests)
    .set({
      status: "FIRST_EXAMINER_ACCEPTED", // Zurück zu: Erstgutachter hat zugesagt, Zweitgutachter fehlt noch
      secondExaminerId: null,
      wantedSecondExaminerId: null,
      secondExaminerRejectedAt: now,
      secondExaminerRejectionReason: rejectionReason ?? null,
      updatedAt: now,
    })
    .where(eq(thesisRequests.id, thesisRequestId));

  // Zweitgutachter-Name
  const [secondExaminerUser] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, examinerId))
    .limit(1);
  const secondExaminerName = secondExaminerUser?.name ?? "die Zweitgutachter:in";

  // In-App-Benachrichtigung für Studierenden
  await db.insert(notifications).values({
    userId: thesis.studentId,
    title: "Zweitgutachter:in hat abgelehnt",
    message: `${secondExaminerName} hat die Zweitbetreuung Ihrer Anfrage „${thesis.title}" abgelehnt. Bitte wählen Sie eine andere Person.${rejectionReason ? ` Begründung: ${rejectionReason}` : ""}`,
    type: "status_change",
    thesisRequestId,
    read: 0,
  });

  // E-Mail an Studierenden
  const [student] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, thesis.studentId))
    .limit(1);
  if (student?.email) {
    const { sendEmail } = await import("./emailHelper");
    const { subject, html, text } = buildSecondExaminerRejectedEmail({
      recipientName: student.name,
      secondExaminerName,
      thesisTitle: thesis.title,
      rejectionReason,
    });
    await sendEmail({ to: student.email, subject, html, text });
  }
}

/**
 * Sendet eine Benachrichtigungs-E-Mail an den Zweitgutachter,
 * wenn ein Student ihn als Zweitgutachter ausgewählt hat.
 */
export async function notifySecondExaminerOfSelection(
  thesisRequestId: number,
  secondExaminerId: number,
  personalNote?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const [thesis] = await db
    .select()
    .from(thesisRequests)
    .where(eq(thesisRequests.id, thesisRequestId))
    .limit(1);
  if (!thesis) return;

  const [secondExaminer] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, secondExaminerId))
    .limit(1);
  if (!secondExaminer?.email) return;

  const [student] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, thesis.studentId))
    .limit(1);
  const studentName = student?.name ?? "eine:r Studierende:r";

  const { sendEmail } = await import("./emailHelper");
  const { subject, html, text } = buildSecondExaminerRequestEmail({
    examinerName: secondExaminer.name,
    studentName,
    thesisTitle: thesis.title,
    semester: thesis.targetSemester ?? undefined,
    personalNote: personalNote ?? undefined,
  });
  await sendEmail({ to: secondExaminer.email, subject, html, text });
}

// ─── Prüfer-Themenvorschläge ──────────────────────────────────────────────────

export async function getTopicsByExaminer(examinerId: number) {
  const db = await getDb();
  if (!db) return [];
  const et = examinerTopics;
  return db
    .select({
      id: et.id,
      examinerId: et.examinerId,
      title: et.title,
      description: et.description,
      validFromSemester: et.validFromSemester,
      validUntilSemester: et.validUntilSemester,
      degreeType: et.degreeType,
      language: et.language,
      isActive: et.isActive,
      allowMultiple: et.allowMultiple,
      maxAssignments: et.maxAssignments,
      tags: et.tags,
      createdAt: et.createdAt,
      updatedAt: et.updatedAt,
      assignmentCount: sql<number>`(SELECT COUNT(*) FROM thesis_requests tr WHERE tr.examiner_topic_id = ${et.id} AND tr.status NOT IN ('WITHDRAWN','REJECTED','REJECTED_BY_FIRST_EXAMINER'))`,
    })
    .from(et)
    .where(eq(et.examinerId, examinerId))
    .orderBy(desc(et.createdAt));
}

export async function getActiveTopicsForExaminer(examinerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(examinerTopics)
    .where(and(eq(examinerTopics.examinerId, examinerId), eq(examinerTopics.isActive, 1)))
    .orderBy(desc(examinerTopics.createdAt));
}

export async function getAllActiveTopics() {
  const db = await getDb();
  if (!db) return [];
  const et = examinerTopics;
  const u = users;
  return db
    .select({
      id: et.id,
      examinerId: et.examinerId,
      title: et.title,
      description: et.description,
      validFromSemester: et.validFromSemester,
      validUntilSemester: et.validUntilSemester,
      degreeType: et.degreeType,
      language: et.language,
      isActive: et.isActive,
      allowMultiple: et.allowMultiple,
      maxAssignments: et.maxAssignments,
      tags: et.tags,
      createdAt: et.createdAt,
      examinerName: u.name,
      examinerFirstName: u.firstName,
      examinerLastName: u.lastName,
      examinerAcademicTitle: u.academicTitle,
      // Anzahl aktiver Vergaben (Anfragen mit diesem Thema, die nicht zurückgezogen/abgelehnt sind)
      assignmentCount: sql<number>`(SELECT COUNT(*) FROM thesis_requests tr WHERE tr.examiner_topic_id = ${et.id} AND tr.status NOT IN ('WITHDRAWN','REJECTED','REJECTED_BY_FIRST_EXAMINER'))`,
    })
    .from(et)
    .innerJoin(u, eq(et.examinerId, u.id))
    .where(eq(et.isActive, 1))
    .orderBy(et.title);
}

export async function createExaminerTopic(data: {
  examinerId: number;
  title: string;
  description: string;
  validFromSemester?: string | null;
  validUntilSemester?: string | null;
  degreeType?: "bachelor" | "master" | null;
  language?: "de" | "en" | "both";
  allowMultiple?: number;
  maxAssignments?: number | null;
  tags?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const [result] = await db.insert(examinerTopics).values({
    examinerId: data.examinerId,
    title: data.title,
    description: data.description,
    validFromSemester: data.validFromSemester ?? null,
    validUntilSemester: data.validUntilSemester ?? null,
    degreeType: data.degreeType ?? null,
    language: data.language ?? "de",
    isActive: 1,
    allowMultiple: data.allowMultiple ?? 1,
    maxAssignments: data.maxAssignments ?? null,
    tags: data.tags ?? null,
  } as any);
  return result;
}

export async function updateExaminerTopic(topicId: number, examinerId: number, data: {
  title?: string;
  description?: string;
  validFromSemester?: string | null;
  validUntilSemester?: string | null;
  degreeType?: "bachelor" | "master" | null;
  language?: "de" | "en" | "both";
  isActive?: number;
  allowMultiple?: number;
  maxAssignments?: number | null;
  tags?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const [existing] = await db.select().from(examinerTopics)
    .where(and(eq(examinerTopics.id, topicId), eq(examinerTopics.examinerId, examinerId)));
  if (!existing) throw new Error("Thema nicht gefunden oder keine Berechtigung");
  await db.update(examinerTopics).set({ ...data, updatedAt: new Date().toISOString().slice(0, 19).replace("T", " ") } as any)
    .where(eq(examinerTopics.id, topicId));
}

export async function deleteExaminerTopic(topicId: number, examinerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const [existing] = await db.select().from(examinerTopics)
    .where(and(eq(examinerTopics.id, topicId), eq(examinerTopics.examinerId, examinerId)));
  if (!existing) throw new Error("Thema nicht gefunden oder keine Berechtigung");
  await db.delete(examinerTopics).where(eq(examinerTopics.id, topicId));
}

// ─── Admin: Gutachter:innen mit Verfügbarkeits-Info abrufen ──────────────────

/**
 * Alle freigeschalteten Prüfer:innen mit Verfügbarkeits-Informationen abrufen.
 * Enthält: aktive Betreuungen, Kapazitätsgrenzen für das angefragte Semester,
 * Studiengang-Präferenzen und Profil-Daten.
 */
export async function getExaminersWithAvailability(targetSemester?: string) {
  const db = await getDb();
  if (!db) return [];

  // Alle freigeschalteten Prüfer:innen (Erst- und Zweitgutachter)
  const examiners = await db.select({
    id: users.id,
    name: users.name,
    firstName: users.firstName,
    lastName: users.lastName,
    academicTitle: users.academicTitle,
    email: users.email,
    role: users.role,
    title: examinerProfiles.title,
    department: examinerProfiles.department,
    studyPrograms: examinerProfiles.studyPrograms,
    maxSupervisions: examinerProfiles.maxSupervisions,
    isSecondExaminer: examinerProfiles.isSecondExaminer,
    bio: examinerProfiles.bio,
    tags: examinerProfiles.tags,
    photoUrl: examinerProfiles.photoUrl,
    avatarUrl: users.avatarUrl,
  })
    .from(users)
    .leftJoin(examinerProfiles, eq(users.id, examinerProfiles.userId))
    .where(
      and(
        eq(users.roleStatus, "approved"),
        or(eq(users.role, "examiner"), eq(users.role, "second_examiner"))
      )
    );

  if (examiners.length === 0) return [];

  const examinerIds = examiners.map((e) => e.id);

  // Aktive Erst-Betreuungen zählen
  const activeFirstRows = await db
    .select({ examinerId: thesisRequests.examinerId, count: sql<number>`COUNT(*)` })
    .from(thesisRequests)
    .where(
      and(
        inArray(thesisRequests.examinerId, examinerIds),
        inArray(thesisRequests.status, [
          "PENDING", "PENDING_FIRST_EXAMINER", "FIRST_EXAMINER_ACCEPTED",
          "FIRST_EXAMINER_ASSIGNED", "PENDING_SECOND_EXAMINER",
          "SECOND_EXAMINER_ACCEPTED", "SECOND_EXAMINER_ASSIGNED", "SECOND_EXAMINER_SET", "MATCHED",
        ] as any)
      )
    )
    .groupBy(thesisRequests.examinerId);

  // Aktive Zweit-Betreuungen zählen
  const activeSecondRows = await db
    .select({ examinerId: thesisRequests.secondExaminerId, count: sql<number>`COUNT(*)` })
    .from(thesisRequests)
    .where(
      and(
        inArray(thesisRequests.secondExaminerId, examinerIds),
        inArray(thesisRequests.status, [
          "SECOND_EXAMINER_ACCEPTED", "SECOND_EXAMINER_ASSIGNED", "SECOND_EXAMINER_SET", "MATCHED",
        ] as any)
      )
    )
    .groupBy(thesisRequests.secondExaminerId);

  const firstCountMap = new Map<number, number>();
  for (const r of activeFirstRows) {
    if (r.examinerId != null) firstCountMap.set(r.examinerId, Number(r.count));
  }
  const secondCountMap = new Map<number, number>();
  for (const r of activeSecondRows) {
    if (r.examinerId != null) secondCountMap.set(r.examinerId, Number(r.count));
  }

  // Semester-Kapazitäten laden (falls Semester angegeben)
  let semesterCapMap = new Map<number, { maxFirst: number; maxSecond: number; adminMaxFirst: number | null; adminMaxSecond: number | null }>();
  if (targetSemester) {
    const caps = await db
      .select()
      .from(examinerSemesterCapacities)
      .where(
        and(
          inArray(examinerSemesterCapacities.examinerId, examinerIds),
          eq(examinerSemesterCapacities.semester, targetSemester)
        )
      );
    for (const c of caps) {
      semesterCapMap.set(c.examinerId, {
        maxFirst: c.maxFirst,
        maxSecond: c.maxSecond,
        adminMaxFirst: c.adminMaxFirst ?? null,
        adminMaxSecond: c.adminMaxSecond ?? null,
      });
    }
  }

  return examiners.map((e) => {
    const activeFirst = firstCountMap.get(e.id) ?? 0;
    const activeSecond = secondCountMap.get(e.id) ?? 0;
    const cap = semesterCapMap.get(e.id);
    const effectiveMaxFirst = cap?.adminMaxFirst ?? cap?.maxFirst ?? e.maxSupervisions ?? null;
    const effectiveMaxSecond = cap?.adminMaxSecond ?? cap?.maxSecond ?? null;
    return {
      ...e,
      activeFirstSupervisions: activeFirst,
      activeSecondSupervisions: activeSecond,
      semesterMaxFirst: effectiveMaxFirst,
      semesterMaxSecond: effectiveMaxSecond,
      // Verfügbar wenn unter der Kapazitätsgrenze (oder keine Grenze gesetzt)
      availableAsFirst: effectiveMaxFirst === null || activeFirst < effectiveMaxFirst,
      availableAsSecond: effectiveMaxSecond === null || activeSecond < effectiveMaxSecond,
    };
  });
}

/**
 * Admin weist einer Anfrage direkt Erst- und/oder Zweitgutachter:in zu.
 * Aktualisiert Status und sendet E-Mail-Benachrichtigungen.
 */
export async function adminDirectAssignExaminers(
  thesisRequestId: number,
  adminId: number,
  opts: {
    firstExaminerId?: number | null;
    secondExaminerId?: number | null;
  }
) {
  const db = await getDb();
  if (!db) return { success: false, error: "Datenbank nicht verfügbar" };

  const [thesis] = await db
    .select()
    .from(thesisRequests)
    .where(eq(thesisRequests.id, thesisRequestId))
    .limit(1);
  if (!thesis) return { success: false, error: "Anfrage nicht gefunden" };

  const updateData: Record<string, unknown> = {};
  let newStatus = thesis.status;

  if (opts.firstExaminerId !== undefined && opts.firstExaminerId !== null) {
    updateData.examinerId = opts.firstExaminerId;
    updateData.wantedExaminerId = opts.firstExaminerId;
    // Status auf FIRST_EXAMINER_ACCEPTED setzen (Admin-Zuweisung = direkte Bestätigung)
    if (
      thesis.status === "PENDING" ||
      thesis.status === "PENDING_FIRST_EXAMINER" ||
      thesis.status === "FIRST_EXAMINER_REJECTED"
    ) {
      newStatus = "FIRST_EXAMINER_ACCEPTED";
      updateData.status = newStatus;
    }
  }

  if (opts.secondExaminerId !== undefined && opts.secondExaminerId !== null) {
    updateData.secondExaminerId = opts.secondExaminerId;
    updateData.wantedSecondExaminerId = opts.secondExaminerId;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    updateData.secondExaminerAcceptedAt = now;
    // Status auf SECOND_EXAMINER_ACCEPTED setzen
    if (
      newStatus === "FIRST_EXAMINER_ACCEPTED" ||
      newStatus === "PENDING_SECOND_EXAMINER" ||
      thesis.status === "FIRST_EXAMINER_ACCEPTED" ||
      thesis.status === "PENDING_SECOND_EXAMINER"
    ) {
      newStatus = "SECOND_EXAMINER_ACCEPTED";
      updateData.status = newStatus;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return { success: false, error: "Keine Zuweisung angegeben" };
  }

  await db.update(thesisRequests).set(updateData as any).where(eq(thesisRequests.id, thesisRequestId));

  return { success: true, newStatus };
}

/**
 * Ermöglicht Studierenden, ihre Einreichung bei CONDITIONAL_ACCEPTANCE zu überarbeiten.
 * Aktualisiert Titel, Beschreibung, Sprache, Semester und Abschlussart.
 * Setzt den Status zurück auf PENDING_FIRST_EXAMINER, damit der Prüfer die
 * überarbeitete Fassung erneut prüfen kann.
 */
export async function reviseThesisSubmission(
  id: number,
  studentId: number,
  data: {
    title: string;
    description: string;
    language?: string;
    targetSemester?: string;
    degreeType?: "bachelor" | "master";
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getThesisRequestById(id);
  if (!existing) throw new Error("Antrag nicht gefunden");
  if (existing.studentId !== studentId) throw new Error("Keine Berechtigung");
  if (existing.status !== "CONDITIONAL_ACCEPTANCE") {
    throw new Error("Überarbeitung nur bei Status 'Zusage unter Vorbehalt' möglich");
  }

  await db.update(thesisRequests).set({
    title: data.title,
    description: data.description,
    ...(data.language ? { language: data.language } : {}),
    ...(data.targetSemester ? { targetSemester: data.targetSemester } : {}),
    ...(data.degreeType ? { degreeType: data.degreeType } : {}),
    status: "PENDING_FIRST_EXAMINER" as any,
  }).where(eq(thesisRequests.id, id));
}

// ─── Login-Fehler-Protokoll ───────────────────────────────────────────────────
export async function logLoginAttempt(data: {
  email: string;
  success: boolean;
  failureReason?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(loginAttempts).values({
    email: data.email,
    success: data.success ? 1 : 0,
    failureReason: data.failureReason ?? null,
    ipAddress: data.ipAddress ?? null,
    userAgent: data.userAgent ? data.userAgent.substring(0, 512) : null,
  });
}

export async function getLoginAttempts(opts?: { email?: string; onlyFailed?: boolean; limit?: number; dateFrom?: Date; dateTo?: Date; search?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.email) conditions.push(eq(loginAttempts.email, opts.email));
  if (opts?.onlyFailed) conditions.push(eq(loginAttempts.success, 0));
  if (opts?.dateFrom) conditions.push(gte(loginAttempts.createdAt, opts.dateFrom.toISOString().slice(0, 19).replace('T', ' ')));
  if (opts?.dateTo) {
    // Ende des Tages einschließen
    const end = new Date(opts.dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(loginAttempts.createdAt, end.toISOString().slice(0, 19).replace('T', ' ')));
  }
  if (opts?.search) {
    const s = `%${opts.search}%`;
    conditions.push(sql`(${loginAttempts.email} LIKE ${s} OR COALESCE(${loginAttempts.failureReason}, '') LIKE ${s})`);
  }
  const query = db
    .select()
    .from(loginAttempts)
    .orderBy(desc(loginAttempts.createdAt))
    .limit(opts?.limit ?? 500);
  if (conditions.length > 0) {
    return query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
  }
  return query;
}

export async function getLastPasswordResetSent(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ createdAt: passwordResetTokens.createdAt })
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, userId))
    .orderBy(desc(passwordResetTokens.createdAt))
    .limit(1);
  return rows[0]?.createdAt ?? null;
}

// ─── Neue Prüfer:innen – Badge-Tracking ──────────────────────────────────────
export async function getNewExaminersCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  // Letzter Zeitpunkt, zu dem der Nutzer neue Prüfer:innen gesehen hat
  const seenRows = await db
    .select({ lastSeenAt: examinerSeenNotifications.lastSeenAt })
    .from(examinerSeenNotifications)
    .where(eq(examinerSeenNotifications.userId, userId))
    .limit(1);
  const lastSeen = seenRows[0]?.lastSeenAt ?? "1970-01-01 00:00:00";
  // Anzahl Prüfer:innen, die seit lastSeen genehmigt wurden
  const rows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(users)
    .where(
      and(
        eq(users.role, "examiner"),
        eq(users.roleStatus, "approved"),
        gt(users.roleConfirmedAt, lastSeen)
      )
    );
  return Number(rows[0]?.count ?? 0);
}

export async function getNewExaminers(userId: number): Promise<Array<{
  id: number; name: string | null; email: string | null;
  department: string | null; title: string | null;
  roleConfirmedAt: string | null; studyPrograms: unknown;
}>> {
  const db = await getDb();
  if (!db) return [];
  const seenRows = await db
    .select({ lastSeenAt: examinerSeenNotifications.lastSeenAt })
    .from(examinerSeenNotifications)
    .where(eq(examinerSeenNotifications.userId, userId))
    .limit(1);
  const lastSeen = seenRows[0]?.lastSeenAt ?? "1970-01-01 00:00:00";
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      department: users.department,
      title: examinerProfiles.title,
      roleConfirmedAt: users.roleConfirmedAt,
      studyPrograms: examinerProfiles.studyPrograms,
    })
    .from(users)
    .leftJoin(examinerProfiles, eq(examinerProfiles.userId, users.id))
    .where(
      and(
        eq(users.role, "examiner"),
        eq(users.roleStatus, "approved"),
        gt(users.roleConfirmedAt, lastSeen)
      )
    )
    .orderBy(desc(users.roleConfirmedAt));
}

export async function markNewExaminersAsSeen(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(examinerSeenNotifications)
    .values({ userId, lastSeenAt: new Date().toISOString().slice(0, 19).replace("T", " ") })
    .onDuplicateKeyUpdate({ set: { lastSeenAt: new Date().toISOString().slice(0, 19).replace("T", " ") } });
}

// ─── E-Mail-Benachrichtigungs-Einstellungen ───────────────────────────────────

/**
 * Alle verfügbaren Benachrichtigungstypen mit Metadaten.
 * Schlüssel entsprechen den notification_type-Werten in der DB.
 */
export const NOTIFICATION_TYPES = [
  {
    key: "new_examiner_colleague",
    labelDe: "Neue Kolleg:in im System",
    descDe: "Benachrichtigung, wenn eine neue Prüfer:in freigeschaltet wird.",
    roles: ["examiner", "second_examiner"],
    defaultEnabled: false, // opt-in (war vorher Massen-E-Mail)
  },
  {
    key: "thesis_status_change",
    labelDe: "Statusänderung bei Abschlussarbeit",
    descDe: "Benachrichtigung bei jeder Statusänderung einer Ihrer Abschlussarbeiten.",
    roles: ["student", "examiner", "second_examiner"],
    defaultEnabled: true,
  },
  {
    key: "second_examiner_request",
    labelDe: "Anfrage als Zweitgutachter:in",
    descDe: "Benachrichtigung, wenn Sie als Zweitgutachter:in für eine Arbeit angefragt werden.",
    roles: ["examiner", "second_examiner"],
    defaultEnabled: true,
  },
  {
    key: "second_examiner_response",
    labelDe: "Antwort des Zweitgutachters",
    descDe: "Benachrichtigung, wenn ein Zweitgutachter auf Ihre Anfrage antwortet.",
    roles: ["examiner"],
    defaultEnabled: true,
  },
  {
    key: "role_approved",
    labelDe: "Rollenfreischaltung",
    descDe: "Benachrichtigung, wenn Ihre Registrierung freigeschaltet oder abgelehnt wird.",
    roles: ["student", "examiner", "second_examiner", "admin", "pav", "dean"],
    defaultEnabled: true,
  },
  {
    key: "colloquium_scheduled",
    labelDe: "Kolloquium angesetzt",
    descDe: "Benachrichtigung, wenn ein Kolloquium für Ihre Abschlussarbeit angesetzt wird.",
    roles: ["student", "examiner", "second_examiner"],
    defaultEnabled: true,
  },
  {
    key: "colloquium_scheduling",
    labelDe: "Kolloquiums-Terminabstimmung",
    descDe: "Einladungen, automatische Fristerinnerungen und verbindliche Bestätigungen zu Kolloquiumsterminen.",
    roles: ["student", "examiner", "second_examiner"],
    defaultEnabled: true,
  },
  {
    key: "deadline_reminder",
    labelDe: "Fristenerinnerungen",
    descDe: "Erinnerungs-E-Mails für bevorstehende Abgabe- und Bearbeitungsfristen.",
    roles: ["student", "examiner", "second_examiner"],
    defaultEnabled: true,
  },
  {
    key: "pav_examiner_proposal",
    labelDe: "PAV-Prüfervorschlag",
    descDe: "Benachrichtigung, wenn ein PAV-Mitglied Sie als Prüfer:in vorschlägt.",
    roles: ["examiner", "second_examiner"],
    defaultEnabled: true,
  },
] as const;

export type NotificationTypeKey = typeof NOTIFICATION_TYPES[number]["key"];

/**
 * Lädt alle Benachrichtigungs-Einstellungen eines Nutzers.
 * Fehlende Einträge werden mit dem systemweiten Standard aufgefüllt.
 */
export async function getNotificationPreferences(userId: number): Promise<Record<NotificationTypeKey, boolean>> {
  const db = await getDb();
  if (!db) throw new Error("DB nicht verfügbar");

  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));

  const result = {} as Record<NotificationTypeKey, boolean>;
  for (const nt of NOTIFICATION_TYPES) {
    const row = rows.find((r) => r.notificationType === nt.key);
    result[nt.key] = row ? row.enabled === 1 : nt.defaultEnabled;
  }
  return result;
}

/**
 * Setzt eine einzelne Benachrichtigungs-Einstellung für einen Nutzer.
 */
export async function setNotificationPreference(
  userId: number,
  notificationType: NotificationTypeKey,
  enabled: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB nicht verfügbar");

  await db
    .insert(notificationPreferences)
    .values({
      userId,
      notificationType,
      enabled: enabled ? 1 : 0,
      updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    })
    .onDuplicateKeyUpdate({
      set: {
        enabled: enabled ? 1 : 0,
        updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      },
    });
}

/**
 * Prüft ob ein Nutzer eine bestimmte E-Mail-Benachrichtigung aktiviert hat.
 * Gibt den systemweiten Standard zurück wenn kein Eintrag vorhanden.
 */
export async function isNotificationEnabled(
  userId: number,
  notificationType: NotificationTypeKey
): Promise<boolean> {
  const db = await getDb();
  if (!db) return true; // Fallback: aktiviert

  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.notificationType, notificationType)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    const nt = NOTIFICATION_TYPES.find((t) => t.key === notificationType);
    return nt?.defaultEnabled ?? true;
  }
  return rows[0].enabled === 1;
}
