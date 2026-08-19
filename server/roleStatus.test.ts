/**
 * Integrationstests für getUserRoleStatus und selectUserRole (server/db.ts)
 *
 * Mock-Strategie: drizzle-orm/mysql2 wird gemockt, damit getDb() ein
 * konfigurierbares Fake-DB-Objekt zurückgibt. _resetDbForTesting() wird
 * in beforeEach aufgerufen, um den _db-Cache zwischen Tests zu leeren.
 *
 * Drizzle-Ketten:
 *   select({...}).from(t).where(c).limit(1)  → Promise<rows>
 *   update(t).set(v).where(c)                → Promise<void>
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Fake-DB-Holder ───────────────────────────────────────────────────────────
const fakeDbHolder: { db: unknown } = { db: null };

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => fakeDbHolder.db),
}));

import { getUserRoleStatus, selectUserRole, _resetDbForTesting } from "./db";

// ─── Fake-DB-Hilfsfunktionen ──────────────────────────────────────────────────

/** Erstellt ein thenable Objekt mit .limit()-Support für Drizzle-Ketten. */
function makeThenable(rows: unknown[]) {
  const promise = Promise.resolve(rows);
  return {
    limit: vi.fn().mockResolvedValue(rows),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      promise.then(resolve, reject),
    catch: (reject: (e: unknown) => unknown) => promise.catch(reject),
  };
}

/**
 * Erstellt eine Fake-DB für SELECT-only-Funktionen (getUserRoleStatus).
 * @param rows - Zeilen die select().from().where().limit() zurückgibt
 * @param throwError - Wenn true, wirft where() einen Fehler
 */
function makeSelectDb(rows: unknown[], throwError = false) {
  const whereFn = throwError
    ? vi.fn().mockReturnValue({ limit: vi.fn().mockRejectedValue(new Error("DB-Fehler")) })
    : vi.fn().mockReturnValue(makeThenable(rows));

  const selectSpy = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({ where: whereFn }),
  });

  return { fakeDb: { select: selectSpy }, selectSpy, whereFn };
}

/**
 * Erstellt eine Fake-DB für UPDATE-Funktionen (selectUserRole).
 * @param throwError - Wenn true, wirft where() einen Fehler
 */
function makeUpdateDb(throwError = false) {
  const whereFn = throwError
    ? vi.fn().mockRejectedValue(new Error("DB-Verbindungsfehler"))
    : vi.fn().mockResolvedValue({});

  const setSpy = vi.fn().mockReturnValue({ where: whereFn });
  const updateSpy = vi.fn().mockReturnValue({ set: setSpy });

  return { fakeDb: { update: updateSpy }, updateSpy, setSpy, whereFn };
}

// ─── getUserRoleStatus Tests ──────────────────────────────────────────────────

describe("getUserRoleStatus", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://fake:fake@localhost/fake";
    _resetDbForTesting();
  });

  it("gibt null zurück wenn DB nicht verfügbar (kein DATABASE_URL)", async () => {
    delete process.env.DATABASE_URL;
    fakeDbHolder.db = null;
    const result = await getUserRoleStatus(1);
    expect(result).toBeNull();
  });

  it("gibt null zurück wenn Nutzer nicht gefunden (leere Ergebnismenge)", async () => {
    const { fakeDb } = makeSelectDb([]);
    fakeDbHolder.db = fakeDb;
    const result = await getUserRoleStatus(999);
    expect(result).toBeNull();
  });

  it("gibt korrektes Status-Objekt für approved-Nutzer zurück", async () => {
    const userRow = { id: 5, role: "student", roleStatus: "approved", requestedRole: null };
    const { fakeDb } = makeSelectDb([userRow]);
    fakeDbHolder.db = fakeDb;

    const result = await getUserRoleStatus(5);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(5);
    expect(result!.role).toBe("student");
    expect(result!.roleStatus).toBe("approved");
    expect(result!.requestedRole).toBeNull();
  });

  it("gibt korrektes Status-Objekt für pending-Nutzer zurück", async () => {
    const userRow = { id: 7, role: "user", roleStatus: "pending", requestedRole: "examiner" };
    const { fakeDb } = makeSelectDb([userRow]);
    fakeDbHolder.db = fakeDb;

    const result = await getUserRoleStatus(7);

    expect(result).not.toBeNull();
    expect(result!.roleStatus).toBe("pending");
    expect(result!.requestedRole).toBe("examiner");
    expect(result!.role).toBe("user");
  });

  it("gibt korrektes Status-Objekt für rejected-Nutzer zurück", async () => {
    const userRow = { id: 8, role: "user", roleStatus: "rejected", requestedRole: "admin" };
    const { fakeDb } = makeSelectDb([userRow]);
    fakeDbHolder.db = fakeDb;

    const result = await getUserRoleStatus(8);

    expect(result).not.toBeNull();
    expect(result!.roleStatus).toBe("rejected");
    expect(result!.requestedRole).toBe("admin");
  });

  it("gibt null zurück bei DB-Fehler (try/catch greift)", async () => {
    const { fakeDb } = makeSelectDb([], true /* throwError */);
    fakeDbHolder.db = fakeDb;

    const result = await getUserRoleStatus(1);
    expect(result).toBeNull();
  });

  it("gibt alle vier Felder zurück (id, role, roleStatus, requestedRole)", async () => {
    const userRow = { id: 42, role: "examiner", roleStatus: "approved", requestedRole: null };
    const { fakeDb } = makeSelectDb([userRow]);
    fakeDbHolder.db = fakeDb;

    const result = await getUserRoleStatus(42);

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("role");
    expect(result).toHaveProperty("roleStatus");
    expect(result).toHaveProperty("requestedRole");
  });

  it("gibt roleStatus als Union-Typ zurück (approved | pending | rejected)", async () => {
    const userRow = { id: 3, role: "student", roleStatus: "approved", requestedRole: null };
    const { fakeDb } = makeSelectDb([userRow]);
    fakeDbHolder.db = fakeDb;

    const result = await getUserRoleStatus(3);

    // TypeScript-Typ-Check: roleStatus muss einer der drei Werte sein
    expect(["approved", "pending", "rejected"]).toContain(result!.roleStatus);
  });
});

