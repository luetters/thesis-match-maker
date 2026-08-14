import { describe, expect, it } from "vitest";
import { getSamlErrorInfo } from "../shared/samlErrorInfo";
import { buildSamlIntegrationGuidePdf } from "./samlGuidePdf";

describe("SAML-Fehlerhilfe", () => {
  it("liefert für eine fehlende Kontozuordnung einen verständlichen Registrierungshinweis", () => {
    const error = getSamlErrorInfo("saml_account_not_found");
    expect(error.title).toBe("Noch kein Portalkonto vorhanden");
    expect(error.showRegistrationHint).toBe(true);
  });

  it("verwendet für unbekannte Fehler einen sicheren allgemeinen Hinweis", () => {
    expect(getSamlErrorInfo("unbekannter-code").title).toBe("Anmeldung über HTW Berlin nicht möglich");
  });
});

describe("SAML-Integrationsleitfaden als PDF", () => {
  it("erzeugt ein nicht leeres PDF-Dokument mit PDF-Signatur", async () => {
    const pdf = await buildSamlIntegrationGuidePdf();
    expect(pdf.length).toBeGreaterThan(1_000);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
