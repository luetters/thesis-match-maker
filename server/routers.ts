import { COOKIE_NAME, SESSION_MAX_AGE_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getRegistrationApprovalNotice } from "./registrationApprovalNotice";
import { isEligibleForProgrammeDirector } from "./programmeDirectorEligibility";
import { getStudentConsentFlags } from "./studentConsent";
import { sanitizeBiographyText } from "./biographySanitization";
import { sql, eq, and, notInArray, aliasedTable, isNull, desc } from "drizzle-orm";
import { examinerTopics, users, thesisRequests, auditLog, userRoles, twoFactorRecoveryCodes } from "../drizzle/schema";
import { getDb } from "./db";
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
  getPublicPortalHighlights,
  getUserByEmail,
  setUserPasswordHash,
	getSystemSettings,
	upsertSystemSetting,
	submitFaqFeedback,
	recordFaqRating,
	getFaqFeedbackOverview,
	answerAndPublishFaqFeedback,
	getPublishedFaqFeedback,
	getTopFaqRatings,
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
  getUsersMissingRequiredTwoFactor,
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
  getCrossDepartmentSupervisionOverview,
  getCrossDepartmentSupervisionTimeSeries,
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
  getPendingRoleUsersForAdmin,
  canAdminManageUser,
  getAdminDepartment,
  assignAdminDepartment,
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
  setExternalSecondExaminer,
  withdrawSecondExaminerRequest,
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
  getThesisDeadlineScope,
  getProgrammeSemesterDeadlines,
  upsertProgrammeSemesterDeadline,
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
  createStudentRegistrationInvitation,
  getStudentRegistrationInvitation,
  markStudentRegistrationInvitationUsed,
  getExaminerRegistrationInvitations,
  revokeStudentRegistrationInvitation,
  getExaminerComments,
  createExaminerComment,
  updateExaminerComment,
  deleteExaminerComment,
  searchExaminerComments,
  setExaminerCommentCompletion,
  getTopicsByExaminer,
  getActiveTopicsForExaminer,
  getAllActiveTopics,
  createExaminerTopic,
  updateExaminerTopic,
  deleteExaminerTopic,
  getExaminersWithAvailability,
  adminDirectAssignExaminers,
  getThesisRequestByIdWithNames,
  reviseThesisSubmission,
  logLoginAttempt,
  getLoginAttempts,
  getLastPasswordResetSent,
  getNewExaminersCount,
  getNewExaminers,
  markNewExaminersAsSeen,
  getNotificationPreferences,
  setNotificationPreference,
  NOTIFICATION_TYPES,
  type NotificationTypeKey,
} from "./db";
import { signExaminerActionToken, verifyExaminerActionToken } from "./jwtHelper";
import { SAML_SETTING_KEYS, getSamlConfigurationIssues, isSamlConfigurationReady, parseSamlConfiguration } from "./samlAuth";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { parse as parseCookie } from "cookie";
import QRCode from "qrcode";
import { createTwoFactorSetup, decryptTwoFactorSecret, encryptTwoFactorSecret, generateRecoveryCodes, isAdminAccount, verifyTwoFactorCode } from "./twoFactorAuth";
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
import { createHeartbeatJob } from "./_core/heartbeat";
import {
  cancelColloquiumSchedulingPoll,
  confirmColloquiumSchedulingSlot,
  createColloquiumSchedulingPoll,
  findColloquiumRoomConflicts,
  getColloquiumSchedulingPollForUser,
  getMyColloquiumSchedulingPolls,
  selectColloquiumSchedulingSlot,
  setPollReminderTaskUid,
  submitColloquiumSchedulingAvailability,
} from "./colloquiumScheduling";
import { storagePut, checkStorageHealth, getStorageMode, getStorageProvider } from "./storageLocal";
import { getSchedulerStatus } from "./scheduler";
import { sendExaminerCTAEmail, sendEmail, sendPavProgrammeAssignmentEmail } from "./emailHelper";
import { examinerRequestEmail, statusChangeEmail, enrollmentEligibilityEmail, defenseEligibilityEmail, directAssignmentEmail, defaultExaminerTemplate, buildExaminerReminderEmail, type Lang } from "./emailTemplates";
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

async function assertDeadlineDepartmentScope(ctx: { user: { id: number; role: string; roles?: string[] } }, thesisRequestId: number) {
  const scope = await getThesisDeadlineScope(thesisRequestId);
  if (!scope) throw new TRPCError({ code: "NOT_FOUND", message: "Anfrage nicht gefunden." });
  if (userHasRole(ctx.user, "superadmin")) return scope;
  const department = await getAdminDepartment(ctx.user.id);
  if (!department || department !== scope.department) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Sie dürfen Abgabefristen nur für Studierende Ihres eigenen Fachbereichs verwalten." });
  }
  return scope;
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
  if (!userHasRole(ctx.user, "examiner") && !userHasRole(ctx.user, "second_examiner") && !userHasRole(ctx.user, "programme_director") && !userHasRole(ctx.user, "admin") && !userHasRole(ctx.user, "superadmin")) {
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
      bio: z.string().max(10000).optional(),
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
      examinerBio: z.string().max(10000).optional(),
      examinerResearchFocus: z.string().max(10000).optional(),
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
      // Prüfer:innen-spezifische Felder sind ausschließlich Prüfer:innen vorbehalten.
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

  setBannerColor: protectedProcedure
    .input(z.object({ color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Ungültige Farbe") }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users)
        .set({ bannerColor: input.color, bannerImageUrl: null, bannerImageKey: null })
        .where(eq(users.id, ctx.user.id));
      return { bannerColor: input.color };
    }),

  removeBanner: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(users)
      .set({ bannerColor: null, bannerImageUrl: null, bannerImageKey: null })
      .where(eq(users.id, ctx.user.id));
    return { success: true };
  }),

  getBannerData: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { bannerColor: null, bannerImageUrl: null };
    const rows = await db.select({ bannerColor: users.bannerColor, bannerImageUrl: users.bannerImageUrl })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);
    const row = rows[0] ?? null;
    return {
      bannerColor: row?.bannerColor ?? null,
      bannerImageUrl: row?.bannerImageUrl ?? null,
    };
  }),
});

// --- App Router ---------------------------------------------------------------

