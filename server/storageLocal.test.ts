import { describe, expect, it } from "vitest";
import { createSafeStorageDiagnostics } from "./storageLocal";

describe("sichere Speicherdiagnosen", () => {
  it("ordnet Berechtigungsfehler einer konkreten, aber geheimnisfreien Maßnahme zu", () => {
    const diagnostics = createSafeStorageDiagnostics({
      name: "AccessDenied",
      message: "AccessDenied: secret=top-secret-value",
      $metadata: { httpStatusCode: 403 },
    });
    expect(diagnostics[0]).toMatchObject({
      title: "Zugriff auf den S3-Speicher verweigert",
      statusCode: 403,
    });
    expect(diagnostics[0]?.detail).not.toContain("top-secret-value");
    expect(diagnostics[0]?.action).toContain("Access Key");
  });

  it("ordnet Netzwerkfehler einer Endpunkt- und Firewall-Prüfung zu", () => {
    const diagnostics = createSafeStorageDiagnostics({ code: "ENOTFOUND", message: "getaddrinfo ENOTFOUND storage.example.invalid" });
    expect(diagnostics[0]).toMatchObject({ title: "S3-Endpunkt nicht erreichbar" });
    expect(diagnostics[0]?.action).toContain("Firewall");
  });
});