// ─── selectUserRole Tests ─────────────────────────────────────────────────────

describe("selectUserRole", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://fake:fake@localhost/fake";
    _resetDbForTesting();
  });

  it("gibt false zurück wenn DB nicht verfügbar (kein DATABASE_URL)", async () => {
    delete process.env.DATABASE_URL;
    fakeDbHolder.db = null;
    const result = await selectUserRole(1, "student");
    expect(result).toBe(false);
  });

  it("gibt true zurück bei erfolgreichem Update", async () => {
    const { fakeDb } = makeUpdateDb();
    fakeDbHolder.db = fakeDb;

    const result = await selectUserRole(10, "student");
    expect(result).toBe(true);
  });

  it("setzt requestedRole auf den übergebenen Wert", async () => {
    const { fakeDb, setSpy } = makeUpdateDb();
    fakeDbHolder.db = fakeDb;

    await selectUserRole(5, "examiner", "FB3");

    const setArg = setSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg.requestedRole).toBe("examiner");
  });

  it("lehnt Erstgutachter:innen ohne Fachbereich ab, ohne einen Datenbank-Write auszuführen", async () => {
    const { fakeDb, updateSpy } = makeUpdateDb();
    fakeDbHolder.db = fakeDb;

    const result = await selectUserRole(5, "examiner");

    expect(result).toBe(false);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("speichert den gewählten Fachbereich mit der Erstgutachter:innenanfrage", async () => {
    const { fakeDb, setSpy } = makeUpdateDb();
    fakeDbHolder.db = fakeDb;

    const result = await selectUserRole(5, "examiner", "FB4");

    expect(result).toBe(true);
    const setArg = setSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg.department).toBe("FB4");
  });

  it("setzt roleStatus immer auf 'pending'", async () => {
    const { fakeDb, setSpy } = makeUpdateDb();
    fakeDbHolder.db = fakeDb;

    await selectUserRole(5, "admin");

    const setArg = setSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg.roleStatus).toBe("pending");
  });

  it("setzt role auf 'user' (zurücksetzen bis zur Bestätigung)", async () => {
    const { fakeDb, setSpy } = makeUpdateDb();
    fakeDbHolder.db = fakeDb;

    await selectUserRole(5, "examiner", "FB3");

    const setArg = setSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg.role).toBe("user");
  });

  it("funktioniert für alle gültigen Rollen (student, examiner, second_examiner, admin)", async () => {
    const roles = ["student", "examiner", "second_examiner", "admin"];
    for (const role of roles) {
      _resetDbForTesting();
      const { fakeDb, setSpy } = makeUpdateDb();
      fakeDbHolder.db = fakeDb;

      const result = await selectUserRole(1, role, role === "examiner" ? "FB3" : undefined);
      expect(result).toBe(true);
      const setArg = setSpy.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(setArg.requestedRole).toBe(role);
    }
  });

  it("gibt false zurück bei DB-Fehler im update", async () => {
    const { fakeDb } = makeUpdateDb(true /* throwError */);
    fakeDbHolder.db = fakeDb;

    const result = await selectUserRole(1, "student");
    expect(result).toBe(false);
  });

  it("ruft update genau einmal auf (kein doppelter Write)", async () => {
    const { fakeDb, updateSpy } = makeUpdateDb();
    fakeDbHolder.db = fakeDb;

    await selectUserRole(3, "pav");

    expect(updateSpy).toHaveBeenCalledOnce();
  });
});
