import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({ getDb: vi.fn(), getThesisRequestsByExaminer: vi.fn(), getThesisRequestsByStudent: vi.fn() }));
vi.mock("./db", () => ({ getDb: dbMocks.getDb, getThesisRequestsByExaminer: dbMocks.getThesisRequestsByExaminer, getThesisRequestsByStudent: dbMocks.getThesisRequestsByStudent }));

import { createColloquium, getAllColloquiums, getColloquiumsByExaminer, getColloquiumsByStudent, getColloquiumsByThesis } from "./db/colloquiums";

describe("Kolloquiums-Repository", () => {
  beforeEach(() => {
    dbMocks.getDb.mockReset();
    dbMocks.getThesisRequestsByExaminer.mockReset();
    dbMocks.getThesisRequestsByStudent.mockReset();
  });

  it("liefert bei nicht verfügbarer Datenbank sichere leere Kolloquiumslisten", async () => {
    dbMocks.getDb.mockResolvedValue(null);
    await expect(getAllColloquiums()).resolves.toEqual([]);
    await expect(getColloquiumsByThesis(42)).resolves.toEqual([]);
  });

  it("verhindert das Anlegen eines Kolloquiums ohne Datenbankverbindung", async () => {
    dbMocks.getDb.mockResolvedValue(null);
    await expect(createColloquium({ thesisRequestId: 42, title: "Kolloquium", scheduledAt: "2026-10-01 10:00:00", createdById: 7 } as any)).rejects.toThrow("Datenbank nicht verfügbar");
  });

  it("überspringt unnötige Kolloquiumsabfragen, wenn keine eigenen Fälle bestehen", async () => {
    dbMocks.getThesisRequestsByExaminer.mockResolvedValue([]);
    dbMocks.getThesisRequestsByStudent.mockResolvedValue([]);
    await expect(getColloquiumsByExaminer(7)).resolves.toEqual([]);
    await expect(getColloquiumsByStudent(8)).resolves.toEqual([]);
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});
