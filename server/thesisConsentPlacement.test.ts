import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), "utf8");

describe("fallbezogene Einwilligungen", () => {
  it("nimmt im Registrierungsvertrag keine Einwilligungen mehr entgegen", () => {
    const router = readProjectFile("server/routers.ts");
    const registrationContract = router.slice(router.indexOf("register: publicProcedure"), router.indexOf("loginWithPassword: publicProcedure"));

    expect(registrationContract).not.toContain("plagiarismConsent");
    expect(registrationContract).not.toContain("aiReviewConsent");
  });

  it("verarbeitet Einwilligungen im Thesis-Antrag und dokumentiert sie fallbezogen", () => {
    const router = readProjectFile("server/routers.ts");
    const studentForm = readProjectFile("client/src/pages/StudentDashboard.tsx");
    const documentGenerator = readProjectFile("server/thesisRegistrationDocument.ts");

    expect(router).toContain("getThesisConsentFlags(input.plagiarismConsent, input.aiReviewConsent)");
    expect(studentForm).toContain("plagiarismConsent: form.plagiarismConsent");
    expect(studentForm).toContain("aiReviewConsent: form.aiReviewConsent");
    expect(documentGenerator).toContain("(thesis as any).plagiarismConsent");
    expect(documentGenerator).not.toContain("(student as any).plagiarismConsent");
  });
});
