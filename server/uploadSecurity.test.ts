import { describe, expect, it } from "vitest";
import { canAccessThesisRecord, hasExpectedFileSignature, isPdfBuffer } from "./uploadRoutes";

function file(mimetype: string, bytes: number[]): Express.Multer.File {
  return {
    fieldname: "file",
    originalname: "test",
    encoding: "7bit",
    mimetype,
    size: bytes.length,
    stream: undefined as never,
    destination: "",
    filename: "",
    path: "",
    buffer: Buffer.from(bytes),
  };
}

describe("Upload-Sicherheit", () => {
  it("akzeptiert nur PDFs mit gültiger Signatur", () => {
    expect(isPdfBuffer(Buffer.from("%PDF-1.7"))).toBe(true);
    expect(isPdfBuffer(Buffer.from("<html>not a pdf</html>"))).toBe(false);
  });

  it("weist einen vorgetäuschten Dateityp zurück", () => {
    expect(hasExpectedFileSignature(file("application/pdf", [0x3c, 0x68, 0x74, 0x6d, 0x6c]))).toBe(false);
    expect(hasExpectedFileSignature(file("image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
  });

  it("beschränkt Thesis-Dokumente auf Beteiligte und Verwaltung", () => {
    const thesis = { studentId: 11, firstExaminerId: 21, secondExaminerId: 31 };
    expect(canAccessThesisRecord({ id: 11, role: "student" }, thesis)).toBe(true);
    expect(canAccessThesisRecord({ id: 21, role: "examiner" }, thesis)).toBe(true);
    expect(canAccessThesisRecord({ id: 31, role: "second_examiner" }, thesis)).toBe(true);
    expect(canAccessThesisRecord({ id: 99, role: "examiner" }, thesis)).toBe(false);
    expect(canAccessThesisRecord({ id: 99, role: "admin" }, thesis)).toBe(true);
  });
});
