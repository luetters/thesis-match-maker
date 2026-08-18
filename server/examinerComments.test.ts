import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeDbHolder: { db: unknown } = { db: null };

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => fakeDbHolder.db),
}));

import { _resetDbForTesting, createExaminerComment } from "./db";

describe("createExaminerComment", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://fake:fake@localhost/fake";
    _resetDbForTesting();
  });

  it("speichert eine datierte private Notiz mit Anfrage- und Prüfer:innenbezug", async () => {
    const valuesSpy = vi.fn().mockResolvedValue([{ insertId: 73 }]);
    const insertSpy = vi.fn().mockReturnValue({ values: valuesSpy });
    fakeDbHolder.db = { insert: insertSpy };

    const id = await createExaminerComment({
      thesisRequestId: 42,
      examinerId: 8,
      content: "Rückfrage im nächsten Termin klären.",
    });

    expect(id).toBe(73);
    expect(valuesSpy).toHaveBeenCalledWith({
      thesisRequestId: 42,
      examinerId: 8,
      content: "Rückfrage im nächsten Termin klären.",
    });
  });
});
