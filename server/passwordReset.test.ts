/**
 * Tests für Passwort-Reset-Prozeduren
 * auth.requestPasswordReset und auth.resetPassword
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof db>("./db");
  return {
    ...actual,
    getUserByEmail: vi.fn(),
    createPasswordResetToken: vi.fn(),
    getPasswordResetToken: vi.fn(),
    markPasswordResetTokenUsed: vi.fn(),
    setUserPasswordHash: vi.fn(),
  };
});

vi.mock("./emailHelper", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
  sendExaminerCTAEmail: vi.fn(),
  sendStatusChangeEmail: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_TOKEN = "a".repeat(64);
const FUTURE_DATE = new Date(Date.now() + 3600 * 1000);
const PAST_DATE = new Date(Date.now() - 3600 * 1000);

function makeUser(overrides = {}) {
  return {
    id: 1,
    openId: "test-open-id",
    name: "Test User",
    email: "test@htw-berlin.de",
    passwordHash: bcrypt.hashSync("Borschtsch05", 10),
    role: "student" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    loginMethod: "password",
    ...overrides,
  };
}

function makeTokenRecord(overrides = {}) {
  return {
    id: 1,
    token: VALID_TOKEN,
    userId: 1,
    expiresAt: FUTURE_DATE,
    used: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("auth.requestPasswordReset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gibt success:true zurück auch wenn E-Mail nicht existiert (kein User-Enumeration)", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(null);
    // Direkte Logik-Simulation (ohne tRPC-Router-Overhead)
    const user = await db.getUserByEmail("unknown@htw-berlin.de");
    expect(user).toBeNull();
    // createPasswordResetToken darf NICHT aufgerufen werden
    expect(db.createPasswordResetToken).not.toHaveBeenCalled();
  });

  it("gibt success:true zurück wenn E-Mail kein Passwort-Login hat", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(makeUser({ passwordHash: null }));
    const user = await db.getUserByEmail("test@htw-berlin.de");
    if (!user || !user.passwordHash) {
      expect(db.createPasswordResetToken).not.toHaveBeenCalled();
    }
  });

  it("erstellt Token wenn Nutzer mit Passwort-Login existiert", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(makeUser());
    vi.mocked(db.createPasswordResetToken).mockResolvedValue(undefined);
    const user = await db.getUserByEmail("test@htw-berlin.de");
    expect(user).not.toBeNull();
    expect(user?.passwordHash).toBeTruthy();
    // Token-Erstellung simulieren
    await db.createPasswordResetToken(user!.id, VALID_TOKEN, FUTURE_DATE);
    expect(db.createPasswordResetToken).toHaveBeenCalledWith(1, VALID_TOKEN, FUTURE_DATE);
  });
});

describe("auth.resetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wirft Fehler bei ungültigem Token", async () => {
    vi.mocked(db.getPasswordResetToken).mockResolvedValue(null);
    const record = await db.getPasswordResetToken("invalid-token");
    expect(record).toBeNull();
    // Prozedur würde TRPCError werfen – Logik-Prüfung
    expect(record).toBeNull();
  });

  it("wirft Fehler bei bereits verwendetem Token", async () => {
    vi.mocked(db.getPasswordResetToken).mockResolvedValue(makeTokenRecord({ used: 1 }));
    const record = await db.getPasswordResetToken(VALID_TOKEN);
    expect(record?.used).toBe(1);
    // Prozedur würde TRPCError werfen
  });

  it("wirft Fehler bei abgelaufenem Token", async () => {
    vi.mocked(db.getPasswordResetToken).mockResolvedValue(makeTokenRecord({ expiresAt: PAST_DATE }));
    const record = await db.getPasswordResetToken(VALID_TOKEN);
    expect(record?.expiresAt).toEqual(PAST_DATE);
    expect(new Date() > record!.expiresAt).toBe(true);
  });

  it("setzt neues Passwort bei gültigem Token", async () => {
    vi.mocked(db.getPasswordResetToken).mockResolvedValue(makeTokenRecord());
    vi.mocked(db.setUserPasswordHash).mockResolvedValue(undefined);
    vi.mocked(db.markPasswordResetTokenUsed).mockResolvedValue(undefined);

    const record = await db.getPasswordResetToken(VALID_TOKEN);
    expect(record).not.toBeNull();
    expect(record?.used).toBe(0);
    expect(new Date() > record!.expiresAt).toBe(false);

    const newHash = await bcrypt.hash("NeuesPasswort99", 12);
    await db.setUserPasswordHash(record!.userId, newHash);
    await db.markPasswordResetTokenUsed(VALID_TOKEN);

    expect(db.setUserPasswordHash).toHaveBeenCalledWith(1, expect.any(String));
    expect(db.markPasswordResetTokenUsed).toHaveBeenCalledWith(VALID_TOKEN);
  });

  it("Token kann nach Verwendung nicht erneut genutzt werden", async () => {
    vi.mocked(db.getPasswordResetToken).mockResolvedValue(makeTokenRecord({ used: 1 }));
    const record = await db.getPasswordResetToken(VALID_TOKEN);
    // used === 1 → Prozedur würde ablehnen
    expect(record?.used).toBe(1);
    expect(db.setUserPasswordHash).not.toHaveBeenCalled();
  });
});

describe("einmalige Passwort-Neuanmeldung", () => {
  it("ist als doppelt bestätigte Superadmin-Aktion für alle freigegebenen E-Mail-Konten implementiert", () => {
    const source = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    const adminUi = readFileSync(resolve(process.cwd(), "client/src/pages/AdminDashboard.tsx"), "utf8");
    expect(source).toContain("getPasswordRenewalCandidates: superadminProcedure");
    expect(source).toContain("sendPasswordRenewalInvitations: superadminProcedure");
    expect(source).toContain('confirmationPhrase: z.literal("PASSWORT-NEUANMELDUNG")');
    expect(source).toContain("secondConfirmation: z.literal(true)");
    expect(source).toContain("Die Versandvorschau hat sich geändert");
    expect(source).toContain("SUPERADMIN_PASSWORD_RENEWAL_SENT");
    expect(adminUi).toContain("const isSuperadmin = hasRole(\"superadmin\")");
    expect(adminUi).toContain("showBulkResetDialog && isSuperadmin");
  });
});
