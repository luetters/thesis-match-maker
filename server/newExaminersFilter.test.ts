import { describe, expect, it } from "vitest";

function filterVisibleNewExaminers<T extends { id: number }>(
  examiners: T[],
  preferenceIds: number[],
  locallyAddedIds: Set<number>,
) {
  return examiners.filter((examiner) => !preferenceIds.includes(examiner.id) && !locallyAddedIds.has(examiner.id));
}

describe("Liste neuer Prüfer:innen", () => {
  it("zeigt nur Prüfer:innen, die noch nicht in den Kommissionspräferenzen stehen", () => {
    const visible = filterVisibleNewExaminers([{ id: 11 }, { id: 12 }], [11], new Set([12]));
    expect(visible).toEqual([]);
  });

  it("belässt noch nicht hinzugefügte Prüfer:innen in der Liste", () => {
    const visible = filterVisibleNewExaminers([{ id: 11 }, { id: 12 }], [11], new Set());
    expect(visible).toEqual([{ id: 12 }]);
  });
});
