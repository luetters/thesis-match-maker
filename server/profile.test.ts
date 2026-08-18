/**
 * Integrationstests für getProfile und updateProfile (server/db.ts)
 *
 * Mock-Strategie: drizzle-orm/mysql2 wird gemockt, sodass getDb() intern
 * ein konfigurierbares Fake-DB-Objekt zurückgibt. Da db.ts ESM-Bindings
 * verwendet und _db gecacht wird, wird _resetDbForTesting() in beforeEach
 * aufgerufen, damit jeder Test eine frische DB-Instanz bekommt.
 *
 * Drizzle-Ketten:
 *   select({...}).from(t).where(c).limit(n)  → Promise<rows>
 *   select({...}).from(t).where(c)            → Promise<rows>  (kein .limit)
 *   update(t).set(v).where(c)                 → Promise<void>
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Fake-DB-Holder ───────────────────────────────────────────────────────────
// Wird von der drizzle()-Mock-Funktion zurückgegeben.
// Kann in jedem Test neu gesetzt werden.
const fakeDbHolder: { db: unknown } = { db: null };

// drizzle-orm/mysql2 mocken: drizzle() gibt immer fakeDbHolder.db zurück
vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => fakeDbHolder.db),
}));

import { getProfile, updateProfile, _resetDbForTesting } from "./db";

// ─── Fake-DB-Hilfsfunktionen ──────────────────────────────────────────────────

/**
 * Erstellt ein thenable Objekt, das sich wie ein Promise verhält und
 * zusätzlich .limit() unterstützt. Wird für Drizzle-Ketten ohne .limit() benötigt.
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

/**
 * Erzeugt ein Fake-Drizzle-Objekt, das select()-Aufrufe sequentiell
 * mit den angegebenen Zeilen-Listen beantwortet.
 * Jede select()-Kette unterstützt .from().where().limit() und .from().where() (thenable).
 */
function makeSequentialSelectDb(rowSequence: unknown[][]) {
  let callIndex = 0;
  return {
    select: vi.fn().mockImplementation(() => {
      const rows = rowSequence[callIndex] ?? [];
      callIndex++;
      const thenable = makeThenable(rows);
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(thenable),
          limit: vi.fn().mockResolvedValue(rows),
        }),
      };
    }),
    update: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  };
}

/**
 * Erzeugt eine Fake-DB für updateProfile-Tests.
 * Kette: db.update(table).set(values).where(cond) → Promise<void>
 *
 * @param selectRows - Zeilen für die interne curRows-Abfrage (firstName/lastName/academicTitle)
 * @param rejectUpdate - Wenn true, wirft where() einen Fehler
 */
function makeUpdateDb(selectRows: unknown[] = [], rejectUpdate = false) {
  const whereFn = rejectUpdate
    ? vi.fn().mockRejectedValue(new Error("DB-Verbindungsfehler"))
    : vi.fn().mockResolvedValue({});

  const setSpy = vi.fn().mockReturnValue({ where: whereFn });
  const updateSpy = vi.fn().mockReturnValue({ set: setSpy });

  // select für die interne curRows-Abfrage (firstName/lastName/academicTitle)
  const selectSpy = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(selectRows),
      }),
    }),
  });

  return { fakeDb: { select: selectSpy, update: updateSpy }, setSpy, updateSpy };
}

// ─── getProfile Tests ─────────────────────────────────────────────────────────

