import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// --- Mock DB ------------------------------------------------------------------
vi.mock("./db", () => ({
  getNotificationsByUser: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      title: "Status geändert: Angenommen",
      message: "\"LLMs in der Kundenbetreuung\" hat den Status Angenommen erhalten.",
      type: "status_change",
      read: 0,
      thesisRequestId: 1,
      createdAt: new Date("2025-01-15T10:00:00Z"),
    },
    {
      id: 2,
      userId: 1,
      title: "Prüfer:in zugewiesen",
      message: "Ihrer Anfrage wurde eine Erstprüfer:in zugewiesen.",
      type: "examiner_assigned",
      read: 1,
      thesisRequestId: 1,
      createdAt: new Date("2025-01-14T09:00:00Z"),
    },
  ]),
  getUnreadCount: vi.fn().mockResolvedValue(1),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
  // Weitere DB-Helfer für andere Router
  createThesisRequest: vi.fn().mockResolvedValue({ insertId: 1 }),
  getThesisRequestsByStudent: vi.fn().mockResolvedValue([]),
  getThesisRequestsByExaminer: vi.fn().mockResolvedValue([]),
  getAllThesisRequests: vi.fn().mockResolvedValue([]),
  getThesisRequestById: vi.fn().mockResolvedValue(null),
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
  getUserById: vi.fn().mockResolvedValue(null),
  notifyThesisParticipants: vi.fn().mockResolvedValue(undefined),
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./emailHelper", () => ({
  sendStatusChangeEmail: vi.fn().mockResolvedValue(undefined),
  sendExaminerCTAEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./jwtHelper", () => ({
  signExaminerActionToken: vi.fn().mockResolvedValue("mock-token"),
  verifyExaminerActionToken: vi.fn().mockResolvedValue(null),
}));

// --- Context Factory ----------------------------------------------------------
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(role: "student" | "examiner" | "admin" | "user", id = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `test-${role}-${id}`,
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

// --- Tests --------------------------------------------------------------------

describe("notifications.list", () => {
  it("gibt Benachrichtigungen des eingeloggten Nutzers zurück", async () => {
    const caller = appRouter.createCaller(makeCtx("student"));
    const result = await caller.notifications.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].title).toBe("Status geändert: Angenommen");
  });

  it("ist für alle authentifizierten Rollen zugänglich", async () => {
    for (const role of ["student", "examiner", "admin"] as const) {
      const caller = appRouter.createCaller(makeCtx(role));
      const result = await caller.notifications.list();
      expect(Array.isArray(result)).toBe(true);
    }
  });
});

describe("notifications.unreadCount", () => {
  it("gibt die Anzahl ungelesener Benachrichtigungen zurück", async () => {
    const caller = appRouter.createCaller(makeCtx("student"));
    const count = await caller.notifications.unreadCount();
    expect(typeof count).toBe("number");
    expect(count).toBe(1);
  });
});

describe("notifications.markRead", () => {
  it("markiert eine Benachrichtigung als gelesen", async () => {
    const caller = appRouter.createCaller(makeCtx("student"));
    const result = await caller.notifications.markRead({ id: 1 });
    expect(result.success).toBe(true);
  });
});

describe("notifications.markAllRead", () => {
  it("markiert alle Benachrichtigungen als gelesen", async () => {
    const caller = appRouter.createCaller(makeCtx("student"));
    const result = await caller.notifications.markAllRead();
    expect(result.success).toBe(true);
  });

  it("ist für alle authentifizierten Rollen zugänglich", async () => {
    for (const role of ["student", "examiner", "admin"] as const) {
      const caller = appRouter.createCaller(makeCtx(role));
      const result = await caller.notifications.markAllRead();
      expect(result.success).toBe(true);
    }
  });
});
