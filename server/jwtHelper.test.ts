import { describe, expect, it } from "vitest";
import { signExaminerActionToken, verifyExaminerActionToken, type ExaminerActionPayload } from "./jwtHelper";

const samplePayload: ExaminerActionPayload = {
  thesisRequestId: 42,
  examinerId: 7,
  action: "accept",
  studentName: "Max Mustermann",
  thesisTitle: "KI-gestützte Analyse von Kundenfeedback",
};

describe("JWT-Helfer: signExaminerActionToken / verifyExaminerActionToken", () => {
  it("signiert und verifiziert einen gültigen Token", async () => {
    const token = await signExaminerActionToken(samplePayload);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // Header.Payload.Signature

    const verified = await verifyExaminerActionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.thesisRequestId).toBe(42);
    expect(verified?.examinerId).toBe(7);
    expect(verified?.action).toBe("accept");
    expect(verified?.studentName).toBe("Max Mustermann");
    expect(verified?.thesisTitle).toBe("KI-gestützte Analyse von Kundenfeedback");
  });

  it("gibt null für einen ungültigen Token zurück", async () => {
    const result = await verifyExaminerActionToken("ungültiger.token.wert");
    expect(result).toBeNull();
  });

  it("gibt null für einen manipulierten Token zurück", async () => {
    const token = await signExaminerActionToken(samplePayload);
    const parts = token.split(".");
    // Manipuliere die Signatur
    const tampered = `${parts[0]}.${parts[1]}.invalidSignature`;
    const result = await verifyExaminerActionToken(tampered);
    expect(result).toBeNull();
  });

  it("gibt null für einen leeren String zurück", async () => {
    const result = await verifyExaminerActionToken("");
    expect(result).toBeNull();
  });

  it("signiert reject-Aktion korrekt", async () => {
    const rejectPayload: ExaminerActionPayload = {
      ...samplePayload,
      action: "reject",
    };
    const token = await signExaminerActionToken(rejectPayload);
    const verified = await verifyExaminerActionToken(token);
    expect(verified?.action).toBe("reject");
  });

  it("verschiedene thesisRequestIds erzeugen verschiedene Tokens", async () => {
    const token1 = await signExaminerActionToken({ ...samplePayload, thesisRequestId: 1 });
    const token2 = await signExaminerActionToken({ ...samplePayload, thesisRequestId: 2 });
    expect(token1).not.toBe(token2);
  });
});
