import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), "utf8");

describe("Superadmin-Sichtwechsel mit einem Konto", () => {
  it("wechselt zwischen den drei Fachansichten, ohne die Superadmin-Datenbankrolle zu überschreiben", () => {
    const switcher = readProjectFile("client/src/components/RoleSwitcher.tsx");
    const database = readProjectFile("server/db.ts");
    const examinerDashboard = readProjectFile("client/src/pages/ExaminerDashboard.tsx");
    const routers = readProjectFile("server/routers.ts");

    expect(switcher).toContain('admin: "/admin"');
    expect(switcher).toContain('examiner: "/examiner"');
    expect(switcher).toContain('student: "/student"');
    expect(switcher).toContain("previousView: currentRole");
    expect(switcher).not.toContain("window.location.reload()");
    expect(database).toContain('Die Datenbankrolle bleibt bewusst "superadmin"');
    expect(examinerDashboard).toContain('if (!hasRole("superadmin") && (hasRole("examiner") || hasRole("second_examiner"))');
    expect(routers).toContain('!userHasRole(ctx.user, "superadmin")');
  });
});
