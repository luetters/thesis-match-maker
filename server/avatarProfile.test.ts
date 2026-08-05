/**
 * Integrationstests für updateProfileAvatar und clearProfileAvatar (server/db.ts)
 *
 * Mock-Strategie: drizzle-orm/mysql2 wird gemockt, damit getDb() ein
 * konfigurierbares Fake-DB-Objekt zurückgibt. Zwischen Tests wird
 * _resetDbForTesting() aufgerufen, um den _db-Cache zu leeren.
 *
 * Drizzle-Ketten:
 *   update(t).set(v).where(c)                → Promise<void>
 *   select({...}).from(t).where(c).limit(1)  → Promise<rows>
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Fake-DB-Holder ───────────────────────────────────────────────────────────
const fakeDbHolder: { db: unknown } = { db: null };

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => fakeDbHolder.db),
}));

import { updateProfileAvatar, clearProfileAvatar, _resetDbForTesting } from "./db";

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

interface AvatarFakeDb {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  _updateSpy: ReturnType<typeof vi.fn>;
  _setSpy: ReturnType<typeof vi.fn>;
  _selectSpy: ReturnType<typeof vi.fn>;
}

/**
 * Erstellt eine Fake-DB für Avatar-Tests.
 *
 * @param emailRow - E-Mail-Zeile für die interne E-Mail-Abfrage (null = kein Eintrag)
 * @param epRows - examinerProfiles-Zeilen (für updateProfileAvatar examiner-Sync)
 * @param rejectUpdate - Wenn true, wirft update().set().where() einen Fehler
 */
function makeAvatarDb(
  emailRow: { email: string } | null,
  epRows: unknown[] = [],
  rejectUpdate = false,
): AvatarFakeDb {
  let selectCallIndex = 0;
  // Reihenfolge der select-Aufrufe:
  // updateProfileAvatar: 1. email-Abfrage, 2. examinerProfiles-Abfrage
  // clearProfileAvatar:  1. email-Abfrage
  const selectResponses = [
    emailRow ? [emailRow] : [],
    epRows,
  ];

  const selectSpy = vi.fn().mockImplementation(() => {
    const rows = selectResponses[selectCallIndex] ?? [];
    selectCallIndex++;
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(makeThenable(rows)),
      }),
    };
  });

  const updateWhereSpy = rejectUpdate
    ? vi.fn().mockRejectedValue(new Error("DB-Verbindungsfehler"))
    : vi.fn().mockResolvedValue({});

  const setSpy = vi.fn().mockReturnValue({ where: updateWhereSpy });
  const updateSpy = vi.fn().mockReturnValue({ set: setSpy });

  return {
    select: selectSpy,
    update: updateSpy,
    _updateSpy: updateSpy,
    _setSpy: setSpy,
    _selectSpy: selectSpy,
  };
}

// ─── updateProfileAvatar Tests ────────────────────────────────────────────────

describe("updateProfileAvatar", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://fake:fake@localhost/fake";
    _resetDbForTesting();
  });

  it("gibt false zurück wenn DB nicht verfügbar", async () => {
    delete process.env.DATABASE_URL;
    fakeDbHolder.db = null;
    const result = await updateProfileAvatar(1, "/manus-storage/avatar.jpg", "avatar.jpg");
    expect(result).toBe(false);
  });

  it("aktualisiert avatarUrl und avatarKey in users-Tabelle", async () => {
    const fakeDb = makeAvatarDb({ email: "test@htw-berlin.de" });
    fakeDbHolder.db = fakeDb;

    const result = await updateProfileAvatar(42, "/manus-storage/new-avatar.jpg", "new-avatar.jpg");

    expect(result).toBe(true);
    // Erster update-Aufruf: users.set({ avatarUrl, avatarKey })
    expect(fakeDb._updateSpy).toHaveBeenCalled();
    const firstSetArg = fakeDb._setSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(firstSetArg.avatarUrl).toBe("/manus-storage/new-avatar.jpg");
    expect(firstSetArg.avatarKey).toBe("new-avatar.jpg");
  });

  it("synchronisiert Avatar auf alle Accounts mit gleicher E-Mail", async () => {
    const fakeDb = makeAvatarDb({ email: "shared@htw-berlin.de" });
    fakeDbHolder.db = fakeDb;

    await updateProfileAvatar(10, "/manus-storage/shared.jpg", "shared.jpg");

    // Mindestens 2 update-Aufrufe: eigener Account + andere Accounts mit gleicher E-Mail
    expect(fakeDb._updateSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    // Zweiter set-Aufruf muss ebenfalls avatarUrl und avatarKey enthalten
    const secondSetArg = fakeDb._setSpy.mock.calls[1]?.[0] as Record<string, unknown>;
    expect(secondSetArg?.avatarUrl).toBe("/manus-storage/shared.jpg");
    expect(secondSetArg?.avatarKey).toBe("shared.jpg");
  });

  it("überspringt E-Mail-Sync wenn kein E-Mail-Eintrag gefunden", async () => {
    // Kein E-Mail-Eintrag → nur eigener Account wird aktualisiert
    const fakeDb = makeAvatarDb(null);
    fakeDbHolder.db = fakeDb;

    const result = await updateProfileAvatar(5, "/manus-storage/solo.jpg", "solo.jpg");

    expect(result).toBe(true);
    // Nur 1 update-Aufruf (eigener Account), kein zweiter für E-Mail-Sync
    // (examinerProfiles-Update wird versucht, aber epRows ist leer → kein Update)
    expect(fakeDb._updateSpy.mock.calls.length).toBe(1);
  });

  it("synchronisiert photoUrl in examinerProfiles wenn Profil existiert", async () => {
    const epRow = { id: 1 };
    const fakeDb = makeAvatarDb({ email: "prof@htw-berlin.de" }, [epRow]);
    fakeDbHolder.db = fakeDb;

    await updateProfileAvatar(7, "/manus-storage/prof.jpg", "prof.jpg");

    // Mindestens 3 update-Aufrufe: eigener Account + E-Mail-Sync + examinerProfiles
    expect(fakeDb._updateSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
    // Letzter set-Aufruf muss photoUrl und photoKey enthalten
    const lastSetArg = fakeDb._setSpy.mock.calls[fakeDb._setSpy.mock.calls.length - 1]?.[0] as Record<string, unknown>;
    expect(lastSetArg.photoUrl).toBe("/manus-storage/prof.jpg");
    expect(lastSetArg.photoKey).toBe("prof.jpg");
  });

  it("überspringt examinerProfiles-Update wenn kein Profil existiert", async () => {
    // epRows leer → kein examinerProfiles-Update
    const fakeDb = makeAvatarDb({ email: "student@student.htw-berlin.de" }, []);
    fakeDbHolder.db = fakeDb;

    await updateProfileAvatar(3, "/manus-storage/student.jpg", "student.jpg");

    // Nur 2 update-Aufrufe: eigener Account + E-Mail-Sync
    // (examinerProfiles-Update wird nicht ausgeführt, da epRows leer)
    const updateCalls = fakeDb._updateSpy.mock.calls.length;
    // Kein update auf examinerProfiles (photoUrl/photoKey)
    const hasPhotoUrlUpdate = fakeDb._setSpy.mock.calls.some(
      (call) => (call[0] as Record<string, unknown>)?.photoUrl !== undefined
    );
    expect(hasPhotoUrlUpdate).toBe(false);
  });

  it("gibt false zurück bei DB-Fehler im ersten update", async () => {
    const fakeDb = makeAvatarDb({ email: "test@htw-berlin.de" }, [], true /* rejectUpdate */);
    fakeDbHolder.db = fakeDb;

    const result = await updateProfileAvatar(1, "/manus-storage/error.jpg", "error.jpg");
    expect(result).toBe(false);
  });

  it("speichert korrekten avatarKey (nicht nur URL)", async () => {
    const fakeDb = makeAvatarDb({ email: "key-test@htw-berlin.de" });
    fakeDbHolder.db = fakeDb;

    await updateProfileAvatar(20, "/manus-storage/user-20/photo.png", "user-20/photo.png");

    const firstSetArg = fakeDb._setSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    // avatarKey muss der S3-Key sein, nicht die URL
    expect(firstSetArg.avatarKey).toBe("user-20/photo.png");
    expect(firstSetArg.avatarUrl).toBe("/manus-storage/user-20/photo.png");
  });
});

