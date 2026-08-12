import { describe, expect, it } from "vitest";
import { derivePollStatus, findColloquiumRoomConflicts, hasThreeWayConfirmation, normalizeRoomValue, roomLabelsConflict, timeRangesOverlap } from "./colloquiumScheduling";

describe("Kolloquiums-Terminabstimmung – Kernregeln", () => {
  it("findet einen passenden Termin nur bei drei positiven Verfügbarkeiten", () => {
    expect(derivePollStatus([{ id: 11 }], [
      { slotId: 11, availability: "YES" },
      { slotId: 11, availability: "YES" },
      { slotId: 11, availability: "YES" },
    ], 3)).toBe("MATCH_FOUND");
  });

  it("wertet einen Termin mit Vorbehalt nicht als verbindlichen Treffer", () => {
    expect(derivePollStatus([{ id: 11 }], [
      { slotId: 11, availability: "YES" },
      { slotId: 11, availability: "YES" },
      { slotId: 11, availability: "MAYBE" },
    ], 3)).toBe("OPEN");
  });

  it("akzeptiert einen Treffer, wenn mindestens eine von mehreren Optionen für alle passt", () => {
    expect(derivePollStatus([{ id: 11 }, { id: 12 }], [
      { slotId: 11, availability: "NO" },
      { slotId: 11, availability: "YES" },
      { slotId: 11, availability: "YES" },
      { slotId: 12, availability: "YES" },
      { slotId: 12, availability: "YES" },
      { slotId: 12, availability: "YES" },
    ], 3)).toBe("MATCH_FOUND");
  });

  it("finalisiert erst nach exakt drei vorliegenden Bestätigungen", () => {
    expect(hasThreeWayConfirmation([
      { confirmedAt: "2026-08-12 09:00:00" },
      { confirmedAt: "2026-08-12 09:01:00" },
      { confirmedAt: null },
    ])).toBe(false);
    expect(hasThreeWayConfirmation([
      { confirmedAt: "2026-08-12 09:00:00" },
      { confirmedAt: "2026-08-12 09:01:00" },
      { confirmedAt: "2026-08-12 09:02:00" },
    ])).toBe(true);
  });

  it("akzeptiert keine Bestätigung, wenn nicht alle drei Beteiligten vorliegen", () => {
    expect(hasThreeWayConfirmation([
      { confirmedAt: "2026-08-12 09:00:00" },
      { confirmedAt: "2026-08-12 09:01:00" },
    ])).toBe(false);
  });
});

describe("Raum-Konfliktcheck", () => {
  it("erkennt zeitlich überlappende Termine, nicht aber direkt anschließende Termine", () => {
    const start = Date.UTC(2026, 9, 14, 10, 0);
    expect(timeRangesOverlap(start, start + 60 * 60 * 1000, start + 30 * 60 * 1000, start + 90 * 60 * 1000)).toBe(true);
    expect(timeRangesOverlap(start, start + 60 * 60 * 1000, start + 60 * 60 * 1000, start + 120 * 60 * 1000)).toBe(false);
  });

  it("vergleicht Raum- und Ortsangaben robust gegen Groß-/Kleinschreibung und Leerzeichen", () => {
    expect(normalizeRoomValue("  C   201 ")).toBe("c 201");
    expect(roomLabelsConflict({ room: "C 201", location: "Campus Treskowallee" }, { room: "c 201", location: "campus treskowallee" })).toBe(true);
  });

  it("vermeidet Fehlalarme bei gleichen Raumnummern an unterschiedlichen Orten", () => {
    expect(roomLabelsConflict({ room: "C 201", location: "Campus Treskowallee" }, { room: "C 201", location: "Campus Wilhelminenhof" })).toBe(false);
  });

  it("behandelt identische Räume vorsorglich als Konflikt, wenn ein Ort fehlt", () => {
    expect(roomLabelsConflict({ room: "C 201", location: null }, { room: "C 201", location: "Campus Treskowallee" })).toBe(true);
  });

  it("meldet eine administrative Sperrzeit als blockierenden Raumkonflikt", async () => {
    let selectCall = 0;
    const fakeDb = {
      select: () => {
        selectCall += 1;
        return selectCall === 1
          ? { from: () => ({ where: async () => [] }) }
          : { from: async () => [{ startsAt: "2026-10-14 10:00:00", endsAt: "2026-10-14 12:00:00", room: "C 201", location: "Campus Treskowallee", reason: "Lehrveranstaltung" }] };
      },
    };
    const conflicts = await findColloquiumRoomConflicts({
      room: "c 201",
      location: "Campus Treskowallee",
      slots: [{ startsAt: Date.UTC(2026, 9, 14, 10, 30), endsAt: Date.UTC(2026, 9, 14, 11, 30) }],
      db: fakeDb,
    });
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ source: "BLOCK", room: "C 201", reason: "Lehrveranstaltung" });
  });

  it("ignoriert eine nicht überlappende Sperrzeit", async () => {
    let selectCall = 0;
    const fakeDb = {
      select: () => {
        selectCall += 1;
        return selectCall === 1
          ? { from: () => ({ where: async () => [] }) }
          : { from: async () => [{ startsAt: "2026-10-14 10:00:00", endsAt: "2026-10-14 11:00:00", room: "C 201", location: "Campus Treskowallee", reason: null }] };
      },
    };
    const conflicts = await findColloquiumRoomConflicts({
      room: "C 201",
      location: "Campus Treskowallee",
      slots: [{ startsAt: Date.UTC(2026, 9, 14, 11, 0), endsAt: Date.UTC(2026, 9, 14, 12, 0) }],
      db: fakeDb,
    });
    expect(conflicts).toHaveLength(0);
  });
});