describe("getProfile", () => {
  beforeEach(() => {
    // DATABASE_URL setzen damit getDb() versucht zu initialisieren
    process.env.DATABASE_URL = "mysql://fake:fake@localhost/fake";
    // _db-Cache leeren damit jeder Test eine frische DB-Instanz bekommt
    _resetDbForTesting();
  });

  it("gibt null zurück wenn DB nicht verfügbar (kein DATABASE_URL)", async () => {
    delete process.env.DATABASE_URL;
    fakeDbHolder.db = null;
    const result = await getProfile(1);
    expect(result).toBeNull();
  });

  it("gibt null zurück wenn Nutzer nicht gefunden (leere Ergebnismenge)", async () => {
    fakeDbHolder.db = makeSequentialSelectDb([[]]);
    const result = await getProfile(999);
    expect(result).toBeNull();
  });

  it("gibt Basis-Profil für Studierenden zurück (kein examiner)", async () => {
    const fakeUser = {
      id: 42,
      name: "Maria Mustermann",
      firstName: "Maria",
      lastName: "Mustermann",
      email: "maria@htw-berlin.de",
      role: "student",
      roleStatus: "approved",
      avatarUrl: null,
      avatarKey: null,
      bio: "Ich studiere BWL.",
      phone: "030-12345",
      department: "FB3",
      programmeId: 1,
      matrikelNr: "s0123456",
      thesisType: "bachelor",
      enrollmentSemester: "WS 2022/23",
      targetSemester: "SS 2025",
      academicTitle: null,
      officeRoom: null,
      officeHours: null,
      researchTags: null,
      staffId: null,
      responsibilityArea: null,
      officeLocation: null,
      secondEmail: null,
      website: null,
      linkedIn: null,
      researchGate: null,
      htwProfileUrl: null,
      miscLink: null,
      bookingUrl: null,
      preferredLanguage: "de",
      bannerColor: null,
      bannerImageUrl: null,
      createdAt: "2022-10-01 10:00:00",
      lastSignedIn: "2025-07-01 08:00:00",
    };

    // Studierende: nur 1 select-Aufruf (users), kein examiner-Block
    fakeDbHolder.db = makeSequentialSelectDb([[fakeUser]]);

    const result = await getProfile(42);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(42);
    expect(result!.name).toBe("Maria Mustermann");
    expect(result!.email).toBe("maria@htw-berlin.de");
    expect(result!.role).toBe("student");
    expect(result!.matrikelNr).toBe("s0123456");
    expect(result!.thesisType).toBe("bachelor");
    expect(result!.enrollmentSemester).toBe("WS 2022/23");
    expect(result!.targetSemester).toBe("SS 2025");
    expect(result!.preferredLanguage).toBe("de");
    // Studierende sind keine Prüfer:innen
    expect(result!.isExaminer).toBe(false);
    expect(result!.examinerLanguages).toBeNull();
    expect(result!.examinerKeywords).toBeNull();
    expect(result!.examinerProgrammeIds).toBeNull();
  });

  it("gibt Prüfer:innen-Profil mit examiner-Feldern zurück", async () => {
    const fakeUser = {
      id: 7,
      name: "Prof. Dr. Schmidt",
      firstName: "Klaus",
      lastName: "Schmidt",
      email: "schmidt@htw-berlin.de",
      role: "examiner",
      roleStatus: "approved",
      avatarUrl: "/manus-storage/avatar.jpg",
      avatarKey: "avatar.jpg",
      bio: "Forschungsschwerpunkt KI",
      phone: null,
      department: "FB4",
      programmeId: null,
      matrikelNr: null,
      thesisType: null,
      enrollmentSemester: null,
      targetSemester: null,
      academicTitle: "Prof. Dr.",
      officeRoom: "C 234",
      officeHours: "Di 14-16 Uhr",
      researchTags: "KI, ML",
      staffId: "P0042",
      responsibilityArea: null,
      officeLocation: null,
      secondEmail: "schmidt@extern.de",
      website: "https://schmidt.de",
      linkedIn: null,
      researchGate: null,
      htwProfileUrl: null,
      miscLink: null,
      bookingUrl: null,
      preferredLanguage: "de",
      bannerColor: "#006937",
      bannerImageUrl: null,
      createdAt: "2020-01-01 00:00:00",
      lastSignedIn: "2025-08-01 09:00:00",
    };

    const fakeEp = {
      languages: JSON.stringify(["de", "en"]),
      tags: JSON.stringify(["KI", "Machine Learning"]),
      bio: "Spezialist für KI-Systeme",
      researchFocus: "Neuronale Netze",
    };

    // Für Prüfer:innen: 4 select-Aufrufe:
    // 1. users, 2. examinerProfiles, 3. examinerProgrammes, 4. examinerDepartments
    fakeDbHolder.db = makeSequentialSelectDb([
      [fakeUser],
      [fakeEp],
      [{ programmeId: 1 }, { programmeId: 3 }],
      [{ department: "FB4", isPrimary: 1 }, { department: "FB3", isPrimary: 0 }],
    ]);

    const result = await getProfile(7);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(7);
    expect(result!.role).toBe("examiner");
    expect(result!.academicTitle).toBe("Prof. Dr.");
    expect(result!.officeRoom).toBe("C 234");
    expect(result!.isExaminer).toBe(true);
    expect(result!.examinerLanguages).toEqual(["de", "en"]);
    expect(result!.examinerKeywords).toEqual(["KI", "Machine Learning"]);
    expect(result!.examinerProgrammeIds).toEqual([1, 3]);
    expect(result!.allowedDepartments).toEqual(["FB4", "FB3"]);
    expect(result!.primaryDepartment).toBe("FB4");
    expect(result!.examinerBio).toBe("Spezialist für KI-Systeme");
    expect(result!.examinerResearchFocus).toBe("Neuronale Netze");
  });

  it("behandelt fehlerhafte JSON-Felder in examinerProfile gracefully", async () => {
    const fakeUser = {
      id: 5,
      name: "Dr. Fehler",
      firstName: "Test",
      lastName: "Fehler",
      email: "fehler@htw-berlin.de",
      role: "examiner",
      roleStatus: "approved",
      avatarUrl: null, avatarKey: null, bio: null, phone: null,
      department: "FB1", programmeId: null, matrikelNr: null, thesisType: null,
      enrollmentSemester: null, targetSemester: null, academicTitle: null,
      officeRoom: null, officeHours: null, researchTags: null, staffId: null,
      responsibilityArea: null, officeLocation: null, secondEmail: null,
      website: null, linkedIn: null, researchGate: null, htwProfileUrl: null,
      miscLink: null, bookingUrl: null, preferredLanguage: "de",
      bannerColor: null, bannerImageUrl: null,
      createdAt: "2021-01-01 00:00:00", lastSignedIn: "2025-01-01 00:00:00",
    };

    const fakeEp = {
      languages: "UNGÜLTIGES_JSON{{{",
      tags: "AUCH_UNGÜLTIG",
      bio: null,
      researchFocus: null,
    };

    fakeDbHolder.db = makeSequentialSelectDb([
      [fakeUser],
      [fakeEp],
      [],  // examinerProgrammes
      [],  // examinerDepartments
    ]);

    const result = await getProfile(5);

    // Fehlerhafte JSON-Felder sollen leere Arrays ergeben, kein Crash
    expect(result).not.toBeNull();
    expect(result!.examinerLanguages).toEqual([]);
    expect(result!.examinerKeywords).toEqual([]);
  });

  it("setzt primaryDepartment auf ersten Eintrag wenn kein isPrimary=1 vorhanden", async () => {
    const fakeUser = {
      id: 9,
      name: "Dr. Fallback",
      firstName: "Test",
      lastName: "Fallback",
      email: "fallback@htw-berlin.de",
      role: "examiner",
      roleStatus: "approved",
      avatarUrl: null, avatarKey: null, bio: null, phone: null,
      department: "FB2", programmeId: null, matrikelNr: null, thesisType: null,
      enrollmentSemester: null, targetSemester: null, academicTitle: null,
      officeRoom: null, officeHours: null, researchTags: null, staffId: null,
      responsibilityArea: null, officeLocation: null, secondEmail: null,
      website: null, linkedIn: null, researchGate: null, htwProfileUrl: null,
      miscLink: null, bookingUrl: null, preferredLanguage: "de",
      bannerColor: null, bannerImageUrl: null,
      createdAt: "2021-01-01 00:00:00", lastSignedIn: "2025-01-01 00:00:00",
    };

    fakeDbHolder.db = makeSequentialSelectDb([
      [fakeUser],
      [],  // examinerProfiles → leer
      [],  // examinerProgrammes
      [{ department: "FB5", isPrimary: 0 }, { department: "FB6", isPrimary: 0 }],
    ]);

    const result = await getProfile(9);
    expect(result).not.toBeNull();
    // Kein isPrimary=1 → erster Eintrag wird primaryDepartment
    expect(result!.primaryDepartment).toBe("FB5");
    expect(result!.allowedDepartments).toEqual(["FB5", "FB6"]);
  });
});

