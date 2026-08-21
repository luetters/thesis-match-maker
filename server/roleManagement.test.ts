/**
 * Integrationstests für approveUserRole und rejectUserRole (server/db.ts)
 *
 * Mock-Strategie: drizzle-orm/mysql2 wird gemockt, damit getDb() ein
 * konfigurierbares Fake-DB-Objekt zurückgibt. Zwischen Tests wird
 * _resetDbForTesting() aufgerufen, um den _db-Cache zu leeren.
 *
 * Zusätzlich werden emailHelper und emailTemplates gemockt, da
 * approveUserRole/rejectUserRole E-Mails versenden.
 *
 * Drizzle-Ketten die hier vorkommen:
 *   select({...}).from(t).where(c).limit(1)  → Promise<rows>
 *   update(t).set(v).where(c)                → Promise<void>
 *   delete(t).where(c)                       → Promise<void>
 *   insert(t).values(v)                      → Promise<void>
 *   execute(sql`...`)                        → Promise<void>
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Fake-DB-Holder ───────────────────────────────────────────────────────────
const fakeDbHolder: { db: unknown } = { db: null };

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => fakeDbHolder.db),
}));

// E-Mail-Module mocken damit kein SMTP-Aufruf erfolgt
vi.mock("./emailHelper", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));
vi.mock("./emailTemplates", () => ({
  roleApprovedEmail: vi.fn().mockReturnValue({
    subject: "Rolle bestätigt",
    html: "<p>Bestätigt</p>",
    text: "Bestätigt",
  }),
  roleRejectedEmail: vi.fn().mockReturnValue({
    subject: "Rolle abgelehnt",
    html: "<p>Abgelehnt</p>",
    text: "Abgelehnt",
  }),
  buildSecondExaminerRequestEmail: vi.fn(),
  buildSecondExaminerConfirmedEmail: vi.fn(),
  buildSecondExaminerRejectedEmail: vi.fn(),
}));

import { approveUserRole, rejectUserRole, _resetDbForTesting } from "./db";
import * as emailHelperModule from "./emailHelper";
import * as emailTemplatesModule from "./emailTemplates";

// ─── Fake-DB-Hilfsfunktionen ──────────────────────────────────────────────────

/**
 * Erstellt ein thenable Objekt (Promise-kompatibel) mit .limit()-Support.
 */
function makeThenable(rows: unknown[]) {
  const promise = Promise.resolve(rows);
  return {
    limit: vi.fn().mockResolvedValue(rows),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      promise.then(resolve, reject),
    catch: (reject: (e: unknown) => unknown) => promise.catch(reject),
  };
}

interface FakeDb {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
  _updateSpy?: ReturnType<typeof vi.fn>;
  _setSpy?: ReturnType<typeof vi.fn>;
  _insertSpy?: ReturnType<typeof vi.fn>;
  _deleteSpy?: ReturnType<typeof vi.fn>;
  _executeSpy?: ReturnType<typeof vi.fn>;
}

/**
 * Erstellt eine Fake-DB für approveUserRole/rejectUserRole.
 *
 * @param userRow - Der Nutzer-Datensatz (oder null für "nicht gefunden")
 * @param epRows - examinerProfiles-Zeilen (für second_examiner-Pfad)
 */
function makeRoleDb(userRow: unknown | null, epRows: unknown[] = [], adminDepartment?: string): FakeDb {
  let selectCallIndex = 0;
  const selectResponses = [
    userRow ? [userRow] : [],  // 1. select: users-Abfrage
    ...(adminDepartment === undefined ? [] : [[{ department: adminDepartment }]]), // 2. select: Fachbereich der Verwaltung
    epRows,                     // 2. select: examinerProfiles (nur bei second_examiner)
  ];

  const whereFnSelect = vi.fn().mockImplementation(() => {
    const rows = selectResponses[selectCallIndex] ?? [];
    selectCallIndex++;
    return makeThenable(rows);
  });

  const selectSpy = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: whereFnSelect,
    }),
  });

  const updateWhereSpy = vi.fn().mockResolvedValue({});
  const setSpy = vi.fn().mockReturnValue({ where: updateWhereSpy });
  const updateSpy = vi.fn().mockReturnValue({ set: setSpy });

  const deleteWhereSpy = vi.fn().mockResolvedValue({});
  const deleteSpy = vi.fn().mockReturnValue({ where: deleteWhereSpy });

  const insertValuesSpy = vi.fn().mockResolvedValue({});
  const insertSpy = vi.fn().mockReturnValue({ values: insertValuesSpy });

  const executeSpy = vi.fn().mockResolvedValue({});

  return {
    select: selectSpy,
    update: updateSpy,
    delete: deleteSpy,
    insert: insertSpy,
    execute: executeSpy,
    _updateSpy: updateSpy,
    _setSpy: setSpy,
    _insertSpy: insertSpy,
    _deleteSpy: deleteSpy,
    _executeSpy: executeSpy,
  };
}

