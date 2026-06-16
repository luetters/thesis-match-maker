import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  assignExaminerToThesis,
  createAuditLogEntry,
  createThesisRequest,
  getQualifiedExaminers,
  getSecondExaminers,
  hasOpenThesisRequest,
  createExaminerActionToken,
  markTokenAsUsed,
  acceptThesisRequest,
  rejectThesisRequest,
  withdrawThesisRequest,
  setSecondExaminer,
  getAllAuditLogs,
  getAllExaminers,
  getAllThesisRequests,
  getAllUsers,
  getAllUsersWithProfiles,
  createExaminerByAdmin,
  updateExaminerByAdmin,
  deleteUserByAdmin,
  getAuditLogByThesis,
  getExaminerProfileByUserId,
  getNotificationsByUser,
  getThesisRequestById,
  getThesisRequestsByExaminer,
  getThesisRequestsByStudent,
  getUnreadCount,
  getUserById,
  markAllNotificationsRead,
  markNotificationRead,
  notifyThesisParticipants,
  updateThesisDeadline,
  updateThesisRequestStatus,
  updateUserRole,
  upsertExaminerProfile,
  getThesisStats,
  getUserByEmail,
  setUserPasswordHash,
  getSystemSettings,
  upsertSystemSetting,
  createPasswordResetToken,
  getPasswordResetToken,
  markPasswordResetTokenUsed,
  getAllProgrammes,
  setStudentProgramme,
  getExaminerProgrammes,
  setExaminerProgrammes,
  updateExaminerAlternativeEmail,
  updateExaminerSecondExaminerFlag,
  resolveExaminerEmail,
  completeExaminerOnboarding,
  getUnassignedStudents,
  countOpenPavProposals,
  createPavProposal,
  getPavProposalsByPav,
  getPavProposalByToken,
  updatePavProposalStatus,
  assignExaminerFromProposal,
  getPavProgrammes,
  addPavProgramme,
  removePavProgramme,
  getUnassignedStudentsByPavProgrammes,
  getAllThesisRequestsForCsv,
  getAllThesisRequestsForDean,
  getAllUsersWithRoles,
  setUserRole,
  resetExaminerOnboarding,
  getAllPavUsersWithProgrammes,
  superadminAssignPavProgramme,
  superadminRemovePavProgramme,
  getThesisRequestDetailForDean,
  getDeanStats,
  getAllEmailTemplates,
  getEmailTemplateByKey,
  updateEmailTemplate,
  listExaminers,
  updateExaminerProfileByAdmin,
  updateUserFields,
  upsertUser,
  getThesisStatsByPeriod,
  getThesisStatsByFaculty,
  getThesisStatsByStatus,
  getAverageProcessingTime,
  getDropoutRate,
  getExaminerWorkload,
  generateCSVReport,
  bulkAcceptRequests,
  bulkRejectRequests,
  bulkSendReminders,
  validateBulkOperation,
  bulkUpdateExaminerCapacity,
  createReminderSchedule,
  getRemindersDue,
  sendReminderEmail,
  markReminderAsSent,
  getReminderHistory,
  getReminderTemplates,
  updateReminderTemplate,
  cleanupOldReminders,
  searchThesisRequests,
  searchExaminers,
  searchStudents,
  createSavedFilter,
  getSavedFilters,
  deleteSavedFilter,
  getAuditTrail,
  getAuditTrailByUser,
  exportAuditTrailCSV,
  anonymizeThesisRequest,
  archiveThesisRequest,
  getComplianceReport,
  isSuperadmin,
  getSuperadminStatus,
  switchUserRole,
  logRoleSwitchAction,
  getRoleSwitchHistory,
  getAllActiveUsers,
  getUserStatistics,
  searchUsers,
  getUserDetails,
  getUserActivityLog,
  updateUserStatus,
  selectUserRole,
  getPendingRoleUsers,
  approveUserRole,
  rejectUserRole,
  getUserRoleStatus,
  getProfile,
  updateProfile,
  updateProfileAvatar,
  clearProfileAvatar,
  getFirstExaminers,
  getAllSecondExaminerCandidates,
  getCommissionPreferences,
  setCommissionPreferences,
  setWantedSecondExaminer,
  getFilteredSecondExaminers,
  hasSharedThesisRequest,
  getRequestsPendingEnrollmentEligibility,
  getRequestsPendingDefenseEligibility,
  setEnrollmentEligibility,
  setDefenseEligibility,
  getAdminDecisionHistory,
  getUserRoles,
  addUserRole,
  removeUserRole,
  AppRole,
  getAssignedExaminers,
  getRegisteredTheses,
  setOfficialRegistration,
  setAdmission,
  extendDeadline,
  setDefenseDate,
  closeCase,
  getDeadlineChanges,
  createExaminerInitiatedDraft,
  getDraftByInviteToken,
  confirmStudentDraft,
  getExaminerDraftRequests,
  getAllDraftRequests,
  updateDraftRequest,
  withdrawDraftRequest,
  getStudentThesisHistory,
  invalidateDocTokensForRequest,
  toggleFavorite,
  getFavoritesByStudent,
  updateFavoriteNote,
} from "./db";
import { signExaminerActionToken, verifyExaminerActionToken } from "./jwtHelper";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { ONE_YEAR_MS } from "@shared/const";
import {
  createColloquium,
  getAllColloquiums,
  getColloquiumsByThesis,
  getColloquiumsByExaminer,
  getColloquiumsByStudent,
  updateColloquiumStatus,
  deleteColloquium,
} from "./db";
import { createIcsEvent } from "./icsHelper";
import { storagePut } from "./storage";
import { sendExaminerCTAEmail, sendStatusChangeEmail, sendEmail, sendPavProgrammeAssignmentEmail } from "./emailHelper";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

// --- Role guards --------------------------------------------------------------
// Hilfsfunktion: prüft ob user.roles (Multi-Rollen) eine bestimmte Rolle enthält
// Fällt auf user.role (Legacy-Feld) zurück wenn roles[] nicht verfügbar
function userHasRole(user: { role: string; roles?: string[] }, role: string): boolean {
  if (user.roles && user.roles.length > 0) {
    return user.roles.includes(role);
  }
  return user.role === role;
}

const studentProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!userHasRole(ctx.user, "student") && !userHasRole(ctx.user, "admin") && !userHasRole(ctx.user, "superadmin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Nur Studierende haben Zugriff." });
  }
  return next({ ctx });
});

// Erstprüfer:innen-Prozedur: nur Rolle 'examiner' (+ Admin)
const examinerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!userHasRole(ctx.user, "examiner") && !userHasRole(ctx.user, "admin") && !userHasRole(ctx.user, "superadmin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Nur Prüfer:innen mit Erstprüfer-Berechtigung haben Zugriff." });
  }
  return next({ ctx });
});

// Zweitprüfer:innen-Prozedur: Rolle 'examiner' ODER 'second_examiner' (+ Admin)
const anyExaminerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!userHasRole(ctx.user, "examiner") && !userHasRole(ctx.user, "second_examiner") && !userHasRole(ctx.user, "admin") && !userHasRole(ctx.user, "superadmin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Nur Prüfer:innen haben Zugriff." });
  }
  return next({ ctx });
});

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!userHasRole(ctx.user, "admin") && !userHasRole(ctx.user, "superadmin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Nur Admins haben Zugriff." });
  }
  return next({ ctx });
});

const superadminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!userHasRole(ctx.user, "superadmin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Nur Superadmins haben Zugriff." });
  }
  return next({ ctx });
});

const pavProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!userHasRole(ctx.user, "pav") && !userHasRole(ctx.user, "admin") && !userHasRole(ctx.user, "superadmin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Nur PAV haben Zugriff." });
  }
  return next({ ctx });
});

const deanProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!userHasRole(ctx.user, "dean") && !userHasRole(ctx.user, "vice_dean") && !userHasRole(ctx.user, "admin") && !userHasRole(ctx.user, "superadmin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Nur Dekanat hat Zugriff." });
  }
  return next({ ctx });
});

