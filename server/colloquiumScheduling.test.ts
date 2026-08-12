import { describe, expect, it } from "vitest";
import { derivePollStatus, hasThreeWayConfirmation } from "./colloquiumScheduling";

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