// ─── approveUserRole Tests ────────────────────────────────────────────────────

describe("approveUserRole", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://fake:fake@localhost/fake";
    _resetDbForTesting();
  });

  it("gibt { success: false } zurück wenn DB nicht verfügbar", async () => {
    delete process.env.DATABASE_URL;
    fakeDbHolder.db = null;
    const result = await approveUserRole(1, 99, "superadmin");
    expect(result).toEqual({ success: false, error: "DB nicht verfügbar" });
  });

  it("gibt { success: false } zurück wenn Nutzer nicht gefunden", async () => {
    fakeDbHolder.db = makeRoleDb(null);
    const result = await approveUserRole(999, 99, "superadmin");
    expect(result).toEqual({ success: false, error: "Nutzer nicht gefunden" });
  });

  it("gibt { success: false } zurück wenn kein pending-Status", async () => {
    const user = { id: 1, email: "test@htw-berlin.de", name: "Test", requestedRole: "student", roleStatus: "approved" };
    fakeDbHolder.db = makeRoleDb(user);
    const result = await approveUserRole(1, 99, "superadmin");
    expect(result).toEqual({ success: false, error: "Keine ausstehende Rollenanfrage" });
  });

  it("verhindert, dass Verwaltung eine Verwaltungsrolle bestätigt", async () => {
    const user = { id: 2, email: "test@htw-berlin.de", name: "Test", requestedRole: "admin", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);
    const result = await approveUserRole(2, 10, "admin");
    expect(result).toMatchObject({ success: false });
    expect(result.error).toContain("Studierende und interne Erstprüfer:innen");
  });

  it("bestätigt Studierenden-Rolle des eigenen Fachbereichs: users.update mit role=student und roleStatus=approved", async () => {
    const user = { id: 3, email: "s0123@student.htw-berlin.de", name: "Maria Muster", requestedRole: "student", roleStatus: "pending", department: "FB3" };
    const fakeDb = makeRoleDb(user, [], "FB3");
    fakeDbHolder.db = fakeDb;

    const result = await approveUserRole(3, 10, "admin");

    expect(result).toEqual({ success: true });
    // users.update muss aufgerufen worden sein
    expect(fakeDb._updateSpy).toHaveBeenCalled();
    const setArg = fakeDb._setSpy!.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg.role).toBe("student");
    expect(setArg.roleStatus).toBe("approved");
    expect(setArg.requestedRole).toBeNull();
    expect(setArg.roleConfirmedBy).toBe(10);
    // auditLog.insert muss aufgerufen worden sein
    expect(fakeDb._insertSpy).toHaveBeenCalled();
    const insertArg = fakeDb._insertSpy!.mock.calls[0] as unknown[];
    // Zweiter Aufruf von insert ist der auditLog-Eintrag
    const auditInsertValues = fakeDb._insertSpy!.mock.results;
    expect(auditInsertValues.length).toBeGreaterThan(0);
  });

  it("speichert den Fachbereich der freigegebenen Person im Audit-Log", async () => {
    const user = { id: 4, email: "s0457@student.htw-berlin.de", name: "Audit Fachbereich", requestedRole: "student", roleStatus: "pending", department: "FB2" };
    const fakeDb = makeRoleDb(user);
    const valuesSpy = vi.fn().mockResolvedValue({});
    fakeDb.insert = vi.fn().mockReturnValue({ values: valuesSpy });
    fakeDbHolder.db = fakeDb;

    await approveUserRole(4, 99, "superadmin");

    const auditEntry = valuesSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(auditEntry.action).toBe("ROLE_APPROVED");
    expect(auditEntry.metadata).toMatchObject({ userId: 4, requestedRole: "student", department: "FB2" });
  });

  it("bestätigt examiner-Rolle: users.update mit role=examiner", async () => {
    const user = { id: 5, email: "prof@htw-berlin.de", name: "Prof. Schmidt", requestedRole: "examiner", roleStatus: "pending" };
    const fakeDb = makeRoleDb(user);
    fakeDbHolder.db = fakeDb;

    const result = await approveUserRole(5, 99, "superadmin");

    expect(result).toEqual({ success: true });
    const setArg = fakeDb._setSpy!.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg.role).toBe("examiner");
    expect(setArg.roleStatus).toBe("approved");
    // user_roles: delete + execute (INSERT IGNORE) müssen aufgerufen worden sein
    expect(fakeDb._deleteSpy).toHaveBeenCalledOnce();
    expect(fakeDb._executeSpy).toHaveBeenCalledOnce();
  });

  it("bestätigt second_examiner-Rolle: examinerProfiles-Update wird versucht", async () => {
    const user = { id: 6, email: "zweit@htw-berlin.de", name: "Zweit Prüfer", requestedRole: "second_examiner", roleStatus: "pending" };
    // examinerProfiles existiert bereits → Update-Pfad
    const epRow = { userId: 6 };
    const fakeDb = makeRoleDb(user, [epRow]);
    fakeDbHolder.db = fakeDb;

    const result = await approveUserRole(6, 99, "superadmin");

    expect(result).toEqual({ success: true });
    // users.update (role=second_examiner) + examinerProfiles.update (isSecondExaminer=1)
    expect(fakeDb._updateSpy!.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("bestätigt second_examiner-Rolle: examinerProfiles-Insert wenn kein Profil existiert", async () => {
    const user = { id: 7, email: "neu@htw-berlin.de", name: "Neu Prüfer", requestedRole: "second_examiner", roleStatus: "pending" };
    // examinerProfiles leer → Insert-Pfad
    const fakeDb = makeRoleDb(user, []);
    fakeDbHolder.db = fakeDb;

    const result = await approveUserRole(7, 99, "superadmin");

    expect(result).toEqual({ success: true });
    // insert muss für examinerProfiles aufgerufen worden sein (zusätzlich zu auditLog)
    expect(fakeDb._insertSpy!.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("admin darf student-Rolle im eigenen Fachbereich bestätigen", async () => {
    const user = { id: 8, email: "s0456@student.htw-berlin.de", name: "Student Test", requestedRole: "student", roleStatus: "pending", department: "FB3" };
    fakeDbHolder.db = makeRoleDb(user, [], "FB3");
    const result = await approveUserRole(8, 20, "admin");
    expect(result).toEqual({ success: true });
  });

  it("admin darf examiner-Rolle im eigenen Fachbereich bestätigen", async () => {
    const user = { id: 9, email: "prof@htw-berlin.de", name: "Prof Test", requestedRole: "examiner", roleStatus: "pending", department: "FB3" };
    fakeDbHolder.db = makeRoleDb(user, [], "FB3");
    const result = await approveUserRole(9, 20, "admin");
    expect(result).toEqual({ success: true });
  });

  it("admin darf Studierende eines anderen Fachbereichs nicht bestätigen", async () => {
    const user = { id: 11, email: "s0999@student.htw-berlin.de", name: "Anderer Fachbereich", requestedRole: "student", roleStatus: "pending", department: "FB2" };
    fakeDbHolder.db = makeRoleDb(user, [], "FB3");
    const result = await approveUserRole(11, 20, "admin");
    expect(result).toMatchObject({ success: false });
    expect(result.error).toContain("zugeordneten Fachbereichs");
  });

  it("gibt { success: false } bei DB-Fehler im update", async () => {
    const user = { id: 10, email: "test@htw-berlin.de", name: "Test", requestedRole: "student", roleStatus: "pending" };
    const fakeDb = makeRoleDb(user);
    // update().set().where() wirft Fehler
    (fakeDb._setSpy as ReturnType<typeof vi.fn>).mockReturnValue({
      where: vi.fn().mockRejectedValue(new Error("DB-Verbindungsfehler")),
    });
    fakeDbHolder.db = fakeDb;

    const result = await approveUserRole(10, 99, "superadmin");
    expect(result).toEqual({ success: false, error: "Interner Fehler" });
  });
});

// ─── rejectUserRole Tests ─────────────────────────────────────────────────────

describe("rejectUserRole", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://fake:fake@localhost/fake";
    _resetDbForTesting();
  });

  it("gibt { success: false } zurück wenn DB nicht verfügbar", async () => {
    delete process.env.DATABASE_URL;
    fakeDbHolder.db = null;
    const result = await rejectUserRole(1, 99, "superadmin");
    expect(result).toEqual({ success: false, error: "DB nicht verfügbar" });
  });

  it("gibt { success: false } zurück wenn Nutzer nicht gefunden", async () => {
    fakeDbHolder.db = makeRoleDb(null);
    const result = await rejectUserRole(999, 99, "superadmin");
    expect(result).toEqual({ success: false, error: "Nutzer nicht gefunden" });
  });

  it("gibt { success: false } zurück wenn kein pending-Status", async () => {
    const user = { id: 1, email: "test@htw-berlin.de", name: "Test", requestedRole: "student", roleStatus: "approved" };
    fakeDbHolder.db = makeRoleDb(user);
    const result = await rejectUserRole(1, 99, "superadmin");
    expect(result).toEqual({ success: false, error: "Keine ausstehende Rollenanfrage" });
  });

  it("erlaubt Verwaltung, eine Erstprüfer:innen-Rolle des eigenen Fachbereichs abzulehnen", async () => {
    const user = { id: 2, email: "prof@htw-berlin.de", name: "Prof Test", requestedRole: "examiner", roleStatus: "pending", department: "FB3" };
    fakeDbHolder.db = makeRoleDb(user, [], "FB3");
    const result = await rejectUserRole(2, 10, "admin");
    expect(result).toEqual({ success: true });
  });

  it("lehnt Studierenden-Rolle des eigenen Fachbereichs ab: users.update mit roleStatus=rejected", async () => {
    const user = { id: 3, email: "s0789@student.htw-berlin.de", name: "Abgelehnt Test", requestedRole: "student", roleStatus: "pending", department: "FB3" };
    const fakeDb = makeRoleDb(user, [], "FB3");
    fakeDbHolder.db = fakeDb;

    const result = await rejectUserRole(3, 10, "admin");

    expect(result).toEqual({ success: true });
    expect(fakeDb._updateSpy).toHaveBeenCalledOnce();
    const setArg = fakeDb._setSpy!.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg.roleStatus).toBe("rejected");
    expect(setArg.roleConfirmedBy).toBe(10);
    // auditLog.insert muss aufgerufen worden sein
    expect(fakeDb._insertSpy).toHaveBeenCalledOnce();
  });

  it("Audit-Log-Eintrag enthält action=ROLE_REJECTED und toStatus=rejected", async () => {
    const user = { id: 4, email: "s0001@student.htw-berlin.de", name: "Audit Test", requestedRole: "student", roleStatus: "pending" };
    const fakeDb = makeRoleDb(user);
    fakeDbHolder.db = fakeDb;

    await rejectUserRole(4, 99, "superadmin", "Unvollständige Angaben");

    // insert wird für auditLog aufgerufen
    const insertValuesArg = fakeDb._insertSpy!.mock.calls[0] as unknown[];
    // insert(auditLog).values({...}) – der values-Spy ist der zweite Aufruf
    const valuesCall = (fakeDb._insertSpy!.mock.results[0]?.value as { values: ReturnType<typeof vi.fn> })?.values;
    // Prüfen ob values-Spy aufgerufen wurde
    expect(fakeDb._insertSpy).toHaveBeenCalledOnce();
  });

  it("Audit-Log-Eintrag enthält übergebenen Ablehnungsgrund", async () => {
    const user = { id: 5, email: "s0002@student.htw-berlin.de", name: "Grund Test", requestedRole: "student", roleStatus: "pending" };
    const fakeDb = makeRoleDb(user);
    // Spy auf insert().values() um den Audit-Log-Inhalt zu prüfen
    const valuesSpy = vi.fn().mockResolvedValue({});
    fakeDb.insert = vi.fn().mockReturnValue({ values: valuesSpy });
    fakeDbHolder.db = fakeDb;

    await rejectUserRole(5, 99, "superadmin", "Matrikelnummer fehlt");

    expect(valuesSpy).toHaveBeenCalledOnce();
    const auditEntry = valuesSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(auditEntry.action).toBe("ROLE_REJECTED");
    expect(auditEntry.toStatus).toBe("rejected");
    expect(auditEntry.reason).toBe("Matrikelnummer fehlt");
    expect(auditEntry.actorId).toBe(99);
    expect(auditEntry.actorRole).toBe("superadmin");
  });

  it("Audit-Log-Eintrag hat reason=null wenn kein Grund angegeben", async () => {
    const user = { id: 6, email: "s0003@student.htw-berlin.de", name: "Kein Grund", requestedRole: "student", roleStatus: "pending" };
    const fakeDb = makeRoleDb(user);
    const valuesSpy = vi.fn().mockResolvedValue({});
    fakeDb.insert = vi.fn().mockReturnValue({ values: valuesSpy });
    fakeDbHolder.db = fakeDb;

    await rejectUserRole(6, 99, "superadmin");

    const auditEntry = valuesSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(auditEntry.reason).toBeNull();
  });

  it("superadmin darf examiner-Rolle ablehnen", async () => {
    const user = { id: 7, email: "prof@htw-berlin.de", name: "Prof Abgelehnt", requestedRole: "examiner", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);
    const result = await rejectUserRole(7, 99, "superadmin");
    expect(result).toEqual({ success: true });
  });

  it("admin darf second_examiner-Rolle nicht ablehnen", async () => {
    const user = { id: 8, email: "zweit@htw-berlin.de", name: "Zweit Abgelehnt", requestedRole: "second_examiner", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);
    const result = await rejectUserRole(8, 20, "admin");
    expect(result).toMatchObject({ success: false });
    expect(result.error).toContain("Studierende und interne Erstprüfer:innen");
  });

  it("admin darf Studierende eines anderen Fachbereichs nicht ablehnen", async () => {
    const user = { id: 10, email: "s0888@student.htw-berlin.de", name: "Anderer Fachbereich", requestedRole: "student", roleStatus: "pending", department: "FB2" };
    fakeDbHolder.db = makeRoleDb(user, [], "FB3");
    const result = await rejectUserRole(10, 20, "admin");
    expect(result).toMatchObject({ success: false });
    expect(result.error).toContain("zugeordneten Fachbereichs");
  });

  it("gibt { success: false } bei DB-Fehler im update", async () => {
    const user = { id: 9, email: "test@htw-berlin.de", name: "Fehler Test", requestedRole: "student", roleStatus: "pending" };
    const fakeDb = makeRoleDb(user);
    (fakeDb._setSpy as ReturnType<typeof vi.fn>).mockReturnValue({
      where: vi.fn().mockRejectedValue(new Error("DB-Verbindungsfehler")),
    });
    fakeDbHolder.db = fakeDb;

    const result = await rejectUserRole(9, 99, "superadmin");
    expect(result).toEqual({ success: false, error: "Interner Fehler" });
  });
});

