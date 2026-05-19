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

vi.mock("./jwtHelper", () => ({
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