export const appRouter = router({
  system: systemRouter,
  profile: profileRouterDef,

  landing: router({
    getPortalHighlights: publicProcedure.query(async () => getPublicPortalHighlights()),
  }),

  faq: router({
    submitFeedback: publicProcedure
      .input(z.object({
        message: z.string().min(15).max(800),
        audience: z.enum(["general", "student", "firstExaminer", "secondExaminer", "admin"]),
        language: z.enum(["de", "en"]),
      }))
      .mutation(async ({ input }) => submitFaqFeedback(input)),
    rateAnswer: publicProcedure
      .input(z.object({ faqKey: z.string().regex(/^(general|student|firstExaminer|secondExaminer|admin|community):\d+$/), helpful: z.boolean() }))
      .mutation(async ({ input }) => recordFaqRating(input)),
    published: publicProcedure
      .input(z.object({ language: z.enum(["de", "en"]) }))
      .query(async ({ input }) => getPublishedFaqFeedback(input.language)),
    topRated: publicProcedure.query(async () => getTopFaqRatings()),
    adminOverview: adminProcedure.query(async () => getFaqFeedbackOverview()),
    answerAndPublish: adminProcedure
      .input(z.object({ id: z.number().int().positive(), answer: z.string().min(15).max(1600), publish: z.boolean() }))
      .mutation(async ({ input }) => answerAndPublishFaqFeedback(input)),
  }),

  saml: router({
    status: publicProcedure.query(async () => {
      const settings = await getSystemSettings();
      const configuration = parseSamlConfiguration(Object.fromEntries(settings.map((setting) => [setting.key, setting.value])));
      return {
        enabled: configuration.enabled,
        ready: isSamlConfigurationReady(configuration),
        issues: configuration.enabled ? getSamlConfigurationIssues(configuration) : [],
      };
    }),
    configuration: superadminProcedure.query(async () => {
      const settings = await getSystemSettings();
      const configuration = parseSamlConfiguration(Object.fromEntries(settings.map((setting) => [setting.key, setting.value])));
      return { ...configuration, ready: isSamlConfigurationReady(configuration), issues: getSamlConfigurationIssues(configuration) };
    }),
    updateConfiguration: superadminProcedure
      .input(z.object({
        enabled: z.boolean(),
        idpEntryPoint: z.string().max(2048),
        idpIssuer: z.string().max(2048),
        idpCertificate: z.string().max(12000),
        spEntityId: z.string().max(2048),
        acsUrl: z.string().max(2048),
        emailAttribute: z.string().min(1).max(256),
        givenNameAttribute: z.string().min(1).max(256),
        surnameAttribute: z.string().min(1).max(256),
      }))
      .mutation(async ({ ctx, input }) => {
        const configuration = parseSamlConfiguration({
          [SAML_SETTING_KEYS.enabled]: input.enabled ? "true" : "false",
          [SAML_SETTING_KEYS.idpEntryPoint]: input.idpEntryPoint,
          [SAML_SETTING_KEYS.idpIssuer]: input.idpIssuer,
          [SAML_SETTING_KEYS.idpCertificate]: input.idpCertificate,
          [SAML_SETTING_KEYS.spEntityId]: input.spEntityId,
          [SAML_SETTING_KEYS.acsUrl]: input.acsUrl,
          [SAML_SETTING_KEYS.emailAttribute]: input.emailAttribute,
          [SAML_SETTING_KEYS.givenNameAttribute]: input.givenNameAttribute,
          [SAML_SETTING_KEYS.surnameAttribute]: input.surnameAttribute,
        });
        const issues = getSamlConfigurationIssues(configuration);
        if (configuration.enabled && issues.length > 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `SAML kann noch nicht aktiviert werden: ${issues.join(" ")}` });
        }
        await Promise.all([
          upsertSystemSetting(SAML_SETTING_KEYS.enabled, configuration.enabled ? "true" : "false", ctx.user.id),
          upsertSystemSetting(SAML_SETTING_KEYS.idpEntryPoint, configuration.idpEntryPoint, ctx.user.id),
          upsertSystemSetting(SAML_SETTING_KEYS.idpIssuer, configuration.idpIssuer, ctx.user.id),
          upsertSystemSetting(SAML_SETTING_KEYS.idpCertificate, configuration.idpCertificate, ctx.user.id),
          upsertSystemSetting(SAML_SETTING_KEYS.spEntityId, configuration.spEntityId, ctx.user.id),
          upsertSystemSetting(SAML_SETTING_KEYS.acsUrl, configuration.acsUrl, ctx.user.id),
          upsertSystemSetting(SAML_SETTING_KEYS.emailAttribute, configuration.emailAttribute, ctx.user.id),
          upsertSystemSetting(SAML_SETTING_KEYS.givenNameAttribute, configuration.givenNameAttribute, ctx.user.id),
          upsertSystemSetting(SAML_SETTING_KEYS.surnameAttribute, configuration.surnameAttribute, ctx.user.id),
        ]);
        return { success: true, ready: isSamlConfigurationReady(configuration), issues };
      }),
    setEnabled: superadminProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const settings = await getSystemSettings();
        const existingConfiguration = parseSamlConfiguration(Object.fromEntries(settings.map((setting) => [setting.key, setting.value])));
        const configuration = { ...existingConfiguration, enabled: input.enabled };
        const issues = getSamlConfigurationIssues(configuration);
        if (input.enabled && issues.length > 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `SAML kann noch nicht aktiviert werden: ${issues.join(" ")}` });
        }
        await upsertSystemSetting(SAML_SETTING_KEYS.enabled, input.enabled ? "true" : "false", ctx.user.id);
        return { enabled: input.enabled, ready: isSamlConfigurationReady(configuration), issues };
      }),
  }),

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
    twoFactorStatus: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user || !isAdminAccount(user.role)) return { eligible: false, enabled: false };
      return { eligible: true, enabled: Boolean(user.twoFactorEnabled), confirmedAt: user.twoFactorConfirmedAt ?? null };
    }),
    beginTwoFactorSetup: protectedProcedure.mutation(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user || !isAdminAccount(user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Zwei-Faktor-Authentifizierung ist nur für Administrationskonten verfügbar." });
      const setup = createTwoFactorSetup(user.email ?? user.openId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set({ twoFactorSecret: encryptTwoFactorSecret(setup.secret), twoFactorEnabled: 0, twoFactorConfirmedAt: null, twoFactorLastUsedStep: null }).where(eq(users.id, user.id));
      return { qrCodeDataUrl: await QRCode.toDataURL(setup.otpauthUrl), manualKey: setup.secret };
    }),
    confirmTwoFactorSetup: protectedProcedure
      .input(z.object({ code: z.string().regex(/^\d{6}$/) }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserById(ctx.user.id);
        if (!user || !isAdminAccount(user.role) || !user.twoFactorSecret) throw new TRPCError({ code: "BAD_REQUEST", message: "Es liegt keine offene 2FA-Einrichtung vor." });
        const result = verifyTwoFactorCode(decryptTwoFactorSecret(user.twoFactorSecret), input.code);
        if (!result.valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Der Sicherheitscode ist ungültig." });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const recoveryCodes = generateRecoveryCodes();
        await db.delete(twoFactorRecoveryCodes).where(eq(twoFactorRecoveryCodes.userId, user.id));
        await db.insert(twoFactorRecoveryCodes).values(await Promise.all(recoveryCodes.map(async (code) => ({ userId: user.id, codeHash: await bcrypt.hash(code, 12) }))));
        await db.update(users).set({ twoFactorEnabled: 1, twoFactorConfirmedAt: sql`NOW()`, twoFactorLastUsedStep: result.step }).where(eq(users.id, user.id));
        return { success: true, recoveryCodes };
      }),
    disableTwoFactor: protectedProcedure
      .input(z.object({ code: z.string().regex(/^\d{6}$/) }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserById(ctx.user.id);
        if (!user || !isAdminAccount(user.role) || !user.twoFactorEnabled || !user.twoFactorSecret) throw new TRPCError({ code: "BAD_REQUEST", message: "Die Zwei-Faktor-Authentifizierung ist nicht aktiv." });
        if (!verifyTwoFactorCode(decryptTwoFactorSecret(user.twoFactorSecret), input.code).valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Der Sicherheitscode ist ungültig." });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(users).set({ twoFactorSecret: null, twoFactorEnabled: 0, twoFactorConfirmedAt: null, twoFactorLastUsedStep: null }).where(eq(users.id, user.id));
        return { success: true };
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
                  <a href="${resetUrl}" style="background: #76B900; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Passwort zurücksetzen</a>
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
	          plagiarismConsent: z.boolean().optional().default(false),
	          aiReviewConsent: z.boolean().optional().default(false),
	          origin: z.string().url().optional(),
          inviteToken: z.string().optional(),
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
          if (!emailLowerReg.endsWith("@student.htw-berlin.de")) {
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
        // Studierende mit @student.htw-berlin.de werden automatisch freigeschaltet
        const isStudentAutoApprove = input.role === "student" && emailLowerReg.endsWith("@student.htw-berlin.de");
        const initialRoleStatus = isStudentAutoApprove ? "approved" : "pending";
        const consentFlags = getStudentConsentFlags(input.role, input.plagiarismConsent, input.aiReviewConsent);
        await drizzleDb.insert(users).values({
          openId,
          email: input.email.toLowerCase(),
          name: input.name,
          ...(input.firstName ? { firstName: input.firstName } : {}),
          ...(input.lastName ? { lastName: input.lastName } : {}),
          role: isStudentAutoApprove ? "student" as any : "user" as any,
          requestedRole: input.role as any,
          roleStatus: initialRoleStatus as any,
          loginMethod: "password",
          passwordHash,
          lastSignedIn: new Date().toISOString().slice(0, 19).replace('T', ' '),
          ...(input.matrikelNr ? { matrikelNr: input.matrikelNr.trim() } : {}),
          ...(input.department ? { department: input.department } : {}),
	          ...(input.thesisType ? { thesisType: input.thesisType } : {}),
	          ...(input.programmeId ? { programmeId: input.programmeId } : {}),
          ...consentFlags,
	        } as any).onDuplicateKeyUpdate({
          set: { name: input.name } as any,
        });
        // Eintrag in user_roles anlegen (Multi-Rollen-Modell)
        // Erst Nutzer-ID ermitteln, dann Rolle eintragen
        const newUser = await getUserByEmail(input.email);
        if (newUser) {
          await addUserRole(newUser.id, input.role as AppRole);
          // Bei Auto-Freischaltung (@student.htw-berlin.de): Rolle sofort aktivieren
          if (isStudentAutoApprove) {
            try {
              const db2 = await getDb();
              if (db2) {
                const { users: usersTable2 } = await import("../drizzle/schema");
                const { eq } = await import("drizzle-orm");
                await db2.update(usersTable2)
                  .set({
                    role: "student" as any,
                    roleStatus: "approved" as any,
                    requestedRole: null as any,
                  })
                  .where(eq(usersTable2.id, newUser.id));
              }
            } catch (e) {
              console.warn("[Register] Auto-Freischaltung fehlgeschlagen:", e);
            }
          }
          // Automatische Freischaltung bei gültigem Einladungs-Token
          if (input.inviteToken) {
            try {
              const inv = await getStudentRegistrationInvitation(input.inviteToken);
              const isValidInvite = inv && !inv.revoked && !inv.usedAt &&
                new Date() <= new Date(inv.expiresAt) &&
                inv.studentEmail.toLowerCase() === input.email.toLowerCase();
              if (isValidInvite) {
                const drizzleDb2 = await getDb();
                if (drizzleDb2) {
                  const { users: usersTable } = await import("../drizzle/schema");
                  await drizzleDb2.update(usersTable)
                    .set({ roleStatus: "approved" as any })
                    .where((await import("drizzle-orm")).eq(usersTable.id, newUser.id));
                  await markStudentRegistrationInvitationUsed({ token: input.inviteToken, userId: newUser.id });
                }
              }
            } catch (invErr) {
              console.warn("[Register] Einladungs-Token-Verarbeitung fehlgeschlagen:", invErr);
            }
          }
        }
        await createAuditLogEntry({
          action: "USER_REGISTERED",
          actorId: 0,
          metadata: { email: input.email, requestedRole: input.role },
        } as any);
        // E-Mail an SuperAdmin(s) senden – nur bei manuell zu prüfenden Registrierungen
        if (!isStudentAutoApprove) {
          try {
            const { sendEmail } = await import("./emailHelper");
            const { getSuperadminEmails } = await import("./db");
            const superadminEmails = await getSuperadminEmails();
            const roleLabels: Record<string, string> = {
              student: "Studierende:r",
              examiner: "Prüfer:in (Erstprüfer:in)",
              second_examiner: "Zweitprüfer:in",
              admin: "Verwaltung",
              programme_director: "Studiengangsleitung",
            };
            const roleLabel = roleLabels[input.role] ?? input.role;
            const siteOrigin = input.origin ?? "https://thesis.htw-berlin.com";
            const approvalNotice = getRegistrationApprovalNotice(input.role);
            const adminUrl = `${siteOrigin}${approvalNotice.dashboardPath}`;
            const logoUrl = `${siteOrigin}/manus-storage/ThesisMatchMaker_e15e6348.jpg`;
            for (const adminEmail of superadminEmails) {
              await sendEmail({
                to: adminEmail,
                subject: `[HTW Berlin Thesis Match Maker] ${approvalNotice.subjectPrefix}: ${input.name} (${roleLabel})`,
                html: `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
      <tr><td style="background:#76B900;padding:24px 32px;text-align:center">
        <img src="${logoUrl}" alt="Thesis Match Maker" width="120" style="display:block;margin:0 auto 8px auto;border-radius:8px" />
        <span style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:0.5px">Thesis Match Maker</span><br>
        <span style="color:#e8f5d0;font-size:13px">HTW Berlin &ndash; Fachbereich 3</span>
      </td></tr>
      <tr><td style="padding:32px">
        <h2 style="color:#1a1a2e;font-size:20px;margin:0 0 16px 0">${approvalNotice.headline}</h2>
        <p style="color:#374151;font-size:14px;margin:0 0 20px 0">${approvalNotice.intro}</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden">
          <tr><td style="padding:12px 16px;font-weight:bold;color:#6b7280;font-size:13px;width:40%;border-bottom:1px solid #e5e7eb">Name</td><td style="padding:12px 16px;color:#111827;font-size:14px;border-bottom:1px solid #e5e7eb">${input.name}</td></tr>
          <tr><td style="padding:12px 16px;font-weight:bold;color:#6b7280;font-size:13px;width:40%;border-bottom:1px solid #e5e7eb">E-Mail</td><td style="padding:12px 16px;font-size:14px;border-bottom:1px solid #e5e7eb"><a href="mailto:${input.email}" style="color:#76B900;text-decoration:none">${input.email}</a></td></tr>
          <tr><td style="padding:12px 16px;font-weight:bold;color:#6b7280;font-size:13px;width:40%">Gewünschte Rolle</td><td style="padding:12px 16px;color:#111827;font-size:14px">${roleLabel}</td></tr>
        </table>
        <p style="color:#374151;font-size:14px;margin:24px 0 20px 0">${approvalNotice.instruction}</p>
        <p style="margin:0 0 32px 0">
          <a href="${adminUrl}" style="background:#76B900;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-size:14px;font-weight:bold">${approvalNotice.actionLabel}</a>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px 0">
        <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.6">⚠️ <strong>Hinweis:</strong> Diese Nachricht wurde automatisch generiert.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
                text: `${approvalNotice.headline}\n\nName: ${input.name}\nE-Mail: ${input.email}\nGewünschte Rolle: ${roleLabel}\n\n${approvalNotice.instruction}\n${adminUrl}`,
              });
            }
          } catch (emailErr) {
            console.warn("[Register] SuperAdmin-E-Mail konnte nicht gesendet werden:", emailErr);
          }
        }
        return { success: true, autoApproved: isStudentAutoApprove };
      }),
    loginWithPassword: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1), twoFactorCode: z.string().trim().min(6).max(16).optional() }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        const ipAddr = ctx.req.ip;
        const ua = ctx.req.headers["user-agent"];
        if (!user) {
          await logLoginAttempt({ email: input.email, success: false, failureReason: "Konto nicht gefunden", ipAddress: ipAddr, userAgent: ua });
          throw new TRPCError({ code: "UNAUTHORIZED", message: "E-Mail oder Passwort ungültig." });
        }
        if (!user.passwordHash) {
          await logLoginAttempt({ email: input.email, success: false, failureReason: "Kein Passwort gesetzt (ehemaliges Magic-Link-Konto)", ipAddress: ipAddr, userAgent: ua });
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Für dieses Konto ist noch kein Passwort vergeben. Bitte nutzen Sie \"Passwort vergessen\".", });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          await logLoginAttempt({ email: input.email, success: false, failureReason: "Falsches Passwort", ipAddress: ipAddr, userAgent: ua });
          throw new TRPCError({ code: "UNAUTHORIZED", message: "E-Mail oder Passwort ungültig." });
        }
        const twoFactorSettings = await getSystemSettings();
        const requiredRolesRaw = twoFactorSettings.find((setting) => setting.key === "twoFactorRequiredRoles")?.value ?? "[]";
        const requiredRoles = (() => {
          try {
            const parsed = JSON.parse(requiredRolesRaw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })() as string[];
        if (requiredRoles.includes(user.role ?? "") && !user.twoFactorEnabled) {
          await logLoginAttempt({ email: input.email, success: false, failureReason: "Zwei-Faktor-Authentifizierung für Rolle erforderlich", ipAddress: ipAddr, userAgent: ua });
          throw new TRPCError({ code: "FORBIDDEN", message: "Für Ihre Rolle ist die Zwei-Faktor-Authentifizierung erforderlich. Bitte wenden Sie sich an die Verwaltung der HTW Berlin, um die Einrichtung zu veranlassen." });
        }
        if (user.twoFactorEnabled && isAdminAccount(user.role)) {
          if (!input.twoFactorCode) {
            return { success: false, requiresTwoFactor: true, role: user.role, roles: [] as AppRole[] };
          }
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          const normalizedCode = input.twoFactorCode.replace(/\s/g, "").toUpperCase();
          const twoFactorSecret = user.twoFactorSecret ? decryptTwoFactorSecret(user.twoFactorSecret) : null;
          const result = /^\d{6}$/.test(normalizedCode) && twoFactorSecret
            ? verifyTwoFactorCode(twoFactorSecret, normalizedCode)
            : { valid: false, step: 0 };
          if (result.valid && user.twoFactorLastUsedStep !== result.step) {
            await db.update(users).set({ twoFactorLastUsedStep: result.step }).where(eq(users.id, user.id));
          } else {
            const recoveryCodes = await db.select().from(twoFactorRecoveryCodes).where(and(eq(twoFactorRecoveryCodes.userId, user.id), isNull(twoFactorRecoveryCodes.usedAt)));
            const matchingRecoveryCode = (await Promise.all(recoveryCodes.map(async (entry) => ({ entry, valid: await bcrypt.compare(normalizedCode, entry.codeHash) })))).find(({ valid }) => valid)?.entry;
            if (!matchingRecoveryCode) {
              await logLoginAttempt({ email: input.email, success: false, failureReason: "Ungültiger Zwei-Faktor- oder Wiederherstellungscode", ipAddress: ipAddr, userAgent: ua });
              throw new TRPCError({ code: "UNAUTHORIZED", message: "Der Sicherheits- oder Wiederherstellungscode ist ungültig oder wurde bereits verwendet." });
            }
            await db.update(twoFactorRecoveryCodes).set({ usedAt: sql`NOW()` }).where(eq(twoFactorRecoveryCodes.id, matchingRecoveryCode.id));
          }
        }
        // Freischaltungs-Prüfung
        const roleStatus = (user as any).roleStatus ?? "approved";
        if (roleStatus === "pending") {
          await logLoginAttempt({ email: input.email, success: false, failureReason: "Konto noch nicht freigeschaltet", ipAddress: ipAddr, userAgent: ua });
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Ihr Konto wurde noch nicht freigeschaltet. Bitte warten Sie auf die Bestätigung durch die Verwaltung der HTW Berlin.",
          });
        }
        if (roleStatus === "rejected") {
          await logLoginAttempt({ email: input.email, success: false, failureReason: "Registrierungsantrag abgelehnt", ipAddress: ipAddr, userAgent: ua });
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
        // Erstprüfer:innen haben automatisch auch Zweitprüfer:innen-Rechte und dürfen externe E-Mails verwenden.
        if (user.role !== "examiner" && user.role !== "second_examiner" && user.role !== "admin" && user.role !== "superadmin" && !isHtwLoginEmail) {
          await logLoginAttempt({ email: input.email, success: false, failureReason: "Ungültige E-Mail-Domäne (keine HTW-Berlin-Adresse)", ipAddress: ipAddr, userAgent: ua });
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
          .setExpirationTime(Math.floor((Date.now() + SESSION_MAX_AGE_MS) / 1000))
          .sign(secret);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: SESSION_MAX_AGE_MS });
        // Multi-Rollen: roles[] aus user_roles laden
        const userRolesArr = await getUserRoles(user.id);
        if (userRolesArr.length === 0 && user.role && user.role !== 'user') {
          await addUserRole(user.id, user.role as AppRole);
          userRolesArr.push(user.role as AppRole);
        }
        // Erfolgreiche Anmeldung protokollieren
        await logLoginAttempt({ email: input.email, success: true, ipAddress: ipAddr, userAgent: ua });
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
          studySpecializations: z.string().max(1000).optional(),
          personalInterests: z.string().max(1000).optional(),
          keywords: z.string().max(500).optional(),
          examinerTopicId: z.number().int().positive().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Prüfen ob Thema-Limit erreicht ist
        if (input.examinerTopicId) {
          const db = await getDb();
          if (db) {
            const tid = input.examinerTopicId;
            const topicRows = await db.select({ maxAssignments: examinerTopics.maxAssignments })
              .from(examinerTopics)
              .where(eq(examinerTopics.id, tid))
              .limit(1);
            const topicData = topicRows[0];
            if (topicData?.maxAssignments !== null && topicData?.maxAssignments !== undefined) {
              const countRows = await db.select({ count: sql<number>`COUNT(*)` })
                .from(thesisRequests)
                .where(and(
                  eq(thesisRequests.examinerTopicId, tid),
                  notInArray(thesisRequests.status, ['WITHDRAWN', 'REJECTED', 'CANCELLED'] as const)
                ));
              const assignmentCount = Number(countRows[0]?.count ?? 0);
              if (assignmentCount >= topicData.maxAssignments) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Dieses Thema hat die maximale Anzahl an Vergaben erreicht und kann nicht mehr gewählt werden.' });
              }
            }
          }
        }
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
          studySpecializations: input.studySpecializations ?? null,
          personalInterests: input.personalInterests ?? null,
          keywords: input.keywords ? JSON.stringify(input.keywords.split(",").map((k: string) => k.trim()).filter((k: string) => k.length > 0)) : null,
          examinerTopicId: input.examinerTopicId ?? null,
        } as any);
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
          action: z.enum(["accept", "reject", "conditional"]),
          rejectionReason: z.string().optional(),
          conditionalReason: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await getThesisRequestById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

        const isWantedExaminer = (existing as any).wantedExaminerId === ctx.user.id;
        const isWantedSecondExaminer = (existing as any).wantedSecondExaminerId === ctx.user.id;
        const isAssignedExaminer = existing.examinerId === ctx.user.id || existing.secondExaminerId === ctx.user.id;
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "superadmin";

        if (!isWantedExaminer && !isWantedSecondExaminer && !isAssignedExaminer && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Diese Anfrage ist Ihnen nicht zugewiesen." });
        }

        // Statusübergang: PENDING_FIRST_EXAMINER → FIRST_EXAMINER_ACCEPTED / FIRST_EXAMINER_REJECTED / CONDITIONAL_ACCEPTANCE
        //                 PENDING_SECOND_EXAMINER → SECOND_EXAMINER_ACCEPTED / FIRST_EXAMINER_ACCEPTED (Ablehnung = zurück)
        //                 PENDING / sonstige    → ACCEPTED / REJECTED / CONDITIONAL_ACCEPTANCE
        let newStatus: string;
        let auditAction: string;
        if (input.action === "conditional") {
          const { conditionalAcceptThesisRequest } = await import("./db");
          await conditionalAcceptThesisRequest(input.id, ctx.user.id, input.conditionalReason ?? "");
          newStatus = "CONDITIONAL_ACCEPTANCE";
          auditAction = "CONDITIONAL_ACCEPTANCE";
        } else if (existing.status === "PENDING_SECOND_EXAMINER" && isWantedSecondExaminer) {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB nicht verfügbar" });
          if (input.action === "accept") {
            const now = new Date().toISOString().slice(0, 19).replace("T", " ");
            await db.update(thesisRequests)
              .set({
                secondExaminerId: ctx.user.id,
                status: "SECOND_EXAMINER_ACCEPTED",
                secondExaminerAcceptedAt: now,
                updatedAt: now,
              })
              .where(eq(thesisRequests.id, input.id));
            newStatus = "SECOND_EXAMINER_ACCEPTED";
            auditAction = "SECOND_EXAMINER_ACCEPTED";
            // E-Mail an Studierenden
            try {
              const student = await getUserById(existing.studentId);
              const examiner = await getUserById(ctx.user.id);
              if (student?.email) {
                const { buildSecondExaminerConfirmedEmail } = await import("./emailTemplates");
                const tpl = buildSecondExaminerConfirmedEmail({
                  recipientName: student.name ?? "Studierende:r",
                  recipientRole: "student",
                  secondExaminerName: examiner?.name ?? ctx.user.name ?? "Zweitgutachter:in",
                  thesisTitle: existing.title ?? "",
                });
                await sendEmail({ to: student.email, subject: tpl.subject, html: tpl.html });
              }
            } catch (_) { /* E-Mail-Fehler nicht fatal */ }
          } else {
            // Ablehnung: Status zurück auf FIRST_EXAMINER_ACCEPTED, wantedSecondExaminerId löschen, Zeitstempel setzen
            const nowTs2 = new Date().toISOString().slice(0, 19).replace("T", " ");
            await db.update(thesisRequests)
              .set({
                status: "FIRST_EXAMINER_ACCEPTED",
                wantedSecondExaminerId: null,
                secondExaminerRequestedAt: null,
                secondExaminerRejectedAt: nowTs2,
                rejectionReason: input.rejectionReason ?? null,
                updatedAt: nowTs2,
              })
              .where(eq(thesisRequests.id, input.id));
            newStatus = "FIRST_EXAMINER_ACCEPTED";
            auditAction = "SECOND_EXAMINER_REJECTED";
            // E-Mail an Studierenden
            try {
              const student = await getUserById(existing.studentId);
              const examiner = await getUserById(ctx.user.id);
              if (student?.email) {
                const { buildSecondExaminerRejectedEmail } = await import("./emailTemplates");
                const tpl = buildSecondExaminerRejectedEmail({
                  recipientName: student.name ?? "Studierende:r",
                  secondExaminerName: examiner?.name ?? ctx.user.name ?? "Zweitgutachter:in",
                  thesisTitle: existing.title ?? "",
                  rejectionReason: input.rejectionReason,
                });
                await sendEmail({ to: student.email, subject: tpl.subject, html: tpl.html });
              }
            } catch (_) { /* E-Mail-Fehler nicht fatal */ }
          }
        } else if (existing.status === "PENDING_FIRST_EXAMINER" || existing.status === "CONDITIONAL_ACCEPTANCE") {
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
          reason: input.action === "conditional" ? input.conditionalReason : input.rejectionReason,
        });
        // In-App-Benachrichtigung
        if (input.action === "conditional") {
          await notifyThesisParticipants({
            thesisRequestId: input.id,
            studentId: existing.studentId,
            examinerId: existing.examinerId ?? null,
            secondExaminerId: existing.secondExaminerId,
            title: "Zusage unter Vorbehalt",
            message: `Ihre Anfrage "${existing.title}" hat eine Zusage unter Vorbehalt erhalten.${input.conditionalReason ? ` Vorbehalt: ${input.conditionalReason}` : ""}`,
            type: "status_change",
          });
          // E-Mail an Studierenden in deren Kommunikationssprache
          const student = await getUserById(existing.studentId);
          if (student?.email) {
            const studentLang: Lang = (student.preferredLanguage as Lang) ?? "de";
            const examiner = await getUserById(ctx.user.id);
            const { conditionalAcceptanceEmail } = await import("./emailTemplates");
            const tpl = conditionalAcceptanceEmail({
              recipientName: student.name,
              examinerName: examiner?.name ?? ctx.user.name,
              thesisTitle: existing.title ?? "",
              reason: input.conditionalReason ?? "",
              lang: studentLang,
            });
            // BCC an den sendenden Prüfer (Absender erhält eine Kopie)
            const examinerBcc = examiner?.email ?? null;
            await sendEmail({
              to: student.email,
              subject: tpl.subject,
              html: tpl.html,
              ...(examinerBcc ? { bcc: examinerBcc } : {}),
            });
          }
        } else {
          await notifyThesisParticipants({
            thesisRequestId: input.id,
            studentId: existing.studentId,
            examinerId: existing.examinerId ?? null,
            secondExaminerId: existing.secondExaminerId,
            title: input.action === "accept" ? "Anfrage angenommen" : "Anfrage abgelehnt",
            message: `Ihre Anfrage "${existing.title}" wurde ${input.action === "accept" ? "angenommen" : "abgelehnt"}.${input.rejectionReason ? ` Begründung: ${input.rejectionReason}` : ""}`,
            type: "status_change",
          });
        }
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
          const origin = input.origin ?? "https://thesis.htw-berlin.com";
          if (student?.email) {
            const studentLang: Lang = (student.preferredLanguage as Lang) ?? "de";
            const statusLabelDE2: Record<string, string> = { ACCEPTED: "Angenommen", REJECTED: "Abgelehnt", MATCHED: "Matched" };
            const statusLabelEN2: Record<string, string> = { ACCEPTED: "Accepted", REJECTED: "Rejected", MATCHED: "Matched" };
            const studentStatusTpl = statusChangeEmail({
              recipientName: student.name,
              thesisTitle: existing.title ?? "",
              statusTextDE: `Der Status Ihrer Anfrage &ldquo;${existing.title}&rdquo; hat sich ge&auml;ndert: ${statusLabelDE2[input.status] ?? input.status}.${input.reason ? " Begr\u00fcndung: " + input.reason : ""} Weitere Details finden Sie in Ihrem <a href="${origin}/student">Dashboard</a>.`,
              statusTextEN: `The status of your application &ldquo;${existing.title}&rdquo; has changed to: ${statusLabelEN2[input.status] ?? input.status}.${input.reason ? " Reason: " + input.reason : ""} View details in your <a href="${origin}/student">dashboard</a>.`,
              lang: studentLang,
            });
            await sendEmail({ to: student.email, subject: studentStatusTpl.subject, html: studentStatusTpl.html });
          }
          // Prüfer:innen benachrichtigen (resolveExaminerEmail bevorzugt alternativeEmail)
          const examinerIds = [existing.examinerId, existing.secondExaminerId].filter(Boolean) as number[];
          for (const exId of examinerIds) {
            const ex = await getUserById(exId);
            if (!ex?.email) continue;
            const exEmailTo = (await resolveExaminerEmail(exId)) ?? ex.email;
            const statusLabelDE = input.status === "ACCEPTED" ? "Angenommen"
              : input.status === "REJECTED" ? "Abgelehnt"
              : input.status === "MATCHED" ? "Matched"
              : input.status;
            const statusLabelEN = input.status === "ACCEPTED" ? "Accepted"
              : input.status === "REJECTED" ? "Rejected"
              : input.status === "MATCHED" ? "Matched"
              : input.status;
            const exStatusTpl = statusChangeEmail({
              recipientName: ex.name,
              thesisTitle: existing.title ?? "",
              statusTextDE: `Der Status der Abschlussarbeit &ldquo;${existing.title}&rdquo; hat sich ge&auml;ndert: ${statusLabelDE}.${input.reason ? " Begr&uuml;ndung: " + input.reason : ""} Weitere Details im <a href="${origin}/examiner">Pr&uuml;fer:innen-Dashboard</a>.`,
              statusTextEN: `The status of the thesis &ldquo;${existing.title}&rdquo; has changed to: ${statusLabelEN}.${input.reason ? " Reason: " + input.reason : ""} View details in the <a href="${origin}/examiner">examiner dashboard</a>.`,
            });
            await sendEmail({ to: exEmailTo, subject: exStatusTpl.subject, html: exStatusTpl.html });
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
          const origin = input.origin ?? "https://thesis.htw-berlin.com";
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

    // Studierende:r: Einreichung bei CONDITIONAL_ACCEPTANCE überarbeiten
    reviseSubmission: studentProcedure
      .input(z.object({
        thesisRequestId: z.number().int().positive(),
        title: z.string().min(3, "Titel zu kurz").max(512),
        description: z.string().min(10, "Beschreibung zu kurz").max(10000),
        language: z.enum(["de", "en"]).optional(),
        targetSemester: z.string().max(32).optional(),
        degreeType: z.enum(["bachelor", "master"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          await reviseThesisSubmission(input.thesisRequestId, ctx.user.id, {
            title: input.title,
            description: input.description,
            language: input.language,
            targetSemester: input.targetSemester,
            degreeType: input.degreeType,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg === "Antrag nicht gefunden") throw new TRPCError({ code: "NOT_FOUND", message: msg });
          if (msg === "Keine Berechtigung") throw new TRPCError({ code: "FORBIDDEN", message: msg });
          if (msg.includes("Überarbeitung nur bei Status")) throw new TRPCError({ code: "BAD_REQUEST", message: msg });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
        }
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "THESIS_REVISED",
          toStatus: "PENDING_FIRST_EXAMINER",
          reason: `Einreichung überarbeitet: Titel: "${input.title}"`,
        });
        return { success: true };
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
          researchFocus: z.string().optional(),
          tags: z.array(z.string()).optional(),
          languages: z.array(z.string()).optional(),
          studyPrograms: z.array(z.string()).optional(),
          maxSupervisions: z.number().optional(),
          allowedDepartments: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { allowedDepartments, ...profileFields } = input;
        await upsertExaminerProfile({ userId: ctx.user.id, ...profileFields });
        // Fachbereich-Zuordnungen speichern
        if (allowedDepartments && allowedDepartments.length > 0) {
          const { setExaminerDepartments } = await import('./db');
          const primaryDept = profileFields.department ?? allowedDepartments[0];
          await setExaminerDepartments(ctx.user.id, allowedDepartments, primaryDept);
        }
        return { success: true };
      }),

    // Fachbereich-Zuordnungen des eingeloggten Prüfers laden
    getDepartments: anyExaminerProcedure.query(async ({ ctx }) => {
      const { getExaminerDepartments } = await import('./db');
      return getExaminerDepartments(ctx.user.id);
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
        // Für Prüfer:innen: bio, phone, languages und tags aus examiner_profiles lesen
        const storedBio = isExaminerRole ? (examinerProfile?.bio ?? user.bio) : user.bio;
        const examinerBio = storedBio ? sanitizeBiographyText(storedBio) : null;
        // Telefonnummer nur für andere Prüfer:innen und Admins sichtbar – NICHT für Studierende
        const viewerRole = ctx.user?.role ?? null;
        const viewerMaySeePh = viewerRole === "examiner" || viewerRole === "second_examiner"
          || viewerRole === "admin" || viewerRole === "superadmin" || viewerRole === "pav"
          || viewerRole === "dean" || viewerRole === "vice_dean";
        const rawPhone = isExaminerRole ? (examinerProfile?.phone ?? user.phone) : user.phone;
        const examinerPhone = viewerMaySeePh ? rawPhone : null;
        const examinerLanguages: string[] = isExaminerRole && examinerProfile?.languages
          ? (Array.isArray(examinerProfile.languages) ? (examinerProfile.languages as string[]) : [])
          : [];
        const examinerTags: string[] = isExaminerRole && examinerProfile?.tags
          ? (Array.isArray(examinerProfile.tags) ? (examinerProfile.tags as string[]) : [])
          : [];
        return {
          id: user.id,
          name: user.name,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
          email: user.email,
          role: user.role,
          department: isExaminerRole ? (examinerProfile?.department ?? user.department) : user.department,
          bio: examinerBio,
          phone: examinerPhone,
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
          researchFocus: examinerProfile?.researchFocus ? sanitizeBiographyText(examinerProfile.researchFocus) : null,
          researchTags: examinerTags.length > 0 ? examinerTags.join(", ") : null,
          tags: examinerTags,
          languages: examinerLanguages,
          photoUrl: examinerProfile?.photoUrl ?? null,
          websiteUrl: examinerProfile?.websiteUrl ?? null,
          // Kapazitäten
          semesterCapacities,
          activeFirstCount,
          activeSecondCount,
          maxSupervisions: examinerProfile?.maxSupervisions ?? null,
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

    // Zweitgutachter bestätigt die Betreuung
    acceptAsSecondExaminer: anyExaminerProcedure
      .input(z.object({ thesisRequestId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const { acceptAsSecondExaminer } = await import("./db");
        await acceptAsSecondExaminer(input.thesisRequestId, ctx.user.id);
        return { success: true };
      }),

    // Zweitgutachter lehnt die Betreuung ab
    rejectAsSecondExaminer: anyExaminerProcedure
      .input(
        z.object({
          thesisRequestId: z.number().int().positive(),
          rejectionReason: z.string().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { rejectAsSecondExaminer } = await import("./db");
        await rejectAsSecondExaminer(input.thesisRequestId, ctx.user.id, input.rejectionReason);
        return { success: true };
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
    // Auslastung pro Semester: wie viele aktive Erst-/Zweitbetreuungen gibt es pro Semester?
    /** LVVO-Report: Alle betreuten Arbeiten eines Semesters für den eingeloggten Prüfer */
    getLvvoReport: anyExaminerProcedure
      .input(z.object({ semester: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return { examiner: null, entries: [] };
        const { thesisRequests: tr, users: usersTable, programmes } = await import("../drizzle/schema");
        const { or, eq: eqDrizzle } = await import("drizzle-orm");
        // Betreuer-Daten laden
        const [examiner] = await db
          .select({
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
            academicTitle: usersTable.academicTitle,
            department: usersTable.department,
          })
          .from(usersTable)
          .where(eqDrizzle(usersTable.id, ctx.user.id))
          .limit(1);
        // Alle Arbeiten für dieses Semester, bei denen der Prüfer Erst- oder Zweitgutachter ist
        const completedStatuses = [
          "SECOND_EXAMINER_SET", "COMPLETED", "ACCEPTED", "MATCHED",
          "FIRST_EXAMINER_ACCEPTED", "FIRST_EXAMINER_ASSIGNED",
          "SECOND_EXAMINER_ACCEPTED", "SECOND_EXAMINER_ASSIGNED",
          "PENDING_SECOND_EXAMINER",
        ] as const;
        const studentAlias = usersTable;
        const rows = await db
          .select({
            id: tr.id,
            title: tr.title,
            degreeType: tr.degreeType,
            language: tr.language,
            targetSemester: tr.targetSemester,
            status: tr.status,
            examinerId: tr.examinerId,
            secondExaminerId: tr.secondExaminerId,
            studentId: tr.studentId,
            department: tr.department,
          })
          .from(tr)
          .where(
            or(
              eqDrizzle(tr.examinerId, ctx.user.id),
              eqDrizzle(tr.secondExaminerId, ctx.user.id)
            )
          );
        // Nur Semester-Match und aktive/abgeschlossene Status
        const filtered = rows.filter(
          (r) =>
            r.targetSemester === input.semester &&
            completedStatuses.includes(r.status as any)
        );
        // Studierenden-Namen nachladen
        const studentIds = Array.from(new Set(filtered.map((r) => r.studentId)));
        const studentsMap: Record<number, { name: string | null; programmeId: number | null; thesisType: string | null }> = {};
        if (studentIds.length > 0) {
          const { inArray } = await import("drizzle-orm");
          const studs = await db
            .select({ id: usersTable.id, name: usersTable.name, programmeId: usersTable.programmeId, thesisType: usersTable.thesisType })
            .from(usersTable)
            .where(inArray(usersTable.id, studentIds));
          for (const s of studs) studentsMap[s.id] = { name: s.name, programmeId: s.programmeId, thesisType: s.thesisType };
        }
        // Studiengänge nachladen
        const progIds = Array.from(new Set(Object.values(studentsMap).map((s) => s.programmeId).filter(Boolean) as number[]));
        const progMap: Record<number, string> = {};
        if (progIds.length > 0) {
          const { inArray } = await import("drizzle-orm");
          const progs = await db.select({ id: programmes.id, name: programmes.name }).from(programmes).where((await import("drizzle-orm")).inArray(programmes.id, progIds));
          for (const p of progs) progMap[p.id] = p.name ?? "";
        }
        const entries = filtered.map((r) => {
          const stu = studentsMap[r.studentId];
          const progName = stu?.programmeId ? (progMap[stu.programmeId] ?? r.department ?? "") : (r.department ?? "");
          const role: "first" | "second" = r.examinerId === ctx.user.id ? "first" : "second";
          return {
            id: r.id,
            studentName: stu?.name ?? "",
            studyProgram: progName,
            title: r.title,
            language: r.language ?? "de",
            degreeType: r.degreeType ?? "bachelor",
            role,
            status: r.status,
          };
        });
        return { examiner: examiner ?? null, entries };
      }),

    /** LVVO-Report per E-Mail an die Hochschulverwaltung senden */
    sendLvvoReport: anyExaminerProcedure
      .input(z.object({
        semester: z.string().min(1),
        recipientEmail: z.string().email(),
        subject: z.string().min(1).max(255),
        message: z.string().max(2000),
        pdfBase64: z.string().min(1),  // Base64-kodiertes PDF
        lang: z.enum(["de", "en"]).default("de"),
      }))
      .mutation(async ({ ctx, input }) => {
        const { sendEmail } = await import("./emailHelper");
        const { getDb } = await import("./db");
        const db = await getDb();
        const de = input.lang === "de";

        // Betreuer-Daten laden
        let examinerName = ctx.user.name ?? "";
        let examinerEmail = ctx.user.email ?? "";
        if (db) {
          const { users: usersTable } = await import("../drizzle/schema");
          const { eq: eqDrizzle } = await import("drizzle-orm");
          const [ex] = await db.select({ name: usersTable.name, email: usersTable.email, academicTitle: usersTable.academicTitle })
            .from(usersTable).where(eqDrizzle(usersTable.id, ctx.user.id)).limit(1);
          if (ex) {
            examinerName = [ex.academicTitle, ex.name].filter(Boolean).join(" ");
            examinerEmail = ex.email ?? examinerEmail;
          }
        }

        const semLabel = input.semester.startsWith("WS")
          ? `WS ${input.semester.slice(2)}/${parseInt(input.semester.slice(2)) + 1}`
          : input.semester.startsWith("SoSe")
          ? `SoSe ${input.semester.slice(4)}`
          : input.semester;

        const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; color: #111;">
  <div style="background:#006937;padding:16px 24px;border-radius:8px 8px 0 0;">
    <span style="color:#fff;font-size:18px;font-weight:bold;">HTW Berlin &ndash; Thesis Match</span>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <p style="margin:0 0 12px;">${de ? "Sehr geehrte Damen und Herren," : "Dear Sir or Madam,"}</p>
    <p style="margin:0 0 16px;">${input.message.replace(/\n/g, "<br>")}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
      <tr><td style="padding:6px 12px;background:#f3f4f6;font-weight:bold;width:40%;">${de ? "Betreuer:in" : "Supervisor"}</td><td style="padding:6px 12px;">${examinerName}</td></tr>
      <tr><td style="padding:6px 12px;background:#f9fafb;font-weight:bold;">${de ? "E-Mail" : "Email"}</td><td style="padding:6px 12px;">${examinerEmail}</td></tr>
      <tr><td style="padding:6px 12px;background:#f3f4f6;font-weight:bold;">${de ? "Semester" : "Semester"}</td><td style="padding:6px 12px;">${semLabel}</td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:#6b7280;">${de ? "Der LVVO-Nachweis ist als PDF-Anhang beigef&uuml;gt." : "The LVVO report is attached as a PDF."}</p>
  </div>
</div>`;

        const pdfBuffer = Buffer.from(input.pdfBase64, "base64");
        const filename = `LVVO_${input.semester}_${(examinerName).replace(/\s+/g, "_")}.pdf`;

        const ok = await sendEmail({
          to: input.recipientEmail,
          subject: input.subject,
          html: htmlBody,
          text: `${input.message}\n\n${de ? "Betreuer:in" : "Supervisor"}: ${examinerName} | ${de ? "Semester" : "Semester"}: ${semLabel}`,
          attachments: [{ filename, content: pdfBuffer, contentType: "application/pdf" }],
        });

        // Audit-Log
        if (db) {
          const { createAuditLogEntry } = await import("./db");
          await createAuditLogEntry({
            actorId: ctx.user.id,
            action: "LVVO_REPORT_SENT",
            reason: `LVVO-Report ${semLabel} an ${input.recipientEmail} gesendet`,
          });
        }

        return { success: ok };
      }),

    getCapacityUsage: anyExaminerProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return [];
      const { thesisRequests: trTable } = await import("../drizzle/schema");
      const { inArray, or, eq } = await import("drizzle-orm");
      const activeStatuses = [
        "PENDING", "PENDING_FIRST_EXAMINER", "PENDING_SECOND_EXAMINER",
        "FIRST_EXAMINER_ACCEPTED", "FIRST_EXAMINER_ASSIGNED",
        "SECOND_EXAMINER_ACCEPTED", "SECOND_EXAMINER_ASSIGNED",
        "SECOND_EXAMINER_SET", "MATCHED", "ACCEPTED",
        "CONDITIONAL_ACCEPTANCE",
      ] as const;
      const rows = await db
        .select({
          examinerId: trTable.examinerId,
          secondExaminerId: trTable.secondExaminerId,
          targetSemester: trTable.targetSemester,
          status: trTable.status,
        })
        .from(trTable)
        .where(inArray(trTable.status, activeStatuses));
      // Aggregieren pro Semester
      const usageMap: Record<string, { usedFirst: number; usedSecond: number; usedConditional: number }> = {};
      for (const r of rows) {
        if (r.examinerId === ctx.user.id && r.targetSemester) {
          if (!usageMap[r.targetSemester]) usageMap[r.targetSemester] = { usedFirst: 0, usedSecond: 0, usedConditional: 0 };
          if (r.status === "CONDITIONAL_ACCEPTANCE") {
            usageMap[r.targetSemester].usedConditional++;
          } else {
            usageMap[r.targetSemester].usedFirst++;
          }
        }
        if (r.secondExaminerId === ctx.user.id && r.targetSemester) {
          if (!usageMap[r.targetSemester]) usageMap[r.targetSemester] = { usedFirst: 0, usedSecond: 0, usedConditional: 0 };
          usageMap[r.targetSemester].usedSecond++;
        }
      }
      return Object.entries(usageMap).map(([semester, usage]) => ({ semester, ...usage }));
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
        role: z.enum(["student", "examiner", "second_examiner", "admin", "user", "superadmin", "pav", "dean", "vice_dean", "programme_director"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.role === "programme_director") {
          const existingRoles = await getUserRoles(input.userId);
          if (!isEligibleForProgrammeDirector(existingRoles)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Die Zusatzrolle Studiengangsleitung kann nur bereits freigeschalteten Erstprüfer:innen zugewiesen werden.",
            });
          }
        }
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
        role: z.enum(["student", "examiner", "second_examiner", "admin", "user", "superadmin", "pav", "dean", "vice_dean", "programme_director"]),
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
          role: z.enum(["student", "examiner", "second_examiner", "admin", "user", "superadmin", "pav", "dean", "vice_dean", "programme_director"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (input.role === "programme_director") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Studiengangsleitung ist eine Zusatzrolle. Weisen Sie sie einer bestehenden Erstprüfer:innen-Rolle über die Zusatzrollenverwaltung zu.",
          });
        }
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
    // Admin: Login-Fehler-Protokoll abrufen
    getLoginAttempts: adminProcedure
      .input(z.object({
        email: z.string().optional(),
        onlyFailed: z.boolean().optional(),
        limit: z.number().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        search: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return getLoginAttempts({
          email: input.email,
          onlyFailed: input.onlyFailed,
          limit: input.limit,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
          search: input.search,
        });
      }),
    // Admin: Letzten Passwort-Reset-Zeitstempel abrufen
    getLastPasswordResetSent: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const ts = await getLastPasswordResetSent(input.userId);
        return { lastSentAt: ts };
      }),
    // Admin: Passwort-Reset-E-Mail an Nutzer:in senden
    sendPasswordResetEmail: adminProcedure
      .input(z.object({ userId: z.number(), origin: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserById(input.userId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Nutzer:in nicht gefunden." });
        if (!user.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Keine E-Mail-Adresse hinterlegt." });
        if (!user.passwordHash) throw new TRPCError({ code: "BAD_REQUEST", message: "Dieses Konto verwendet kein Passwort-Login." });
        const { randomBytes } = await import("crypto");
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 Stunde
        await createPasswordResetToken(user.id, token, expiresAt);
        const resetUrl = `${input.origin}/reset-password?token=${token}`;
        const { sendEmail } = await import("./emailHelper");
        await sendEmail({
          to: user.email,
          subject: "Neues Passwort anfordern – HTW Berlin Thesis Match Maker",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
              <div style="background: #006937; padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 20px;">HTW Berlin – Thesis Match Maker</h1>
              </div>
              <div style="padding: 32px; background: #f9f9f9;">
                <h2 style="color: #1a1a1a; margin-top: 0;">Passwort zurücksetzen</h2>
                <p style="color: #444;">Die Verwaltung der HTW Berlin hat für Sie einen Passwort-Reset-Link erstellt. Klicken Sie auf den folgenden Button, um ein neues Passwort zu vergeben:</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${resetUrl}" style="background: #76B900; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Neues Passwort vergeben</a>
                </div>
                <p style="color: #888; font-size: 13px;">Dieser Link ist 1 Stunde gültig. Falls Sie diese Anfrage nicht gestellt haben, wenden Sie sich bitte an die Verwaltung.</p>
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
                <p style="color: #aaa; font-size: 12px;">© ${new Date().getFullYear()} HTW Berlin – Hochschule für Technik und Wirtschaft</p>
              </div>
            </div>
          `,
        });
        await createAuditLogEntry({
          action: "ADMIN_PASSWORD_RESET_SENT",
          actorId: ctx.user.id,
          metadata: { targetUserId: input.userId, targetEmail: user.email },
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
        // Magic-Link wurde entfernt. Einladung = Passwort-Reset-E-Mail.
        // Nutzer muss bereits registriert sein oder wird per Import angelegt.
        const user = await getUserByEmail(input.email);
        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Kein Konto mit dieser E-Mail-Adresse gefunden. Bitte zuerst registrieren.",
          });
        }
        const { randomBytes } = await import("crypto");
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Stunden
        await createPasswordResetToken(user.id, token, expiresAt);
        const resetUrl = `${input.origin}/reset-password?token=${token}`;
        const { sendEmail } = await import("./emailHelper");
        await sendEmail({
          to: input.email,
          subject: "Einladung – HTW Berlin Thesis Match Maker",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #006937; padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 20px;">HTW Berlin – Thesis Match Maker</h1>
              </div>
              <div style="padding: 32px; background: #f9f9f9;">
                <h2 style="color: #1a1a1a; margin-top: 0;">Willkommen beim Thesis Match Maker</h2>
                <p style="color: #444;">Sie wurden eingeladen, das Thesis-Management-System der HTW Berlin zu nutzen. Bitte vergeben Sie zunächst ein Passwort für Ihr Konto:</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${resetUrl}" style="background: #76B900; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Passwort vergeben &amp; anmelden</a>
                </div>
                <p style="color: #888; font-size: 13px;">Dieser Link ist 24 Stunden gültig. Melden Sie sich danach unter <a href="${input.origin}/login">${input.origin}/login</a> mit Ihrer E-Mail-Adresse und dem gewählten Passwort an.</p>
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
                <p style="color: #aaa; font-size: 12px;">&copy; ${new Date().getFullYear()} HTW Berlin – Hochschule f&uuml;r Technik und Wirtschaft</p>
              </div>
            </div>
          `,
        });
        await createAuditLogEntry({
          action: "INVITE_SENT",
          actorId: ctx.user.id,
          metadata: { email: input.email, role: input.role },
        });
        return { success: true, message: "Einladungs-E-Mail wurde versendet." };
      }),
    // Anzahl der Magic-Link-Nutzer ohne Passwort abfragen (Vorschau vor Massen-Reset)
    getMagicLinkUsersCount: adminProcedure
      .input(z.object({ origin: z.string().url() }))
      .query(async () => {
        const db = await getDb();
        if (!db) return { count: 0, users: [] };
        const list = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
          .from(users)
          .where(and(
            eq(users.loginMethod, 'magic_link'),
            sql`(${users.passwordHash} IS NULL OR ${users.passwordHash} = '')`,
            sql`${users.email} IS NOT NULL`,
            eq(users.roleStatus, 'approved')
          ))
          .orderBy(desc(users.createdAt))
          .limit(200);
        return {
          count: list.length,
          users: list.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role as string })),
        };
      }),

    // Massen-Passwort-Reset: alle Magic-Link-Nutzer ohne Passwort per E-Mail benachrichtigen
    sendPasswordResetToMagicLinkUsers: adminProcedure
      .input(z.object({ origin: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Datenbank nicht verfügbar." });
        const list = await db.select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(and(
            eq(users.loginMethod, 'magic_link'),
            sql`(${users.passwordHash} IS NULL OR ${users.passwordHash} = '')`,
            sql`${users.email} IS NOT NULL`,
            eq(users.roleStatus, 'approved')
          ))
          .limit(200);
        if (list.length === 0) return { sent: 0, failed: 0, skipped: 0 };
        const { randomBytes } = await import("crypto");
        const { sendEmail: send } = await import("./emailHelper");
        let sent = 0;
        let failed = 0;
        for (const user of list) {
          try {
            const token = randomBytes(32).toString("hex");
            const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 Stunden
            await createPasswordResetToken(user.id, token, expiresAt);
            const resetUrl = `${input.origin}/reset-password?token=${token}`;
            await send({
              to: user.email as string,
              subject: "Bitte vergeben Sie ein Passwort – HTW Berlin Thesis Match Maker",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: #006937; padding: 24px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 20px;">HTW Berlin &ndash; Thesis Match Maker</h1>
                  </div>
                  <div style="padding: 32px; background: #f9f9f9;">
                    <h2 style="color: #1a1a1a; margin-top: 0;">Ihr Konto wurde auf Passwort-Anmeldung umgestellt</h2>
                    <p style="color: #444;">Sehr geehrte:r ${user.name ?? "Nutzer:in"},</p>
                    <p style="color: #444;">das Thesis-Management-System der HTW Berlin wurde aktualisiert. Die bisherige Anmeldung per E-Mail-Link ist nicht mehr verf&uuml;gbar. Bitte vergeben Sie jetzt ein pers&ouml;nliches Passwort f&uuml;r Ihr Konto:</p>
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${resetUrl}" style="background: #76B900; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Passwort vergeben</a>
                    </div>
                    <p style="color: #888; font-size: 13px;">Dieser Link ist 48 Stunden g&uuml;ltig. Melden Sie sich danach unter <a href="${input.origin}/login">${input.origin}/login</a> mit Ihrer E-Mail-Adresse und dem gew&auml;hlten Passwort an.</p>
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
                    <p style="color: #aaa; font-size: 12px;">&copy; ${new Date().getFullYear()} HTW Berlin &ndash; Hochschule f&uuml;r Technik und Wirtschaft</p>
                  </div>
                </div>
              `,
            });
            sent++;
          } catch (err) {
            console.error(`[BulkPasswordReset] Fehler bei ${user.email}:`, err);
            failed++;
          }
        }
        await createAuditLogEntry({
          action: "BULK_PASSWORD_RESET_SENT",
          actorId: ctx.user.id,
          metadata: { sent, failed, total: list.length },
        });
        return { sent, failed, skipped: 0 };
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
    // Admin: Prüfer:innen mit Verfügbarkeits-Info abrufen
    getExaminersWithAvailability: adminProcedure
      .input(z.object({ semester: z.string().optional() }))
      .query(async ({ input }) => {
        return getExaminersWithAvailability(input.semester);
      }),
    // Admin: Direkte Zuweisung von Erst- und/oder Zweitgutachter:in
    assignExaminers: adminProcedure
      .input(z.object({
        thesisRequestId: z.number(),
        firstExaminerId: z.number().nullable().optional(),
        secondExaminerId: z.number().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await adminDirectAssignExaminers(
          input.thesisRequestId,
          ctx.user.id,
          { firstExaminerId: input.firstExaminerId, secondExaminerId: input.secondExaminerId }
        );
        if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          actorRole: "admin",
          action: "ADMIN_ASSIGN_EXAMINERS",
          toStatus: result.newStatus,
          reason: `Admin-Zuweisung: Erstgutachter:in=${input.firstExaminerId ?? "–"}, Zweitgutachter:in=${input.secondExaminerId ?? "–"}`,
          createdAt: new Date().toISOString(),
        });
        return result;
      }),
    // Admin: Erinnerungsmail an ausstehende Gutachter:in senden
    sendExaminerReminder: adminProcedure
      .input(z.object({ thesisRequestId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const thesis = await getThesisRequestByIdWithNames(input.thesisRequestId);
        if (!thesis) throw new TRPCError({ code: "NOT_FOUND", message: "Anfrage nicht gefunden" });
        const sent: string[] = [];
        const origin = process.env.APP_ORIGIN ?? "https://thesis.htw-berlin.com";
        const needsFirstReminder = (
          thesis.wantedExaminerId &&
          !thesis.examinerId &&
          thesis.status !== "FIRST_EXAMINER_ACCEPTED" &&
          thesis.status !== "FIRST_EXAMINER_ASSIGNED"
        );
        if (needsFirstReminder) {
          const examinerUser = await getUserById(thesis.wantedExaminerId!);
          if (examinerUser) {
            const token = await createExaminerActionToken(
              thesis.id,
              examinerUser.id,
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            );
            const acceptUrl = `${origin}/examiner/respond?token=${token}&action=accept`;
            const declineUrl = `${origin}/examiner/respond?token=${token}&action=reject`;
            const tpl = buildExaminerReminderEmail({
              examinerName: [examinerUser.academicTitle, examinerUser.firstName, examinerUser.lastName].filter(Boolean).join(" ") || examinerUser.name || examinerUser.email,
              role: "first",
              thesisTitle: thesis.title ?? "(kein Titel)",
              studentName: thesis.studentName,
              studiengang: thesis.programmeName,
              semester: thesis.targetSemester,
              requestedAt: thesis.createdAt,
              acceptUrl,
              declineUrl,
              lang: examinerUser.preferredLanguage === "en" ? "en" : "de",
            });
            await sendEmail({ to: examinerUser.email ?? "", subject: tpl.subject, html: tpl.html });
            sent.push(`Erstgutachter:in (${examinerUser.email})`);
          }
        }
        const needsSecondReminder = (
          thesis.wantedSecondExaminerId &&
          !thesis.secondExaminerId &&
          thesis.status !== "SECOND_EXAMINER_ASSIGNED"
        );
        if (needsSecondReminder) {
          const secondUser = await getUserById(thesis.wantedSecondExaminerId!);
          if (secondUser) {
            const token = await createExaminerActionToken(
              thesis.id,
              secondUser.id,
              new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
            );
            const acceptUrl = `${origin}/examiner/respond?token=${token}&action=accept`;
            const declineUrl = `${origin}/examiner/respond?token=${token}&action=reject`;
            const tpl = buildExaminerReminderEmail({
              examinerName: [secondUser.academicTitle, secondUser.firstName, secondUser.lastName].filter(Boolean).join(" ") || secondUser.name || secondUser.email,
              role: "second",
              thesisTitle: thesis.title ?? "(kein Titel)",
              studentName: thesis.studentName,
              studiengang: thesis.programmeName,
              semester: thesis.targetSemester,
              requestedAt: thesis.secondExaminerRequestedAt ?? undefined,
              acceptUrl,
              declineUrl,
              lang: secondUser.preferredLanguage === "en" ? "en" : "de",
            });
            await sendEmail({ to: secondUser.email ?? "", subject: tpl.subject, html: tpl.html });
            sent.push(`Zweitgutachter:in (${secondUser.email})`);
          }
        }
        if (sent.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Keine ausstehenden Gutachter-Anfragen gefunden." });
        }
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          actorRole: "admin",
          action: "REMINDER_SENT",
          toStatus: thesis.status,
          reason: `Erinnerung gesendet an: ${sent.join(", ")}`,
          createdAt: new Date().toISOString(),
        });
        return { success: true, sentTo: sent };
      }),

    /** Prüft die bereits konfigurierte Speicherverbindung ohne Zugangsdaten offenzulegen. */
    testConfiguredStorage: adminProcedure.mutation(async () => {
      const status = await checkStorageHealth();
      return {
        success: status.healthy,
        mode: status.mode,
        provider: status.provider,
        message: status.message,
        diagnostics: status.diagnostics,
      };
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
        // Thesis-Daten mit aufgelösten Namen laden
        const thesis = await getThesisRequestByIdWithNames(col.thesisRequestId);
        const icsContent = createIcsEvent({
          title: col.title,
          start: new Date(col.scheduledAt as string),
          durationMinutes: 60,
          location: [col.location, col.room].filter(Boolean).join(" – ") || undefined,
          onlineLink: col.onlineLink || undefined,
          notes: col.notes || undefined,
          colloquiumId: col.id,
          thesisTitle: thesis?.title,
          studentName: thesis?.studentName ?? undefined,
          firstExaminerName: thesis?.firstExaminerName ?? undefined,
          secondExaminerName: thesis?.secondExaminerName ?? undefined,
          programmeName: thesis?.programmeName ?? undefined,
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
    scheduling: router({
      /** Alle eigenen laufenden und vergangenen Terminabstimmungen laden. */
      myPolls: protectedProcedure.query(async ({ ctx }) => {
        return getMyColloquiumSchedulingPolls(ctx.user.id);
      }),
      /** Detailansicht einschließlich Beteiligten, Optionen und Verfügbarkeiten. */
      byId: protectedProcedure
        .input(z.object({ pollId: z.number().int().positive() }))
        .query(async ({ ctx, input }) => {
          try {
            return await getColloquiumSchedulingPollForUser(input.pollId, ctx.user.id, ctx.user.role);
          } catch (error) {
            throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Zugriff nicht erlaubt" });
          }
        }),
      /** Konflikte werden vor dem Start sichtbar; die finale Prüfung bleibt serverseitig verpflichtend. */
      roomConflicts: anyExaminerProcedure
        .input(z.object({
          room: z.string().trim().max(256).optional(),
          location: z.string().trim().max(512).optional(),
          slots: z.array(z.object({ startsAt: z.number().int().positive(), endsAt: z.number().int().positive() })).max(10),
        }))
        .query(async ({ input }) => {
          return findColloquiumRoomConflicts(input);
        }),
      /** Nur die zugeordnete Erstprüferin bzw. der Erstprüfer kann eine Runde starten. */
      create: anyExaminerProcedure
        .input(z.object({
          thesisRequestId: z.number().int().positive(),
          responseDeadline: z.number().int().positive(),
          durationMinutes: z.number().int().min(30).max(180),
          location: z.string().trim().max(512).optional(),
          room: z.string().trim().max(256).optional(),
          onlineLink: z.union([z.string().trim().url().max(1024), z.literal("")]).optional(),
          slots: z.array(z.object({
            startsAt: z.number().int().positive(),
            endsAt: z.number().int().positive(),
          }).refine((slot) => slot.endsAt > slot.startsAt, { message: "Das Zeitfenster muss nach dem Start enden." })).min(3).max(10),
        }))
        .mutation(async ({ ctx, input }) => {
          try {
            const { pollId } = await createColloquiumSchedulingPoll({
              ...input,
              createdById: ctx.user.id,
              onlineLink: input.onlineLink || null,
            });
            // Der Job läuft täglich um 08:00 UTC und versendet idempotent Erinnerungen
            // drei bzw. einen Tag vor der individuellen Abstimmungsfrist.
            const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
            const job = await createHeartbeatJob({
              name: `colloquium-scheduling-poll-${pollId}`,
              cron: "0 0 8 * * *",
              path: "/api/scheduled/colloquium-scheduling-reminders",
              payload: {},
              description: `Automatische E-Mail-Erinnerungen für Kolloquiums-Terminabstimmung ${pollId}`,
            }, sessionToken);
            await setPollReminderTaskUid(pollId, job.taskUid);
            await createAuditLogEntry({
              thesisRequestId: input.thesisRequestId,
              actorId: ctx.user.id,
              actorRole: ctx.user.role,
              action: "COLLOQUIUM_SCHEDULING_OPENED",
              metadata: { pollId, responseDeadline: input.responseDeadline, slotCount: input.slots.length, hasOnlineLink: Boolean(input.onlineLink), room: input.room ?? null },
            });
            return { pollId, nextReminderRun: job.nextExecutionAt ?? null };
          } catch (error) {
            throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Terminabstimmung konnte nicht gestartet werden" });
          }
        }),
      respond: protectedProcedure
        .input(z.object({
          pollId: z.number().int().positive(),
          responses: z.array(z.object({ slotId: z.number().int().positive(), availability: z.enum(["YES", "MAYBE", "NO"]) })).min(1),
        }))
        .mutation(async ({ ctx, input }) => {
          try {
            const result = await submitColloquiumSchedulingAvailability({ ...input, userId: ctx.user.id, role: ctx.user.role });
            const poll = await getColloquiumSchedulingPollForUser(input.pollId, ctx.user.id, ctx.user.role);
            await createAuditLogEntry({ thesisRequestId: poll.thesis.id, actorId: ctx.user.id, actorRole: ctx.user.role, action: "COLLOQUIUM_SCHEDULING_AVAILABILITY_SET", metadata: { pollId: input.pollId, hasMatch: result.hasMatch } });
            return result;
          } catch (error) {
            throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Verfügbarkeit konnte nicht gespeichert werden" });
          }
        }),
      selectSlot: anyExaminerProcedure
        .input(z.object({ pollId: z.number().int().positive(), slotId: z.number().int().positive() }))
        .mutation(async ({ ctx, input }) => {
          try {
            await selectColloquiumSchedulingSlot({ ...input, userId: ctx.user.id, role: ctx.user.role });
            const poll = await getColloquiumSchedulingPollForUser(input.pollId, ctx.user.id, ctx.user.role);
            await createAuditLogEntry({ thesisRequestId: poll.thesis.id, actorId: ctx.user.id, actorRole: ctx.user.role, action: "COLLOQUIUM_SCHEDULING_SLOT_SELECTED", metadata: { pollId: input.pollId, slotId: input.slotId } });
            return { success: true };
          } catch (error) {
            throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Termin konnte nicht vorgeschlagen werden" });
          }
        }),
      confirm: protectedProcedure
        .input(z.object({ pollId: z.number().int().positive(), confirmed: z.boolean(), reason: z.string().trim().max(1000).optional() }))
        .mutation(async ({ ctx, input }) => {
          try {
            const result = await confirmColloquiumSchedulingSlot({ ...input, userId: ctx.user.id, role: ctx.user.role });
            const poll = await getColloquiumSchedulingPollForUser(input.pollId, ctx.user.id, ctx.user.role);
            await createAuditLogEntry({
              thesisRequestId: poll.thesis.id,
              actorId: ctx.user.id,
              actorRole: ctx.user.role,
              action: input.confirmed ? (result.finalized ? "COLLOQUIUM_SCHEDULING_CONFIRMED" : "COLLOQUIUM_SCHEDULING_CONFIRMATION_GIVEN") : "COLLOQUIUM_SCHEDULING_CONFIRMATION_DECLINED",
              metadata: { pollId: input.pollId, finalized: result.finalized, reason: input.reason ?? null },
            });
            return result;
          } catch (error) {
            throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Bestätigung konnte nicht gespeichert werden" });
          }
        }),
      cancel: anyExaminerProcedure
        .input(z.object({ pollId: z.number().int().positive(), reason: z.string().trim().max(1000).optional() }))
        .mutation(async ({ ctx, input }) => {
          try {
            await cancelColloquiumSchedulingPoll(input.pollId, ctx.user.id, ctx.user.role, input.reason);
            const poll = await getColloquiumSchedulingPollForUser(input.pollId, ctx.user.id, ctx.user.role);
            await createAuditLogEntry({ thesisRequestId: poll.thesis.id, actorId: ctx.user.id, actorRole: ctx.user.role, action: "COLLOQUIUM_SCHEDULING_CANCELLED", reason: input.reason ?? null, metadata: { pollId: input.pollId } });
            return { success: true };
          } catch (error) {
            throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Abstimmung konnte nicht abgesagt werden" });
          }
        }),
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
        administrationEmail: map["administrationEmail"] ?? "",
        twoFactorRequiredRoles: (() => {
          try {
            const parsed = JSON.parse(map["twoFactorRequiredRoles"] ?? "[]");
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })(),
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
          administrationEmail: z.string().email().or(z.literal("")).optional(),
          twoFactorRequiredRoles: z.array(z.enum(["student", "examiner", "second_examiner", "pav", "admin", "dean", "vice_dean", "programme_director", "superadmin"])).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const entries = Object.entries(input)
          .filter(([, v]) => v !== undefined)
          .map(([key, value]) => [key, key === "twoFactorRequiredRoles" ? JSON.stringify(value) : value] as [string, string]);
        for (const [key, value] of entries) {
          await upsertSystemSetting(key, value, ctx.user.id);
        }
        return { success: true };
      }),

    /** Konten mit verpflichtender, aber noch nicht eingerichteter Zwei-Faktor-Authentifizierung. */
    getTwoFactorEnrollmentGaps: superadminProcedure.query(async () => {
      const settings = await getSystemSettings();
      const requiredRolesSetting = settings.find((setting) => setting.key === "twoFactorRequiredRoles");
      const rawRoles = requiredRolesSetting?.value ?? "[]";
      let requiredRoles: string[] = [];
      try {
        const parsed = JSON.parse(rawRoles);
        requiredRoles = Array.isArray(parsed) ? parsed.filter((role): role is string => typeof role === "string") : [];
      } catch {
        requiredRoles = [];
      }
      const activationDate = requiredRolesSetting?.updatedAt ? new Date(requiredRolesSetting.updatedAt) : new Date();
      const deadline = new Date(activationDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const overdue = Date.now() > deadline.getTime();
      const users = await getUsersMissingRequiredTwoFactor(requiredRoles);
      return users.map((user) => ({
        ...user,
        twoFactorRequirementActivatedAt: activationDate.toISOString(),
        twoFactorDeadline: deadline.toISOString(),
        twoFactorOverdue: overdue,
      }));
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
          role: z.enum(["student", "examiner", "second_examiner", "pav", "admin", "dean", "vice_dean", "superadmin", "programme_director"]),
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
          const dashboardUrl = `${input.origin ?? "https://thesis.htw-berlin.com"}/pav`;
          await sendPavProgrammeAssignmentEmail({
            to: pavUser.email,
            pavName: pavUser.name ?? pavUser.email,
            programmeName: prog.name,
            programmeLevel: prog.level,
            dashboardUrl,
            removed: false,
            lang: pavUser.preferredLanguage === "en" ? "en" : "de",
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
          const dashboardUrl = `${input.origin ?? "https://thesis.htw-berlin.com"}/pav`;
          await sendPavProgrammeAssignmentEmail({
            to: pavUser.email,
            pavName: pavUser.name ?? pavUser.email,
            programmeName: prog.name,
            programmeLevel: prog.level,
            dashboardUrl,
            removed: true,
            lang: pavUser.preferredLanguage === "en" ? "en" : "de",
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
              // Neuen Nutzer anlegen (openId = email, loginMethod = password)
              const openId = `import_${row.email.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}`;
              await upsertUser({
                openId,
                name: row.name,
                email: row.email,
                role: row.role,
                loginMethod: "password",
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

    /** Infrastruktur-Status: Speicher, Scheduler, Konfiguration */
    getInfrastructureStatus: superadminProcedure.query(async () => {
      const storageHealth = await checkStorageHealth();
      const schedulerStatus = getSchedulerStatus();
      const settings = await getSystemSettings();
      const map: Record<string, string> = {};
      for (const r of settings) map[r.key] = r.value;
      return {
        storage: storageHealth,
        scheduler: schedulerStatus,
        config: {
          siteUrl: process.env.SITE_URL || map["siteUrl"] || "",
          emailLogoUrl: map["emailLogoUrl"] || "",
          s3Endpoint: process.env.S3_ENDPOINT || map["s3Endpoint"] || "",
          s3Bucket: process.env.S3_BUCKET || map["s3Bucket"] || "",
          s3Region: process.env.S3_REGION || map["s3Region"] || "",
          storageMode: getStorageMode(),
          storageProvider: getStorageProvider(),
        },
      };
    }),

    /** Infrastruktur-Konfiguration aktualisieren (S3, Logo-URL, Site-URL) */
    updateInfrastructureConfig: superadminProcedure
      .input(z.object({
        siteUrl: z.string().max(512).optional(),
        emailLogoUrl: z.string().max(512).optional(),
        s3Endpoint: z.string().max(512).optional(),
        s3Bucket: z.string().max(128).optional(),
        s3Region: z.string().max(32).optional(),
        s3AccessKey: z.string().max(256).optional(),
        s3SecretKey: z.string().max(256).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const entries = Object.entries(input)
          .filter(([, v]) => v !== undefined && v !== "")
          .map(([key, value]) => [key, value] as [string, string]);
        for (const [key, value] of entries) {
          await upsertSystemSetting(key, value, ctx.user.id);
        }
        return { success: true, note: "Änderungen werden nach einem Neustart des Servers wirksam (Umgebungsvariablen haben Vorrang vor DB-Einstellungen)." };
      }),

    /** S3-Verbindungstest mit den eingegebenen Zugangsdaten */
    testS3Connection: superadminProcedure
      .input(z.object({
        endpoint: z.string().min(1),
        bucket: z.string().min(1),
        region: z.string().default("de"),
        accessKey: z.string().min(1),
        secretKey: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        try {
          const { S3Client, HeadBucketCommand } = await import("@aws-sdk/client-s3");
          const client = new S3Client({
            endpoint: input.endpoint.startsWith("http") ? input.endpoint : `https://${input.endpoint}`,
            region: input.region,
            credentials: { accessKeyId: input.accessKey, secretAccessKey: input.secretKey },
            forcePathStyle: true,
          });
          await client.send(new HeadBucketCommand({ Bucket: input.bucket }));
          return { success: true, message: `Verbindung zu Bucket „${input.bucket}" erfolgreich hergestellt.` };
        } catch (err: any) {
          const msg = err?.message ?? "Unbekannter Fehler";
          const code = err?.$metadata?.httpStatusCode;
          if (code === 403) return { success: false, message: "Zugriff verweigert – bitte Access Key und Secret Key prüfen." };
          if (code === 404) return { success: false, message: `Bucket „${input.bucket}" nicht gefunden.` };
          return { success: false, message: `Verbindung fehlgeschlagen: ${msg}` };
        }
      }),

    /** Backup-Konfiguration lesen und speichern */
    getBackupConfig: superadminProcedure.query(async () => {
      const settings = await getSystemSettings();
      const map: Record<string, string> = {};
      for (const r of settings) map[r.key] = r.value;
      return {
        backupEnabled: map["backupEnabled"] === "true",
        backupInterval: map["backupInterval"] || "daily",
        backupTime: map["backupTime"] || "03:00",
        backupRetentionDays: parseInt(map["backupRetentionDays"] || "30", 10),
        lastBackup: map["lastBackupAt"] || null,
      };
    }),

    updateBackupConfig: superadminProcedure
      .input(z.object({
        backupEnabled: z.boolean(),
        backupInterval: z.enum(["hourly", "daily", "weekly"]),
        backupTime: z.string().regex(/^\d{2}:\d{2}$/).default("03:00"),
        backupRetentionDays: z.number().int().min(1).max(365).default(30),
      }))
      .mutation(async ({ input, ctx }) => {
        await upsertSystemSetting("backupEnabled", String(input.backupEnabled), ctx.user.id);
        await upsertSystemSetting("backupInterval", input.backupInterval, ctx.user.id);
        await upsertSystemSetting("backupTime", input.backupTime, ctx.user.id);
        await upsertSystemSetting("backupRetentionDays", String(input.backupRetentionDays), ctx.user.id);
        return { success: true, note: "Backup-Konfiguration gespeichert. Änderungen werden beim nächsten Scheduler-Durchlauf wirksam." };
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
        if (!userHasRole(ctx.user, 'examiner') && !userHasRole(ctx.user, 'second_examiner'))
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur Prüfer:innen können Studiengangsbeteiligungen verwalten.' });
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
          emailLang: z.enum(["de", "en"]).optional(),
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
          const examinerUser = await getUserById(input.examinerId);
          // Sprachauswahl: manuell gewählt > Präferenz des Empfängers > Fallback DE
          const lang: Lang = input.emailLang ?? (examinerUser?.preferredLanguage as Lang) ?? "de";
          const acceptUrl = `${input.origin}/pav/respond?token=${token}&action=accept`;
          const declineUrl = `${input.origin}/pav/respond?token=${token}&action=decline`;
          const tpl = examinerRequestEmail({
            examinerName: examinerUser?.name,
            role: input.examinerRole,
            thesisTitle: thesis.title ?? "Abschlussarbeit",
            acceptUrl,
            declineUrl,
            lang,
          });
          await sendEmail({ to: examinerEmail, subject: tpl.subject, html: tpl.html });
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
          const studentLang: Lang = (student.preferredLanguage as Lang) ?? "de";
          const tpl = enrollmentEligibilityEmail({
            studentName: student.name,
            thesisTitle: thesis.title ?? "Abschlussarbeit",
            eligible: input.eligibility === "approved",
            note: input.note,
            lang: studentLang,
          });
          await sendEmail({ to: student.email, subject: tpl.subject, html: tpl.html });
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
          const studentLang: Lang = (student.preferredLanguage as Lang) ?? "de";
          const tpl = defenseEligibilityEmail({
            studentName: student.name,
            thesisTitle: thesis.title ?? "Abschlussarbeit",
            eligible: input.eligibility === "approved",
            note: input.note,
            lang: studentLang,
          });
          await sendEmail({ to: student.email, subject: tpl.subject, html: tpl.html });
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
        // Benachrichtigungs-E-Mail an Prüfer:in (zweisprachig)
        const examinerEmail = await resolveExaminerEmail(input.examinerId);
        if (examinerEmail) {
          const examinerUser = await getUserById(input.examinerId);
          const examinerLang: Lang = (examinerUser?.preferredLanguage as Lang) ?? "de";
          const tpl = directAssignmentEmail({
            examinerName: examinerUser?.name,
            role: input.examinerRole,
            thesisTitle: thesis.title ?? "Abschlussarbeit",
            lang: examinerLang,
          });
          await sendEmail({ to: examinerEmail, subject: tpl.subject, html: tpl.html });
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
    /** Vorlage aktualisieren (inkl. DE/EN-Versionen) */
    update: adminProcedure
      .input(z.object({
        key: z.string(),
        subject: z.string().optional(),
        htmlBody: z.string().optional(),
        textBody: z.string().optional(),
        subjectDe: z.string().optional(),
        htmlBodyDe: z.string().optional(),
        textBodyDe: z.string().optional(),
        subjectEn: z.string().optional(),
        htmlBodyEn: z.string().optional(),
        textBodyEn: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await updateEmailTemplate(
          input.key,
          {
            subject: input.subject, htmlBody: input.htmlBody, textBody: input.textBody,
            subjectDe: input.subjectDe, htmlBodyDe: input.htmlBodyDe, textBodyDe: input.textBodyDe,
            subjectEn: input.subjectEn, htmlBodyEn: input.htmlBodyEn, textBodyEn: input.textBodyEn,
          },
          ctx.user.id
        );
        return { success: true };
      }),
    /** Sendet die aktuell bearbeitete Sprachversion ausschließlich an die angemeldete Verwaltungsperson. */
    sendPreviewToSelf: adminProcedure
      .input(z.object({
        templateKey: z.string().min(1).max(100),
        language: z.enum(["de", "en"]),
        subject: z.string().min(1).max(500),
        html: z.string().min(1).max(200_000),
        text: z.string().max(100_000).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Für Ihr Konto ist keine E-Mail-Adresse hinterlegt." });
        const sent = await sendEmail({ to: ctx.user.email, subject: input.subject, html: input.html, text: input.text });
        if (!sent) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Die Testmail konnte nicht versendet werden." });
        await createAuditLogEntry({
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "EMAIL_TEMPLATE_TEST_SENT",
          metadata: { templateKey: input.templateKey, emailLanguage: input.language, recipientEmail: ctx.user.email },
        });
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
        studySpecializations: z.string().max(1000).optional(),
        personalInterests: z.string().max(1000).optional(),
                keywords: z.string().max(500).optional(),
        examinerTopicId: z.number().int().positive().optional(),
        hasOwnTopic: z.boolean().default(true).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Prüfe ob Student offene Anfrage hat
        if (await hasOpenThesisRequest(ctx.user.id)) {
          throw new TRPCError({ code: "CONFLICT", message: "Student hat bereits eine offene Anfrage" });
        }

        // Prüfen ob Thema-Limit erreicht ist (allowMultiple=0 oder maxAssignments)
        if (input.examinerTopicId) {
          const db = await getDb();
          if (db) {
            const tid = input.examinerTopicId;
            const topicRows2 = await db.select({ maxAssignments: examinerTopics.maxAssignments, allowMultiple: examinerTopics.allowMultiple })
              .from(examinerTopics)
              .where(eq(examinerTopics.id, tid))
              .limit(1);
            const topicData2 = topicRows2[0];
            if (topicData2) {
              const countRows2 = await db.select({ count: sql<number>`COUNT(*)` })
                .from(thesisRequests)
                .where(and(
                  eq(thesisRequests.examinerTopicId, tid),
                  notInArray(thesisRequests.status, ['WITHDRAWN', 'REJECTED', 'CANCELLED'] as const)
                ));
              const assignmentCount2 = Number(countRows2[0]?.count ?? 0);
              // allowMultiple=0 bedeutet: Thema darf nur 1x vergeben werden
              if (Number(topicData2.allowMultiple) === 0 && assignmentCount2 >= 1) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Dieses Thema kann nur einmal vergeben werden und ist bereits belegt.' });
              }
              // maxAssignments-Limit prüfen
              if (topicData2.maxAssignments !== null && topicData2.maxAssignments !== undefined && assignmentCount2 >= topicData2.maxAssignments) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Dieses Thema hat die maximale Anzahl an Vergaben erreicht und kann nicht mehr gewählt werden.' });
              }
            }
          }
        }

        let result: any;
        try {
          result = await createThesisRequest({
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
            studySpecializations: input.studySpecializations ?? null,
            personalInterests: input.personalInterests ?? null,
            keywords: input.keywords ? JSON.stringify(input.keywords.split(",").map((k: string) => k.trim()).filter((k: string) => k.length > 0)) : null,
            examinerTopicId: input.examinerTopicId ?? null,
            hasOwnTopic: input.hasOwnTopic ? 1 : 0,
          } as any);
        } catch (dbErr: any) {
          console.error("[createWithWantedExaminer] DB Insert Fehler:", dbErr?.message ?? dbErr);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Datenbankfehler beim Erstellen der Anfrage: ${dbErr?.message ?? "Unbekannter Fehler"}` });
        }

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

        // E-Mail sofort an Wunsch-Erstgutachter:in senden
        try {
          const examinerUser = await getUserById(input.wantedExaminerId);
          const examinerEmailTo = await resolveExaminerEmail(input.wantedExaminerId) ?? examinerUser?.email;
          const student = await getUserById(ctx.user.id);
          const origin = (input as any).origin ?? process.env.SITE_URL ?? "https://thesis.htw-berlin.com";
          if (examinerEmailTo) {
            const acceptUrl = `${origin}/examiner/respond?token=${token}&action=accept`;
            const rejectUrl = `${origin}/examiner/respond?token=${token}&action=reject`;
            await sendExaminerCTAEmail({
              to: examinerEmailTo,
              examinerName: examinerUser?.name ?? "Prüfer:in",
              studentName: student?.name ?? ctx.user.email ?? "Studierende:r",
              thesisTitle: input.title,
              department: input.department ?? "",
              acceptUrl,
              rejectUrl,
              lang: (examinerUser?.preferredLanguage as "de" | "en") ?? "de",
            });
            console.log(`[createWithWantedExaminer] E-Mail an ${examinerEmailTo} gesendet.`);
          }
        } catch (emailErr) {
          console.warn("[createWithWantedExaminer] E-Mail-Fehler (nicht kritisch):", emailErr);
        }

        return { success: true, insertId, token };
      }),

    // Student: Anfrage zurückziehen
    withdraw: studentProcedure
      .input(z.object({ thesisRequestId: z.number().int().positive(), reason: z.string().max(500).optional() }))
      .mutation(async ({ ctx, input }) => {
        try {
          await withdrawThesisRequest(input.thesisRequestId, ctx.user.id, input.reason);
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

    // Student: Eingereichte Anfrage bearbeiten (nur bei PENDING / PENDING_FIRST_EXAMINER)
    editRequest: studentProcedure
      .input(z.object({
        thesisRequestId: z.number().int().positive(),
        title: z.string().min(1).max(512),
        description: z.string().min(1),
        department: z.string().max(255).optional(),
        abstract: z.string().optional(),
        targetSemester: z.string(),
        language: z.enum(["de", "en"]).default("de"),
        degreeType: z.enum(["bachelor", "master"]).default("bachelor"),
        studySpecializations: z.string().max(1000).optional(),
        personalInterests: z.string().max(1000).optional(),
        keywords: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Datenbank nicht verfügbar" });
        const [request] = await db
          .select({ id: thesisRequests.id, studentId: thesisRequests.studentId, status: thesisRequests.status })
          .from(thesisRequests)
          .where(eq(thesisRequests.id, input.thesisRequestId))
          .limit(1);
        if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Anfrage nicht gefunden" });
        if (request.studentId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Keine Berechtigung" });
        const editableStatuses = ["PENDING", "PENDING_FIRST_EXAMINER"];
        if (!editableStatuses.includes(request.status)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Anfrage kann nicht mehr bearbeitet werden, da sie bereits von einer Prüfer:in bearbeitet wird." });
        }
        // Vorherige Werte laden für Diff
        const [oldData] = await db
          .select({
            title: thesisRequests.title,
            description: thesisRequests.description,
            department: thesisRequests.department,
            abstract: thesisRequests.abstract,
            targetSemester: thesisRequests.targetSemester,
            language: thesisRequests.language,
            degreeType: thesisRequests.degreeType,
            studySpecializations: thesisRequests.studySpecializations,
            personalInterests: thesisRequests.personalInterests,
            keywords: thesisRequests.keywords,
          })
          .from(thesisRequests)
          .where(eq(thesisRequests.id, input.thesisRequestId))
          .limit(1);
        const newKeywords = input.keywords
          ? JSON.stringify(input.keywords.split(",").map((k: string) => k.trim()).filter((k: string) => k.length > 0))
          : undefined;
        // Diff berechnen
        const FIELD_LABELS: Record<string, string> = {
          title: "Titel",
          description: "Beschreibung",
          department: "Fachbereich",
          abstract: "Abstract",
          targetSemester: "Zielsemester",
          language: "Sprache",
          degreeType: "Abschlussart",
          studySpecializations: "Studienvertiefungen",
          personalInterests: "Persönliche Interessen",
          keywords: "Stichwörter",
        };
        const diffEntries: { field: string; label: string; oldValue: string | null; newValue: string | null }[] = [];
        const compareFields: Array<{ key: keyof typeof oldData; newVal: string | null | undefined }> = [
          { key: "title", newVal: input.title },
          { key: "description", newVal: input.description },
          { key: "department", newVal: input.department ?? null },
          { key: "abstract", newVal: input.abstract ?? null },
          { key: "targetSemester", newVal: input.targetSemester },
          { key: "language", newVal: input.language },
          { key: "degreeType", newVal: input.degreeType },
          { key: "studySpecializations", newVal: input.studySpecializations ?? null },
          { key: "personalInterests", newVal: input.personalInterests ?? null },
          { key: "keywords", newVal: newKeywords ?? null },
        ];
        for (const { key, newVal } of compareFields) {
          const oldVal = oldData ? (oldData[key] as string | null ?? null) : null;
          const nv = newVal ?? null;
          if (oldVal !== nv) {
            diffEntries.push({ field: key, label: FIELD_LABELS[key] ?? key, oldValue: oldVal, newValue: nv });
          }
        }
        await db.update(thesisRequests)
          .set({
            title: input.title,
            description: input.description,
            department: input.department ?? undefined,
            abstract: input.abstract ?? undefined,
            targetSemester: input.targetSemester,
            language: input.language,
            degreeType: input.degreeType,
            studySpecializations: input.studySpecializations ?? undefined,
            personalInterests: input.personalInterests ?? undefined,
            keywords: newKeywords ?? undefined,
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          } as any)
          .where(eq(thesisRequests.id, input.thesisRequestId));
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "THESIS_UPDATED_BY_STUDENT",
          toStatus: request.status as any,
          metadata: { diff: diffEntries, changedFieldCount: diffEntries.length } as any,
        });
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

        // E-Mail-Benachrichtigung an den ausgewählten Zweitgutachter (asynchron, kein Fehler wenn fehlschlägt)
        const { notifySecondExaminerOfSelection } = await import("./db");
        notifySecondExaminerOfSelection(input.thesisRequestId, input.secondExaminerId).catch(
          (err: unknown) => console.error("[Email] Zweitgutachter-Benachrichtigung fehlgeschlagen:", err)
        );

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
      .query(async ({ ctx }) => {
        const all = await getAllSecondExaminerCandidates();
        // Eingeloggte Person aus der Liste ausschließen
        return all.filter((c: any) => c.id !== ctx.user.id);
      }),

    // Student: Zweitgutachter-Anfrage stellen (interner Prüfer im System)
    setWantedSecondExaminer: studentProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        secondExaminerId: z.number().int().positive().nullable(),
        personalNote: z.string().max(1000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await setWantedSecondExaminer(input.requestId, ctx.user.id, input.secondExaminerId);
        if (!result.success) {
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        }
        // E-Mail mit direktem Bestätigungs-Token an Zweitgutachter:in senden
        if (input.secondExaminerId) {
          try {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 14); // 14 Tage gültig
            const secToken = await createExaminerActionToken(input.requestId, input.secondExaminerId, expiresAt);
            const secondExaminerUser = await getUserById(input.secondExaminerId);
            const secondExaminerEmailTo = await resolveExaminerEmail(input.secondExaminerId) ?? secondExaminerUser?.email;
            const student = await getUserById(ctx.user.id);
            const origin = (input as any).origin ?? process.env.SITE_URL ?? "https://thesis.htw-berlin.com";
            if (secondExaminerEmailTo) {
              const acceptUrl = `${origin}/examiner/respond?token=${secToken}&action=accept`;
              const rejectUrl = `${origin}/examiner/respond?token=${secToken}&action=reject`;
              await sendExaminerCTAEmail({
                to: secondExaminerEmailTo,
                examinerName: secondExaminerUser?.name ?? "Prüfer:in",
                studentName: student?.name ?? ctx.user.email ?? "Studierende:r",
                thesisTitle: (await getThesisRequestById(input.requestId))?.title ?? "Abschlussarbeit",
                department: "",
                acceptUrl,
                rejectUrl,
                lang: (secondExaminerUser?.preferredLanguage as "de" | "en") ?? "de",
              });
              console.log(`[setWantedSecondExaminer] E-Mail an ${secondExaminerEmailTo} gesendet.`);
            }
          } catch (emailErr) {
            console.warn("[setWantedSecondExaminer] E-Mail-Fehler (nicht kritisch):", emailErr);
          }
        }
        return { success: true };
      }),

    // Student: Externen Zweitgutachter (nicht im System) eintragen
    setExternalSecondExaminer: studentProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        title: z.string().max(64).default(""),
        firstName: z.string().min(1).max(128),
        lastName: z.string().min(1).max(128),
        email: z.string().email().max(320),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await setExternalSecondExaminer(input.requestId, ctx.user.id, {
          title: input.title,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
        });
        if (!result.success) {
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        }
        return { success: true };
      }),

    // Student/Admin: Zweitgutachter-Anfrage zurückziehen
    withdrawSecondExaminerRequest: studentProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "superadmin";
        const result = await withdrawSecondExaminerRequest(input.requestId, ctx.user.id, isAdmin);
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
        const allowedRoles = ["examiner", "second_examiner", "admin", "superadmin"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Prüfer:innen können Kommissionspräferenzen setzen." });
        }
        const success = await setCommissionPreferences(ctx.user.id, input.secondExaminerIds);
        return { success };
      }),

    // ─── Prüfer-Themenvorschläge ──────────────────────────────────────────────

    // Prüfer:in: eigene Themen abrufen
    getMyTopics: protectedProcedure
      .query(async ({ ctx }) => {
        if (!["examiner", "second_examiner", "admin", "superadmin"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getTopicsByExaminer(ctx.user.id);
      }),

    // Öffentlich: alle aktiven Themen abrufen (für Studierende)
    getAllActiveTopics: publicProcedure
      .query(async () => {
        return getAllActiveTopics();
      }),

    // Öffentlich: aktive Themen eines bestimmten Prüfers abrufen
    getActiveTopicsForExaminer: publicProcedure
      .input(z.object({ examinerId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getActiveTopicsForExaminer(input.examinerId);
      }),

    // Prüfer:in: neues Thema anlegen
    createTopic: protectedProcedure
      .input(z.object({
        title: z.string().min(3).max(512),
        description: z.string().min(10),
        validFromSemester: z.string().max(16).nullable().optional(),
        validUntilSemester: z.string().max(16).nullable().optional(),
        degreeType: z.enum(["bachelor", "master"]).nullable().optional(),
        language: z.enum(["de", "en", "both"]).default("de"),
        allowMultiple: z.number().int().min(0).max(1).default(1),
        tags: z.string().max(512).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!["examiner", "second_examiner", "admin", "superadmin"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Prüfer:innen können Themen anlegen." });
        }
        await createExaminerTopic({ examinerId: ctx.user.id, ...input });
        return { success: true };
      }),

    // Prüfer:in: Thema aktualisieren
    updateTopic: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        title: z.string().min(3).max(512).optional(),
        description: z.string().min(10).optional(),
        validFromSemester: z.string().max(16).nullable().optional(),
        validUntilSemester: z.string().max(16).nullable().optional(),
        degreeType: z.enum(["bachelor", "master"]).nullable().optional(),
        language: z.enum(["de", "en", "both"]).optional(),
        isActive: z.number().int().min(0).max(1).optional(),
        allowMultiple: z.number().int().min(0).max(1).optional(),
        tags: z.string().max(512).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!["examiner", "second_examiner", "admin", "superadmin"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { id, ...data } = input;
        await updateExaminerTopic(id, ctx.user.id, data);
        return { success: true };
      }),

    // Prüfer:in: Thema löschen
    deleteTopic: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (!["examiner", "second_examiner", "admin", "superadmin"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await deleteExaminerTopic(input.id, ctx.user.id);
        return { success: true };
      }),

    // Prüfer:in: Studierende zu einem Thema abrufen
    getStudentsByTopic: protectedProcedure
      .input(z.object({ topicId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        if (!["examiner", "second_examiner", "admin", "superadmin"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = await getDb();
        if (!db) return [];
        const studentAlias = aliasedTable(users, "topic_student");
        const rows = await db
          .select({
            requestId: thesisRequests.id,
            title: thesisRequests.title,
            status: thesisRequests.status,
            createdAt: thesisRequests.createdAt,
            studentId: studentAlias.id,
            studentName: studentAlias.name,
            studentEmail: studentAlias.email,
            studentAvatarUrl: studentAlias.avatarUrl,
          })
          .from(thesisRequests)
          .innerJoin(studentAlias, eq(thesisRequests.studentId, studentAlias.id))
          .where(
            and(
              eq(thesisRequests.examinerTopicId, input.topicId),
              notInArray(thesisRequests.status, ['WITHDRAWN', 'REJECTED', 'CANCELLED'] as const)
            )
          )
          .orderBy(thesisRequests.createdAt);
        return rows;
      }),

    // Prüfer:in: Vergabelimit eines Themas erhöhen
    increaseTopicLimit: protectedProcedure
      .input(z.object({
        topicId: z.number().int().positive(),
        newMaxAssignments: z.number().int().min(1).max(999),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!["examiner", "second_examiner", "admin", "superadmin"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Sicherstellen dass das Thema dem Prüfer gehört
        const [topic] = await db
          .select({ id: examinerTopics.id, examinerId: examinerTopics.examinerId, maxAssignments: examinerTopics.maxAssignments, allowMultiple: examinerTopics.allowMultiple })
          .from(examinerTopics)
          .where(eq(examinerTopics.id, input.topicId))
          .limit(1);
        if (!topic) throw new TRPCError({ code: "NOT_FOUND", message: "Thema nicht gefunden." });
        if (topic.examinerId !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "superadmin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Dieses Thema gehört Ihnen nicht." });
        }
        await db
          .update(examinerTopics)
          .set({ maxAssignments: input.newMaxAssignments, allowMultiple: 1 })
          .where(eq(examinerTopics.id, input.topicId));
        return { success: true };
      }),
  }),

  // ─── Fristenverwaltung der Fachbereiche ───────────────────────────────────
  deadlines: router({
    list: adminProcedure.query(async ({ ctx }) => {
      const scope = userHasRole(ctx.user, "superadmin") ? null : await getAdminDepartment(ctx.user.id);
      return getProgrammeSemesterDeadlines(scope);
    }),
    saveRule: adminProcedure
      .input(z.object({
        department: z.enum(["FB1", "FB2", "FB3", "FB4", "FB5"]),
        programmeId: z.number().int().positive().nullable(),
        semester: z.string().min(3).max(32),
        registrationDeadline: z.string().min(10),
        submissionDeadline: z.string().min(10),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!userHasRole(ctx.user, "superadmin")) {
          const department = await getAdminDepartment(ctx.user.id);
          if (department !== input.department) throw new TRPCError({ code: "FORBIDDEN", message: "Sie dürfen Fristen nur für Ihren Fachbereich verwalten." });
        }
        if (new Date(input.registrationDeadline) > new Date(input.submissionDeadline)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Die Anmeldefrist darf nicht nach der Abgabefrist liegen." });
        }
        const saved = await upsertProgrammeSemesterDeadline({ ...input, updatedBy: ctx.user.id });
        return { success: true, ...saved };
      }),
    setIndividualSubmissionDeadline: adminProcedure
      .input(z.object({
        thesisRequestId: z.number().int().positive(),
        newDeadline: z.string().min(10),
        reason: z.string().min(3).max(512),
      }))
      .mutation(async ({ ctx, input }) => {
        const scope = await assertDeadlineDepartmentScope(ctx, input.thesisRequestId);
        const thesis = await getThesisRequestById(input.thesisRequestId);
        if (!thesis) throw new TRPCError({ code: "NOT_FOUND", message: "Anfrage nicht gefunden." });
        await extendDeadline(input.thesisRequestId, ctx.user.id, input.newDeadline, input.reason);
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "STATUS_CHANGED",
          reason: input.reason,
          metadata: { action: "submission_deadline_changed", newDeadline: input.newDeadline, department: scope.department },
        });
        await notifyThesisParticipants({
          thesisRequestId: input.thesisRequestId,
          studentId: thesis.studentId,
          examinerId: thesis.examinerId,
          secondExaminerId: thesis.secondExaminerId,
          title: "Abgabetermin geändert",
          message: `Der Abgabetermin für „${thesis.title}" wurde auf ${new Date(input.newDeadline).toLocaleDateString("de-DE")} verschoben. Begründung: ${input.reason}`,
          type: "status_change",
        });
        return { success: true };
      }),
    getChangesForRequest: protectedProcedure
      .input(z.object({ thesisRequestId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const thesis = await getThesisRequestById(input.thesisRequestId);
        if (!thesis) throw new TRPCError({ code: "NOT_FOUND", message: "Anfrage nicht gefunden." });
        const isInvolved = [thesis.studentId, thesis.examinerId, thesis.secondExaminerId].includes(ctx.user.id);
        const isAdministrator = userHasRole(ctx.user, "admin") || userHasRole(ctx.user, "superadmin");
        if (!isInvolved && !isAdministrator) throw new TRPCError({ code: "FORBIDDEN" });
        if (isAdministrator) await assertDeadlineDepartmentScope(ctx, input.thesisRequestId);
        return getDeadlineChanges(input.thesisRequestId);
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

    // Superadmins sehen alle Fachbereiche; Verwaltungsmitarbeiter:innen nur Fälle ihrer Studierenden.
    getCrossDepartmentSupervisions: adminProcedure
      .input(z.object({ semester: z.string().min(1).optional() }).optional())
      .query(async ({ ctx, input }) => {
        const scopeDepartment = userHasRole(ctx.user, "superadmin") ? null : await getAdminDepartment(ctx.user.id);
        return getCrossDepartmentSupervisionOverview(scopeDepartment, input?.semester ?? null);
      }),

    // Vergleich der Volumen aller vorhandenen Semester mit derselben Fachbereichs-Sicht wie die Kreuztabelle.
    getCrossDepartmentTimeSeries: adminProcedure
      .query(async ({ ctx }) => {
        const scopeDepartment = userHasRole(ctx.user, "superadmin") ? null : await getAdminDepartment(ctx.user.id);
        return getCrossDepartmentSupervisionTimeSeries(scopeDepartment);
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
      return roles.includes("superadmin")
        ? getPendingRoleUsers()
        : getPendingRoleUsersForAdmin(ctx.user.id);
    }),

    // Rollenanfrage bestätigen
    approve: protectedProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        adminDepartment: z.enum(["FB1", "FB2", "FB3", "FB4", "FB5"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const roles: string[] = (ctx.user as any).roles ?? [ctx.user.role];
        if (!roles.includes("admin") && !roles.includes("superadmin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Kein Zugriff." });
        }
        const isSuperadmin = roles.includes("superadmin");
        const targetStatus = await getUserRoleStatus(input.userId);
        if (!isSuperadmin && !(await canAdminManageUser(ctx.user.id, input.userId))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sie dürfen nur Registrierungen Ihres zugewiesenen Fachbereichs bearbeiten." });
        }
        if (targetStatus?.requestedRole === "admin") {
          if (!isSuperadmin) throw new TRPCError({ code: "FORBIDDEN", message: "Verwaltungsmitarbeiter:innen können nur durch Superadmins freigeschaltet werden." });
          if (!input.adminDepartment) throw new TRPCError({ code: "BAD_REQUEST", message: "Bitte weisen Sie der Verwaltungsmitarbeiterin bzw. dem Verwaltungsmitarbeiter einen Fachbereich zu." });
        }
        const confirmerRole = isSuperadmin ? "superadmin" : "admin";
        const result = await approveUserRole(input.userId, ctx.user.id, confirmerRole);
        if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: result.error ?? "Fehler beim Bestätigen." });
        if (targetStatus?.requestedRole === "admin" && input.adminDepartment) {
          const scopeResult = await assignAdminDepartment(input.userId, input.adminDepartment, ctx.user.id);
          if (!scopeResult.success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: scopeResult.error ?? "Fachbereichsberechtigung konnte nicht gespeichert werden." });
        }
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
        if (!roles.includes("superadmin") && !(await canAdminManageUser(ctx.user.id, input.userId))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sie dürfen nur Registrierungen Ihres zugewiesenen Fachbereichs bearbeiten." });
        }
        const confirmerRole = roles.includes("superadmin") ? "superadmin" : "admin";
        const result = await rejectUserRole(input.userId, ctx.user.id, confirmerRole, input.reason);
        if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: result.error ?? "Fehler beim Ablehnen." });
        return { success: true };
      }),

    // Mehrere Rollenanfragen auf einmal bestätigen (Gruppen-Freischaltung)
    approveMany: protectedProcedure
      .input(z.object({ userIds: z.array(z.number().int().positive()).min(1).max(200) }))
      .mutation(async ({ ctx, input }) => {
        const roles: string[] = (ctx.user as any).roles ?? [ctx.user.role];
        if (!roles.includes("admin") && !roles.includes("superadmin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Kein Zugriff." });
        }
        if (!roles.includes("superadmin")) {
          const allowed = await Promise.all(input.userIds.map((userId) => canAdminManageUser(ctx.user.id, userId)));
          if (allowed.some((value) => !value)) throw new TRPCError({ code: "FORBIDDEN", message: "Die Gruppenauswahl enthält Registrierungen außerhalb Ihres Fachbereichs." });
        }
        const requestedRoles = await Promise.all(input.userIds.map((userId) => getUserRoleStatus(userId)));
        if (requestedRoles.some((status) => status?.requestedRole === "admin")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Verwaltungsmitarbeiter:innen müssen einzeln durch einen Superadmin mit Fachbereichsrecht freigeschaltet werden." });
        }
        const confirmerRole = roles.includes("superadmin") ? "superadmin" : "admin";
        const results = await Promise.allSettled(
          input.userIds.map((uid) => approveUserRole(uid, ctx.user.id, confirmerRole))
        );
        const succeeded = results.filter(
          (r) => r.status === "fulfilled" && (r as PromiseFulfilledResult<{ success: boolean }>).value?.success
        ).length;
        const failed = results.length - succeeded;
        return { succeeded, failed };
      }),

    assignAdminDepartment: protectedProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        department: z.enum(["FB1", "FB2", "FB3", "FB4", "FB5"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const roles: string[] = (ctx.user as any).roles ?? [ctx.user.role];
        if (!roles.includes("superadmin")) throw new TRPCError({ code: "FORBIDDEN", message: "Nur Superadmins dürfen Fachbereichsrechte der Verwaltung ändern." });
        const result = await assignAdminDepartment(input.userId, input.department, ctx.user.id);
        if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: result.error ?? "Fachbereichsrecht konnte nicht gespeichert werden." });
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
        if (!roles.includes("superadmin") && !(await canAdminManageUser(ctx.user.id, input.userId))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sie dürfen nur Registrierungen Ihres zugewiesenen Fachbereichs bearbeiten." });
        }
        const { getDb: getDbInner } = await import("./db");
        const db = await getDbInner();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Datenbankfehler." });
        // Prüfen ob Nutzer tatsächlich pending ist
        const userRows = await db.select({ id: users.id, roleStatus: users.roleStatus })
          .from(users)
          .where(eq(users.id, input.userId))
          .limit(1);
        const pendingUser = userRows[0];
        if (!pendingUser) throw new TRPCError({ code: "NOT_FOUND", message: "Nutzer nicht gefunden." });
        if (pendingUser.roleStatus !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Nur ausstehende Anfragen können geändert werden." });
        }
        await db.update(users)
          .set({ requestedRole: input.newRole })
          .where(eq(users.id, input.userId));
        // Audit-Log
        await db.insert(auditLog).values({
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "REQUESTED_ROLE_CHANGED",
          toStatus: input.newRole,
          metadata: { userId: input.userId, newRole: input.newRole },
          createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
        });
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
        let studentLang: Lang = "de";
        if (input.thesisRequestId) {
          const { getThesisRequestById: getTR, getUserById: getU } = await import("./db");
          const req = await getTR(input.thesisRequestId);
          if (req) {
            const student = await getU(req.studentId);
            studentLang = (student?.preferredLanguage as Lang) ?? "de";
            vars = {
              name: student?.name ?? "",
              thema: req.title ?? "",
              semester: req.targetSemester ?? "",
              studiengang: req.department ?? "",
            };
          }
        }
        // Wenn kein benutzerdefiniertes Template gespeichert: Standardvorlage in Empfängersprache
        if (!tpl.subject && !tpl.body && input.templateType !== "requirements") {
          const examinerUser = await getUserById(input.examinerId);
          const defTpl = defaultExaminerTemplate(
            studentLang,
            input.templateType as "acceptance" | "rejection" | "fully_booked",
            {
              ...vars,
              examinerName: examinerUser?.name ?? "",
              examinerTitle: examinerUser?.academicTitle ?? "",
              bookingUrl: examinerUser?.bookingUrl ?? "",
            }
          );
          return { subject: defTpl.subject, body: defTpl.body };
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

    /** Erstgutachter:in schreibt Zweitgutachter:in direkt an */
    contactSecondExaminer: anyExaminerProcedure
      .input(z.object({
        thesisRequestId: z.number().int().positive(),
        subject: z.string().min(1).max(255),
        body: z.string().min(1),
        recipientEmail: z.string().email(),
      }))
      .mutation(async ({ ctx, input }) => {
        const req = await getThesisRequestById(input.thesisRequestId);
        if (!req) throw new TRPCError({ code: "NOT_FOUND" });
        // Erstgutachter:in, Zweitgutachter:in oder Admin darf diese Funktion nutzen
        const isFirstExaminer = req.examinerId === ctx.user.id || (req as any).wantedExaminerId === ctx.user.id;
        const isSecondExaminerUser = (req as any).secondExaminerId === ctx.user.id || (req as any).wantedSecondExaminerId === ctx.user.id;
        const isAdminUser = ctx.user.role === "admin" || ctx.user.role === "superadmin" || ctx.user.role === "pav";
        if (!isFirstExaminer && !isSecondExaminerUser && !isAdminUser)
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur beteiligte Gutachter:innen können diese Funktion nutzen." });
        const sent = await sendEmail({
          to: input.recipientEmail,
          subject: input.subject,
          html: input.body.replace(/\n/g, "<br>"),
        });
        if (!sent) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "E-Mail konnte nicht gesendet werden." });
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          action: "FIRST_EXAMINER_CONTACTED_SECOND",
          reason: `Erstgutachter:in hat Zweitgutachter:in (${input.recipientEmail}) kontaktiert.`,
        });
        return { success: true, sentTo: input.recipientEmail };
      }),

    /** Erstgutachter:in trägt neuen Zweitgutachter-Wunsch ein (nach Ablehnung) */
    setWantedSecondExaminerByFirstExaminer: anyExaminerProcedure
      .input(z.object({
        thesisRequestId: z.number().int().positive(),
        secondExaminerId: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        const req = await getThesisRequestById(input.thesisRequestId);
        if (!req) throw new TRPCError({ code: "NOT_FOUND" });
        // Nur Erstgutachter:in oder Admin
        const isFirstExaminer = req.examinerId === ctx.user.id || (req as any).wantedExaminerId === ctx.user.id;
        const isAdminUser = ctx.user.role === "admin" || ctx.user.role === "superadmin" || ctx.user.role === "pav";
        if (!isFirstExaminer && !isAdminUser)
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Erstgutachter:innen können den Zweitgutachter-Wunsch setzen." });
        // Status muss FIRST_EXAMINER_ACCEPTED sein (Zweitgutachter fehlt noch)
        if (req.status !== "FIRST_EXAMINER_ACCEPTED")
          throw new TRPCError({ code: "BAD_REQUEST", message: "Zweitgutachter:in kann nur bei Status \"Erstgutachter:in zugesagt\" eingetragen werden." });
        // Nicht identisch mit Erstgutachter
        if (input.secondExaminerId === req.examinerId)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Zweitgutachter:in darf nicht identisch mit Erstgutachter:in sein." });
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { thesisRequests: tr } = await import("../drizzle/schema");
        const { eq: eqDrizzle } = await import("drizzle-orm");
        await db.update(tr)
          .set({ wantedSecondExaminerId: input.secondExaminerId })
          .where(eqDrizzle(tr.id, input.thesisRequestId));
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          action: "FIRST_EXAMINER_SET_WANTED_SECOND",
          reason: `Erstgutachter:in hat neuen Zweitgutachter-Wunsch (ID: ${input.secondExaminerId}) eingetragen.`,
        });
        return { success: true };
      }),

    // Erstgutachter:in lädt eine externe Person als Zweitgutachter:in ein
    inviteExternalSecondExaminer: anyExaminerProcedure
      .input(z.object({
        thesisRequestId: z.number().int().positive(),
        inviteeEmail: z.string().email(),
        inviteeName: z.string().min(1),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const req = await getThesisRequestById(input.thesisRequestId);
        if (!req) throw new TRPCError({ code: "NOT_FOUND" });
        const isFirstExaminer = req.examinerId === ctx.user.id;
        const isAdminUser = ctx.user.role === "admin" || ctx.user.role === "superadmin" || ctx.user.role === "pav";
        if (!isFirstExaminer && !isAdminUser)
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Erstgutachter:innen können externe Zweitgutachter:innen einladen." });
        if (req.status !== "FIRST_EXAMINER_ACCEPTED")
          throw new TRPCError({ code: "BAD_REQUEST", message: 'Einladung nur bei Status "Erstgutachter:in zugesagt" möglich.' });
        // Einladungstoken generieren
        const crypto = await import("crypto");
        const token = crypto.randomBytes(32).toString("hex");
        const now = new Date().toISOString().slice(0, 19).replace("T", " ");
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { thesisRequests: tr } = await import("../drizzle/schema");
        const { eq: eqDrizzle } = await import("drizzle-orm");
        // Externe Daten und Token speichern
        await db.update(tr)
          .set({
            externalSecondExaminerFirstName: input.inviteeName.split(" ").slice(0, -1).join(" ") || input.inviteeName,
            externalSecondExaminerLastName: input.inviteeName.split(" ").slice(-1)[0] || "",
            externalSecondExaminerEmail: input.inviteeEmail,
            secondExaminerInviteToken: token,
            secondExaminerInviteSentAt: now,
            secondExaminerRequestedAt: now,
          } as any)
          .where(eqDrizzle(tr.id, input.thesisRequestId));
        // Einladungs-E-Mail senden
        const registerUrl = `${input.origin}/register?inviteToken=${token}&role=second_examiner&email=${encodeURIComponent(input.inviteeEmail)}&thesisId=${input.thesisRequestId}`;
        const { sendEmail } = await import("./emailHelper");
        const lang = ctx.user.preferredLanguage === "en" ? "en" : "de";
        const studentName = (req as any).studentName ?? (lang === "en" ? "Student" : "Studierende:r");
        const firstExaminerName = ctx.user.name ?? (lang === "en" ? "First examiner" : "Erstgutachter:in");
        const thesisTitle = req.title ?? (lang === "en" ? "(no title)" : "(kein Titel)");
        await sendEmail({
          to: input.inviteeEmail,
          subject: lang === "en" ? "Invitation as second examiner – Thesis Match HTW Berlin" : "Einladung als Zweitgutachter:in – Thesis Match HTW Berlin",
          html: lang === "en" ? `<p>Dear ${input.inviteeName},</p><p>You have been invited by <strong>${firstExaminerName}</strong> as second examiner for ${studentName}'s thesis.</p><p><strong>Thesis title:</strong> ${thesisTitle}</p><p>To accept the invitation, please register in the HTW Berlin Thesis Match system:</p><p><a href="${registerUrl}" style="background:#76B900;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Register and accept invitation</a></p><p>The link is valid for 14 days.</p><p>Kind regards<br>Thesis Match HTW Berlin</p>` : `<p>Sehr geehrte:r ${input.inviteeName},</p><p>Sie wurden von <strong>${firstExaminerName}</strong> als Zweitgutachter:in für die Abschlussarbeit von <strong>${studentName}</strong> eingeladen.</p><p><strong>Titel der Arbeit:</strong> ${thesisTitle}</p><p>Um die Einladung anzunehmen, registrieren Sie sich bitte im Thesis-Match-System der HTW Berlin:</p><p><a href="${registerUrl}" style="background:#76B900;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Jetzt registrieren &amp; Einladung annehmen</a></p><p>Der Link ist 14 Tage gültig.</p><p>Mit freundlichen Grüßen<br>Thesis Match HTW Berlin</p>`,
          text: lang === "en" ? `Dear ${input.inviteeName},\n\nYou have been invited as second examiner.\n\nRegistration: ${registerUrl}` : `Sehr geehrte:r ${input.inviteeName},\n\nSie wurden als Zweitgutachter:in eingeladen.\n\nRegistrierung: ${registerUrl}`,
        });
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          action: "FIRST_EXAMINER_INVITED_EXTERNAL_SECOND",
          reason: `Erstgutachter:in hat externe Person (${input.inviteeEmail}) als Zweitgutachter:in eingeladen.`,
          metadata: { emailLanguage: lang, recipientEmail: input.inviteeEmail },
        });
        return { success: true, token };
      }),

    // Einladungs-E-Mail erneut versenden
    resendSecondExaminerInvite: anyExaminerProcedure
      .input(z.object({
        thesisRequestId: z.number().int().positive(),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const req = await getThesisRequestById(input.thesisRequestId);
        if (!req) throw new TRPCError({ code: "NOT_FOUND" });
        const isFirstExaminer = req.examinerId === ctx.user.id;
        const isAdminUser = ctx.user.role === "admin" || ctx.user.role === "superadmin" || ctx.user.role === "pav";
        if (!isFirstExaminer && !isAdminUser)
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Erstgutachter:innen können Einladungen erneut versenden." });
        const inviteToken = (req as any).secondExaminerInviteToken;
        const inviteeEmail = (req as any).externalSecondExaminerEmail;
        if (!inviteToken || !inviteeEmail)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Keine ausstehende Einladung für diese Anfrage vorhanden." });
        // Zeitstempel aktualisieren
        const now = new Date().toISOString().slice(0, 19).replace("T", " ");
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { thesisRequests: tr } = await import("../drizzle/schema");
        const { eq: eqDrizzle } = await import("drizzle-orm");
        await db.update(tr)
          .set({ secondExaminerInviteSentAt: now } as any)
          .where(eqDrizzle(tr.id, input.thesisRequestId));
        // E-Mail erneut senden
        const registerUrl = `${input.origin}/register?inviteToken=${inviteToken}&role=second_examiner&email=${encodeURIComponent(inviteeEmail)}&thesisId=${input.thesisRequestId}`;
        const { sendEmail } = await import("./emailHelper");
        const lang = ctx.user.preferredLanguage === "en" ? "en" : "de";
        const firstName = (req as any).externalSecondExaminerFirstName ?? "";
        const lastName = (req as any).externalSecondExaminerLastName ?? "";
        const inviteeName = `${firstName} ${lastName}`.trim() || inviteeEmail;
        const studentName = (req as any).studentName ?? (lang === "en" ? "Student" : "Studierende:r");
        const firstExaminerName = ctx.user.name ?? (lang === "en" ? "First examiner" : "Erstgutachter:in");
        const thesisTitle = req.title ?? (lang === "en" ? "(no title)" : "(kein Titel)");
        await sendEmail({
          to: inviteeEmail,
          subject: lang === "en" ? "Reminder: invitation as second examiner – Thesis Match HTW Berlin" : "Erinnerung: Einladung als Zweitgutachter:in – Thesis Match HTW Berlin",
          html: lang === "en" ? `<p>Dear ${inviteeName},</p><p>This is a reminder: you have been invited by <strong>${firstExaminerName}</strong> as second examiner for ${studentName}'s thesis.</p><p><strong>Thesis title:</strong> ${thesisTitle}</p><p>Please register in the HTW Berlin Thesis Match system to accept the invitation:</p><p><a href="${registerUrl}" style="background:#76B900;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Register and accept invitation</a></p><p>Kind regards<br>Thesis Match HTW Berlin</p>` : `<p>Sehr geehrte:r ${inviteeName},</p><p>Dies ist eine Erinnerung: Sie wurden von <strong>${firstExaminerName}</strong> als Zweitgutachter:in für die Abschlussarbeit von <strong>${studentName}</strong> eingeladen.</p><p><strong>Titel der Arbeit:</strong> ${thesisTitle}</p><p>Bitte registrieren Sie sich im Thesis-Match-System der HTW Berlin, um die Einladung anzunehmen:</p><p><a href="${registerUrl}" style="background:#76B900;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Jetzt registrieren &amp; Einladung annehmen</a></p><p>Mit freundlichen Grüßen<br>Thesis Match HTW Berlin</p>`,
          text: lang === "en" ? `Reminder: you have been invited as second examiner.\n\nRegistration: ${registerUrl}` : `Erinnerung: Sie wurden als Zweitgutachter:in eingeladen.\n\nRegistrierung: ${registerUrl}`,
        });
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          action: "FIRST_EXAMINER_RESENT_INVITE",
          reason: `Einladungs-E-Mail erneut an ${inviteeEmail} gesendet.`,
          metadata: { emailLanguage: lang, recipientEmail: inviteeEmail },
        });
        return { success: true };
      }),

    updateConditionalReason: anyExaminerProcedure
      .input(z.object({
        thesisRequestId: z.number(),
        reason: z.string().min(1, "Bitte einen Vorbehalt angeben."),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getThesisRequestById(input.thesisRequestId);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        if (existing.status !== "CONDITIONAL_ACCEPTANCE") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Nur bei Status 'Zusage unter Vorbehalt' möglich." });
        }
        const isAssigned = existing.examinerId === ctx.user.id || existing.secondExaminerId === ctx.user.id;
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "superadmin";
        if (!isAssigned && !isAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { thesisRequests: tr } = await import("../drizzle/schema");
        const { eq: eqDrizzle } = await import("drizzle-orm");
        await db.update(tr)
          .set({ conditionalAcceptanceReason: input.reason })
          .where(eqDrizzle(tr.id, input.thesisRequestId));
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          action: "CONDITIONAL_ACCEPTANCE",
          reason: `Vorbehalt aktualisiert: ${input.reason}`,
        });
        return { success: true };
      }),

    // Vorbehalt aufheben: CONDITIONAL_ACCEPTANCE → FIRST_EXAMINER_ACCEPTED
    liftConditional: anyExaminerProcedure
      .input(z.object({ thesisRequestId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getThesisRequestById(input.thesisRequestId);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        if (existing.status !== "CONDITIONAL_ACCEPTANCE") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Nur bei Status 'Zusage unter Vorbehalt' möglich." });
        }
        const isAssigned = existing.examinerId === ctx.user.id || existing.secondExaminerId === ctx.user.id;
        const isAdmin = userHasRole(ctx.user, "admin") || userHasRole(ctx.user, "superadmin");
        if (!isAssigned && !isAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { thesisRequests: tr } = await import("../drizzle/schema");
        const { eq: eqDrizzle } = await import("drizzle-orm");
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await db.update(tr)
          .set({
            status: "FIRST_EXAMINER_ACCEPTED",
            conditionalAcceptanceReason: null,
            updatedAt: now,
          })
          .where(eqDrizzle(tr.id, input.thesisRequestId));
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          action: "EXAMINER_ACCEPTED",
          fromStatus: "CONDITIONAL_ACCEPTANCE",
          toStatus: "FIRST_EXAMINER_ACCEPTED",
          reason: "Vorbehalt aufgehoben – reguläre Zusage erteilt",
        });
        // E-Mail an Studierenden
        try {
          const { getUserById } = await import("./db");
          const student = await getUserById(existing.studentId);
          const examiner = await getUserById(ctx.user.id);
          if (student?.email) {
            const studentLang: Lang = (student.preferredLanguage as Lang) ?? "de";
            const { statusChangeEmail } = await import("./emailTemplates");
            const tpl = statusChangeEmail({
              recipientName: student.name,
              thesisTitle: existing.title ?? "",
              statusTextDE: `Ihr Betreuer ${examiner?.name ?? ""} hat den Vorbehalt zu Ihrer Betreuungsanfrage \u201e${existing.title}\u201c aufgehoben. Ihre Anfrage ist nun regulär angenommen.`,
              statusTextEN: `Your supervisor ${examiner?.name ?? ""} has lifted the conditional acceptance of your thesis request "${existing.title}". Your request is now fully accepted.`,
              lang: studentLang,
            });
            await sendEmail({ to: student.email, subject: tpl.subject, html: tpl.html });
          }
        } catch (_) { /* E-Mail-Fehler nicht fatal */ }
        return { success: true };
      }),

    getConditionalDocuments: protectedProcedure
      .input(z.object({ thesisRequestId: z.number() }))
      .query(async ({ ctx, input }) => {
        const existing = await getThesisRequestById(input.thesisRequestId);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        // Zugriff: Studierende der Thesis, zugewiesene Prüfer:innen, Admin
        const isStudent = existing.studentId === ctx.user.id;
        const isExaminer = existing.examinerId === ctx.user.id || existing.secondExaminerId === ctx.user.id;
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "superadmin" || ctx.user.role === "pav";
        if (!isStudent && !isExaminer && !isAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { conditionalDocuments } = await import("../drizzle/schema");
        const { eq: eqDrizzle, desc } = await import("drizzle-orm");
        const docs = await db.select().from(conditionalDocuments)
          .where(eqDrizzle(conditionalDocuments.thesisRequestId, input.thesisRequestId))
          .orderBy(desc(conditionalDocuments.createdAt));
        return docs;
      }),

    deleteConditionalDocument: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { conditionalDocuments } = await import("../drizzle/schema");
        const { eq: eqDrizzle } = await import("drizzle-orm");
        const [doc] = await db.select().from(conditionalDocuments)
          .where(eqDrizzle(conditionalDocuments.id, input.documentId));
        if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
        // Nur Uploader oder Admin darf löschen
        const isOwner = doc.uploadedByUserId === ctx.user.id;
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "superadmin";
        if (!isOwner && !isAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        await db.delete(conditionalDocuments).where(eqDrizzle(conditionalDocuments.id, input.documentId));
        await createAuditLogEntry({
          thesisRequestId: doc.thesisRequestId,
          actorId: ctx.user.id,
          action: "CONDITIONAL_DOCUMENT_DELETED",
          reason: `Dokument gelöscht: ${doc.originalFilename}`,
        });
        return { success: true };
      }),

    // ── Kommentare zu Conditional-Dokumenten ──────────────────────────────────
    addDocumentComment: protectedProcedure
      .input(z.object({
        documentId: z.number(),
        content: z.string().min(1, "Kommentar darf nicht leer sein.").max(2000),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { conditionalDocuments, conditionalDocumentComments } = await import("../drizzle/schema");
        const { eq: eqDrizzle } = await import("drizzle-orm");
        // Dokument laden und Berechtigungen prüfen
        const [doc] = await db.select().from(conditionalDocuments)
          .where(eqDrizzle(conditionalDocuments.id, input.documentId));
        if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
        const thesis = await getThesisRequestById(doc.thesisRequestId);
        if (!thesis) throw new TRPCError({ code: "NOT_FOUND" });
        const isExaminer = thesis.examinerId === ctx.user.id || thesis.secondExaminerId === ctx.user.id;
        const isStudent = thesis.studentId === ctx.user.id;
        const isAdmin = ["admin", "superadmin", "pav"].includes(ctx.user.role ?? "");
        if (!isExaminer && !isStudent && !isAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const [inserted] = await db.insert(conditionalDocumentComments).values({
          documentId: input.documentId,
          authorId: ctx.user.id,
          content: input.content,
        });
        await createAuditLogEntry({
          thesisRequestId: doc.thesisRequestId,
          actorId: ctx.user.id,
          action: "CONDITIONAL_DOCUMENT_COMMENT",
          reason: `Kommentar zu Dokument "${doc.originalFilename}": ${input.content.substring(0, 80)}`,
        });
        return { success: true, id: (inserted as any)?.insertId };
      }),

    getDocumentComments: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { conditionalDocuments, conditionalDocumentComments, users } = await import("../drizzle/schema");
        const { eq: eqDrizzle, asc } = await import("drizzle-orm");
        const [doc] = await db.select().from(conditionalDocuments)
          .where(eqDrizzle(conditionalDocuments.id, input.documentId));
        if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
        const thesis = await getThesisRequestById(doc.thesisRequestId);
        if (!thesis) throw new TRPCError({ code: "NOT_FOUND" });
        const isExaminer = thesis.examinerId === ctx.user.id || thesis.secondExaminerId === ctx.user.id;
        const isStudent = thesis.studentId === ctx.user.id;
        const isAdmin = ["admin", "superadmin", "pav"].includes(ctx.user.role ?? "");
        if (!isExaminer && !isStudent && !isAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const comments = await db
          .select({
            id: conditionalDocumentComments.id,
            content: conditionalDocumentComments.content,
            createdAt: conditionalDocumentComments.createdAt,
            updatedAt: conditionalDocumentComments.updatedAt,
            authorId: conditionalDocumentComments.authorId,
            authorName: users.name,
            authorRole: users.role,
          })
          .from(conditionalDocumentComments)
          .leftJoin(users, eqDrizzle(conditionalDocumentComments.authorId, users.id))
          .where(eqDrizzle(conditionalDocumentComments.documentId, input.documentId))
          .orderBy(asc(conditionalDocumentComments.createdAt));
        return comments;
      }),

    deleteDocumentComment: protectedProcedure
      .input(z.object({ commentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { conditionalDocumentComments } = await import("../drizzle/schema");
        const { eq: eqDrizzle } = await import("drizzle-orm");
        const [comment] = await db.select().from(conditionalDocumentComments)
          .where(eqDrizzle(conditionalDocumentComments.id, input.commentId));
        if (!comment) throw new TRPCError({ code: "NOT_FOUND" });
        const isOwner = comment.authorId === ctx.user.id;
        const isAdmin = ["admin", "superadmin"].includes(ctx.user.role ?? "");
        if (!isOwner && !isAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        await db.delete(conditionalDocumentComments).where(eqDrizzle(conditionalDocumentComments.id, input.commentId));
        return { success: true };
      }),
  }),

  // ─── Examiner/PAV-initiierter Antrag (Studierenden einladen) ─────────────────
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
        // Einladungs-E-Mail senden (zweisprachig – Sprache des Einladenden)
        const confirmUrl = `${input.origin}/thesis/confirm?token=${token}`;
        const examinerName = ctx.user.name ?? "Ihre Prüfer:in";
        const inviteLang: Lang = (ctx.user.preferredLanguage as Lang) ?? "de";
        const inviteSubject = inviteLang === "en"
          ? `Invitation to confirm your thesis application – HTW Berlin`
          : `Einladung zur Antragsbestätigung – Abschlussarbeit HTW Berlin`;
        const inviteBody = inviteLang === "en" ? `
          <p>Dear Student,</p>
          <p><strong>${examinerName}</strong> has created a thesis application for you:</p>
          <p><strong>Title:</strong> ${input.title}</p>
          <p>Please review the details, add your information, and confirm the application:</p>
          <p><a href="${confirmUrl}" style="background:#76B900;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">Confirm application</a></p>
          <p>This link is valid for 14 days.</p>
          <p>Kind regards,<br>HTW Berlin – Examination Office</p>
        ` : `
          <p>Sehr geehrte:r Studierende:r,</p>
          <p><strong>${examinerName}</strong> hat einen Antrag für Ihre Abschlussarbeit angelegt:</p>
          <p><strong>Thema:</strong> ${input.title}</p>
          <p>Bitte überprüfen Sie die Angaben, ergänzen Sie Ihre Informationen und bestätigen Sie den Antrag unter folgendem Link:</p>
          <p><a href="${confirmUrl}" style="background:#76B900;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">Antrag bestätigen</a></p>
          <p>Dieser Link ist 14 Tage gültig.</p>
          <p>Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsamt</p>
        `;
        await sendEmail({ to: input.studentEmail, subject: inviteSubject, html: inviteBody });
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
            const resendLang: Lang = (ctx.user.preferredLanguage as Lang) ?? "de";
            const resendSubject = resendLang === "en"
              ? `Updated invitation to confirm your thesis application – HTW Berlin`
              : `Aktualisierte Einladung zur Antragsbestätigung – Abschlussarbeit HTW Berlin`;
            const resendBody = resendLang === "en" ? `
              <p>Dear Student,</p>
              <p><strong>${examinerName}</strong> has updated your thesis application.</p>
              ${input.title ? `<p><strong>Title:</strong> ${input.title}</p>` : ""}
              <p>Please review the updated details and confirm the application:</p>
              <p><a href="${confirmUrl}" style="background:#76B900;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">Confirm application</a></p>
              <p>Kind regards,<br>HTW Berlin – Examination Office</p>
            ` : `
              <p>Sehr geehrte:r Studierende:r,</p>
              <p><strong>${examinerName}</strong> hat Ihren Antrag für die Abschlussarbeit aktualisiert.</p>
              ${input.title ? `<p><strong>Thema:</strong> ${input.title}</p>` : ""}
              <p>Bitte überprüfen Sie die aktualisierten Angaben und bestätigen Sie den Antrag:</p>
              <p><a href="${confirmUrl}" style="background:#76B900;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">Antrag bestätigen</a></p>
              <p>Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsamt</p>
            `;
            await sendEmail({ to: targetEmail, subject: resendSubject, html: resendBody });
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

    /**
     * Prüfer lädt Studierende per E-Mail zur Registrierung ein (nur E-Mail-Adresse nötig).
     * Wer über diesen Token registriert, wird automatisch freigeschaltet.
     */
    sendRegistrationInvite: protectedProcedure
      .input(z.object({
        studentEmail: z.string().email(),
        emailLang: z.enum(["de", "en"]).default("de"),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isExaminer = userHasRole(ctx.user, "examiner");
        const isAdmin = userHasRole(ctx.user, "admin") || userHasRole(ctx.user, "superadmin");
        if (!isExaminer && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Prüfer:innen können Studierende einladen." });
        }
        const { randomBytes } = await import("crypto");
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString().slice(0, 19).replace("T", " ");
        await createStudentRegistrationInvitation({
          token,
          examinerId: ctx.user.id,
          studentEmail: input.studentEmail,
          emailLang: input.emailLang,
          expiresAt,
        });
        const { buildFullName } = await import("@shared/const");
        const examinerName = buildFullName({
          firstName: (ctx.user as any).firstName,
          lastName: (ctx.user as any).lastName,
          academicTitle: (ctx.user as any).academicTitle,
          name: ctx.user.name,
        });
        const registerUrl = `${input.origin}/register?inviteToken=${token}`;
        const logoUrl = `${process.env.SITE_URL || 'https://thesis.htw-berlin.com'}/manus-storage/ThesisMatchMaker_b92cd3c0.jpg`;
        const subject = `Einladung zur Registrierung / Invitation to register – HTW Berlin Thesis Match Maker`;
        const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:560px">
      <tr><td style="background:#006937;padding:24px 32px;text-align:center">
        <img src="${logoUrl}" alt="Thesis Match Maker" style="height:48px;max-width:200px;object-fit:contain" />
        <p style="color:#ffffff;margin:8px 0 0 0;font-size:13px;opacity:0.85">HTW Berlin &ndash; Thesis Match Maker</p>
      </td></tr>
      <tr><td style="padding:8px 32px 8px 32px;background:#f0f7e6;border-bottom:1px solid #d4edaa">
        <p style="color:#5a7a00;font-size:12px;margin:0;font-style:italic">&#127468;&#127463; English below</p>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="color:#374151;font-size:14px;margin:0 0 12px 0">Sehr geehrte:r Studierende:r,</p>
        <p style="color:#374151;font-size:14px;margin:0 0 12px 0"><strong>${examinerName}</strong> hat Sie eingeladen, sich im HTW Berlin Thesis Match Maker zu registrieren, um Ihren Abschlussarbeits-Antrag zu stellen.</p>
        <p style="color:#374151;font-size:14px;margin:0 0 24px 0">Bitte klicken Sie auf den folgenden Button, um sich zu registrieren. Alle weiteren Angaben nehmen Sie selbst vor.</p>
        <p style="margin:0 0 12px 0;text-align:center">
          <a href="${registerUrl}" style="background:#76B900;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;display:inline-block;font-size:15px;font-weight:bold">Jetzt registrieren</a>
        </p>
        <p style="color:#6b7280;font-size:13px;margin:0 0 8px 0">Dieser Einladungslink ist 30 Tage g&uuml;ltig.</p>
        <p style="color:#374151;font-size:14px;margin:16px 0 4px 0">Mit freundlichen Gr&uuml;&szlig;en<br>HTW Berlin &ndash; Pr&uuml;fungsamt</p>
        <hr style="border:none;border-top:2px solid #e5e7eb;margin:28px 0" />
        <p style="color:#374151;font-size:14px;margin:0 0 12px 0">Dear Student,</p>
        <p style="color:#374151;font-size:14px;margin:0 0 12px 0"><strong>${examinerName}</strong> has invited you to register on the HTW Berlin Thesis Match Maker to submit your thesis application.</p>
        <p style="color:#374151;font-size:14px;margin:0 0 24px 0">Please click the button below to register. You will fill in all further details yourself.</p>
        <p style="margin:0 0 12px 0;text-align:center">
          <a href="${registerUrl}" style="background:#76B900;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;display:inline-block;font-size:15px;font-weight:bold">Register now</a>
        </p>
        <p style="color:#6b7280;font-size:13px;margin:0 0 8px 0">This invitation link is valid for 30 days.</p>
        <p style="color:#374151;font-size:14px;margin:16px 0 4px 0">Kind regards,<br>HTW Berlin &ndash; Examination Office</p>
      </td></tr>
      <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center">
        <p style="color:#9ca3af;font-size:11px;margin:0 0 4px 0">&#9888;&#65039; Dies ist ein nicht offizielles Tool an der HTW Berlin, welches zu Testzwecken installiert wurde.</p>
        <p style="color:#9ca3af;font-size:11px;margin:0">&#9888;&#65039; This is an unofficial tool at HTW Berlin, installed for testing purposes.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
        await sendEmail({ to: input.studentEmail, subject, html });
        return { success: true, token };
      }),

    /** Gibt alle Registrierungs-Einladungen des eingeloggten Prüfers zurück. */
    getMyRegistrationInvites: examinerProcedure.query(async ({ ctx }) => {
      return getExaminerRegistrationInvitations(ctx.user.id);
    }),

    /** Widerruft eine Registrierungs-Einladung. */
    revokeRegistrationInvite: protectedProcedure
      .input(z.object({ token: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const isAdmin = userHasRole(ctx.user, "admin") || userHasRole(ctx.user, "superadmin");
        await revokeStudentRegistrationInvitation({ token: input.token, callerId: ctx.user.id, isAdmin });
        return { success: true };
      }),

    /**
     * Öffentlich: Prüft ob ein Registrierungs-Einladungs-Token gültig ist.
     */
    validateRegistrationInvite: publicProcedure
      .input(z.object({ token: z.string().min(1) }))
      .query(async ({ input }) => {
        const inv = await getStudentRegistrationInvitation(input.token);
        if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Einladungs-Token nicht gefunden." });
        if (inv.revoked) throw new TRPCError({ code: "FORBIDDEN", message: "Diese Einladung wurde widerrufen." });
        const now = new Date();
        const expires = new Date(inv.expiresAt);
        if (now > expires) throw new TRPCError({ code: "FORBIDDEN", message: "Diese Einladung ist abgelaufen." });
        if (inv.usedAt) throw new TRPCError({ code: "FORBIDDEN", message: "Diese Einladung wurde bereits verwendet." });
        const examiner = await getUserById(inv.examinerId);
        const { buildFullName } = await import("@shared/const");
        const examinerName = examiner ? buildFullName({
          firstName: (examiner as any).firstName,
          lastName: (examiner as any).lastName,
          academicTitle: (examiner as any).academicTitle,
          name: examiner.name,
        }) : "";
        return { valid: true, studentEmail: inv.studentEmail, examinerName, emailLang: inv.emailLang };
      }),

  }),

  // ─── Examiner Comments ────────────────────────────────────────────────────────
  examinerComments: router({
    /** Gibt alle eigenen Kommentare für einen Thesis-Antrag zurück. */
    list: protectedProcedure
      .input(z.object({ thesisRequestId: z.number(), includeCompleted: z.boolean().optional() }))
      .query(async ({ ctx, input }) => {
        return getExaminerComments(input.thesisRequestId, ctx.user.id, input.includeCompleted);
      }),

    /** Durchsucht ausschließlich eigene private Notizen über alle Anfragen hinweg. */
    search: protectedProcedure
      .input(z.object({
        search: z.string().trim().max(200).optional(),
        priority: z.enum(["normal", "important", "urgent"]).optional(),
        includeCompleted: z.boolean().optional(),
      }))
      .query(async ({ ctx, input }) => searchExaminerComments({ examinerId: ctx.user.id, ...input })),

    /** Setzt ausschließlich für eigene dringende Notizen den Erledigtstatus. */
    setCompletion: protectedProcedure
      .input(z.object({ id: z.number(), completed: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await setExaminerCommentCompletion({ id: input.id, examinerId: ctx.user.id, completed: input.completed });
        return { success: true };
      }),

    /** Erstellt einen neuen Kommentar. */
    create: protectedProcedure
      .input(z.object({
        thesisRequestId: z.number(),
        content: z.string().min(1).max(4000),
        priority: z.enum(["normal", "important", "urgent"]).default("normal"),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createExaminerComment({
          thesisRequestId: input.thesisRequestId,
          examinerId: ctx.user.id,
          content: input.content,
          priority: input.priority,
          dueAt: input.priority === "urgent" && input.dueDate ? `${input.dueDate} 23:59:59` : null,
        });
        return { id };
      }),

    /** Aktualisiert einen bestehenden Kommentar (nur Ersteller). */
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        content: z.string().min(1).max(4000),
        priority: z.enum(["normal", "important", "urgent"]).optional(),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateExaminerComment({
          id: input.id,
          examinerId: ctx.user.id,
          content: input.content,
          priority: input.priority,
          dueAt: input.priority === "urgent" && input.dueDate ? `${input.dueDate} 23:59:59` : null,
        });
        return { success: true };
      }),

    /** Löscht einen Kommentar (nur Ersteller). */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteExaminerComment({ id: input.id, examinerId: ctx.user.id });
        return { success: true };
      }),
  }),

  // --- E-Mail-Benachrichtigungs-Einstellungen ---
  notificationSettings: router({
    /** Gibt alle Benachrichtigungstypen mit dem aktuellen Aktivierungsstatus des Nutzers zurück. */
    getAll: protectedProcedure.query(async ({ ctx }) => {
      const prefs = await getNotificationPreferences(ctx.user.id);
      return NOTIFICATION_TYPES.map((nt) => ({
        key: nt.key,
        labelDe: nt.labelDe,
        descDe: nt.descDe,
        roles: nt.roles,
        defaultEnabled: nt.defaultEnabled,
        enabled: prefs[nt.key],
      }));
    }),
    /** Setzt eine einzelne Benachrichtigungs-Einstellung. */
    set: protectedProcedure
      .input(z.object({
        notificationType: z.string(),
        enabled: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const validKey = NOTIFICATION_TYPES.find((t) => t.key === input.notificationType);
        if (!validKey) throw new TRPCError({ code: "BAD_REQUEST", message: "Unbekannter Benachrichtigungstyp." });
        await setNotificationPreference(ctx.user.id, input.notificationType as NotificationTypeKey, input.enabled);
        return { success: true };
      }),
    /** Setzt alle Benachrichtigungs-Einstellungen auf einmal. */
    setAll: protectedProcedure
      .input(z.record(z.string(), z.boolean()))
      .mutation(async ({ ctx, input }) => {
        for (const [key, enabled] of Object.entries(input)) {
          const validKey = NOTIFICATION_TYPES.find((t) => t.key === key);
          if (!validKey) continue;
          await setNotificationPreference(ctx.user.id, key as NotificationTypeKey, enabled);
        }
        return { success: true };
      }),
  }),
  // --- Neue Prüfer:innen – Badge-Tracking ---
  newExaminers: router({
    getCount: protectedProcedure.query(async ({ ctx }) => {
      const count = await getNewExaminersCount(ctx.user.id);
      return { count };
    }),
    getList: protectedProcedure.query(async ({ ctx }) => {
      return getNewExaminers(ctx.user.id);
    }),
    markAsSeen: protectedProcedure.mutation(async ({ ctx }) => {
      await markNewExaminersAsSeen(ctx.user.id);
      return { success: true };
    }),
  }),

});
export type AppRouter = typeof appRouter;
