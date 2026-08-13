import { describe, expect, it } from "vitest";
import { getRegistrationApprovalNotice } from "./registrationApprovalNotice";

describe("getRegistrationApprovalNotice", () => {
  it("leitet Verwaltungsanmeldungen ausschließlich an die Superadmin-Freigabe", () => {
    const notice = getRegistrationApprovalNotice("admin");
    expect(notice.dashboardPath).toBe("/superadmin");
    expect(notice.subjectPrefix).toBe("Neue Verwaltungsanmeldung");
    expect(notice.instruction).toContain("ausschließlich durch einen Superadmin");
  });

  it("verwendet für reguläre Rollen die Verwaltungsfreigabe", () => {
    const notice = getRegistrationApprovalNotice("examiner");
    expect(notice.dashboardPath).toBe("/admin");
    expect(notice.subjectPrefix).toBe("Neue Registrierung");
  });
});
