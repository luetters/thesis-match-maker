import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db", () => ({ getDb: dbMocks.getDb }));

import { extendDeadline, getDeadlineChanges, getProgrammeSemesterDeadlines, getThesisDeadlineScope } from "./db/deadlines";

describe("Fristen-Repository", () => {
  beforeEach(() => dbMocks.getDb.mockReset());

  it("liefert für lesende Fristenabfragen bei nicht verfügbarer Datenbank sichere Leerwerte", async () => {
    dbMocks.getDb.mockResolvedValue(null);
    await expect(getDeadlineChanges(42)).resolves.toEqual([]);
    await expect(getProgrammeSemesterDeadlines("FB3")).resolves.toEqual([]);
    await expect(getThesisDeadlineScope(42)).resolves.toBeNull();
  });

  it("verhindert schreibende Fristenänderungen ohne Datenbankverbindung", async () => {
    dbMocks.getDb.mockResolvedValue(null);
    await expect(extendDeadline(42, 7, "2026-10-01", "Nachteilsausgleich")).rejects.toThrow("Datenbank nicht verfügbar");
  });
});
