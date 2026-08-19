import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeDbHolder: { db: unknown } = { db: null };

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => fakeDbHolder.db),
}));

import { _resetDbForTesting } from "./db";
import { createExaminerComment, setExaminerCommentCompletion } from "./db/examinerComments";

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
      priority: "normal",
      dueAt: null,
    });
  });

  it("speichert eine ausdrücklich gewählte Priorität", async () => {
    const valuesSpy = vi.fn().mockResolvedValue([{ insertId: 74 }]);
    fakeDbHolder.db = { insert: vi.fn().mockReturnValue({ values: valuesSpy }) };

    await createExaminerComment({ thesisRequestId: 43, examinerId: 8, content: "Frist prüfen.", priority: "important" });

    expect(valuesSpy).toHaveBeenCalledWith(expect.objectContaining({ priority: "important" }));
  });

  it("speichert ein Fälligkeitsdatum ausschließlich für dringende Notizen", async () => {
    const valuesSpy = vi.fn().mockResolvedValue([{ insertId: 75 }]);
    fakeDbHolder.db = { insert: vi.fn().mockReturnValue({ values: valuesSpy }) };

    await createExaminerComment({ thesisRequestId: 44, examinerId: 8, content: "Rückmeldung einholen.", priority: "urgent", dueAt: "2026-09-01 23:59:59" });

    expect(valuesSpy).toHaveBeenCalledWith(expect.objectContaining({ priority: "urgent", dueAt: "2026-09-01 23:59:59" }));
  });
});

describe("setExaminerCommentCompletion", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://fake:fake@localhost/fake";
    _resetDbForTesting();
  });

  it("markiert ausschließlich eine eigene dringende Notiz mit einem Erledigtzeitpunkt", async () => {
    const limitSpy = vi.fn().mockResolvedValue([{ id: 81, examinerId: 8, priority: "urgent" }]);
    const selectWhereSpy = vi.fn().mockReturnValue({ limit: limitSpy });
    const selectFromSpy = vi.fn().mockReturnValue({ where: selectWhereSpy });
    const setSpy = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    fakeDbHolder.db = {
      select: vi.fn().mockReturnValue({ from: selectFromSpy }),
      update: vi.fn().mockReturnValue({ set: setSpy }),
    };

    await setExaminerCommentCompletion({ id: 81, examinerId: 8, completed: true });

    expect(setSpy).toHaveBeenCalledWith(expect.objectContaining({ completedAt: expect.any(String) }));
  });
});
