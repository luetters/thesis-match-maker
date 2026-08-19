import { describe, expect, it } from "vitest";
import { colloquiumSchedulingRouter } from "./routers/colloquiumSchedulingRouter";

describe("Kolloquiums-Terminabstimmungsrouter", () => {
  it("stellt alle bisherigen Verfahren unter einem geschlossenen Fachrouter bereit", () => {
    expect(Object.keys(colloquiumSchedulingRouter._def.procedures).sort()).toEqual([
      "byId",
      "cancel",
      "confirm",
      "create",
      "myPolls",
      "respond",
      "roomConflicts",
      "selectSlot",
    ]);
  });
});
