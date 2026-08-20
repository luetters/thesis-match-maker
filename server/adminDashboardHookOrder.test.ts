import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Verwaltungsdashboard: stabile Hook-Reihenfolge", () => {
  it("ruft Navigations- und Abfragehooks vor der Zugriffs-Rückgabe auf", () => {
    const source = readFileSync(resolve(process.cwd(), "client", "src", "pages", "AdminDashboard.tsx"), "utf8");
    const component = source.slice(source.indexOf("export default function AdminDashboard"));
    const queryIndex = component.indexOf("trpc.roleApproval.getPending.useQuery");
    const navHookIndex = component.indexOf("const navItems = useNavItems");
    const accessReturnIndex = component.indexOf("if (user && !canAccessAdmin) return null;");

    expect(queryIndex).toBeGreaterThan(-1);
    expect(navHookIndex).toBeGreaterThan(-1);
    expect(accessReturnIndex).toBeGreaterThan(-1);
    expect(queryIndex).toBeLessThan(accessReturnIndex);
    expect(navHookIndex).toBeLessThan(accessReturnIndex);
  });

  it("deaktiviert die geschützte Abfrage bis die Verwaltungsberechtigung feststeht", () => {
    const source = readFileSync(resolve(process.cwd(), "client", "src", "pages", "AdminDashboard.tsx"), "utf8");
    expect(source).toContain("const canAccessAdmin = Boolean(user && (hasRole(\"admin\") || hasRole(\"superadmin\")))");
    expect(source).toContain("enabled: canAccessAdmin");
    expect(source).toContain("refetchInterval: canAccessAdmin ? 60000 : false");
  });
});
