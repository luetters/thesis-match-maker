import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// --- Mock DB ------------------------------------------------------------------
vi.mock("./db", () => ({
  createThesisRequest: vi.fn().mockResolvedValue({ insertId: 42 }),
  getThesisRequestsByStudent: vi.fn().mockResolvedValue([
    {
      id: 1,
      title: "LLMs in der Kundenbetreuung",
      description: "Eine Untersuchung...",
      department: "M.Sc. Wirtschaftsinformatik",
      status: "PENDING",
      studentId: 1,
      language: "de",
      degreeType: "bachelor",
      targetSemester: "WS 2025/26",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getThesisRequestsByExaminer: vi.fn().mockResolvedValue([]),
  getAllThesisRequests: vi.fn().mockResolvedValue([]),
  getThesisRequestById: vi.fn().mockResolvedValue({
    id: 1,
    title: "Test Thesis",
    status: "PENDING",
    studentId: 1,
  }),
  updateThesisRequestStatus: vi.fn().mockResolvedValue(undefined),
  assignExaminerToThesis: vi.fn().mockResolvedValue(undefined),
  createAuditLogEntry: vi.fn().mockResolvedValue(undefined),
  getAllAuditLogs: vi.fn().mockResolvedValue([]),
  getAuditLogByThesis: vi.fn().mockResolvedValue([]),
  getAllExaminers: vi.fn().mockResolvedValue([]),
  getExaminerProfileByUserId: vi.fn().mockResolvedValue(null),
  upsertExaminerProfile: vi.fn().mockResolvedValue(undefined),
  getAllUsers: vi.fn().mockResolvedValue([]),
  updateUserRole: vi.fn().mockResolvedValue(undefined),
  getUserById: vi.fn().mockResolvedValue({ id: 1, name: "Max Mustermann", email: "student@htw-berlin.de" }),
  getNotificationsByUser: vi.fn().mockResolvedValue([]),
  getUnreadCount: vi.fn().mockResolvedValue(0),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
  notifyThesisParticipants: vi.fn().mockResolvedValue(undefined),
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./emailHelper", () => ({
  sendStatusChangeEmail: vi.fn().mockResolvedValue(undefined),
  sendExaminerCTAEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./jwtHelper", () => ({
  signExaminerActionToken: vi.fn().mockResolvedValue("mock-jwt-token"),
  verifyExaminerActionToken: vi.fn().mockResolvedValue({
    thesisRequestId: 1,
    examinerId: 2,
    action: "accept",
    studentName: "Max Mustermann",
    thesisTitle: "Test Thesis",
  }),
}));

// --- Context Factories --------------------------------------------------------
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(role: "student" | "examiner" | "admin" | "user" | "superadmin"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: `test-${role}`,
    email: `${role}@htw-berlin.de`,
    name: `Test ${role}`,
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// --- Tests --------------------------------------------------------------------

describe("auth.me", () => {
  it("gibt null zurück wenn nicht angemeldet", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("gibt den angemeldeten Nutzer zurück", async () => {
    const caller = appRouter.createCaller(makeCtx("student"));
    const result = await caller.auth.me();
    expect(result?.role).toBe("student");
    expect(result?.email).toBe("student@htw-berlin.de");
  });
});

describe("thesis.create", () => {
  it("erlaubt Studierenden, eine Anfrage einzureichen", async () => {
    const caller = appRouter.createCaller(makeCtx("student"));
    const result = await caller.thesis.create({
      title: "KI-gestützte Analyse von Kundenfeedback",
      description: "Diese Arbeit untersucht den Einsatz von KI-Methoden zur automatischen Analyse von Kundenfeedback in E-Commerce-Plattformen.",
      department: "M.Sc. Wirtschaftsinformatik",
      language: "de",
      degreeType: "master",
    });
    expect(result.success).toBe(true);
  });

  it("verweigert Prüfer:innen das Einreichen einer Anfrage", async () => {
    const caller = appRouter.createCaller(makeCtx("examiner"));
    await expect(
      caller.thesis.create({
        title: "Test",
        description: "Test Beschreibung für eine Abschlussarbeit",
        department: "Informatik",
        language: "de",
        degreeType: "bachelor",
      })
    ).rejects.toThrow();
  });

  it("validiert leeren Titel (Pflichtfeld)", async () => {
    const caller = appRouter.createCaller(makeCtx("student"));
    await expect(
      caller.thesis.create({
        title: "",
        description: "Test Beschreibung für eine Abschlussarbeit",
        department: "Informatik",
        language: "de",
        degreeType: "bachelor",
      })
    ).rejects.toThrow();
  });
});

describe("thesis.myRequests", () => {
  it("gibt die Anfragen des Studierenden zurück", async () => {
    const caller = appRouter.createCaller(makeCtx("student"));
    const result = await caller.thesis.myRequests();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].title).toBe("LLMs in der Kundenbetreuung");
  });
});

describe("thesis.all (Admin)", () => {
  it("erlaubt Admins, alle Anfragen abzurufen", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.thesis.all();
    expect(Array.isArray(result)).toBe(true);
  });

  it("verweigert Studierenden den Zugriff auf alle Anfragen", async () => {
    const caller = appRouter.createCaller(makeCtx("student"));
    await expect(caller.thesis.all()).rejects.toThrow();
  });
});

describe("thesis.updateStatus (Admin)", () => {
  it("erlaubt Admins, den Status zu ändern", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.thesis.updateStatus({ id: 1, status: "ACCEPTED" });
    expect(result.success).toBe(true);
  });

  it("verweigert Studierenden die Statusänderung", async () => {
    const caller = appRouter.createCaller(makeCtx("student"));
    await expect(caller.thesis.updateStatus({ id: 1, status: "ACCEPTED" })).rejects.toThrow();
  });
});

describe("examiner.respondViaToken", () => {
  it("verarbeitet einen gültigen JWT-Token (annehmen)", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.examiner.respondViaToken({
      token: "valid-jwt-token",
      action: "accept",
    });
    expect(result.success).toBe(true);
    expect(result.action).toBe("accept");
  });

  it("verarbeitet einen gültigen JWT-Token (ablehnen)", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.examiner.respondViaToken({
      token: "valid-jwt-token",
      action: "reject",
      rejectionReason: "Kein Kapazität",
    });
    expect(result.success).toBe(true);
    expect(result.action).toBe("reject");
  });
});

describe("auditLog.all (Admin)", () => {
  it("erlaubt Admins, das Audit-Log abzurufen", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.auditLog.all();
    expect(Array.isArray(result)).toBe(true);
  });

  it("verweigert Nicht-Admins den Zugriff auf das Audit-Log", async () => {
    const caller = appRouter.createCaller(makeCtx("examiner"));
    await expect(caller.auditLog.all()).rejects.toThrow();
  });
});

describe("admin.updateUserRole", () => {
  it("erlaubt Superadmins, Rollen zu ändern", async () => {
    const caller = appRouter.createCaller(makeCtx("superadmin"));
    const result = await caller.admin.updateUserRole({ userId: 2, role: "examiner" });
    expect(result.success).toBe(true);
  });

  it("verweigert normalen Admins die Rollenvergabe (nur Superadmin)", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    await expect(caller.admin.updateUserRole({ userId: 2, role: "examiner" })).rejects.toThrow();
  });

  it("verweigert Studierenden die Rollenänderung", async () => {
    const caller = appRouter.createCaller(makeCtx("student"));
    await expect(caller.admin.updateUserRole({ userId: 2, role: "examiner" })).rejects.toThrow();
  });
});
