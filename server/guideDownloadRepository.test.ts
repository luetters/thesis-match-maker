import { getTableColumns } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));
vi.mock("./db", () => ({ getDb: getDbMock }));

import { guideDownloadTotals } from "../drizzle/schema";
import { recordGuideDownload } from "./db/faq";

describe("anonyme Leitfaden-Downloadzählung", () => {
  beforeEach(() => vi.clearAllMocks());

  it("speichert ausschließlich einen aggregierten Leitfadenschlüssel und einen Zähler", () => {
    expect(Object.keys(getTableColumns(guideDownloadTotals)).sort()).toEqual(["downloadCount", "guideKey", "id", "updatedAt"]);
  });

  it("erhöht den Aggregatwert ohne Nutzer-, Geräte- oder Netzwerkinformationen", async () => {
    const onDuplicateKeyUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn(() => ({ onDuplicateKeyUpdate }));
    getDbMock.mockResolvedValue({
      insert: vi.fn(() => ({ values })),
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ downloadCount: 4 }]) })) })) })),
    });

    await expect(recordGuideDownload("first_examiner")).resolves.toEqual({ guideKey: "first_examiner", downloadCount: 4 });
    expect(values).toHaveBeenCalledWith({ guideKey: "first_examiner", downloadCount: 1 });
    expect(JSON.stringify(values.mock.calls[0]?.[0])).not.toMatch(/user|email|ip|device|session/i);
    expect(onDuplicateKeyUpdate).toHaveBeenCalledOnce();
  });
});