// ─── clearProfileAvatar Tests ─────────────────────────────────────────────────

describe("clearProfileAvatar", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://fake:fake@localhost/fake";
    _resetDbForTesting();
  });

  it("gibt false zurück wenn DB nicht verfügbar", async () => {
    delete process.env.DATABASE_URL;
    fakeDbHolder.db = null;
    const result = await clearProfileAvatar(1);
    expect(result).toBe(false);
  });

  it("setzt avatarUrl und avatarKey auf null in users-Tabelle", async () => {
    const fakeDb = makeAvatarDb({ email: "clear@htw-berlin.de" });
    fakeDbHolder.db = fakeDb;

    const result = await clearProfileAvatar(15);

    expect(result).toBe(true);
    expect(fakeDb._updateSpy).toHaveBeenCalled();
    const firstSetArg = fakeDb._setSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(firstSetArg.avatarUrl).toBeNull();
    expect(firstSetArg.avatarKey).toBeNull();
  });

  it("synchronisiert null-Avatar auf alle Accounts mit gleicher E-Mail", async () => {
    const fakeDb = makeAvatarDb({ email: "shared-clear@htw-berlin.de" });
    fakeDbHolder.db = fakeDb;

    await clearProfileAvatar(8);

    // Mindestens 2 update-Aufrufe: eigener Account + andere Accounts mit gleicher E-Mail
    expect(fakeDb._updateSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    const secondSetArg = fakeDb._setSpy.mock.calls[1]?.[0] as Record<string, unknown>;
    expect(secondSetArg?.avatarUrl).toBeNull();
    expect(secondSetArg?.avatarKey).toBeNull();
  });

  it("überspringt E-Mail-Sync wenn kein E-Mail-Eintrag gefunden", async () => {
    const fakeDb = makeAvatarDb(null);
    fakeDbHolder.db = fakeDb;

    const result = await clearProfileAvatar(99);

    expect(result).toBe(true);
    // Nur 1 update-Aufruf (eigener Account)
    expect(fakeDb._updateSpy.mock.calls.length).toBe(1);
  });

  it("gibt false zurück bei DB-Fehler im update", async () => {
    const fakeDb = makeAvatarDb({ email: "error@htw-berlin.de" }, [], true /* rejectUpdate */);
    fakeDbHolder.db = fakeDb;

    const result = await clearProfileAvatar(1);
    expect(result).toBe(false);
  });

  it("löscht kein examinerProfiles-Feld (nur users-Tabelle wird geleert)", async () => {
    const fakeDb = makeAvatarDb({ email: "examiner-clear@htw-berlin.de" });
    fakeDbHolder.db = fakeDb;

    await clearProfileAvatar(12);

    // Kein update mit photoUrl/photoKey (clearProfileAvatar berührt examinerProfiles nicht)
    const hasPhotoUrlUpdate = fakeDb._setSpy.mock.calls.some(
      (call) => (call[0] as Record<string, unknown>)?.photoUrl !== undefined
    );
    expect(hasPhotoUrlUpdate).toBe(false);
  });
});
