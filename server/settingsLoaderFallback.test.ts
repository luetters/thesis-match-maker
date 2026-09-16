import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync(
  resolve(import.meta.dirname, "../client/src/pages/SuperadminDashboard.tsx"),
  "utf8",
);

describe("Superadmin-Einstellungen", () => {
  it("zeigt bei einem fehlgeschlagenen Abruf einen Fehlerzustand mit Wiederholungsaktion statt eines Endlos-Loaders", () => {
    expect(dashboard).toContain("isError, error, refetch");
    expect(dashboard).toContain("Einstellungen momentan nicht verfügbar");
    expect(dashboard).toContain('role="alert"');
    expect(dashboard).toContain("Erneut laden");
    expect(dashboard).toContain("isLoading || (settings && !form)");
  });
});
