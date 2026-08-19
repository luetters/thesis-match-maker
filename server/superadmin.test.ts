import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// --- Mock DB ------------------------------------------------------------------
vi.mock("./db", () => ({
  // Superadmin-Funktionen
  isSuperadmin: vi.fn((email: string) => email === "holger@luetters.net"),
  getSuperadminStatus: vi.fn().mockResolvedValue({
    isSuperadmin: true,
    currentRole: "admin",
  }),
  switchUserRole: vi.fn().mockResolvedValue({
    success: true,
    newRole: "examiner",
    previousRole: "admin",
    metadata: { previousRole: "admin", switchedAt: new Date().toISOString(), switchedBy: 1 },
  }),
  getRoleSwitchHistory: vi.fn().mockResolvedValue([]),
  getAllActiveUsers: vi.fn().mockResolvedValue({
    users: [
      {
        id: 1,
        email: "student@htw-berlin.de",
        name: "Max Mustermann",
        role: "student",
        createdAt: new Date(),
      },
      {
        id: 2,
        email: "pruefer@htw-berlin.de",
        name: "Prof. Dr. Müller",
        role: "examiner",
        createdAt: new Date(),
      },
    ],
    total: 2,
  }),
  getUserStatistics: vi.fn().mockResolvedValue({
    total: 10,
    student: 5,
    examiner: 3,
    pav: 1,
    admin: 1,
    dean: 0,
    vice_dean: 0,
    superadmin: 0,
  }),
  searchUsers: vi.fn().mockResolvedValue({
    users: [
      {
        id: 1,
        email: "student@htw-berlin.de",
        name: "Max Mustermann",
        role: "student",
        createdAt: new Date(),
      },
    ],
    total: 1,
  }),
  getUserDetails: vi.fn().mockResolvedValue({
    id: 1,
    email: "student@htw-berlin.de",
    name: "Max Mustermann",
    role: "student",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getUserActivityLog: vi.fn().mockResolvedValue([
    {
      id: 1,
      actorId: 1,
      action: "THESIS_SUBMITTED",
      createdAt: new Date(),
    },
  ]),
  updateUserStatus: vi.fn().mockResolvedValue(true),
  setUserRole: vi.fn().mockResolvedValue(undefined),
  // Allgemeine Funktionen (für andere Prozeduren benötigt)
  getUserById: vi.fn().mockResolvedValue({ id: 1, name: "Holger Lütters", email: "holger@luetters.net", role: "admin" }),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getAllThesisRequests: vi.fn().mockResolvedValue([]),
  getThesisStats: vi.fn().mockResolvedValue({ total: 0, pending: 0, approved: 0, rejected: 0 }),
  getAllExaminers: vi.fn().mockResolvedValue([]),
  getAuditLogByThesis: vi.fn().mockResolvedValue([]),
  getAllAuditLogs: vi.fn().mockResolvedValue([]),
  getNotificationsByUser: vi.fn().mockResolvedValue([]),
  getUnreadCount: vi.fn().mockResolvedValue(0),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
  createNotification: vi.fn().mockResolvedValue(undefined),
  notifyThesisParticipants: vi.fn().mockResolvedValue(undefined),
  getThesisRequestsByStudent: vi.fn().mockResolvedValue([]),
  getThesisRequestsByExaminer: vi.fn().mockResolvedValue([]),
  getThesisRequestById: vi.fn().mockResolvedValue(null),
  updateThesisRequestStatus: vi.fn().mockResolvedValue(undefined),
  assignExaminerToThesis: vi.fn().mockResolvedValue(undefined),
  createAuditLogEntry: vi.fn().mockResolvedValue(undefined),
  upsertExaminerProfile: vi.fn().mockResolvedValue(undefined),
  getExaminerProfileByUserId: vi.fn().mockResolvedValue(null),
  updateUserRole: vi.fn().mockResolvedValue(undefined),
  getUserByEmail: vi.fn().mockResolvedValue(null),
  createUserWithPassword: vi.fn().mockResolvedValue({ id: 99 }),
  setUserPasswordHash: vi.fn().mockResolvedValue(undefined),
  createPasswordResetToken: vi.fn().mockResolvedValue(undefined),
  getPasswordResetToken: vi.fn().mockResolvedValue(null),
  markPasswordResetTokenUsed: vi.fn().mockResolvedValue(undefined),
  getAllProgrammes: vi.fn().mockResolvedValue([]),
  getSystemSettings: vi.fn().mockResolvedValue([]),
  getSystemSetting: vi.fn().mockResolvedValue(null),
  upsertSystemSetting: vi.fn().mockResolvedValue(undefined),
  submitFaqFeedback: vi.fn().mockResolvedValue({ success: true }),
  recordFaqRating: vi.fn().mockResolvedValue({ helpfulCount: 1, notHelpfulCount: 0 }),
  getFaqFeedbackOverview: vi.fn().mockResolvedValue({ newCount: 1, feedback: [{ id: 1, message: "Wie wird die Freischaltung erklärt?", audience: "student", language: "de", status: "NEW", createdAt: new Date() }], ratings: [] }),
  answerAndPublishFaqFeedback: vi.fn().mockResolvedValue({ success: true, publishedFaqKey: "community:1" }),
  getPublishedFaqFeedback: vi.fn().mockResolvedValue([{ id: 1, question: "Wie wird die Freischaltung erklärt?", answer: "Die Verwaltung prüft die Registrierung vor dem Zugang.", audience: "student", faqKey: "community:1" }]),
  getTopFaqRatings: vi.fn().mockResolvedValue([{ faqKey: "student:0", helpfulCount: 4, notHelpfulCount: 1 }]),
  getUsersMissingRequiredTwoFactor: vi.fn().mockResolvedValue([
    { id: 17, name: "Dr. Beispiel", email: "beispiel@htw-berlin.de", role: "examiner", createdAt: new Date() },
  ]),
  getAllUsersWithProfiles: vi.fn().mockResolvedValue([]),
  deleteUserByAdmin: vi.fn().mockResolvedValue(undefined),
  createExaminerByAdmin: vi.fn().mockResolvedValue({ id: 10 }),
  updateExaminerByAdmin: vi.fn().mockResolvedValue(undefined),
  updateThesisDeadline: vi.fn().mockResolvedValue(undefined),
  getAllColloquiums: vi.fn().mockResolvedValue([]),
  getColloquiumsByThesis: vi.fn().mockResolvedValue([]),
  createColloquium: vi.fn().mockResolvedValue(1),
  updateColloquiumStatus: vi.fn().mockResolvedValue(undefined),
  deleteColloquium: vi.fn().mockResolvedValue(undefined),
  getColloquiumsByExaminer: vi.fn().mockResolvedValue([]),
  getColloquiumsByStudent: vi.fn().mockResolvedValue([]),
  getUnassignedStudents: vi.fn().mockResolvedValue([]),
  countOpenPavProposals: vi.fn().mockResolvedValue(0),
  updateExaminerPhoto: vi.fn().mockResolvedValue(undefined),
  resolveExaminerEmail: vi.fn().mockResolvedValue(null),
  completeExaminerOnboarding: vi.fn().mockResolvedValue(undefined),
  setStudentProgramme: vi.fn().mockResolvedValue(true),
  getExaminerProgrammes: vi.fn().mockResolvedValue([]),
  setExaminerProgrammes: vi.fn().mockResolvedValue(undefined),
  getProgrammeById: vi.fn().mockResolvedValue(null),
  updateExaminerAlternativeEmail: vi.fn().mockResolvedValue(undefined),
  updateExaminerSecondExaminerFlag: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  logRoleSwitchAction: vi.fn().mockResolvedValue(undefined),
  // Reminder/Filter/Reporting Funktionen
  getReminderSchedules: vi.fn().mockResolvedValue([]),
  getReminderTemplates: vi.fn().mockResolvedValue([]),
  createReminderSchedule: vi.fn().mockResolvedValue({ id: 1 }),
  updateReminderSchedule: vi.fn().mockResolvedValue(undefined),
  deleteReminderSchedule: vi.fn().mockResolvedValue(undefined),
  getSavedFilters: vi.fn().mockResolvedValue([]),
  createSavedFilter: vi.fn().mockResolvedValue({ id: 1 }),
  deleteSavedFilter: vi.fn().mockResolvedValue(undefined),
  getReportingData: vi.fn().mockResolvedValue({}),
  getComplianceReport: vi.fn().mockResolvedValue({}),
  getThesisTimeline: vi.fn().mockResolvedValue([]),
  getExaminerWorkload: vi.fn().mockResolvedValue([]),
  getDepartmentStats: vi.fn().mockResolvedValue([]),
  getMonthlyStats: vi.fn().mockResolvedValue([]),
  getStatusDistribution: vi.fn().mockResolvedValue([]),
  getAverageProcessingTime: vi.fn().mockResolvedValue(0),
  getBulkActionTargets: vi.fn().mockResolvedValue([]),
  executeBulkAction: vi.fn().mockResolvedValue({ success: true }),
  globalSearch: vi.fn().mockResolvedValue({ results: [] }),
  getAuditTrail: vi.fn().mockResolvedValue([]),
  exportAuditTrail: vi.fn().mockResolvedValue(""),
  getComplianceStatus: vi.fn().mockResolvedValue({}),
  generateComplianceReport: vi.fn().mockResolvedValue(""),
  getDataRetentionStatus: vi.fn().mockResolvedValue([]),
  archiveOldData: vi.fn().mockResolvedValue({ archived: 0 }),
}));

vi.mock("./emailHelper", () => ({
  sendStatusChangeEmail: vi.fn().mockResolvedValue(undefined),
  sendExaminerCTAEmail: vi.fn().mockResolvedValue(undefined),
  sendMagicLinkEmail: vi.fn().mockResolvedValue(undefined),
  sendReminderEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./db/faq", () => ({
  submitFaqFeedback: vi.fn().mockResolvedValue({ success: true }),
  recordFaqRating: vi.fn().mockResolvedValue({ helpfulCount: 1, notHelpfulCount: 0 }),
  getFaqFeedbackOverview: vi.fn().mockResolvedValue({ newCount: 1, feedback: [{ id: 1, message: "Wie wird die Freischaltung erklärt?", audience: "student", language: "de", status: "NEW", createdAt: new Date() }], ratings: [] }),
  answerAndPublishFaqFeedback: vi.fn().mockResolvedValue({ success: true, publishedFaqKey: "community:1" }),
  getPublishedFaqFeedback: vi.fn().mockResolvedValue([{ id: 1, question: "Wie wird die Freischaltung erklärt?", answer: "Die Verwaltung prüft die Registrierung vor dem Zugang.", audience: "student", faqKey: "community:1" }]),
  getTopFaqRatings: vi.fn().mockResolvedValue([{ faqKey: "student:0", helpfulCount: 4, notHelpfulCount: 1 }]),
}));

vi.mock("./twoFactorAuth", () => ({
  signExaminerActionToken: vi.fn().mockResolvedValue("mock-jwt-token"),
  verifyExaminerActionToken: vi.fn().mockResolvedValue({
    thesisRequestId: 1,
    examinerId: 2,
    action: "accept",
  }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./storageLocal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./storageLocal")>();
  return {
    ...actual,
    checkStorageHealth: vi.fn().mockResolvedValue({
      mode: "s3",
      provider: "hetzner",
      healthy: true,
      message: "S3-Bucket erreichbar",
      diagnostics: [{ code: "S3_HEAD_BUCKET_OK", title: "S3-Bucket erreichbar", detail: "Test erfolgreich", action: "Keine Aktion erforderlich." }],
    }),
  };
});

// --- Hilfsfunktionen ----------------------------------------------------------
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createSuperadminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "superadmin-user",
    email: "holger@luetters.net",
    name: "Holger Lütters",
    loginMethod: "password",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "admin-user",
    email: "admin@htw-berlin.de",
    name: "Admin User",
    loginMethod: "password",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// --- Tests --------------------------------------------------------------------

describe("superadmin.getSuperadminStatus", () => {
  it("gibt Superadmin-Status für holger@luetters.net zurück", async () => {
    const ctx = createSuperadminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.superadmin.getSuperadminStatus();
    expect(result).toMatchObject({
      isSuperadmin: true,
      currentRole: "admin",
    });
  });
});

describe("superadmin.switchRole", () => {
  it("wechselt die Rolle erfolgreich", async () => {
    const ctx = createSuperadminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.superadmin.switchRole({ targetRole: "examiner" });
    expect(result).toMatchObject({
      success: true,
      newRole: "examiner",
    });
  });
});

describe("superadmin.getAllUsers", () => {
  it("gibt alle Nutzer mit Pagination zurück", async () => {
    const ctx = createSuperadminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.superadmin.getAllUsers({ limit: 20, offset: 0 });
    expect(result).toMatchObject({
      users: expect.any(Array),
      total: expect.any(Number),
    });
    expect(result.users.length).toBeGreaterThanOrEqual(0);
  });

  it("verweigert Zugriff für Nicht-Superadmin", async () => {
    // Nicht-Superadmin: getSuperadminStatus gibt isSuperadmin: false zurück
    const { getSuperadminStatus } = await import("./db");
    vi.mocked(getSuperadminStatus).mockResolvedValueOnce({ isSuperadmin: false, currentRole: "admin" });
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.superadmin.getAllUsers({ limit: 20, offset: 0 })).rejects.toThrow();
  });
});

describe("superadmin.getUserStatistics", () => {
  it("gibt Nutzer-Statistiken nach Rolle zurück", async () => {
    const ctx = createSuperadminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.superadmin.getUserStatistics();
    expect(result).toMatchObject({
      total: expect.any(Number),
      student: expect.any(Number),
      examiner: expect.any(Number),
    });
  });
});

describe("admin.testConfiguredStorage", () => {
  it("gibt Verwaltungsmitarbeiter:innen einen geheimnisfreien Speicherstatus zurück", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.testConfiguredStorage();
    expect(result).toEqual({
      success: true,
      mode: "s3",
      provider: "hetzner",
      message: "S3-Bucket erreichbar",
      diagnostics: [{ code: "S3_HEAD_BUCKET_OK", title: "S3-Bucket erreichbar", detail: "Test erfolgreich", action: "Keine Aktion erforderlich." }],
    });
  });
});

describe("superadmin.searchUsers", () => {
  it("sucht Nutzer nach Query", async () => {
    const ctx = createSuperadminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.superadmin.searchUsers({ query: "Max" });
    expect(result).toMatchObject({
      users: expect.any(Array),
      total: expect.any(Number),
    });
  });

  it("sucht Nutzer mit Rollen-Filter", async () => {
    const ctx = createSuperadminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.superadmin.searchUsers({ query: "", role: "student" });
    expect(result).toMatchObject({
      users: expect.any(Array),
      total: expect.any(Number),
    });
  });
});

describe("superadmin.getUserDetails", () => {
  it("gibt Nutzer-Details für gültige ID zurück", async () => {
    const ctx = createSuperadminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.superadmin.getUserDetails({ userId: 1 });
    expect(result).toMatchObject({
      id: 1,
      email: "student@htw-berlin.de",
      name: "Max Mustermann",
    });
  });
});

describe("superadmin.updateUserStatus", () => {
  it("aktualisiert den Nutzer-Status", async () => {
    const ctx = createSuperadminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.superadmin.updateUserStatus({ userId: 1, isActive: false });
    // updateUserStatus gibt boolean zurück
    expect(result).toBe(true);
  });
});

describe("superadmin.getTwoFactorEnrollmentGaps", () => {
  it("zeigt nur die Konten an, deren verpflichtende 2FA noch aussteht", async () => {
    const { getSystemSettings, getUsersMissingRequiredTwoFactor } = await import("./db");
    vi.mocked(getSystemSettings).mockResolvedValueOnce([{ key: "twoFactorRequiredRoles", value: JSON.stringify(["examiner"]), updatedById: 1, updatedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString() } as any]);
    const context = createSuperadminContext();
    context.user = { ...context.user!, role: "superadmin" };
    const caller = appRouter.createCaller(context);
    const result = await caller.superadmin.getTwoFactorEnrollmentGaps();
    expect(getUsersMissingRequiredTwoFactor).toHaveBeenCalledWith(["examiner"]);
    expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ id: 17, role: "examiner", twoFactorOverdue: true })]));
  });
});