// ─── Profile Router ──────────────────────────────────────────────────────────
const profileRouterDef = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getProfile(ctx.user.id);
    if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Profil nicht gefunden." });
    return profile;
  }),
  update: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(128).optional(),
      firstName: z.string().max(128).optional(),
      lastName: z.string().max(128).optional(),
      bio: z.string().max(1000).optional(),
      phone: z.string().max(64).optional(),
      department: z.string().max(255).optional(),
      // Studierende
      matrikelNr: z.string().max(32).optional(),
      thesisType: z.enum(['bachelor', 'master']).optional(),
      enrollmentSemester: z.string().max(32).optional(),
      targetSemester: z.string().max(20).optional(),
      // Prüfer:innen
      academicTitle: z.string().max(64).optional(),
      officeRoom: z.string().max(64).optional(),
      officeHours: z.string().max(500).optional(),
      researchTags: z.string().max(500).optional(),
      examinerLanguages: z.array(z.string()).optional(),
      examinerKeywords: z.array(z.string().max(64)).max(30).optional(),
      examinerProgrammeIds: z.array(z.number().int().positive()).optional(),
      examinerBio: z.string().max(2000).optional(),
      examinerResearchFocus: z.string().max(2000).optional(),
      // Multi-Fachbereich für Prüfer:innen
      allowedDepartments: z.array(z.string().max(10)).max(5).optional(),
      primaryDepartment: z.string().max(10).optional(),
      // Verwaltung
      staffId: z.string().max(32).optional(),
      responsibilityArea: z.string().max(255).optional(),
      officeLocation: z.string().max(255).optional(),
      // Persönliche Einstellungen
      preferredLanguage: z.enum(['de', 'en']).optional(),
      // Kontakt & Online-Präsenz
      secondEmail: z.string().email().max(320).optional().or(z.literal('')),
      website: z.string().max(512).optional(),
      linkedIn: z.string().max(512).optional(),
      researchGate: z.string().max(512).optional(),
      htwProfileUrl: z.string().max(512).optional(),
      miscLink: z.string().max(512).optional(),
      bookingUrl: z.string().max(512).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ok = await updateProfile(ctx.user.id, input);
      if (!ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Profil konnte nicht aktualisiert werden." });
      // Bevorzugte Sprache separat speichern (eigene Spalte)
      if (input.preferredLanguage) {
        const { setPreferredLanguage } = await import('./db');
        await setPreferredLanguage(ctx.user.id, input.preferredLanguage);
      }
      // Prüfer:innen-spezifische Felder in examiner_profiles speichern
      const isExaminer = userHasRole(ctx.user, 'examiner') || userHasRole(ctx.user, 'second_examiner');
      if (isExaminer && (input.examinerLanguages !== undefined || input.examinerKeywords !== undefined || input.examinerBio !== undefined || input.examinerResearchFocus !== undefined)) {
        await upsertExaminerProfile({
          userId: ctx.user.id,
          ...(input.examinerLanguages !== undefined ? { languages: input.examinerLanguages } : {}),
          ...(input.examinerKeywords !== undefined ? { tags: input.examinerKeywords } : {}),
          ...(input.examinerBio !== undefined ? { bio: input.examinerBio } : {}),
          ...(input.examinerResearchFocus !== undefined ? { researchFocus: input.examinerResearchFocus } : {}),
        });
      }
      // Studiengänge speichern
      if (isExaminer && input.examinerProgrammeIds !== undefined) {
        await setExaminerProgrammes(ctx.user.id, input.examinerProgrammeIds);
      }
      // Multi-Fachbereich speichern
      if (isExaminer && input.allowedDepartments !== undefined && input.allowedDepartments.length > 0) {
        const { setExaminerDepartments } = await import('./db');
        await setExaminerDepartments(
          ctx.user.id,
          input.allowedDepartments,
          input.primaryDepartment ?? input.allowedDepartments[0]
        );
      }
      return { success: true };
    }),
  getAssignedExaminers: protectedProcedure.query(async ({ ctx }) => {
    return getAssignedExaminers(ctx.user.id);
  }),

  deleteAvatar: protectedProcedure
    .mutation(async ({ ctx }) => {
      const ok = await clearProfileAvatar(ctx.user.id);
      if (!ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Profilfoto konnte nicht gelöscht werden." });
      return { success: true };
    }),

  uploadAvatar: protectedProcedure
    .input(z.object({
      base64: z.string(),
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
      fileName: z.string().max(128),
    }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      if (buffer.byteLength > 5 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Datei zu groß (max. 5 MB)." });
      }
      const ext = input.mimeType.split("/")[1];
      const key = `avatars/user-${ctx.user.id}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      const ok = await updateProfileAvatar(ctx.user.id, url, key);
      if (!ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Avatar konnte nicht gespeichert werden." });
      return { avatarUrl: url };
    }),
});

// --- App Router ---------------------------------------------------------------

export const appRouter = router({
  system: systemRouter,
  profile: profileRouterDef,

  // Öffentliche Systemstatus-Prozedur (kein Auth erforderlich)
  maintenanceStatus: publicProcedure.query(async () => {
    const settings = await getSystemSettings();
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    return {
      active: map["maintenanceMode"] === "true",
      contactEmail: map["contactEmail"] ?? "support@htw-berlin.de",
      systemName: map["systemName"] ?? "Thesis Match Maker",
    };
  }),

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8, "Das neue Passwort muss mindestens 8 Zeichen lang sein."),
      }))
      .mutation(async ({ ctx, input }) => {
        // Aktuelles Passwort prüfen
        const user = await getUserByEmail(ctx.user.email ?? "");
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Kein Passwort-Login für dieses Konto eingerichtet." });
        }
        const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Das aktuelle Passwort ist falsch." });
        }
        const newHash = await bcrypt.hash(input.newPassword, 12);
        await setUserPasswordHash(ctx.user.id, newHash);
        return { success: true };
      }),
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email(), origin: z.string().url() }))
      .mutation(async ({ input }) => {
        // Kein Fehler zurückgeben wenn E-Mail nicht existiert (Security: kein User-Enumeration)
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) return { success: true };
        // Token generieren (kryptografisch sicher)
        const { randomBytes } = await import("crypto");
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 Stunde
        await createPasswordResetToken(user.id, token, expiresAt);
        const resetUrl = `${input.origin}/reset-password?token=${token}`;
        await sendEmail({
          to: input.email,
          subject: "Passwort zurücksetzen – HTW Berlin Thesis Match Maker",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
              <div style="background: #006937; padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 20px;">HTW Berlin – Thesis Match Maker</h1>
              </div>
              <div style="padding: 32px; background: #f9f9f9;">
                <h2 style="color: #1a1a1a; margin-top: 0;">Passwort zurücksetzen</h2>
                <p style="color: #444;">Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. Klicken Sie auf den folgenden Button, um ein neues Passwort zu vergeben:</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${resetUrl}" style="background: #006937; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Passwort zurücksetzen</a>
                </div>
                <p style="color: #888; font-size: 13px;">Dieser Link ist 1 Stunde gültig. Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.</p>
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
                <p style="color: #aaa; font-size: 12px;">© ${new Date().getFullYear()} HTW Berlin – Hochschule für Technik und Wirtschaft</p>
              </div>
            </div>
          `,
        });
        return { success: true };
      }),
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string().min(1),
        newPassword: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein."),
      }))
      .mutation(async ({ input }) => {
        const record = await getPasswordResetToken(input.token);
        if (!record) throw new TRPCError({ code: "BAD_REQUEST", message: "Ungültiger oder abgelaufener Reset-Link." });
        if (record.used) throw new TRPCError({ code: "BAD_REQUEST", message: "Dieser Reset-Link wurde bereits verwendet." });
        if (new Date() > new Date(record.expiresAt as string)) throw new TRPCError({ code: "BAD_REQUEST", message: "Der Reset-Link ist abgelaufen. Bitte fordern Sie einen neuen an." });
        const newHash = await bcrypt.hash(input.newPassword, 12);
        await setUserPasswordHash(record.userId, newHash);
        await markPasswordResetTokenUsed(input.token);
        return { success: true };
      }),
    register: publicProcedure
      .input(
        z.object({
          name: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein."),
          firstName: z.string().max(128).optional(),
          lastName: z.string().max(128).optional(),
          email: z.string().email("Bitte eine gültige E-Mail-Adresse eingeben."),
          password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein."),
          role: z.enum(["student", "examiner", "second_examiner", "admin"]),
          matrikelNr: z.string().optional(),
          programmeId: z.number().int().positive().optional(),
          department: z.string().optional(),
          thesisType: z.enum(["bachelor", "master"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Matrikelnummer ist Pflicht für Studierende
        if (input.role === "student" && (!input.matrikelNr || !input.matrikelNr.trim())) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Studierende müssen eine Matrikelnummer angeben." });
        }
        // Studiengang ist Pflicht für Studierende
        if (input.role === "student" && !input.programmeId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Studierende müssen einen Studiengang auswählen." });
        }
        // E-Mail-Domain-Validierung bei Registrierung
        const emailLowerReg = input.email.toLowerCase();
        const isHtwEmail = emailLowerReg.endsWith("@htw-berlin.de") || emailLowerReg.endsWith("@htw-berlin.com") || emailLowerReg.endsWith("@student.htw-berlin.de");
        if (input.role === "student") {
          if (!emailLowerReg.endsWith("@student.htw-berlin.de") && !isHtwEmail) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Studierende müssen sich mit ihrer Studierenden-E-Mail-Adresse (@student.htw-berlin.de) registrieren.",
            });
          }
        } else if (input.role === "examiner" || input.role === "admin") {
          if (!isHtwEmail) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Prüfer:innen und Verwaltungsmitarbeitende müssen sich mit einer HTW-Berlin-E-Mail-Adresse (@htw-berlin.de oder @htw-berlin.com) registrieren.",
            });
          }
        }
        // second_examiner: externe E-Mails erlaubt – keine Domain-Einschränkung
        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an." });
        }
        const passwordHash = await bcrypt.hash(input.password, 12);
        const openId = `pw_${input.email.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
        const { getDb } = await import("./db");
        const drizzleDb = await getDb();
        if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Datenbankfehler." });
        const { users } = await import("../drizzle/schema");
        await drizzleDb.insert(users).values({
          openId,
          email: input.email.toLowerCase(),
          name: input.name,
          ...(input.firstName ? { firstName: input.firstName } : {}),
          ...(input.lastName ? { lastName: input.lastName } : {}),
          role: "user" as any,
          requestedRole: input.role as any,
          roleStatus: "pending" as any,
          loginMethod: "password",
          passwordHash,
          lastSignedIn: new Date().toISOString().slice(0, 19).replace('T', ' '),
          ...(input.matrikelNr ? { matrikelNr: input.matrikelNr.trim() } : {}),
          ...(input.department ? { department: input.department } : {}),
          ...(input.thesisType ? { thesisType: input.thesisType } : {}),
        } as any).onDuplicateKeyUpdate({
          set: { name: input.name } as any,
        });
        // Studiengang direkt bei Registrierung setzen (für Studierende)
        if (input.role === "student" && input.programmeId) {
          const mysql2 = await import('mysql2/promise');
          const conn = await mysql2.createConnection(process.env.DATABASE_URL!);
          await conn.execute('UPDATE users SET programme_id = ? WHERE openId = ?', [input.programmeId, openId]);
          await conn.end();
        }
        // Eintrag in user_roles anlegen (Multi-Rollen-Modell)
        // Erst Nutzer-ID ermitteln, dann Rolle eintragen
        const newUser = await getUserByEmail(input.email);
        if (newUser) {
          await addUserRole(newUser.id, input.role as AppRole);
        }
        await createAuditLogEntry({
          action: "USER_REGISTERED",
          actorId: 0,
          metadata: { email: input.email, requestedRole: input.role },
        } as any);
        // E-Mail an SuperAdmin(s) senden
        try {
          const { sendEmail } = await import("./emailHelper");
          const { getSuperadminEmails } = await import("./db");
          const superadminEmails = await getSuperadminEmails();
          const roleLabels: Record<string, string> = {
            student: "Studierende:r",
            examiner: "Prüfer:in (Erstprüfer:in)",
            second_examiner: "Zweitprüfer:in",
            admin: "Verwaltung",
          };
          const roleLabel = roleLabels[input.role] ?? input.role;
          const adminUrl = `${process.env.VITE_FRONTEND_FORGE_API_URL ? "" : ""}/admin`;
          for (const adminEmail of superadminEmails) {
            await sendEmail({
              to: adminEmail,
              subject: `[HTW Berlin Thesis Match Maker] Neue Registrierung: ${input.name} (${roleLabel})`,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <h2 style="color:#005B4F">Neue Registrierung wartet auf Freischaltung</h2>
  <p>Eine neue Person hat sich registriert und wartet auf Ihre Freischaltung:</p>
  <table style="border-collapse:collapse;width:100%">
    <tr><td style="padding:8px;font-weight:bold">Name:</td><td style="padding:8px">${input.name}</td></tr>
    <tr><td style="padding:8px;font-weight:bold">E-Mail:</td><td style="padding:8px">${input.email}</td></tr>
    <tr><td style="padding:8px;font-weight:bold">Gewünschte Rolle:</td><td style="padding:8px">${roleLabel}</td></tr>
  </table>
  <p style="margin-top:24px">Bitte melden Sie sich im Admin-Dashboard an, um den Zugang freizuschalten oder abzulehnen.</p>
  <p><a href="/admin" style="background:#005B4F;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Zum Admin-Dashboard</a></p>
  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb">
  <p style="color:#6b7280;font-size:12px">HTW Berlin Thesis Match Maker &ndash; Automatische Benachrichtigung</p>
</div>`,
              text: `Neue Registrierung wartet auf Freischaltung\n\nName: ${input.name}\nE-Mail: ${input.email}\nGewünschte Rolle: ${roleLabel}\n\nBitte melden Sie sich im Admin-Dashboard an, um den Zugang freizuschalten.`,
            });
          }
        } catch (emailErr) {
          console.warn("[Register] SuperAdmin-E-Mail konnte nicht gesendet werden:", emailErr);
        }
        return { success: true };
      }),
    loginWithPassword: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "E-Mail oder Passwort ungültig." });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "E-Mail oder Passwort ungültig." });
        }
        // Freischaltungs-Prüfung
        const roleStatus = (user as any).roleStatus ?? "approved";
        if (roleStatus === "pending") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Ihr Konto wurde noch nicht freigeschaltet. Bitte warten Sie auf die Bestätigung durch die Verwaltung der HTW Berlin.",
          });
        }
        if (roleStatus === "rejected") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Ihr Registrierungsantrag wurde abgelehnt. Bitte wenden Sie sich an die Verwaltung der HTW Berlin.",
          });
        }
        // E-Mail-Domain-Prüfung beim Login:
        // Alle HTW-Domains (@htw-berlin.de, @htw-berlin.com, @student.htw-berlin.de) sind erlaubt.
        // Zweitprüfer:innen und externe Gutachter:innen dürfen beliebige E-Mail-Adressen verwenden.
        const emailLower = input.email.toLowerCase();
        const isHtwLoginEmail = emailLower.endsWith("@htw-berlin.de") || emailLower.endsWith("@htw-berlin.com") || emailLower.endsWith("@student.htw-berlin.de");
        if (user.role !== "second_examiner" && user.role !== "admin" && user.role !== "superadmin" && !isHtwLoginEmail) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Bitte melden Sie sich mit Ihrer HTW-Berlin-E-Mail-Adresse (@htw-berlin.de oder @htw-berlin.com) an.",
          });
        }
        // JWT mit appId erstellen (kompatibel mit sdk.verifySession)
        const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
        const sessionToken = await new SignJWT({
          openId: user.openId,
          appId: process.env.VITE_APP_ID ?? "",
          name: user.name ?? user.email ?? "",
        })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
          .sign(secret);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        // Multi-Rollen: roles[] aus user_roles laden
        const userRolesArr = await getUserRoles(user.id);
        if (userRolesArr.length === 0 && user.role && user.role !== 'user') {
          await addUserRole(user.id, user.role as AppRole);
          userRolesArr.push(user.role as AppRole);
        }
        return { success: true, role: user.role, roles: userRolesArr };
      }),
  }),

  // --- Thesis Requests ------------------------------------------------------

  thesis: router({
    // Student: Neue Anfrage einreichen
    create: studentProcedure
      .input(
        z.object({
          title: z.string().min(1).max(512),
          description: z.string().min(1),
          department: z.string().max(255).optional(),
          abstract: z.string().optional(),
          targetSemester: z.string().optional(),
          language: z.enum(["de", "en"]).default("de"),
          degreeType: z.enum(["bachelor", "master"]).default("bachelor"),
          hasOwnTopic: z.boolean().default(true),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await createThesisRequest({
          studentId: ctx.user.id,
          title: input.title,
          description: input.description,
          department: input.department ?? "",
          abstract: input.abstract ?? "",
          targetSemester: input.targetSemester,
          language: input.language,
          degreeType: input.degreeType,
          hasOwnTopic: input.hasOwnTopic ? 1 : 0,
          status: "PENDING",
        });
        const insertId = (result as { insertId: number }).insertId;
        await createAuditLogEntry({
          thesisRequestId: insertId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "THESIS_CREATED",
          toStatus: "PENDING",
        });
        return { success: true, insertId };
      }),

    // Student: Eigene Anfragen abrufen (mit Erstbetreuer-Name)
    myRequests: studentProcedure.query(async ({ ctx }) => {
      return getThesisRequestsByStudent(ctx.user.id);
    }),
    // Student: Prüfen ob offene Anfrage vorhanden
    hasOpenRequest: studentProcedure.query(async ({ ctx }) => {
      return hasOpenThesisRequest(ctx.user.id);
    }),

    // Prüfer: Eigene Betreuungen abrufen
    examinerRequests: examinerProcedure.query(async ({ ctx }) => {
      return getThesisRequestsByExaminer(ctx.user.id);
    }),

    // Admin: Alle Anfragen abrufen
    all: adminProcedure.query(async () => {
      return getAllThesisRequests();
    }),

    // Prüfer:in: Eigene Anfrage annehmen oder ablehnen
    examinerRespond: examinerProcedure
      .input(
        z.object({
          id: z.number(),
          action: z.enum(["accept", "reject"]),
          rejectionReason: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await getThesisRequestById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

        const isWantedExaminer = (existing as any).wantedExaminerId === ctx.user.id;
        const isAssignedExaminer = existing.examinerId === ctx.user.id || existing.secondExaminerId === ctx.user.id;
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "superadmin";

        if (!isWantedExaminer && !isAssignedExaminer && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Diese Anfrage ist Ihnen nicht zugewiesen." });
        }

        // Statusübergang: PENDING_FIRST_EXAMINER → FIRST_EXAMINER_ACCEPTED / FIRST_EXAMINER_REJECTED
        //                 PENDING / sonstige    → ACCEPTED / REJECTED
        let newStatus: string;
        let auditAction: string;
        if (existing.status === "PENDING_FIRST_EXAMINER") {
          if (input.action === "accept") {
            const { acceptThesisRequest } = await import("./db");
            await acceptThesisRequest(input.id, ctx.user.id);
            newStatus = "FIRST_EXAMINER_ACCEPTED";
            auditAction = "EXAMINER_ACCEPTED";
          } else {
            const { rejectThesisRequest } = await import("./db");
            await rejectThesisRequest(input.id, input.rejectionReason);
            newStatus = "FIRST_EXAMINER_REJECTED";
            auditAction = "EXAMINER_REJECTED";
          }
        } else {
          newStatus = input.action === "accept" ? "ACCEPTED" : "REJECTED";
          auditAction = input.action === "accept" ? "EXAMINER_ACCEPTED" : "EXAMINER_REJECTED";
          await updateThesisRequestStatus(input.id, newStatus as any, {
            rejectionReason: input.rejectionReason,
          });
        }

        await createAuditLogEntry({
          thesisRequestId: input.id,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: auditAction,
          fromStatus: existing.status,
          toStatus: newStatus,
          reason: input.rejectionReason,
        });
        // In-App-Benachrichtigung
        // Bei PENDING_FIRST_EXAMINER ist examinerId noch null – nur Studierenden benachrichtigen
        await notifyThesisParticipants({
          thesisRequestId: input.id,
          studentId: existing.studentId,
          examinerId: existing.examinerId ?? null,
          secondExaminerId: existing.secondExaminerId,
          title: input.action === "accept" ? "Anfrage angenommen" : "Anfrage abgelehnt",
          message: `Ihre Anfrage "${existing.title}" wurde ${input.action === "accept" ? "angenommen" : "abgelehnt"}.${input.rejectionReason ? ` Begründung: ${input.rejectionReason}` : ""}`,
          type: "status_change",
        });
        return { success: true };
      }),

    // Admin: Status ändern (mit AuditLog + Benachrichtigungen)
    updateStatus: adminProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "MATCHED"]),
          reason: z.string().optional(),
          origin: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await getThesisRequestById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

        await updateThesisRequestStatus(input.id, input.status, {
          rejectionReason: input.reason,
        });
        await createAuditLogEntry({
          thesisRequestId: input.id,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "STATUS_CHANGED",
          fromStatus: existing.status,
          toStatus: input.status,
          reason: input.reason,
        });

        // In-App-Benachrichtigung + E-Mail
        if (["ACCEPTED", "REJECTED", "MATCHED"].includes(input.status)) {
          const statusLabel: Record<string, string> = {
            ACCEPTED: "Angenommen",
            REJECTED: "Abgelehnt",
            MATCHED: "Matched",
          };
          await notifyThesisParticipants({
            thesisRequestId: input.id,
            studentId: existing.studentId,
            examinerId: existing.examinerId,
            secondExaminerId: existing.secondExaminerId,
            title: `Status geändert: ${statusLabel[input.status] ?? input.status}`,
            message: `"${existing.title}" hat den Status ${statusLabel[input.status] ?? input.status} erhalten.${input.reason ? ` Begründung: ${input.reason}` : ""}`,
            type: "status_change",
          });
          const student = await getUserById(existing.studentId);
          const origin = input.origin ?? "https://thesis-match.htw-berlin.de";
          if (student?.email) {
            await sendStatusChangeEmail({
              to: student.email,
              studentName: student.name ?? "Studierende:r",
              thesisTitle: existing.title,
              newStatus: input.status as "ACCEPTED" | "REJECTED" | "MATCHED",
              reason: input.reason,
              dashboardUrl: `${origin}/student`,
            });
          }
          // Prüfer:innen benachrichtigen (resolveExaminerEmail bevorzugt alternativeEmail)
          const examinerIds = [existing.examinerId, existing.secondExaminerId].filter(Boolean) as number[];
          for (const exId of examinerIds) {
            const ex = await getUserById(exId);
            if (!ex?.email) continue;
            const exEmailTo = (await resolveExaminerEmail(exId)) ?? ex.email;
            await sendEmail({
              to: exEmailTo,
              subject: `Thesis Match: Statusänderung – ${existing.title}`,
              html: `<p>Guten Tag ${ex.name ?? "Prüfer:in"},</p><p>der Status der Abschlussarbeit <strong>${existing.title}</strong> hat sich geändert: <strong>${input.status}</strong>.</p>${input.reason ? `<p>Begründung: ${input.reason}</p>` : ""}<p>Weitere Details finden Sie im <a href="${origin}/examiner">Prüfer:innen-Dashboard</a>.</p>`,
            });
          }
        }
        return { success: true };
      }),

    // Admin: Prüfer zuweisen (mit AuditLog + JWT-E-Mail + Benachrichtigung)
    assignExaminer: adminProcedure
      .input(
        z.object({
          thesisId: z.number(),
          examinerId: z.number(),
          slot: z.enum(["first", "second"]),
          origin: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const thesis = await getThesisRequestById(input.thesisId);
        if (!thesis) throw new TRPCError({ code: "NOT_FOUND" });
        const examiner = await getUserById(input.examinerId);
        if (!examiner) throw new TRPCError({ code: "NOT_FOUND", message: "Prüfer:in nicht gefunden." });
        const student = await getUserById(thesis.studentId);

        await assignExaminerToThesis(input.thesisId, input.examinerId, input.slot);
        await createAuditLogEntry({
          thesisRequestId: input.thesisId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: input.slot === "first" ? "FIRST_EXAMINER_ASSIGNED" : "SECOND_EXAMINER_ASSIGNED",
          metadata: { examinerId: input.examinerId, slot: input.slot },
        });

        // In-App-Benachrichtigung
        await notifyThesisParticipants({
          thesisRequestId: input.thesisId,
          studentId: thesis.studentId,
          examinerId: input.examinerId,
          title: "Prüfer:in zugewiesen",
          message: `Ihrer Anfrage "${thesis.title}" wurde ${input.slot === "first" ? "eine Erstprüfer:in" : "eine Zweitprüfer:in"} zugewiesen.`,
          type: "examiner_assigned",
        });

        // JWT-CTA-E-Mail an Prüfer:in senden
        // resolveExaminerEmail bevorzugt alternativeEmail aus dem Profil
        if (examiner.email) {
          const emailTo = (await resolveExaminerEmail(input.examinerId)) ?? examiner.email;
          const token = await signExaminerActionToken({
            thesisRequestId: input.thesisId,
            examinerId: input.examinerId,
            action: "accept",
            studentName: student?.name ?? "Studierende:r",
            thesisTitle: thesis.title,
          });
          const origin = input.origin ?? "https://thesis-match.htw-berlin.de";
          await sendExaminerCTAEmail({
            to: emailTo,
            examinerName: examiner.name ?? "Prüfer:in",
            studentName: student?.name ?? "Studierende:r",
            thesisTitle: thesis.title,
            department: thesis.department,
            acceptUrl: `${origin}/examiner/respond?token=${token}&action=accept`,
            rejectUrl: `${origin}/examiner/respond?token=${token}&action=reject`,
          });
        }
        return { success: true };
      }),

    // Einzelne Anfrage abrufen
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getThesisRequestById(input.id);
      }),
  }),

  // --- Examiner -------------------------------------------------------------

  examiner: router({
    // Nur für eingeloggte Nutzer:innen: Alle Prüfer-Profile abrufen
    list: protectedProcedure.query(async () => {
      return getAllExaminers();
    }),

    // Aggregierte Tags / Forschungsschlagworte aller Prüfer:innen
    allTags: protectedProcedure.query(async () => {
      const examiners = await getAllExaminers();
      const tagSet = new Set<string>();
      for (const ex of examiners) {
        const tags = Array.isArray(ex.profile?.tags) ? ex.profile.tags as string[] : [];
        for (const t of tags) tagSet.add(t);
      }
      return Array.from(tagSet).sort();
    }),

    // Prüfer: Eigenes Profil abrufen
    myProfile: anyExaminerProcedure.query(async ({ ctx }) => {
      return getExaminerProfileByUserId(ctx.user.id);
    }),

    // Prüfer: Profil aktualisieren
    updateProfile: anyExaminerProcedure
      .input(
        z.object({
          title: z.string().optional(),
          department: z.string().optional(),
          bio: z.string().optional(),
          tags: z.array(z.string()).optional(),
          languages: z.array(z.string()).optional(),
          studyPrograms: z.array(z.string()).optional(),
          maxSupervisions: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertExaminerProfile({ userId: ctx.user.id, ...input });
        return { success: true };
      }),

    // JWT-gesicherter Endpunkt: Prüfer antwortet per E-Mail-Link (kein Login nötig)
    respondViaToken: publicProcedure
      .input(
        z.object({
          token: z.string(),
          action: z.enum(["accept", "reject"]),
          rejectionReason: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const payload = await verifyExaminerActionToken(input.token);
        if (!payload) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Ungültiger oder abgelaufener Token.",
          });
        }
        const thesis = await getThesisRequestById(payload.thesisRequestId);
        if (!thesis) throw new TRPCError({ code: "NOT_FOUND" });
        const newStatus = input.action === "accept" ? "ACCEPTED" : "REJECTED";
        await updateThesisRequestStatus(payload.thesisRequestId, newStatus, {
          rejectionReason: input.rejectionReason,
        });
        await createAuditLogEntry({
          thesisRequestId: payload.thesisRequestId,
          actorId: payload.examinerId,
          actorRole: "examiner",
          action: input.action === "accept" ? "EXAMINER_ACCEPTED" : "EXAMINER_REJECTED",
          fromStatus: thesis.status,
          toStatus: newStatus,
          reason: input.rejectionReason,
        });
        // In-App-Benachrichtigung
        await notifyThesisParticipants({
          thesisRequestId: payload.thesisRequestId,
          studentId: thesis.studentId,
          examinerId: payload.examinerId,
          title: input.action === "accept" ? "Anfrage angenommen" : "Anfrage abgelehnt",
          message: `Ihre Anfrage "${thesis.title}" wurde ${input.action === "accept" ? "angenommen" : "abgelehnt"}.`,
          type: "status_change",
        });
        return { success: true, action: input.action };
      }),

    // Öffentlich: Einzelnes Prüfer-Profil abrufen (für Profilseite)
    getPublicProfile: publicProcedure
      .input(z.object({ userId: z.number(), viewerToken: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const user = await getUserById(input.userId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Nutzer:in nicht gefunden" });
        const isExaminerRole = user.role === "examiner" || user.role === "second_examiner";
        const isStudentRole = user.role === "student";
        // Prüfer:innen-Profile sind vollständig öffentlich
        // Studierenden-Profile nur sichtbar wenn:
        //   a) Betrachter:in ist die Prüfer:in einer Anfrage des Studierenden, ODER
        //   b) Betrachter:in ist der/die Studierende selbst, ODER
        //   c) Betrachter:in ist Admin/Superadmin
        if (isStudentRole) {
          const viewer = ctx.user;
          if (!viewer) throw new TRPCError({ code: "UNAUTHORIZED", message: "Anmeldung erforderlich." });
          const isSelf = viewer.id === input.userId;
          const isAdmin = viewer.role === "admin" || viewer.role === "superadmin";
          const isExaminerOfStudent = (viewer.role === "examiner" || viewer.role === "second_examiner")
            && await hasSharedThesisRequest(viewer.id, input.userId);
          if (!isSelf && !isAdmin && !isExaminerOfStudent) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Zugriff nicht erlaubt." });
          }
        }
        const examinerProfile = isExaminerRole ? await getExaminerProfileByUserId(input.userId) : null;
        // Semesterkapazitäten und aktive Betreuungslast für Prüfer:innen
        let semesterCapacities: Array<{ semester: string; maxFirst: number; maxSecond: number }> = [];
        let activeFirstCount = 0;
        let activeSecondCount = 0;
        if (isExaminerRole) {
          const { getSemesterCapacities: getSC } = await import("./db");
          const caps = await getSC(input.userId);
          semesterCapacities = caps.map((sc) => ({
            semester: sc.semester,
            maxFirst: sc.adminOverride && sc.adminMaxFirst != null ? sc.adminMaxFirst : sc.maxFirst,
            maxSecond: sc.adminOverride && sc.adminMaxSecond != null ? sc.adminMaxSecond : sc.maxSecond,
          }));
          // Aktive Betreuungslast aus DB
          const { getDb } = await import("./db");
          const dbInstance = await getDb();
          if (dbInstance) {
            const { thesisRequests: trTable } = await import("../drizzle/schema");
            const { inArray } = await import("drizzle-orm");
            const activeStatuses = ["PENDING", "PENDING_FIRST_EXAMINER", "PENDING_SECOND_EXAMINER", "FIRST_EXAMINER_ACCEPTED", "FIRST_EXAMINER_ASSIGNED", "SECOND_EXAMINER_ACCEPTED", "SECOND_EXAMINER_ASSIGNED", "SECOND_EXAMINER_SET", "MATCHED"] as const;
            const activeReqs = await dbInstance
              .select({ examinerId: trTable.examinerId, secondExaminerId: trTable.secondExaminerId })
              .from(trTable)
              .where(inArray(trTable.status, activeStatuses));
            for (const r of activeReqs) {
              if (r.examinerId === input.userId) activeFirstCount++;
              if (r.secondExaminerId === input.userId) activeSecondCount++;
            }
          }
        }
        // Nur öffentliche Felder zurückgeben
        return {
          id: user.id,
          name: user.name,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
          email: user.email,
          role: user.role,
          department: user.department,
          bio: user.bio,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          website: user.website,
          linkedIn: user.linkedIn,
          researchGate: user.researchGate,
          htwProfileUrl: user.htwProfileUrl,
          miscLink: user.miscLink,
          bookingUrl: user.bookingUrl,
          createdAt: user.createdAt,
          // Prüfer:in-spezifische Felder
          academicTitle: examinerProfile?.title ?? null,
          officeHours: examinerProfile?.officeHours ?? null,
          researchFocus: examinerProfile?.researchFocus ?? null,
          researchTags: examinerProfile?.tags ? (Array.isArray(examinerProfile.tags) ? (examinerProfile.tags as string[]).join(", ") : String(examinerProfile.tags)) : null,
          photoUrl: examinerProfile?.photoUrl ?? null,
          websiteUrl: examinerProfile?.websiteUrl ?? null,
          // Kapazitäten
          semesterCapacities,
          activeFirstCount,
          activeSecondCount,
        };
      }),
    // Prüfer: Erweiterte Profil-Felder aktualisieren
    updateProfileExtended: anyExaminerProcedure
      .input(
        z.object({
          title: z.string().optional(),
          department: z.string().optional(),
          bio: z.string().optional(),
          tags: z.array(z.string()).optional(),
          languages: z.array(z.string()).optional(),
          studyPrograms: z.array(z.string()).optional(),
          maxSupervisions: z.number().optional(),
          researchFocus: z.string().optional(),
          officeHours: z.string().optional(),
          websiteUrl: z.string().optional(),
          phone: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertExaminerProfile({ userId: ctx.user.id, ...input });
        return { success: true };
      }),
    // Prüfer:in: Alternative E-Mail-Adresse setzen (für Zweitprüfer:innen mit externer E-Mail)
    setAlternativeEmail: anyExaminerProcedure
      .input(
        z.object({
          alternativeEmail: z.string().email().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateExaminerAlternativeEmail(ctx.user.id, input.alternativeEmail ?? null);
        return { success: true };
      }),

    // Prüfer:in oder Admin: Zweitprüfer:in-Flag setzen
    // Admins können userId angeben, Prüfer:innen setzen ihr eigenes Flag
    setSecondExaminerFlag: anyExaminerProcedure
      .input(
        z.object({
          isSecondExaminer: z.boolean(),
          userId: z.number().optional(), // nur für Admins
        })
      )
      .mutation(async ({ ctx, input }) => {
        const targetUserId = (input.userId && (ctx.user.role === "admin" || ctx.user.role === "superadmin"))
          ? input.userId
          : ctx.user.id;
        await updateExaminerSecondExaminerFlag(targetUserId, input.isSecondExaminer);
        return { success: true };
      }),

    // Prüfer:in: Onboarding abschließen (vollständiger 5-Schritt-Assistent)
    completeOnboarding: anyExaminerProcedure
      .input(
        z.object({
          isSecondExaminer: z.boolean(),
          alternativeEmail: z.string().email().optional().nullable(),
          // Erweiterte Profildaten
          title: z.string().optional(),
          department: z.string().optional(),
          // Multi-Fachbereich
          allowedDepartments: z.array(z.string()).optional(),
          primaryDepartment: z.string().optional(),
          bio: z.string().optional(),
          researchFocus: z.string().optional(),
          officeHours: z.string().optional(),
          websiteUrl: z.string().optional(),
          phone: z.string().optional(),
          languages: z.array(z.string()).optional(),
          maxSupervisions: z.number().int().min(0).max(20).optional(),
          programmeIds: z.array(z.number().int().positive()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { programmeIds, isSecondExaminer, alternativeEmail, allowedDepartments, primaryDepartment, ...profileFields } = input;
        await upsertExaminerProfile({
          userId: ctx.user.id,
          ...profileFields,
          // Primärfachbereich in examiner_profiles.department speichern
          department: primaryDepartment ?? profileFields.department,
          alternativeEmail: alternativeEmail ?? null,
          isSecondExaminer: isSecondExaminer ? 1 : 0,
          onboardingCompleted: 1,
        });
        if (programmeIds && programmeIds.length > 0) {
          await setExaminerProgrammes(ctx.user.id, programmeIds);
        }
        // Fachbereiche in examiner_departments speichern
        if (allowedDepartments && allowedDepartments.length > 0) {
          const { setExaminerDepartments } = await import("./db");
          await setExaminerDepartments(
            ctx.user.id,
            allowedDepartments,
            primaryDepartment ?? allowedDepartments[0]
          );
        }
        return { success: true };
      }),

    // Admin: JWT-Token für Prüfer generieren (für E-Mail-CTA)
    generateActionToken: adminProcedure
      .input(
        z.object({
          thesisRequestId: z.number(),
          examinerId: z.number(),
          action: z.enum(["accept", "reject"]),
          studentName: z.string(),
          thesisTitle: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const token = await signExaminerActionToken(input);
        return { token };
      }),

    // Phase 28: Examiner-Dashboard für Anfrage-Verwaltung
    getPendingRequests: anyExaminerProcedure.query(async ({ ctx }) => {
      const { getExaminerPendingRequests } = await import("./db");
      return getExaminerPendingRequests(ctx.user.id);
    }),

    getAcceptedRequests: anyExaminerProcedure.query(async ({ ctx }) => {
      const { getExaminerAcceptedRequests } = await import("./db");
      return getExaminerAcceptedRequests(ctx.user.id);
    }),

    getRejectedRequests: anyExaminerProcedure.query(async ({ ctx }) => {
      const { getExaminerRejectedRequests } = await import("./db");
      return getExaminerRejectedRequests(ctx.user.id);
    }),

    getSecondExaminerRequests: anyExaminerProcedure.query(async ({ ctx }) => {
      const { getExaminerSecondExaminerRequests } = await import("./db");
      return getExaminerSecondExaminerRequests(ctx.user.id);
    }),

    getRequestStats: anyExaminerProcedure.query(async ({ ctx }) => {
      const { getExaminerRequestStats } = await import("./db");
      return getExaminerRequestStats(ctx.user.id);
    }),

    // Semesterkapazitäten lesen
    getSemesterCapacities: anyExaminerProcedure.query(async ({ ctx }) => {
      const { getSemesterCapacities } = await import("./db");
      return getSemesterCapacities(ctx.user.id);
    }),

    // Kapazität für ein Semester setzen
    upsertSemesterCapacity: anyExaminerProcedure
      .input(
        z.object({
          semester: z.string().min(4).max(16),
          maxFirst: z.number().int().min(0).max(50),
          maxSecond: z.number().int().min(0).max(50),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { upsertSemesterCapacity } = await import("./db");
        await upsertSemesterCapacity(ctx.user.id, input.semester, input.maxFirst, input.maxSecond);
        return { success: true };
      }),
  }),

  // --- Favorites -----------------------------------------------------------

  favorites: router({
    toggle: studentProcedure
      .input(z.object({ examinerId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return toggleFavorite(ctx.user.id, input.examinerId);
      }),

    list: studentProcedure.query(async ({ ctx }) => {
      const favs = await getFavoritesByStudent(ctx.user.id);
      const examiners = await getAllExaminers();
      return favs.map((fav: { examinerId: number; note: string | null; createdAt: string }) => ({
        ...fav,
        examiner: examiners.find((ex) => ex.user.id === fav.examinerId) ?? null,
      }));
    }),

    updateNote: studentProcedure
      .input(z.object({ examinerId: z.number(), note: z.string().max(512) }))
      .mutation(async ({ ctx, input }) => {
        await updateFavoriteNote(ctx.user.id, input.examinerId, input.note);
        return { success: true };
      }),

    myIds: studentProcedure.query(async ({ ctx }) => {
      const favs = await getFavoritesByStudent(ctx.user.id);
      return favs.map((f: { examinerId: number }) => f.examinerId);
    }),
  }),

  // --- Audit Log ------------------------------------------------------------

  auditLog: router({
    all: adminProcedure.query(async () => {
      return getAllAuditLogs();
    }),
    byThesis: protectedProcedure
      .input(z.object({ thesisRequestId: z.number() }))
      .query(async ({ input }) => {
        return getAuditLogByThesis(input.thesisRequestId);
      }),
    /**
     * Kombinierte Historien-Abfrage für Studierende:
     * Gibt Audit-Log-Einträge und Benachrichtigungen chronologisch zusammengeführt zurück.
     */
    studentHistory: protectedProcedure
      .input(z.object({ thesisRequestId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getStudentThesisHistory(input.thesisRequestId, ctx.user.id);
      }),
  }),

  // --- Notifications --------------------------------------------------------

  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getNotificationsByUser(ctx.user.id);
    }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return getUnreadCount(ctx.user.id);
    }),
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await markNotificationRead(input.id, ctx.user.id);
        return { success: true };
      }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  // -  // --- Admin: User-Management & Prüfer-CRUD -------------------------------------------
  admin: router({
    users: adminProcedure.query(async () => {
      return getAllUsersWithProfiles();
    }),
    // Multi-Rollen: Alle Rollen eines Nutzers abrufen
    getUserRoles: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getUserRoles(input.userId);
      }),
    // Multi-Rollen: Rolle hinzufügen
    addUserRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["student", "examiner", "second_examiner", "admin", "user", "superadmin", "pav", "dean", "vice_dean"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await addUserRole(input.userId, input.role as AppRole, ctx.user.id);
        await createAuditLogEntry({
          action: "ROLE_ADDED",
          actorId: ctx.user.id,
          metadata: { userId: input.userId, addedRole: input.role },
        });
        return { success: true };
      }),
    // Multi-Rollen: Rolle entfernen
    removeUserRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["student", "examiner", "second_examiner", "admin", "user", "superadmin", "pav", "dean", "vice_dean"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const currentRoles = await getUserRoles(input.userId);
        if (currentRoles.length <= 1) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Die letzte Rolle kann nicht entfernt werden." });
        }
        await removeUserRole(input.userId, input.role as AppRole);
        await createAuditLogEntry({
          action: "ROLE_REMOVED",
          actorId: ctx.user.id,
          metadata: { userId: input.userId, removedRole: input.role },
        });
        return { success: true };
      }),
    updateUserRole: superadminProcedure
      .input(
        z.object({
          userId: z.number(),
          role: z.enum(["student", "examiner", "second_examiner", "admin", "user", "superadmin", "pav", "dean", "vice_dean"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateUserRole(input.userId, input.role as any);
        await createAuditLogEntry({
          action: "ROLE_CHANGED",
          actorId: ctx.user.id,
          metadata: { userId: input.userId, newRole: input.role },
        });
        return { success: true };
      }),
    createExaminer: adminProcedure
      .input(
        z.object({
          name: z.string().min(2),
          email: z.string().email(),
          title: z.string().optional(),
          department: z.string().optional(),
          bio: z.string().optional(),
          maxSupervisions: z.number().min(1).max(20).optional(),
          tags: z.array(z.string()).optional(),
          languages: z.array(z.string()).optional(),
          studyPrograms: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await createExaminerByAdmin(input);
        await createAuditLogEntry({
          action: "EXAMINER_CREATED",
          actorId: ctx.user.id,
          metadata: { ...result, email: input.email, name: input.name },
        });
        return result;
      }),
    updateExaminer: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          name: z.string().min(2).optional(),
          title: z.string().optional(),
          department: z.string().optional(),
          bio: z.string().optional(),
          maxSupervisions: z.number().min(1).max(20).optional(),
          tags: z.array(z.string()).optional(),
          languages: z.array(z.string()).optional(),
          studyPrograms: z.array(z.string()).optional(),
          role: z.enum(["examiner", "admin", "student", "user"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { userId, ...data } = input;
        await updateExaminerByAdmin(userId, data);
        await createAuditLogEntry({
          action: "EXAMINER_UPDATED",
          actorId: ctx.user.id,
          metadata: { userId, changes: data },
        });
        return { success: true };
      }),
    deleteUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Sie können sich nicht selbst löschen." });
        }
        await deleteUserByAdmin(input.userId);
        await createAuditLogEntry({
          action: "USER_DELETED",
          actorId: ctx.user.id,
          metadata: { deletedUserId: input.userId },
        });
        return { success: true };
      }),
    setDeadline: adminProcedure
      .input(
        z.object({
          thesisId: z.number(),
          deadline: z.string().nullable(), // ISO-String oder null
        })
      )
      .mutation(async ({ ctx, input }) => {
        const thesis = await getThesisRequestById(input.thesisId);
        if (!thesis) throw new TRPCError({ code: "NOT_FOUND" });
        const deadlineDate = input.deadline ? new Date(input.deadline) : null;
        await updateThesisDeadline(input.thesisId, deadlineDate);
        await createAuditLogEntry({
          thesisRequestId: input.thesisId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: deadlineDate ? "DEADLINE_SET" : "DEADLINE_REMOVED",
          metadata: { deadline: input.deadline },
        });
        // Benachrichtigungen an Beteiligte
        await notifyThesisParticipants({
          thesisRequestId: input.thesisId,
          studentId: thesis.studentId,
          examinerId: thesis.examinerId,
          secondExaminerId: thesis.secondExaminerId,
          title: deadlineDate ? "Deadline gesetzt" : "Deadline entfernt",
          message: deadlineDate
            ? `Für Ihre Anfrage "${thesis.title}" wurde eine Deadline gesetzt: ${deadlineDate.toLocaleDateString("de-DE")}.`
            : `Die Deadline für Ihre Anfrage "${thesis.title}" wurde entfernt.`,
          type: "status_change",
        });
        return { success: true };
      }),
    sendInvite: adminProcedure
      .input(
        z.object({
          email: z.string().email(),
          role: z.enum(["student", "examiner"]),
          origin: z.string().url(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { sendMagicLink: sendLink } = await import("./magicLinkAuth");
        const result = await sendLink(input.email, input.role, input.origin);
        await createAuditLogEntry({
          action: "INVITE_SENT",
          actorId: ctx.user.id,
          metadata: { email: input.email, role: input.role },
        });
        return result;
      }),
    stats: adminProcedure.query(async () => {
      return getThesisStats();
    }),

    // Semesterkapazitäten einer Prüferin / eines Prüfers einsehen
    getExaminerCapacities: adminProcedure
      .input(z.object({ examinerId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const { getExaminerSemesterCapacitiesForAdmin } = await import("./db");
        return getExaminerSemesterCapacitiesForAdmin(input.examinerId);
      }),

    // Admin-Override für ein Semester setzen
    overrideExaminerCapacity: adminProcedure
      .input(z.object({
        examinerId: z.number().int().positive(),
        semester: z.string().min(4).max(16),
        maxFirst: z.number().int().min(0).max(99),
        maxSecond: z.number().int().min(0).max(99),
      }))
      .mutation(async ({ ctx, input }) => {
        const { adminOverrideExaminerCapacity } = await import("./db");
        await adminOverrideExaminerCapacity(
          input.examinerId,
          input.semester,
          input.maxFirst,
          input.maxSecond,
          ctx.user.id,
        );
        return { success: true };
      }),

    // Admin-Override für ein Semester zurücksetzen
    resetExaminerCapacityOverride: adminProcedure
      .input(z.object({
        examinerId: z.number().int().positive(),
        semester: z.string().min(4).max(16),
      }))
      .mutation(async ({ input }) => {
        const { resetAdminOverride } = await import("./db");
        await resetAdminOverride(input.examinerId, input.semester);
        return { success: true };
      }),
  }),

  // --- Onboarding: Rolle nach erstem Login setzen ---
  onboarding: router({
    setRole: protectedProcedure
      .input(z.object({ role: z.enum(["student", "examiner"]) }))
      .mutation(async ({ ctx, input }) => {
        await updateUserRole(ctx.user.id, input.role);
        return { success: true, role: input.role };
      }),
  }),
  // --- Kolloquien ---
  colloquium: router({
    all: adminProcedure.query(async () => getAllColloquiums()),
    byThesis: protectedProcedure
      .input(z.object({ thesisRequestId: z.number().int().positive() }))
      .query(async ({ input }) => getColloquiumsByThesis(input.thesisRequestId)),
    create: adminProcedure
      .input(z.object({
        thesisRequestId: z.number().int().positive(),
        title: z.string().min(3).max(512),
        scheduledAt: z.number(),
        location: z.string().max(512).optional(),
        room: z.string().max(256).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createColloquium({
          thesisRequestId: input.thesisRequestId,
          title: input.title,
          scheduledAt: new Date(input.scheduledAt).toISOString().slice(0, 19).replace('T', ' '),
          location: input.location ?? null,
          room: input.room ?? null,
          notes: input.notes ?? null,
          createdById: ctx.user.id,
        });
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "COLLOQUIUM_CREATED",
          metadata: { colloquiumId: id, title: input.title },
        });
        return { id };
      }),
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        status: z.enum(["SCHEDULED", "CANCELLED", "COMPLETED"]),
      }))
      .mutation(async ({ input }) => {
        await updateColloquiumStatus(input.id, input.status);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await deleteColloquium(input.id);
        return { success: true };
      }),
    getIcs: protectedProcedure
      .input(z.object({ colloquiumId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const all = await getAllColloquiums();
        const col = all.find(c => c.id === input.colloquiumId);
        if (!col) throw new TRPCError({ code: "NOT_FOUND", message: "Kolloquium nicht gefunden" });
        const icsContent = createIcsEvent({
          title: col.title,
          start: new Date(col.scheduledAt as string),
          durationMinutes: 60,
          location: [col.location, col.room].filter(Boolean).join(" – ") || undefined,
          description: col.notes || undefined,
        });
        return { icsContent, filename: `kolloquium-${col.id}.ics` };
      }),
    // Studierende: Eigene Kolloquien abrufen
    myStudentColloquiums: studentProcedure.query(async ({ ctx }) => {
      return getColloquiumsByStudent(ctx.user.id);
    }),
    // Prüfer:innen: Eigene Kolloquien abrufen
    myExaminerColloquiums: anyExaminerProcedure.query(async ({ ctx }) => {
      return getColloquiumsByExaminer(ctx.user.id);
    }),
  }),
  // --- Superadmin: Systemkonfiguration ---
  superadmin: router({
    getSettings: superadminProcedure.query(async () => {
      const rows = await getSystemSettings();
      const map: Record<string, string> = {};
      for (const r of rows) map[r.key] = r.value;
      return {
        systemName: map["systemName"] ?? "HTW Berlin Thesis Match Maker",
        contactEmail: map["contactEmail"] ?? "",
        maintenanceMode: map["maintenanceMode"] ?? "false",
        maxSupervisionDefault: map["maxSupervisionDefault"] ?? "5",
        allowStudentRegistration: map["allowStudentRegistration"] ?? "true",
        footerText: map["footerText"] ?? "",
        thesisDeadlineWarningDays: map["thesisDeadlineWarningDays"] ?? "14",
        pdfDisclaimerDe: map["pdfDisclaimerDe"] ?? "Der Thesis Match Maker ist ein Hilfsmittel zur Organisation der Thesisbetreuung. Die Abstimmung erfolgt jedoch ausserhalb der offiziellen Prozesse der HTW Berlin. Aus der erfolgreichen Synchronisierung entsteht kein Anspruch auf eine Thesis im geplanten Semester. Hierzu ist eine Zulassung zur Thesis durch die Verwaltung Ihres Studiengangs erforderlich, die im Nachgang zu diesem Match erfolgt.",
        pdfDisclaimerEn: map["pdfDisclaimerEn"] ?? "The Thesis Match Maker is a tool designed to help organize your thesis supervision. Please note that any arrangements made here take place outside of HTW Berlin's official administrative processes. A successful match via the platform does not guarantee enrollment in your thesis for the planned semester. For this, official admission from your department's degree program administration is required, which must be requested after a match has been made.",
      };
    }),
    updateSettings: superadminProcedure
      .input(
        z.object({
          systemName: z.string().min(1).max(128).optional(),
          contactEmail: z.string().email().or(z.literal("")).optional(),
          maintenanceMode: z.enum(["true", "false"]).optional(),
          maxSupervisionDefault: z.string().optional(),
          allowStudentRegistration: z.enum(["true", "false"]).optional(),
          footerText: z.string().max(512).optional(),
          thesisDeadlineWarningDays: z.string().optional(),
          pdfDisclaimerDe: z.string().max(2000).optional(),
          pdfDisclaimerEn: z.string().max(2000).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const entries = Object.entries(input).filter(([, v]) => v !== undefined) as [string, string][];
        for (const [key, value] of entries) {
          await upsertSystemSetting(key, value, ctx.user.id);
        }
        return { success: true };
      }),

    /** Alle Nutzer:innen mit Rollen (SuperAdmin) */
    listAllUsers: superadminProcedure.query(async () => {
      return getAllUsersWithRoles();
    }),

    /** Rolle eines Nutzers setzen (SuperAdmin) */
    setUserRole: superadminProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          role: z.enum(["student", "examiner", "second_examiner", "pav", "admin", "dean", "vice_dean", "superadmin"]),
        })
      )
      .mutation(async ({ input }) => {
        await setUserRole(input.userId, input.role);
        return { success: true };
      }),

    /** Onboarding-Reset für Prüfer:in (SuperAdmin) */
    resetExaminerOnboarding: superadminProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await resetExaminerOnboarding(input.userId);
        return { success: true };
      }),
    /** Alle PAV-Nutzer:innen mit Studiengaengen */
    getPavUsers: superadminProcedure.query(async () => {
      return getAllPavUsersWithProgrammes();
    }),
    /** PAV einem Studiengang zuweisen */
    assignPavProgramme: superadminProcedure
      .input(z.object({ userId: z.number().int().positive(), programmeId: z.number().int().positive(), origin: z.string().url().optional() }))
      .mutation(async ({ input }) => {
        await superadminAssignPavProgramme(input.userId, input.programmeId);
        // E-Mail an PAV senden
        const pavUser = await getUserById(input.userId);
        const allProgs = await getAllProgrammes();
        const prog = allProgs.find((p) => p.id === input.programmeId);
        if (pavUser?.email && prog) {
          const dashboardUrl = `${input.origin ?? "https://thesismatch.manus.space"}/pav`;
          await sendPavProgrammeAssignmentEmail({
            to: pavUser.email,
            pavName: pavUser.name ?? pavUser.email,
            programmeName: prog.name,
            programmeLevel: prog.level,
            dashboardUrl,
            removed: false,
          });
        }
        return { success: true };
      }),
    /** PAV-Studiengang-Zuweisung entfernen */
    removePavProgramme: superadminProcedure
      .input(z.object({ userId: z.number().int().positive(), programmeId: z.number().int().positive(), origin: z.string().url().optional() }))
      .mutation(async ({ input }) => {
        await superadminRemovePavProgramme(input.userId, input.programmeId);
        // E-Mail an PAV senden
        const pavUser = await getUserById(input.userId);
        const allProgs = await getAllProgrammes();
        const prog = allProgs.find((p) => p.id === input.programmeId);
        if (pavUser?.email && prog) {
          const dashboardUrl = `${input.origin ?? "https://thesismatch.manus.space"}/pav`;
          await sendPavProgrammeAssignmentEmail({
            to: pavUser.email,
            pavName: pavUser.name ?? pavUser.email,
            programmeName: prog.name,
            programmeLevel: prog.level,
            dashboardUrl,
            removed: true,
          });
        }
        return { success: true };
      }),
    /** Alle Prüfer:innen auflisten */
    listExaminers: superadminProcedure
      .input(z.object({ isActive: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        return listExaminers(input);
      }),
    /** Prüfer:innen-Profil bearbeiten */
    updateExaminerProfile: superadminProcedure
      .input(z.object({
        examinerId: z.number().int().positive(),
        title: z.string().optional(),
        department: z.string().optional(),
        bio: z.string().optional(),
        researchFocus: z.string().optional(),
        maxSupervisions: z.number().int().positive().optional(),
      }))
      .mutation(async ({ input }) => {
        const { examinerId, ...data } = input;
        await updateExaminerProfileByAdmin(examinerId, data);
        return { success: true };
      }),
    // toggleExaminerStatus wurde entfernt (isActive-Spalte nicht in DB vorhanden)

    /** Prüfer:innen per CSV/Excel-Daten importieren */
    importExaminers: superadminProcedure
      .input(z.object({
        rows: z.array(z.object({
          name: z.string().min(1),
          email: z.string().email(),
          role: z.enum(["examiner", "second_examiner"]),
          title: z.string().optional(),
          department: z.string().optional(),
          tags: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        let created = 0;
        let updated = 0;
        const errors: string[] = [];
        for (const row of input.rows) {
          try {
            const existing = await getUserByEmail(row.email);
            if (existing) {
              // Nutzer existiert – Rolle und Profil aktualisieren
              await updateUserRole(existing.id, row.role);
              await upsertExaminerProfile({
                userId: existing.id,
                department: row.department ?? null,
                researchFocus: row.tags ?? null,
              });
              if (row.title || row.department) {
                await updateUserFields(existing.id, {
                  academicTitle: row.title ?? undefined,
                  department: row.department ?? undefined,
                });
              }
              updated++;
            } else {
              // Neuen Nutzer anlegen (openId = email, loginMethod = magic_link)
              const openId = `import_${row.email.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}`;
              await upsertUser({
                openId,
                name: row.name,
                email: row.email,
                role: row.role,
                loginMethod: "magic_link",
                roleStatus: "approved",
              });
              const newUser = await getUserByEmail(row.email);
              if (newUser) {
                await upsertExaminerProfile({
                  userId: newUser.id,
                  department: row.department ?? null,
                  researchFocus: row.tags ?? null,
                });
                if (row.title || row.department) {
                  await updateUserFields(newUser.id, {
                    academicTitle: row.title ?? undefined,
                    department: row.department ?? undefined,
                  });
                }
              }
              created++;
            }
          } catch (e: any) {
            errors.push(`${row.email}: ${e.message ?? "Unbekannter Fehler"}`);
          }
        }
        return { created, updated, errors };
      }),

    // --- Phase 39: Superadmin-Rolle-Wechsel ---
    getSuperadminStatus: protectedProcedure
      .query(async ({ ctx }) => {
        return await getSuperadminStatus(ctx.user.id);
      }),

    switchRole: protectedProcedure
      .input(z.object({ targetRole: z.enum(["admin", "examiner", "student"]) }))
      .mutation(async ({ ctx, input }) => {
        const status = await getSuperadminStatus(ctx.user.id);
        if (!status.isSuperadmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Superadmins können die Rolle wechseln" });
        }

        const result = await switchUserRole(ctx.user.id, input.targetRole);
        if (result.success) {
          await logRoleSwitchAction(ctx.user.id, result.previousRole || "user", input.targetRole);
        }
        return result;
      }),

    getRoleSwitchHistory: protectedProcedure
      .query(async ({ ctx }) => {
        const status = await getSuperadminStatus(ctx.user.id);
        if (!status.isSuperadmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Superadmins können die Historie anzeigen" });
        }
        return await getRoleSwitchHistory(ctx.user.id);
      }),

    getAllUsers: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).optional(), offset: z.number().int().min(0).optional() }))
      .query(async ({ ctx, input }) => {
        const status = await getSuperadminStatus(ctx.user.id);
        if (!status.isSuperadmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Superadmins können alle Nutzer anzeigen" });
        }
        return await getAllActiveUsers(input.limit || 50, input.offset || 0);
      }),

    getUserStatistics: protectedProcedure
      .query(async ({ ctx }) => {
        const status = await getSuperadminStatus(ctx.user.id);
        if (!status.isSuperadmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Superadmins können Statistiken anzeigen" });
        }
        return await getUserStatistics();
      }),

    searchUsers: protectedProcedure
      .input(z.object({ query: z.string(), role: z.string().optional(), limit: z.number().int().optional(), offset: z.number().int().optional() }))
      .query(async ({ ctx, input }) => {
        const status = await getSuperadminStatus(ctx.user.id);
        if (!status.isSuperadmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Superadmins können Nutzer suchen" });
        }
        return await searchUsers(input.query, { role: input.role, limit: input.limit, offset: input.offset });
      }),

    getUserDetails: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const status = await getSuperadminStatus(ctx.user.id);
        if (!status.isSuperadmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Superadmins können Nutzer-Details anzeigen" });
        }
        return await getUserDetails(input.userId);
      }),

    getUserActivityLog: protectedProcedure
      .input(z.object({ userId: z.number().int().positive(), limit: z.number().int().optional() }))
      .query(async ({ ctx, input }) => {
        const status = await getSuperadminStatus(ctx.user.id);
        if (!status.isSuperadmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Superadmins können Aktivitaetslogs anzeigen" });
        }
        return await getUserActivityLog(input.userId, input.limit || 20);
      }),

    updateUserStatus: protectedProcedure
      .input(z.object({ userId: z.number().int().positive(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const status = await getSuperadminStatus(ctx.user.id);
        if (!status.isSuperadmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Superadmins koennen Nutzer-Status aendern" });
        }
        return await updateUserStatus(input.userId, input.isActive, ctx.user.id);
      }),
  }),
  // --- System: SMTP-Verbindungstest ---
  system2: router({
    testSmtp: adminProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        try {
          const ok = await sendEmail({
            to: input.email,
            subject: "HTW Berlin Thesis Match Maker – SMTP-Test",
            html: `<div style="font-family:sans-serif;padding:24px"><h2 style="color:#76B900">SMTP-Verbindungstest erfolgreich</h2><p>Diese E-Mail bestätigt, dass der SMTP-Server korrekt konfiguriert ist.</p><p style="color:#888;font-size:12px">HTW Berlin &ndash; Thesis Match Maker</p></div>`,
            text: "SMTP-Verbindungstest erfolgreich. Der SMTP-Server ist korrekt konfiguriert.",
          });
          return { success: ok, message: ok ? "Test-E-Mail erfolgreich versendet." : "SMTP nicht konfiguriert." };
        } catch (err: unknown) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err instanceof Error ? err.message : "SMTP-Fehler" });
        }
      }),
  }),
  // --- Studiengänge ---
  programmes: router({
    list: publicProcedure.query(async () => {
      // Gibt alle Programme inkl. fachbereich zurück
      const mysql2 = await import('mysql2/promise');
      const conn = await mysql2.createConnection(process.env.DATABASE_URL!);
      const [rows] = await conn.execute(
        'SELECT id, name, abbreviation, level, fachbereich, pictogram_url AS pictogramUrl, sort_order AS sortOrder FROM programmes ORDER BY sort_order, name'
      ) as any;
      await conn.end();
      return rows as Array<{ id: number; name: string; abbreviation: string; level: string; fachbereich: string; pictogramUrl: string | null; sortOrder: number }>;
    }),
    setStudentProgramme: protectedProcedure
      .input(z.object({ programmeId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'student') throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur Studierende können einen Studiengang wählen.' });
        const success = await setStudentProgramme(ctx.user.id, input.programmeId);
        if (!success) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Studiengang wurde bereits gesetzt und kann nicht geändert werden.' });
        return { success: true };
      }),
    getMyProgramme: protectedProcedure.query(async ({ ctx }) => {
      const mysql2 = await import('mysql2/promise');
      const conn = await mysql2.createConnection(process.env.DATABASE_URL!);
      const [rows] = await conn.execute(
        'SELECT p.id, p.name, p.abbreviation, p.level, p.pictogram_url AS pictogramUrl, p.sort_order AS sortOrder FROM programmes p INNER JOIN users u ON u.programme_id = p.id WHERE u.id = ?',
        [ctx.user.id]
      ) as any;
      await conn.end();
      return (rows as any[])[0] ?? null;
    }),
    getExaminerProgrammes: protectedProcedure.query(async ({ ctx }) => {
      return getExaminerProgrammes(ctx.user.id);
    }),
    setExaminerProgrammes: protectedProcedure
      .input(z.object({ programmeIds: z.array(z.number().int().positive()) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'examiner' && ctx.user.role !== 'admin' && ctx.user.role !== 'superadmin')
          throw new TRPCError({ code: 'FORBIDDEN' });
        await setExaminerProgrammes(ctx.user.id, input.programmeIds);
        return { success: true };
      }),
  }),

  // ─── PAV Router ────────────────────────────────────────────────────────────
  pav: router({
    /** Unzugeteilte Studierende (kein Erst-/Zweitprüfer:in) */
    getUnassignedStudents: pavProcedure.query(async () => {
      return getUnassignedStudents();
    }),

    /** Eigene Vorschläge des PAV */
    getProposals: pavProcedure.query(async ({ ctx }) => {
      return getPavProposalsByPav(ctx.user.id);
    }),

    /** PAV-Studiengang-Zuordnungen lesen */
    getProgrammes: pavProcedure.query(async ({ ctx }) => {
      return getPavProgrammes(ctx.user.id);
    }),

    /** Studiengang hinzufügen */
    addProgramme: pavProcedure
      .input(z.object({ programmeId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await addPavProgramme(ctx.user.id, input.programmeId);
        return { success: true };
      }),

    /** Studiengang entfernen */
    removeProgramme: pavProcedure
      .input(z.object({ programmeId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await removePavProgramme(ctx.user.id, input.programmeId);
        return { success: true };
      }),

    /** Unzugeteilte Studierende (gefiltert nach PAV-Studiengängen) */
    getUnassignedStudentsFiltered: pavProcedure.query(async ({ ctx }) => {
      return getUnassignedStudentsByPavProgrammes(ctx.user.id);
    }),

    /** Prüfer:in vorschlagen (max. 3 offene Anfragen pro Antrag) */
    proposeExaminer: pavProcedure
      .input(
        z.object({
          thesisRequestId: z.number().int().positive(),
          examinerId: z.number().int().positive(),
          examinerRole: z.enum(["first", "second"]),
          origin: z.string().url(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Maximal 3 offene Anfragen gleichzeitig
        const openCount = await countOpenPavProposals(input.thesisRequestId);
        if (openCount >= 3) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Es sind bereits 3 offene Anfragen für diesen Antrag vorhanden. Bitte warten Sie auf eine Antwort.",
          });
        }
        const crypto = await import("crypto");
        const token = crypto.randomBytes(32).toString("hex");
        await createPavProposal({
          thesisRequestId: input.thesisRequestId,
          proposedByPavId: ctx.user.id,
          examinerId: input.examinerId,
          examinerRole: input.examinerRole,
          actionToken: token,
          emailSentAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        });
        // E-Mail an Prüfer:in
        const examinerEmail = await resolveExaminerEmail(input.examinerId);
        const thesis = await getThesisRequestById(input.thesisRequestId);
        if (examinerEmail && thesis) {
          const { sendEmail } = await import("./emailHelper");
          const acceptUrl = `${input.origin}/pav/respond?token=${token}&action=accept`;
          const declineUrl = `${input.origin}/pav/respond?token=${token}&action=decline`;
          await sendEmail({
            to: examinerEmail,
            subject: `HTW Berlin – Anfrage als ${input.examinerRole === "first" ? "Erstprüfer:in" : "Zweitprüfer:in"}: ${thesis.title}`,
            html: `<p>Sehr geehrte Damen und Herren,</p>
<p>der Prüfungsausschuss hat Sie als <strong>${input.examinerRole === "first" ? "Erstprüfer:in" : "Zweitprüfer:in"}</strong> für folgende Abschlussarbeit vorgeschlagen:</p>
<p><strong>${thesis.title}</strong></p>
<p>Bitte nehmen Sie die Anfrage an oder lehnen Sie sie ab:</p>
<p><a href="${acceptUrl}">Anfrage annehmen</a> &nbsp;|&nbsp; <a href="${declineUrl}">Anfrage ablehnen</a></p>
<p>Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsausschuss</p>`,
          });
        }
        return { success: true };
      }),

    /** Prüfer:in antwortet auf Vorschlag (per Token-Link) */
    respondToProposal: publicProcedure
      .input(
        z.object({
          token: z.string().min(1),
          action: z.enum(["accept", "decline"]),
          declineReason: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const proposal = await getPavProposalByToken(input.token);
        if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "Ungültiger oder abgelaufener Link." });
        if (proposal.status !== "pending") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Diese Anfrage wurde bereits beantwortet." });
        }
        if (input.action === "accept") {
          await updatePavProposalStatus(proposal.id, "accepted");
          await assignExaminerFromProposal(proposal.thesisRequestId, proposal.examinerId, proposal.examinerRole);
        } else {
          await updatePavProposalStatus(proposal.id, "declined", input.declineReason);
        }
        return { success: true, action: input.action };
      }),

    /** Alle Anträge mit ausstehender Anmeldefähigkeit */
    getPendingEnrollmentEligibility: pavProcedure.query(async ({ ctx }) => {
      return getRequestsPendingEnrollmentEligibility(ctx.user.id);
    }),
    /** Alle Anträge mit ausstehender Verteidigungsfähigkeit */
    getPendingDefenseEligibility: pavProcedure.query(async ({ ctx }) => {
      return getRequestsPendingDefenseEligibility(ctx.user.id);
    }),
    /** Anmeldefähigkeit bestätigen oder ablehnen */
    setEnrollmentEligibility: pavProcedure
      .input(z.object({
        thesisRequestId: z.number().int().positive(),
        eligibility: z.enum(["approved", "rejected"]),
        note: z.string().max(512).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const thesis = await getThesisRequestById(input.thesisRequestId);
        if (!thesis) throw new TRPCError({ code: "NOT_FOUND", message: "Antrag nicht gefunden." });
        await setEnrollmentEligibility(input.thesisRequestId, input.eligibility, ctx.user.id, input.note);
        if (input.eligibility === "rejected") {
          await updateThesisRequestStatus(input.thesisRequestId, "REJECTED", { rejectionReason: input.note ?? "Anmeldefähigkeit nicht bestätigt." });
        }
        const student = await getUserById(thesis.studentId);
        if (student?.email) {
          const statusText = input.eligibility === "approved"
            ? "Ihre Anmeldefähigkeit wurde bestätigt. Ihr Antrag wird nun weiterbearbeitet."
            : `Ihre Anmeldefähigkeit wurde nicht bestätigt. Ihr Antrag wurde abgelehnt.${input.note ? " Begründung: " + input.note : ""}`;
          await sendEmail({
            to: student.email,
            subject: `HTW Berlin – Anmeldefähigkeit: ${thesis.title}`,
            html: `<p>Sehr geehrte/r ${student.name ?? "Studierende/r"},</p><p>${statusText}</p><p>Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung</p>`,
          });
        }
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          actorRole: "pav",
          action: input.eligibility === "approved" ? "ENROLLMENT_ELIGIBILITY_APPROVED" : "ENROLLMENT_ELIGIBILITY_REJECTED",
          reason: input.note,
        });
        return { success: true };
      }),
    /** Verteidigungsfähigkeit bestätigen oder blockieren */
    setDefenseEligibility: pavProcedure
      .input(z.object({
        thesisRequestId: z.number().int().positive(),
        eligibility: z.enum(["approved", "blocked"]),
        note: z.string().max(512).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const thesis = await getThesisRequestById(input.thesisRequestId);
        if (!thesis) throw new TRPCError({ code: "NOT_FOUND", message: "Antrag nicht gefunden." });
        await setDefenseEligibility(input.thesisRequestId, input.eligibility, ctx.user.id, input.note);
        const student = await getUserById(thesis.studentId);
        if (student?.email) {
          const statusText = input.eligibility === "approved"
            ? "Sie sind prüfungsfähig. Ihr Kolloquium kann geplant werden."
            : `Sie sind derzeit nicht prüfungsfähig (Student not legally qualified to take final exam).${input.note ? " Begründung: " + input.note : ""} Bitte wenden Sie sich an die Prüfungsverwaltung.`;
          await sendEmail({
            to: student.email,
            subject: `HTW Berlin – Prüfungsfähigkeit: ${thesis.title}`,
            html: `<p>Sehr geehrte/r ${student.name ?? "Studierende/r"},</p><p>${statusText}</p><p>Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsverwaltung</p>`,
          });
        }
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          actorRole: "pav",
          action: input.eligibility === "approved" ? "DEFENSE_ELIGIBILITY_APPROVED" : "DEFENSE_ELIGIBILITY_BLOCKED",
          reason: input.note,
        });
        return { success: true };
      }),
    /** Entscheidungshistorie für einen Antrag abrufen */
    getDecisionHistory: pavProcedure
      .input(z.object({ thesisRequestId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getAdminDecisionHistory(input.thesisRequestId);
      }),

    /** PAV weist Prüfer:in direkt zu (ohne Rückfrage-E-Mail) */
    directAssignExaminer: pavProcedure
      .input(
        z.object({
          thesisRequestId: z.number().int().positive(),
          examinerId: z.number().int().positive(),
          examinerRole: z.enum(["first", "second"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const thesis = await getThesisRequestById(input.thesisRequestId);
        if (!thesis) throw new TRPCError({ code: "NOT_FOUND", message: "Antrag nicht gefunden." });
        if (input.examinerRole === "first" && thesis.examinerId) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Dieser Antrag hat bereits eine Erstprüfer:in." });
        }
        if (input.examinerRole === "second" && thesis.secondExaminerId) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Dieser Antrag hat bereits eine Zweitprüfer:in." });
        }
        await assignExaminerFromProposal(input.thesisRequestId, input.examinerId, input.examinerRole);
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "EXAMINER_ASSIGNED",
          metadata: { examinerId: input.examinerId, slot: input.examinerRole, assignedByPav: true, directAssignment: true },
        });
        // Benachrichtigungs-E-Mail an Prüfer:in
        const examinerEmail = await resolveExaminerEmail(input.examinerId);
        if (examinerEmail) {
          await sendEmail({
            to: examinerEmail,
            subject: `HTW Berlin – Sie wurden als ${input.examinerRole === "first" ? "Erstprüfer:in" : "Zweitprüfer:in"} zugewiesen: ${thesis.title ?? "Abschlussarbeit"}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
<div style="background:#006937;padding:24px;text-align:center"><h1 style="color:white;margin:0;font-size:20px">HTW Berlin – Thesis Match Maker</h1></div>
<div style="padding:32px;background:#f9f9f9">
<p>Sehr geehrte Damen und Herren,</p>
<p>der Prüfungsausschuss hat Sie als <strong>${input.examinerRole === "first" ? "Erstprüfer:in" : "Zweitprüfer:in"}</strong> für folgende Abschlussarbeit direkt zugewiesen:</p>
<p><strong>${thesis.title ?? "Abschlussarbeit"}</strong></p>
<p>Diese Zuweisung ist verbindlich und erfordert keine weitere Bestätigung Ihrerseits. Bei Rückfragen wenden Sie sich bitte an den Prüfungsausschuss.</p>
<p>Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsausschuss</p>
</div></div>`,
          });
        }
        return { success: true };
      }),
  }),

  // ─── Dekanat Router ────────────────────────────────────────────────────────
  dean: router({
    /** Alle Anträge lesen (Lesezugriff für Dekan/Prodekan) */
    getAllRequests: deanProcedure.query(async () => {
      return getAllThesisRequestsForDean();
    }),

    /** Einzelner Antrag mit Details (Prüfer:innen, Statushistorie, Kolloquium) */
    getRequestDetail: deanProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getThesisRequestDetailForDean(input.requestId);
      }),
    /** Statistiken für das Dekanat-Dashboard */
    stats: deanProcedure.query(async () => {
      return getDeanStats();
    }),

    /** CSV-Export – optional gefiltert nach Status und Suchbegriff */
    exportCsv: deanProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const rows = await getAllThesisRequestsForCsv();
        // Filtern
        const filtered = rows.filter((r) => {
          const matchesStatus = !input?.status || input.status === "all" || r.status === input.status;
          const q = (input?.search ?? "").toLowerCase();
          const matchesSearch = !q ||
            (r.title ?? "").toLowerCase().includes(q) ||
            (r.studentName ?? "").toLowerCase().includes(q) ||
            (r.department ?? "").toLowerCase().includes(q);
          return matchesStatus && matchesSearch;
        });
        const header = [
          "ID","Titel","Studiengang","Abschluss","Status","Sprache","Eigenes Thema","Erstellt am","Abgabefrist","Letzte Status\u00e4nderung","Anzahl Status\u00e4nderungen","Studierende:r","E-Mail"
        ].join(";");
        const csvRows = filtered.map((r) => [
          r.id,
          `"${(r.title ?? "").replace(/"/g, '""')}"`,
          `"${(r.department ?? "").replace(/"/g, '""')}"`,
          r.degreeType,
          r.status,
          r.language,
          r.hasOwnTopic ? "Ja" : "Nein",
          r.createdAt ? new Date(r.createdAt).toLocaleDateString("de-DE") : "",
          r.deadline ? new Date(r.deadline).toLocaleDateString("de-DE") : "",
          (r as any).lastStatusChange ? new Date((r as any).lastStatusChange).toLocaleDateString("de-DE") : "",
          (r as any).statusChangeCount ?? 0,
          `"${(r.studentName ?? "").replace(/"/g, '""')}"`,
          r.studentEmail,
        ].join(";"));
        return { csv: [header, ...csvRows].join("\n"), count: filtered.length };
      }),
  }),

  // ─── Verwaltungsworkflow: Anmeldung & Zulassung ──────────────────────────
  adminWorkflow: router({
    /** Alle offiziell angemeldeten/zugelassenen Arbeiten */
    getRegisteredTheses: pavProcedure.query(async () => {
      return getRegisteredTheses();
    }),

    /** Arbeit offiziell anmelden (Zulassung ausstehend) */
    registerThesis: pavProcedure
      .input(z.object({ thesisRequestId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await setOfficialRegistration(input.thesisRequestId, ctx.user.id);
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "STATUS_CHANGED",
          metadata: { officialStatus: "registered", note: "Arbeit offiziell angemeldet, Zulassung ausstehend" },
        });
        return { success: true };
      }),

    /** Thesis zulassen und Abgabedatum setzen */
    admitThesis: pavProcedure
      .input(z.object({
        thesisRequestId: z.number().int().positive(),
        submissionDeadline: z.string(),
        note: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await setAdmission(input.thesisRequestId, ctx.user.id, input.submissionDeadline, input.note);
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "STATUS_CHANGED",
          metadata: { officialStatus: "admitted", submissionDeadline: input.submissionDeadline, note: input.note },
        });
        return { success: true };
      }),

    /** Abgabefrist verlängern */
    extendDeadline: pavProcedure
      .input(z.object({
        thesisRequestId: z.number().int().positive(),
        newDeadline: z.string(),
        reason: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        await extendDeadline(input.thesisRequestId, ctx.user.id, input.newDeadline, input.reason);
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "STATUS_CHANGED",
          metadata: { action: "deadline_extended", newDeadline: input.newDeadline, reason: input.reason },
        });
        return { success: true };
      }),

    /** Verteidigungsdatum eintragen */
    setDefenseDate: pavProcedure
      .input(z.object({
        thesisRequestId: z.number().int().positive(),
        defenseDate: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        await setDefenseDate(input.thesisRequestId, ctx.user.id, input.defenseDate);
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "STATUS_CHANGED",
          metadata: { action: "defense_date_set", defenseDate: input.defenseDate },
        });
        return { success: true };
      }),

    /** Akte vollständig übermitteln */
    closeCase: pavProcedure
      .input(z.object({ thesisRequestId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await closeCase(input.thesisRequestId, ctx.user.id);
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "STATUS_CHANGED",
          metadata: { officialStatus: "case_closed", note: "Akte vollständig übermittelt" },
        });
        return { success: true };
      }),

    /** Abgabefrist-Änderungsprotokoll abrufen */
    getDeadlineChanges: pavProcedure
      .input(z.object({ thesisRequestId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getDeadlineChanges(input.thesisRequestId);
      }),
  }),

  // ─── E-Mail-Vorlagen (Superadmin) ─────────────────────────────────────────
    emailTemplates: router({
    /** Alle Vorlagen abrufen */
    getAll: adminProcedure.query(async () => {
      return getAllEmailTemplates();
    }),
    /** Einzelne Vorlage abrufen */
    getByKey: adminProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return getEmailTemplateByKey(input.key);
      }),
    /** Vorlage aktualisieren */
    update: adminProcedure
      .input(z.object({
        key: z.string(),
        subject: z.string().optional(),
        htmlBody: z.string().optional(),
        textBody: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await updateEmailTemplate(
          input.key,
          { subject: input.subject, htmlBody: input.htmlBody, textBody: input.textBody },
          ctx.user.id
        );
        return { success: true };
      }),
  }),

  // ─── Admin-Erweiterung: Onboarding-Reset ──────────────────────────────────
  adminExtra: router({
    resetExaminerOnboarding: adminProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await resetExaminerOnboarding(input.userId);
        return { success: true };
      }),
  }),
  // ─── Phase 27: Anfrageprozess-Verbesserungen ──────────────────────────────
  thesisPhase27: router({
    // Student: Qualifizierte Gutachter:innen für Studiengang abrufen
    getQualifiedExaminers: studentProcedure
      .input(z.object({ department: z.string() }))
      .query(async ({ input }) => {
        return getQualifiedExaminers(input.department);
      }),

    // Student: Zweitgutachter:innen (intern/extern) abrufen
    getSecondExaminers: studentProcedure
      .input(z.object({ department: z.string() }))
      .query(async ({ input }) => {
        return getSecondExaminers(input.department);
      }),

    // Student: Neue Anfrage mit Wunschgutachter
    createWithWantedExaminer: studentProcedure
      .input(z.object({
        title: z.string().min(1).max(512),
          description: z.string().min(1),
          department: z.string().max(255).optional(),
          abstract: z.string().optional(),
          targetSemester: z.string(),
          language: z.enum(["de", "en"]).default("de"),
          degreeType: z.enum(["bachelor", "master"]).default("bachelor"),
          wantedExaminerId: z.number().int().positive(),
        exposeUrl: z.string().optional(),
        exposeKey: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        
        // Prüfe ob Student offene Anfrage hat
        if (await hasOpenThesisRequest(ctx.user.id)) {
          throw new TRPCError({ code: "CONFLICT", message: "Student hat bereits eine offene Anfrage" });
        }

        const result = await createThesisRequest({
          studentId: ctx.user.id,
          wantedExaminerId: input.wantedExaminerId,
          title: input.title,
          description: input.description,
          department: input.department ?? "",
          abstract: input.abstract ?? "",
          targetSemester: input.targetSemester,
          language: input.language,
          degreeType: input.degreeType,
          exposeUrl: input.exposeUrl,
          exposeKey: input.exposeKey,
          status: "PENDING_FIRST_EXAMINER",
        });

        const insertId = (result as { insertId: number }).insertId;
        
        // Erstelle Action Token für Accept/Reject
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 Tage gültig
        const token = await createExaminerActionToken(insertId, input.wantedExaminerId, expiresAt);

        await createAuditLogEntry({
          thesisRequestId: insertId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "THESIS_CREATED_WITH_WANTED_EXAMINER",
          toStatus: "PENDING_FIRST_EXAMINER",
        });

        return { success: true, insertId, token };
      }),

    // Student: Anfrage zurückziehen
    withdraw: studentProcedure
      .input(z.object({ thesisRequestId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        try {
          await withdrawThesisRequest(input.thesisRequestId, ctx.user.id);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg === "Anfrage nicht gefunden") {
            throw new TRPCError({ code: "NOT_FOUND", message: msg });
          }
          if (msg === "Keine Berechtigung") {
            throw new TRPCError({ code: "FORBIDDEN", message: msg });
          }
          if (msg === "Anfrage kann nicht mehr zurückgezogen werden") {
            throw new TRPCError({ code: "BAD_REQUEST", message: msg });
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
        }
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "THESIS_WITHDRAWN",
          toStatus: "WITHDRAWN",
        });
        // Alle Verifikations-Token für diesen Antrag widerrufen
        await invalidateDocTokensForRequest(input.thesisRequestId);
        return { success: true };
      }),

    // Gutachter:in: Anfrage akzeptieren (via Token)
    acceptRequest: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        
        const tokenData = await verifyExaminerActionToken(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Token ungültig oder abgelaufen" });
        }

        await acceptThesisRequest(tokenData.thesisRequestId, tokenData.examinerId);
        await markTokenAsUsed(input.token);
        await createAuditLogEntry({
          thesisRequestId: tokenData.thesisRequestId,
          actorId: tokenData.examinerId,
          actorRole: "examiner",
          action: "THESIS_ACCEPTED",
          toStatus: "FIRST_EXAMINER_ACCEPTED",
        });

        return { success: true, thesisRequestId: tokenData.thesisRequestId };
      }),

    // Gutachter:in: Anfrage ablehnen (via Token)
    rejectRequest: publicProcedure
      .input(z.object({ token: z.string(), reason: z.string().optional() }))
      .mutation(async ({ input }) => {
        
        const tokenData = await verifyExaminerActionToken(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Token ungültig oder abgelaufen" });
        }

        await rejectThesisRequest(tokenData.thesisRequestId, input.reason);
        await markTokenAsUsed(input.token);
        await createAuditLogEntry({
          thesisRequestId: tokenData.thesisRequestId,
          actorId: tokenData.examinerId,
          actorRole: "examiner",
          action: "THESIS_REJECTED",
          toStatus: "FIRST_EXAMINER_REJECTED",
          reason: input.reason,
        });

        return { success: true, thesisRequestId: tokenData.thesisRequestId };
      }),

    // Student: Zweitgutachter speichern nach Akzeptanz des Erstgutachters
    setSecondExaminer: studentProcedure
      .input(z.object({
        thesisRequestId: z.number().int().positive(),
        secondExaminerId: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        
        await setSecondExaminer(input.thesisRequestId, input.secondExaminerId);
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "SECOND_EXAMINER_SET",
          toStatus: "PENDING_SECOND_EXAMINER",
        });

        return { success: true };
      }),

    // Student: Alle Erstgutachter:innen abrufen (role=examiner)
    getFirstExaminers: studentProcedure
      .query(async () => {
        return getFirstExaminers();
      }),

    // Student: Zweitgutachter-Kandidaten gefiltert nach Erstgutachter-Präferenzen
    getFilteredSecondExaminers: studentProcedure
      .input(z.object({ firstExaminerId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getFilteredSecondExaminers(input.firstExaminerId);
      }),

    // Alle Zweitgutachter-Kandidaten (ohne Filter) – zugänglich für Studierende und Prüfer:innen
    getAllSecondExaminerCandidates: protectedProcedure
      .query(async () => {
        return getAllSecondExaminerCandidates();
      }),

    // Student: Zweitgutachter-Wunsch für eine Anfrage setzen
    setWantedSecondExaminer: studentProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        secondExaminerId: z.number().int().positive().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await setWantedSecondExaminer(input.requestId, ctx.user.id, input.secondExaminerId);
        if (!result.success) {
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        }
        return { success: true };
      }),

    // Erstgutachter:in: Eigene Kommissionspräferenzen abrufen
    getCommissionPreferences: protectedProcedure
      .query(async ({ ctx }) => {
        return getCommissionPreferences(ctx.user.id);
      }),

    // Erstgutachter:in: Eigene Kommissionspräferenzen setzen
    setCommissionPreferences: protectedProcedure
      .input(z.object({ secondExaminerIds: z.array(z.number().int().positive()) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "examiner" && ctx.user.role !== "admin" && ctx.user.role !== "superadmin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Erstprüfer:innen können Kommissionspräferenzen setzen." });
        }
        const success = await setCommissionPreferences(ctx.user.id, input.secondExaminerIds);
        return { success };
      }),
  }),

  // ─── Phase 33: Admin-Reporting-Dashboard ──────────────────────────────────
  reporting: router({
    // Statistiken für Zeitraum mit Filtern
    getStatsByPeriod: adminProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
        department: z.string().optional(),
        status: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return getThesisStatsByPeriod(input.startDate, input.endDate, {
          department: input.department,
          status: input.status,
        });
      }),

    // Statistiken pro Fachbereich
    getStatsByFaculty: adminProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return getThesisStatsByFaculty(input.startDate, input.endDate);
      }),

    // Statistiken pro Status
    getStatsByStatus: adminProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return getThesisStatsByStatus(input.startDate, input.endDate);
      }),

    // Durchschnittliche Bearbeitungszeit
    getAverageProcessingTime: adminProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return getAverageProcessingTime(input.startDate, input.endDate);
      }),

    // Abbruchquote
    getDropoutRate: adminProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return getDropoutRate(input.startDate, input.endDate);
      }),

    // Prüfer:innen-Auslastung
    getExaminerWorkload: adminProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return getExaminerWorkload(input.startDate, input.endDate);
      }),

    // CSV-Export
    exportCSV: adminProcedure
      .input(z.object({
        reportType: z.enum(["requests", "examiners", "audit"]),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        const csv = await generateCSVReport(
          input.reportType,
          input.startDate,
          input.endDate
        );
        return { csv };
      }),
  }),

  // ─── Phase 34: Bulk-Aktionen für Prüfer:innen ──────────────────────────────
  // ─── Phase 35: Automatische Erinnerungs-E-Mails ──────────────────────────────
  // ─── Phase 36: Erweiterte Filterung und Suche ──────────────────────────────
  search: router({
    // Thesis-Anfragen durchsuchen
    searchThesis: protectedProcedure
      .input(z.object({
        query: z.string().optional(),
        filters: z.object({
          status: z.array(z.string()).optional(),
          semester: z.array(z.string()).optional(),
          department: z.array(z.string()).optional(),
          language: z.array(z.string()).optional(),
          dateFrom: z.date().optional(),
          dateTo: z.date().optional(),
        }).optional(),
      }))
      .query(async ({ input }) => {
        const results = await searchThesisRequests(input.query || "", input.filters);
        return results;
      }),

    // Prüfer:innen durchsuchen
    searchExaminers: protectedProcedure
      .input(z.object({
        query: z.string().optional(),
        filters: z.object({
          language: z.array(z.string()).optional(),
          department: z.array(z.string()).optional(),
        }).optional(),
      }))
      .query(async ({ input }) => {
        const results = await searchExaminers(input.query || "", input.filters);
        return results;
      }),

    // Studierende durchsuchen
    searchStudents: adminProcedure
      .input(z.object({
        query: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const results = await searchStudents(input.query || "");
        return results;
      }),

    // Gespeicherte Filter erstellen
    createFilter: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        filterConfig: z.object({
          status: z.array(z.string()).optional(),
          semester: z.array(z.string()).optional(),
          department: z.array(z.string()).optional(),
          language: z.array(z.string()).optional(),
          dateFrom: z.date().optional(),
          dateTo: z.date().optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await createSavedFilter(ctx.user.id, input.name, input.filterConfig);
        return { success: !!result };
      }),

    // Gespeicherte Filter abrufen
    getFilters: protectedProcedure
      .query(async ({ ctx }) => {
        const filters = await getSavedFilters(ctx.user.id);
        return filters;
      }),

    // Gespeicherten Filter löschen
    deleteFilter: protectedProcedure
      .input(z.object({ filterId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const success = await deleteSavedFilter(input.filterId, ctx.user.id);
        return { success };
      }),
  }),

  reminders: router({
    // Erinnerungs-Vorlagen abrufen
    getTemplates: adminProcedure
      .query(async () => {
        const templates = await getReminderTemplates();
        return templates;
      }),

    // Erinnerungs-Vorlage aktualisieren
    updateTemplate: adminProcedure
      .input(z.object({
        templateId: z.number().int().positive(),
        subject: z.string().optional(),
        htmlBody: z.string().optional(),
        textBody: z.string().optional(),
        delayDays: z.number().int().min(0).optional(),
      }))
      .mutation(async ({ input }) => {
        const success = await updateReminderTemplate(input.templateId, {
          subject: input.subject,
          htmlBody: input.htmlBody,
          textBody: input.textBody,
          delayDays: input.delayDays,
        });
        return { success };
      }),

    // Erinnerungs-Historie abrufen
    getHistory: protectedProcedure
      .input(z.object({ thesisRequestId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const history = await getReminderHistory(input.thesisRequestId);
        return history;
      }),

    // Fällige Erinnerungen abrufen (für Heartbeat-Job)
    getDue: adminProcedure
      .query(async () => {
        const reminders = await getRemindersDue();
        return reminders;
      }),
  }),

  bulkActions: router({
    // Mehrfach-Accept
    acceptRequests: examinerProcedure
      .input(z.object({ requestIds: z.array(z.number().int().positive()) }))
      .mutation(async ({ ctx, input }) => {
        // Validiere dass Prüfer:in diese Anfragen bearbeiten darf
        const isValid = await validateBulkOperation(ctx.user.id, input.requestIds);
        if (!isValid) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sie dürfen diese Anfragen nicht bearbeiten" });
        }

        const result = await bulkAcceptRequests(input.requestIds);
        
        // Audit-Log für jede Anfrage
        for (const requestId of input.requestIds) {
          await createAuditLogEntry({
            thesisRequestId: requestId,
            actorId: ctx.user.id,
            actorRole: ctx.user.role,
            action: "BULK_THESIS_ACCEPTED",
            toStatus: "FIRST_EXAMINER_ACCEPTED",
          });
        }

        return result;
      }),

    // Mehrfach-Reject
    rejectRequests: examinerProcedure
      .input(z.object({
        requestIds: z.array(z.number().int().positive()),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isValid = await validateBulkOperation(ctx.user.id, input.requestIds);
        if (!isValid) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sie dürfen diese Anfragen nicht bearbeiten" });
        }

        const result = await bulkRejectRequests(input.requestIds, input.reason);
        
        for (const requestId of input.requestIds) {
          await createAuditLogEntry({
            thesisRequestId: requestId,
            actorId: ctx.user.id,
            actorRole: ctx.user.role,
            action: "BULK_THESIS_REJECTED",
            toStatus: "FIRST_EXAMINER_REJECTED",
            reason: input.reason,
          });
        }

        return result;
      }),

    // Mehrfach-Erinnerungs-E-Mails
    sendReminders: examinerProcedure
      .input(z.object({
        requestIds: z.array(z.number().int().positive()),
        templateKey: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isValid = await validateBulkOperation(ctx.user.id, input.requestIds);
        if (!isValid) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sie dürfen diese Anfragen nicht bearbeiten" });
        }

        const result = await bulkSendReminders(input.requestIds, input.templateKey);
        return result;
      }),

    // Admin: Kapazität aktualisieren
    updateExaminerCapacity: adminProcedure
      .input(z.object({
        examinerIds: z.array(z.number().int().positive()),
        newCapacity: z.number().int().min(1).max(50),
      }))
      .mutation(async ({ input }) => {
        const result = await bulkUpdateExaminerCapacity(input.examinerIds, input.newCapacity);
        return result;
      }),
  }),

  // ─── Rollen-Bestätigungsworkflow ─────────────────────────────────────────────────────
  roleApproval: router({
    // Nutzer wählt Rolle nach Magic-Link-Login
    selectRole: protectedProcedure
      .input(z.object({
        requestedRole: z.enum(["student", "examiner", "admin"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const ok = await selectUserRole(ctx.user.id, input.requestedRole);
        if (!ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Rolle konnte nicht gespeichert werden." });
        return { success: true };
      }),

    // Eigenen Rollen-Status abrufen
    myStatus: protectedProcedure.query(async ({ ctx }) => {
      const status = await getUserRoleStatus(ctx.user.id);
      return status;
    }),

    // Alle ausstehenden Rollenanfragen abrufen (Admin + Superadmin)
    getPending: protectedProcedure.query(async ({ ctx }) => {
      const roles: string[] = (ctx.user as any).roles ?? [ctx.user.role];
      if (!roles.includes("admin") && !roles.includes("superadmin")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Kein Zugriff." });
      }
      return getPendingRoleUsers();
    }),

    // Rollenanfrage bestätigen
    approve: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const roles: string[] = (ctx.user as any).roles ?? [ctx.user.role];
        if (!roles.includes("admin") && !roles.includes("superadmin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Kein Zugriff." });
        }
        const result = await approveUserRole(input.userId, ctx.user.id, ctx.user.role);
        if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: result.error ?? "Fehler beim Bestätigen." });
        return { success: true };
      }),

    // Rollenanfrage ablehnen
    reject: protectedProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const roles: string[] = (ctx.user as any).roles ?? [ctx.user.role];
        if (!roles.includes("admin") && !roles.includes("superadmin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Kein Zugriff." });
        }
        const result = await rejectUserRole(input.userId, ctx.user.id, ctx.user.role, input.reason);
        if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: result.error ?? "Fehler beim Ablehnen." });
        return { success: true };
      }),

    // Gewünschte Rolle eines wartenden Nutzers vor Freischaltung anpassen
    updateRequestedRole: protectedProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        newRole: z.enum(["student", "examiner", "second_examiner", "admin", "pav", "dean", "vice_dean"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const roles: string[] = (ctx.user as any).roles ?? [ctx.user.role];
        if (!roles.includes("admin") && !roles.includes("superadmin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Kein Zugriff." });
        }
        const { getDb: getDbInner } = await import("./db");
        const db = await getDbInner();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Datenbankfehler." });
        // Prüfen ob Nutzer tatsächlich pending ist
        const rows = await db.execute(`SELECT id, roleStatus FROM users WHERE id = ${input.userId}`);
        const user = (rows[0] as unknown as any[])[0];
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Nutzer nicht gefunden." });
        if (user.roleStatus !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Nur ausstehende Anfragen können geändert werden." });
        }
        await db.execute(`UPDATE users SET requestedRole = '${input.newRole}' WHERE id = ${input.userId}`);
        // Audit-Log
        const metaJson = JSON.stringify({ userId: input.userId, newRole: input.newRole }).replace(/'/g, "\\'");
        await db.execute(
          `INSERT INTO audit_log (actorId, actorRole, action, toStatus, metadata, createdAt) VALUES (${ctx.user.id}, '${ctx.user.role}', 'REQUESTED_ROLE_CHANGED', '${input.newRole}', '${metaJson}', NOW())`
        );
        return { success: true };
      }),
  }),

  // ─── E-Mail-Templates ─────────────────────────────────────────────────────────────────────────────────
  examinerEmailTemplates: router({
    /** Alle 4 Templates des eingeloggten Prüfers laden */
    getAll: protectedProcedure.query(async ({ ctx }) => {
      const { getExaminerEmailTemplates } = await import("./db");
      return getExaminerEmailTemplates(ctx.user.id);
    }),

    /** Ein Template speichern */
    save: protectedProcedure
      .input(z.object({
        templateType: z.enum(["requirements", "acceptance", "rejection", "fully_booked"]),
        subject: z.string().max(255),
        body: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { saveExaminerEmailTemplate } = await import("./db");
        await saveExaminerEmailTemplate(ctx.user.id, input.templateType, input.subject, input.body);
        return { success: true };
      }),

    /** Template mit Variablen aufgelöst für eine konkrete Anfrage laden */
    resolve: protectedProcedure
      .input(z.object({
        examinerId: z.number().int().positive(),
        templateType: z.enum(["requirements", "acceptance", "rejection", "fully_booked"]),
        thesisRequestId: z.number().int().positive().optional(),
      }))
      .query(async ({ input }) => {
        const { getExaminerEmailTemplates, resolveEmailTemplate } = await import("./db");
        const templates = await getExaminerEmailTemplates(input.examinerId);
        const tpl = templates[input.templateType];
        let vars: { name?: string; thema?: string; semester?: string; studiengang?: string } = {};
        if (input.thesisRequestId) {
          const { getThesisRequestById: getTR, getUserById: getU } = await import("./db");
          const req = await getTR(input.thesisRequestId);
          if (req) {
            const student = await getU(req.studentId);
            vars = {
              name: student?.name ?? "",
              thema: req.title ?? "",
              semester: req.targetSemester ?? "",
              studiengang: req.department ?? "",
            };
          }
        }
        return resolveEmailTemplate(tpl, vars);
      }),
    /** Antwort-E-Mail an Studierenden senden (nach Zusage/Absage) */
    sendResponse: anyExaminerProcedure
      .input(z.object({
        thesisRequestId: z.number().int().positive(),
        subject: z.string().min(1).max(255),
        body: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const req = await getThesisRequestById(input.thesisRequestId);
        if (!req) throw new TRPCError({ code: "NOT_FOUND" });
        const isAssigned = req.examinerId === ctx.user.id || req.secondExaminerId === ctx.user.id;
        const isWanted = (req as any).wantedExaminerId === ctx.user.id;
        const isAdminUser = ctx.user.role === "admin" || ctx.user.role === "superadmin" || ctx.user.role === "pav";
        if (!isAssigned && !isWanted && !isAdminUser)
          throw new TRPCError({ code: "FORBIDDEN", message: "Diese Anfrage ist Ihnen nicht zugewiesen." });
        const student = await getUserById(req.studentId);
        if (!student?.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Keine E-Mail-Adresse des Prüflings gefunden." });
        await sendEmail({
          to: student.email,
          subject: input.subject,
          html: input.body.replace(/\n/g, "<br>"),
        });
        return { success: true };
      }),

    /** Persönliche Hinweise/Anforderungen-Mail an Studierende senden */
    sendRequirements: anyExaminerProcedure
      .input(z.object({
        thesisRequestId: z.number().int().positive(),
        subject: z.string().min(1).max(255),
        body: z.string().min(1),
        attachments: z.array(z.object({
          filename: z.string().max(255),
          base64: z.string(),
          mimeType: z.string().max(128),
        })).max(5).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const req = await getThesisRequestById(input.thesisRequestId);
        if (!req) throw new TRPCError({ code: "NOT_FOUND" });
        const isAssigned = req.examinerId === ctx.user.id || req.secondExaminerId === ctx.user.id;
        const isWanted = (req as any).wantedExaminerId === ctx.user.id;
        const isAdminUser = ctx.user.role === "admin" || ctx.user.role === "superadmin" || ctx.user.role === "pav";
        if (!isAssigned && !isWanted && !isAdminUser)
          throw new TRPCError({ code: "FORBIDDEN", message: "Diese Anfrage ist Ihnen nicht zugewiesen." });
        const student = await getUserById(req.studentId);
        if (!student?.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Keine E-Mail-Adresse des Prüflings gefunden." });
        // Anhänge aus base64 dekodieren
        const emailAttachments = (input.attachments ?? []).map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.base64, "base64"),
          contentType: a.mimeType,
        }));
        // Größenprüfung: max. 10 MB gesamt
        const totalSize = emailAttachments.reduce((sum, a) => sum + (a.content as Buffer).byteLength, 0);
        if (totalSize > 10 * 1024 * 1024) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Anhänge überschreiten 10 MB. Bitte reduzieren Sie die Dateigröße." });
        }
        const sent = await sendEmail({
          to: student.email,
          subject: input.subject,
          html: input.body.replace(/\n/g, "<br>"),
          attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
        });
        if (!sent) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "E-Mail konnte nicht gesendet werden." });
        return {
          success: true,
          sentTo: student.email,
          attachmentCount: emailAttachments.length,
        };
      }),
  }),

  // ─── Examiner/PAV-initiierter Antrag (Studierenden einladen) ─────────────
  invite: router({
    /**
     * Erstgutachter oder PAV legt einen Entwurf-Antrag an und lädt den Studierenden per E-Mail ein.
     */
    createDraft: protectedProcedure
      .input(z.object({
        studentEmail: z.string().email(),
        title: z.string().min(3).max(512),
        description: z.string().min(10),
        department: z.string().min(1).max(255),
        targetSemester: z.string().min(1).max(32),
        language: z.enum(["de", "en"]),
        degreeType: z.enum(["bachelor", "master"]),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isExaminer = userHasRole(ctx.user, "examiner");
        const isPav = userHasRole(ctx.user, "pav");
        const isAdmin = userHasRole(ctx.user, "admin") || userHasRole(ctx.user, "superadmin");
        if (!isExaminer && !isPav && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Prüfer:innen oder PAV können Studierende einladen." });
        }
        const { randomBytes } = await import("crypto");
        const token = randomBytes(32).toString("hex");
        const role = isExaminer ? "examiner" : isPav ? "pav" : "admin";
        await createExaminerInitiatedDraft({
          examinerId: ctx.user.id,
          initiatedByRole: role,
          studentEmail: input.studentEmail,
          title: input.title,
          description: input.description,
          department: input.department,
          targetSemester: input.targetSemester,
          language: input.language,
          degreeType: input.degreeType,
          inviteToken: token,
        });
        // Einladungs-E-Mail senden
        const confirmUrl = `${input.origin}/thesis/confirm?token=${token}`;
        const examinerName = ctx.user.name ?? "Ihre Prüfer:in";
        await sendEmail({
          to: input.studentEmail,
          subject: `Einladung zur Antragsbestätigung – Abschlussarbeit HTW Berlin`,
          html: `
            <p>Sehr geehrte:r Studierende:r,</p>
            <p><strong>${examinerName}</strong> hat einen Antrag für Ihre Abschlussarbeit angelegt:</p>
            <p><strong>Thema:</strong> ${input.title}</p>
            <p>Bitte überprüfen Sie die Angaben, ergänzen Sie Ihre Informationen und bestätigen Sie den Antrag unter folgendem Link:</p>
            <p><a href="${confirmUrl}" style="background:#76B900;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">Antrag bestätigen</a></p>
            <p>Dieser Link ist 14 Tage gültig.</p>
            <p>Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsamt</p>
          `,
        });
        return { success: true, token };
      }),

    /**
     * Öffentliche Prozedur: Holt den Entwurf anhand des Tokens (für die Bestätigungsseite).
     */
    getDraft: publicProcedure
      .input(z.object({ token: z.string().min(1) }))
      .query(async ({ input }) => {
        const draft = await getDraftByInviteToken(input.token);
        if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "Einladungs-Token nicht gefunden oder abgelaufen." });
        return draft;
      }),

    /**
     * Studierende:r bestätigt den Antrag (muss eingeloggt sein).
     */
    confirmDraft: protectedProcedure
      .input(z.object({
        token: z.string().min(1),
        title: z.string().min(3).max(512).optional(),
        description: z.string().min(10).optional(),
        abstract: z.string().max(2000).optional(),
        targetSemester: z.string().max(32).optional(),
        language: z.enum(["de", "en"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!userHasRole(ctx.user, "student") && !userHasRole(ctx.user, "admin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Studierende können einen Antrag bestätigen." });
        }
        const result = await confirmStudentDraft({
          token: input.token,
          studentId: ctx.user.id,
          title: input.title,
          description: input.description,
          abstract: input.abstract,
          targetSemester: input.targetSemester,
          language: input.language,
        });
        return result;
      }),

    /**
     * Holt alle Entwurf-Anträge des eingeloggten Erstgutachters.
     */
    getMyDrafts: examinerProcedure.query(async ({ ctx }) => {
      return getExaminerDraftRequests(ctx.user.id);
    }),

    /**
     * PAV/Admin: Alle offenen Einladungs-Entwürfe.
     */
    getAllDrafts: pavProcedure.query(async () => {
      return getAllDraftRequests();
    }),

    /**
     * Erstgutachter oder PAV bearbeitet einen Entwurf-Antrag nachträglich.
     */
    updateDraft: protectedProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        title: z.string().min(3).max(512).optional(),
        description: z.string().min(10).optional(),
        department: z.string().min(1).max(255).optional(),
        targetSemester: z.string().min(1).max(32).optional(),
        language: z.enum(["de", "en"]).optional(),
        degreeType: z.enum(["bachelor", "master"]).optional(),
        studentEmail: z.string().email().optional(),
        resendEmail: z.boolean().optional(),
        origin: z.string().url().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isExaminer = userHasRole(ctx.user, "examiner");
        const isPav = userHasRole(ctx.user, "pav");
        const isAdmin = userHasRole(ctx.user, "admin") || userHasRole(ctx.user, "superadmin");
        if (!isExaminer && !isPav && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Keine Berechtigung." });
        }
        const result = await updateDraftRequest({
          requestId: input.requestId,
          callerId: ctx.user.id,
          isAdmin: isPav || isAdmin,
          title: input.title,
          description: input.description,
          department: input.department,
          targetSemester: input.targetSemester,
          language: input.language,
          degreeType: input.degreeType,
          studentEmail: input.studentEmail,
        });
        // Optional: Einladungs-E-Mail erneut senden
        if (input.resendEmail && input.origin && result.token) {
          const targetEmail = input.studentEmail ?? undefined;
          if (targetEmail) {
            const confirmUrl = `${input.origin}/thesis/confirm?token=${result.token}`;
            const examinerName = ctx.user.name ?? "Ihre Prüfer:in";
            await sendEmail({
              to: targetEmail,
              subject: `Aktualisierte Einladung zur Antragsbestätigung – Abschlussarbeit HTW Berlin`,
              html: `
                <p>Sehr geehrte:r Studierende:r,</p>
                <p><strong>${examinerName}</strong> hat Ihren Antrag für die Abschlussarbeit aktualisiert.</p>
                ${input.title ? `<p><strong>Thema:</strong> ${input.title}</p>` : ""}
                <p>Bitte überprüfen Sie die aktualisierten Angaben und bestätigen Sie den Antrag:</p>
                <p><a href="${confirmUrl}" style="background:#76B900;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">Antrag bestätigen</a></p>
                <p>Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsamt</p>
              `,
            });
          }
        }
        return { success: true };
      }),

    /**
     * Erstgutachter oder PAV zieht eine ausstehende Einladung zurück.
     */
    withdrawDraft: protectedProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isExaminer = userHasRole(ctx.user, "examiner");
        const isPav = userHasRole(ctx.user, "pav");
        const isAdmin = userHasRole(ctx.user, "admin") || userHasRole(ctx.user, "superadmin");
        if (!isExaminer && !isPav && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Keine Berechtigung." });
        }
        const result = await withdrawDraftRequest({
          requestId: input.requestId,
          callerId: ctx.user.id,
          isAdmin: isPav || isAdmin,
        });
        // Alle Verifikations-Token für diesen Antrag widerrufen
        await invalidateDocTokensForRequest(input.requestId);
        return result;
      }),
  }),
});
export type AppRouter = typeof appRouter;