// ─── updateProfile Tests ──────────────────────────────────────────────────────

describe("updateProfile", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://fake:fake@localhost/fake";
    _resetDbForTesting();
  });

  it("gibt false zurück wenn DB nicht verfügbar (kein DATABASE_URL)", async () => {
    delete process.env.DATABASE_URL;
    fakeDbHolder.db = null;
    const result = await updateProfile(1, { bio: "Test" });
    expect(result).toBe(false);
  });

  it("gibt true zurück ohne DB-Aufruf wenn keine Felder übergeben werden", async () => {
    const { fakeDb, updateSpy } = makeUpdateDb();
    fakeDbHolder.db = fakeDb;

    const result = await updateProfile(1, {});
    expect(result).toBe(true);
    // Kein Update-Aufruf bei leeren Daten
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("aktualisiert einfache Felder (bio, phone, department) mit camelCase-Schlüsseln", async () => {
    const { fakeDb, setSpy, updateSpy } = makeUpdateDb();
    fakeDbHolder.db = fakeDb;

    const result = await updateProfile(10, {
      bio: "Neue Bio",
      phone: "030-99999",
      department: "FB5",
    });

    expect(result).toBe(true);
    expect(updateSpy).toHaveBeenCalledOnce();
    const setArg = setSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg).toMatchObject({
      bio: "Neue Bio",
      phone: "030-99999",
      department: "FB5",
    });
    // Kein firstName/lastName → kein name-Feld automatisch gesetzt
    expect(setArg).not.toHaveProperty("name");
    expect(setArg).not.toHaveProperty("firstName");
  });

  it("bereinigt HTML aus Benutzerbiografien vor dem Speichern", async () => {
    const { fakeDb, setSpy } = makeUpdateDb();
    fakeDbHolder.db = fakeDb;

    await updateProfile(10, { bio: '<img src=x onerror="alert(1)">Sichere Biografie' });

    const setArg = setSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg.bio).toBe("Sichere Biografie");
  });

  it("setzt name automatisch aus firstName + lastName zusammen", async () => {
    const curRows = [{ firstName: "Alt", lastName: "Name", academicTitle: null }];
    const { fakeDb, setSpy } = makeUpdateDb(curRows);
    fakeDbHolder.db = fakeDb;

    const result = await updateProfile(5, {
      firstName: "Maria",
      lastName: "Musterfrau",
    });

    expect(result).toBe(true);
    const setArg = setSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg.firstName).toBe("Maria");
    expect(setArg.lastName).toBe("Musterfrau");
    // name = firstName + lastName (kein Titel vorhanden)
    expect(setArg.name).toBe("Maria Musterfrau");
  });

  it("setzt name mit akademischem Titel wenn vorhanden", async () => {
    const curRows = [{ firstName: "Klaus", lastName: "Schmidt", academicTitle: "Prof. Dr." }];
    const { fakeDb, setSpy } = makeUpdateDb(curRows);
    fakeDbHolder.db = fakeDb;

    const result = await updateProfile(7, {
      firstName: "Klaus",
      lastName: "Schmidt",
      academicTitle: "Prof. Dr.",
    });

    expect(result).toBe(true);
    const setArg = setSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg.name).toBe("Prof. Dr. Klaus Schmidt");
    expect(setArg.academicTitle).toBe("Prof. Dr.");
  });

  it("aktualisiert Studierenden-Felder mit camelCase (kein snake_case)", async () => {
    const { fakeDb, setSpy } = makeUpdateDb();
    fakeDbHolder.db = fakeDb;

    await updateProfile(3, {
      matrikelNr: "s0987654",
      thesisType: "master",
      enrollmentSemester: "WS 2023/24",
      targetSemester: "WS 2025/26",
    });

    const setArg = setSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    // Drizzle-camelCase-Schlüssel
    expect(setArg).toHaveProperty("matrikelNr", "s0987654");
    expect(setArg).toHaveProperty("thesisType", "master");
    expect(setArg).toHaveProperty("enrollmentSemester", "WS 2023/24");
    expect(setArg).toHaveProperty("targetSemester", "WS 2025/26");
    // Keine alten snake_case-Schlüssel
    expect(setArg).not.toHaveProperty("matrikel_nr");
    expect(setArg).not.toHaveProperty("thesis_type");
    expect(setArg).not.toHaveProperty("enrollment_semester");
    expect(setArg).not.toHaveProperty("target_semester");
  });

  it("aktualisiert Prüfer:innen-Kontaktfelder mit camelCase (kein snake_case)", async () => {
    const { fakeDb, setSpy } = makeUpdateDb();
    fakeDbHolder.db = fakeDb;

    await updateProfile(8, {
      staffId: "P0099",
      responsibilityArea: "Prüfungsausschuss",
      officeLocation: "Gebäude B",
      secondEmail: "extern@example.com",
      linkedIn: "https://linkedin.com/in/test",
      htwProfileUrl: "https://htw-berlin.de/person/test",
    });

    const setArg = setSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    // camelCase
    expect(setArg).toHaveProperty("staffId", "P0099");
    expect(setArg).toHaveProperty("responsibilityArea", "Prüfungsausschuss");
    expect(setArg).toHaveProperty("officeLocation", "Gebäude B");
    expect(setArg).toHaveProperty("secondEmail", "extern@example.com");
    expect(setArg).toHaveProperty("linkedIn", "https://linkedin.com/in/test");
    expect(setArg).toHaveProperty("htwProfileUrl", "https://htw-berlin.de/person/test");
    // Kein snake_case
    expect(setArg).not.toHaveProperty("staff_id");
    expect(setArg).not.toHaveProperty("responsibility_area");
    expect(setArg).not.toHaveProperty("office_location");
    expect(setArg).not.toHaveProperty("second_email");
    expect(setArg).not.toHaveProperty("linked_in");
    expect(setArg).not.toHaveProperty("htw_profile_url");
  });

  it("gibt false zurück bei DB-Fehler im update", async () => {
    const { fakeDb } = makeUpdateDb([], true /* rejectUpdate */);
    fakeDbHolder.db = fakeDb;

    const result = await updateProfile(1, { bio: "Test" });
    expect(result).toBe(false);
  });
});