describe("auth.twoFactorStatus", () => {
  it("stellt die persönliche 2FAS-Einrichtung auch Studierenden bereit", async () => {
    const { getUserById } = await import("./db");
    vi.mocked(getUserById).mockResolvedValueOnce({
      id: 7,
      name: "Max Muster",
      email: "max@student.htw-berlin.de",
      role: "student",
      twoFactorEnabled: 0,
      twoFactorConfirmedAt: null,
    } as any);
    const context = createAdminContext();
    context.user = { ...context.user!, id: 7, role: "student", email: "max@student.htw-berlin.de" };
    const caller = appRouter.createCaller(context);

    await expect(caller.auth.twoFactorStatus()).resolves.toEqual({ eligible: true, enabled: false, confirmedAt: null });
  });
});

describe("faq", () => {
  it("speichert eine anonymisierte fehlende Frage ohne Nutzerkennung", async () => {
    const caller = appRouter.createCaller({ ...createAdminContext(), user: null } as TrpcContext);
    const result = await caller.faq.submitFeedback({ message: "Wie funktioniert die Freischaltung im Detail?", audience: "student", language: "de" });
    const { submitFaqFeedback } = await import("./db/faq");
    expect(result).toEqual({ success: true });
    expect(submitFaqFeedback).toHaveBeenCalledWith({ message: "Wie funktioniert die Freischaltung im Detail?", audience: "student", language: "de" });
  });

  it("lehnt zu kurze Rückmeldungen vor dem Speichern ab", async () => {
    const caller = appRouter.createCaller({ ...createAdminContext(), user: null } as TrpcContext);
    await expect(caller.faq.submitFeedback({ message: "Zu kurz", audience: "student", language: "de" })).rejects.toThrow();
  });

  it("erlaubt die Bewertungsübersicht ausschließlich der Verwaltung", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    await expect(adminCaller.faq.adminOverview()).resolves.toMatchObject({ newCount: 1 });
    const publicCaller = appRouter.createCaller({ ...createAdminContext(), user: null } as TrpcContext);
    await expect(publicCaller.faq.adminOverview()).rejects.toThrow();
  });

  it("veröffentlicht eine beantwortete Frage nur für berechtigte Verwaltungskonten", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const result = await adminCaller.faq.answerAndPublish({ id: 1, answer: "Die Verwaltung prüft die Registrierung vor dem Zugang.", publish: true });
    const { answerAndPublishFaqFeedback } = await import("./db/faq");
    expect(result).toEqual({ success: true, publishedFaqKey: "community:1" });
    expect(answerAndPublishFaqFeedback).toHaveBeenCalledWith({ id: 1, answer: "Die Verwaltung prüft die Registrierung vor dem Zugang.", publish: true });
    const publicCaller = appRouter.createCaller({ ...createAdminContext(), user: null } as TrpcContext);
    await expect(publicCaller.faq.answerAndPublish({ id: 1, answer: "Die Verwaltung prüft die Registrierung vor dem Zugang.", publish: true })).rejects.toThrow();
  });

  it("stellt veröffentlichte Community-FAQs und aggregierte Bewertungsdaten öffentlich bereit", async () => {
    const caller = appRouter.createCaller({ ...createAdminContext(), user: null } as TrpcContext);
    await expect(caller.faq.published({ language: "de" })).resolves.toHaveLength(1);
    await expect(caller.faq.topRated()).resolves.toHaveLength(1);
  });
});