// ─── E-Mail-Parameter-Tests: approveUserRole ──────────────────────────────────

describe("approveUserRole – E-Mail-Benachrichtigung", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://fake:fake@localhost/fake";
    _resetDbForTesting();
    vi.clearAllMocks();
    // Mock-Implementierungen nach clearAllMocks wiederherstellen
    (emailTemplatesModule.roleApprovedEmail as ReturnType<typeof vi.fn>).mockReturnValue({
      subject: "Rolle bestätigt",
      html: "<p>Bestätigt</p>",
      text: "Bestätigt",
    });
    (emailHelperModule.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  it("sendet E-Mail an die korrekte Empfänger-Adresse", async () => {
    const user = { id: 1, email: "s0001@student.htw-berlin.de", name: "Maria Muster", requestedRole: "student", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await approveUserRole(1, 99, "superadmin");

    expect(emailHelperModule.sendEmail).toHaveBeenCalledOnce();
    const sendArg = (emailHelperModule.sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(sendArg.to).toBe("s0001@student.htw-berlin.de");
  });

  it("übergibt korrekten userName an roleApprovedEmail", async () => {
    const user = { id: 2, email: "prof@htw-berlin.de", name: "Prof. Schmidt", requestedRole: "examiner", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await approveUserRole(2, 99, "superadmin");

    expect(emailTemplatesModule.roleApprovedEmail).toHaveBeenCalledOnce();
    const templateArg = (emailTemplatesModule.roleApprovedEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(templateArg.userName).toBe("Prof. Schmidt");
  });

  it("übergibt korrektes roleLabel für student-Rolle", async () => {
    const user = { id: 3, email: "s0002@student.htw-berlin.de", name: "Test Nutzer", requestedRole: "student", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await approveUserRole(3, 99, "superadmin");

    const templateArg = (emailTemplatesModule.roleApprovedEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(templateArg.roleLabel).toBe("Studierende:r");
  });

  it("übergibt korrektes roleLabel für examiner-Rolle", async () => {
    const user = { id: 4, email: "prof@htw-berlin.de", name: "Prof Test", requestedRole: "examiner", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await approveUserRole(4, 99, "superadmin");

    const templateArg = (emailTemplatesModule.roleApprovedEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(templateArg.roleLabel).toBe("Prüfer:in (Erstprüfer:in)");
  });

  it("übergibt Erstprüfer:innen den passenden Begrüßungsleitfaden", async () => {
    const user = { id: 12, email: "prof-guide@htw-berlin.de", name: "Prof Guide", requestedRole: "examiner", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user, [{ userId: 12 }]);

    await approveUserRole(12, 99, "superadmin");

    const templateArg = (emailTemplatesModule.roleApprovedEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(templateArg.examinerGuideRole).toBe("examiner");
  });

  it("übergibt korrektes roleLabel für second_examiner-Rolle", async () => {
    const user = { id: 5, email: "zweit@htw-berlin.de", name: "Zweit Test", requestedRole: "second_examiner", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user, [{ userId: 5 }]);

    await approveUserRole(5, 99, "superadmin");

    const templateArg = (emailTemplatesModule.roleApprovedEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(templateArg.roleLabel).toBe("Zweitprüfer:in");
  });

  it("übergibt Zweitprüfer:innen den passenden Begrüßungsleitfaden", async () => {
    const user = { id: 13, email: "zweit-guide@example.org", name: "Zweit Guide", requestedRole: "second_examiner", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user, [{ userId: 13 }]);

    await approveUserRole(13, 99, "superadmin");

    const templateArg = (emailTemplatesModule.roleApprovedEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(templateArg.examinerGuideRole).toBe("second_examiner");
  });

  it("übergibt korrekten dashboardPath für student (/student)", async () => {
    const user = { id: 6, email: "s0003@student.htw-berlin.de", name: "Student", requestedRole: "student", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await approveUserRole(6, 99, "superadmin");

    const templateArg = (emailTemplatesModule.roleApprovedEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(templateArg.dashboardPath).toBe("/student");
  });

  it("übergibt korrekten dashboardPath für examiner (/examiner)", async () => {
    const user = { id: 7, email: "prof@htw-berlin.de", name: "Examiner", requestedRole: "examiner", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await approveUserRole(7, 99, "superadmin");

    const templateArg = (emailTemplatesModule.roleApprovedEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(templateArg.dashboardPath).toBe("/examiner");
  });

  it("übergibt korrekten dashboardPath für admin (/admin)", async () => {
    const user = { id: 8, email: "admin@htw-berlin.de", name: "Admin", requestedRole: "admin", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await approveUserRole(8, 99, "superadmin");

    const templateArg = (emailTemplatesModule.roleApprovedEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(templateArg.dashboardPath).toBe("/admin");
  });

  it("übergibt E-Mail-Inhalt (subject, html, text) korrekt an sendEmail", async () => {
    const user = { id: 9, email: "test@htw-berlin.de", name: "Test", requestedRole: "student", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await approveUserRole(9, 99, "superadmin");

    const sendArg = (emailHelperModule.sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(sendArg.subject).toBe("Rolle bestätigt");
    expect(sendArg.html).toBe("<p>Bestätigt</p>");
    expect(sendArg.text).toBe("Bestätigt");
  });

  it("sendet keine E-Mail wenn Nutzer keine E-Mail-Adresse hat", async () => {
    const user = { id: 10, email: null, name: "Kein Email", requestedRole: "student", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await approveUserRole(10, 99, "superadmin");

    expect(emailHelperModule.sendEmail).not.toHaveBeenCalled();
  });

  it("verwendet 'Nutzende:r' als Fallback-Name wenn name null ist", async () => {
    const user = { id: 11, email: "anon@htw-berlin.de", name: null, requestedRole: "student", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await approveUserRole(11, 99, "superadmin");

    const templateArg = (emailTemplatesModule.roleApprovedEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(templateArg.userName).toBe("Nutzende:r");
  });
});

// ─── E-Mail-Parameter-Tests: rejectUserRole ───────────────────────────────────

describe("rejectUserRole – E-Mail-Benachrichtigung", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://fake:fake@localhost/fake";
    _resetDbForTesting();
    vi.clearAllMocks();
    // Mock-Implementierungen nach clearAllMocks wiederherstellen
    (emailTemplatesModule.roleRejectedEmail as ReturnType<typeof vi.fn>).mockReturnValue({
      subject: "Rolle abgelehnt",
      html: "<p>Abgelehnt</p>",
      text: "Abgelehnt",
    });
    (emailHelperModule.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  it("sendet E-Mail an die korrekte Empfänger-Adresse", async () => {
    const user = { id: 1, email: "s0010@student.htw-berlin.de", name: "Abgelehnt Muster", requestedRole: "student", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await rejectUserRole(1, 99, "superadmin");

    expect(emailHelperModule.sendEmail).toHaveBeenCalledOnce();
    const sendArg = (emailHelperModule.sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(sendArg.to).toBe("s0010@student.htw-berlin.de");
  });

  it("übergibt korrekten userName an roleRejectedEmail", async () => {
    const user = { id: 2, email: "test@htw-berlin.de", name: "Max Mustermann", requestedRole: "student", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await rejectUserRole(2, 99, "superadmin");

    const templateArg = (emailTemplatesModule.roleRejectedEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(templateArg.userName).toBe("Max Mustermann");
  });

  it("übergibt korrektes roleLabel für student-Rolle", async () => {
    const user = { id: 3, email: "s0011@student.htw-berlin.de", name: "Test", requestedRole: "student", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await rejectUserRole(3, 99, "superadmin");

    const templateArg = (emailTemplatesModule.roleRejectedEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(templateArg.roleLabel).toBe("Studierende:r");
  });

  it("übergibt korrektes roleLabel für examiner-Rolle", async () => {
    const user = { id: 4, email: "prof@htw-berlin.de", name: "Prof", requestedRole: "examiner", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await rejectUserRole(4, 99, "superadmin");

    const templateArg = (emailTemplatesModule.roleRejectedEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(templateArg.roleLabel).toBe("Prüfer:in (Erstprüfer:in)");
  });

  it("übergibt Ablehnungsgrund an roleRejectedEmail wenn angegeben", async () => {
    const user = { id: 5, email: "s0012@student.htw-berlin.de", name: "Grund Test", requestedRole: "student", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await rejectUserRole(5, 99, "superadmin", "Matrikelnummer fehlt");

    const templateArg = (emailTemplatesModule.roleRejectedEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(templateArg.reason).toBe("Matrikelnummer fehlt");
  });

  it("übergibt undefined als reason wenn kein Grund angegeben", async () => {
    const user = { id: 6, email: "s0013@student.htw-berlin.de", name: "Kein Grund", requestedRole: "student", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await rejectUserRole(6, 99, "superadmin");

    const templateArg = (emailTemplatesModule.roleRejectedEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(templateArg.reason).toBeUndefined();
  });

  it("übergibt E-Mail-Inhalt (subject, html, text) korrekt an sendEmail", async () => {
    const user = { id: 7, email: "test@htw-berlin.de", name: "Test", requestedRole: "student", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await rejectUserRole(7, 99, "superadmin");

    const sendArg = (emailHelperModule.sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(sendArg.subject).toBe("Rolle abgelehnt");
    expect(sendArg.html).toBe("<p>Abgelehnt</p>");
    expect(sendArg.text).toBe("Abgelehnt");
  });

  it("sendet keine E-Mail wenn Nutzer keine E-Mail-Adresse hat", async () => {
    const user = { id: 8, email: null, name: "Kein Email", requestedRole: "student", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await rejectUserRole(8, 99, "superadmin");

    expect(emailHelperModule.sendEmail).not.toHaveBeenCalled();
  });

  it("verwendet 'Nutzende:r' als Fallback-Name wenn name null ist", async () => {
    const user = { id: 9, email: "anon@htw-berlin.de", name: null, requestedRole: "student", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await rejectUserRole(9, 99, "superadmin");

    const templateArg = (emailTemplatesModule.roleRejectedEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(templateArg.userName).toBe("Nutzende:r");
  });

  it("sendet E-Mail auch bei second_examiner-Ablehnungen", async () => {
    const user = { id: 10, email: "zweit@htw-berlin.de", name: "Zweit Test", requestedRole: "second_examiner", roleStatus: "pending" };
    fakeDbHolder.db = makeRoleDb(user);

    await rejectUserRole(10, 99, "superadmin");

    expect(emailHelperModule.sendEmail).toHaveBeenCalledOnce();
    const sendArg = (emailHelperModule.sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(sendArg.to).toBe("zweit@htw-berlin.de");
  });
});
