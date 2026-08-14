import { describe, expect, it } from "vitest";
import { getSafeSamlReturnTo, getSamlConfigurationIssues, getSamlProfileIdentity, isSamlConfigurationReady, parseSamlConfiguration } from "./samlAuth";

describe("optionale SAML-2.0-Anmeldung", () => {
  const readyConfiguration = parseSamlConfiguration({
    samlEnabled: "true",
    samlIdpEntryPoint: "https://weblogin.htw-berlin.de/idp/profile/SAML2/Redirect/SSO",
    samlIdpIssuer: "https://weblogin.htw-berlin.de/idp/shibboleth",
    samlIdpCertificate: "-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----",
    samlSpEntityId: "https://thesis.htw-berlin.com/saml/metadata",
    samlAcsUrl: "https://thesis.htw-berlin.com/api/auth/saml/acs",
    samlEmailAttribute: "mail",
    samlGivenNameAttribute: "givenName",
    samlSurnameAttribute: "sn",
  });

  it("ist standardmäßig deaktiviert und verwendet die produktiven Service-Provider-URLs", () => {
    const configuration = parseSamlConfiguration({});
    expect(configuration.enabled).toBe(false);
    expect(configuration.spEntityId).toBe("https://thesis.htw-berlin.com/saml/metadata");
    expect(configuration.acsUrl).toBe("https://thesis.htw-berlin.com/api/auth/saml/acs");
  });

  it("lässt die Aktivierung nur mit HTTPS-Endpunkten, IdP-Kennung und Zertifikat zu", () => {
    expect(isSamlConfigurationReady(readyConfiguration)).toBe(true);
    expect(getSamlConfigurationIssues({ ...readyConfiguration, idpCertificate: "" })).toContain("Das X.509-Signaturzertifikat des Identity Providers fehlt oder ist ungültig.");
    expect(getSamlConfigurationIssues({ ...readyConfiguration, acsUrl: "http://thesis.htw-berlin.com/api/auth/saml/acs" })).toContain("Die ACS-URL muss eine HTTPS-URL sein.");
  });

  it("ordnet die SAML-Attribute einer eindeutigen lokalen Identität zu", () => {
    const identity = getSamlProfileIdentity({
      issuer: "https://weblogin.htw-berlin.de/idp/shibboleth",
      nameID: "abc-123",
      nameIDFormat: "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent",
      mail: "Vorname.Nachname@HTW-Berlin.de",
      givenName: "Vorname",
      sn: "Nachname",
    }, readyConfiguration);

    expect(identity).toMatchObject({
      issuer: "https://weblogin.htw-berlin.de/idp/shibboleth",
      subject: "abc-123",
      email: "vorname.nachname@htw-berlin.de",
      givenName: "Vorname",
      surname: "Nachname",
    });
  });

  it("verhindert offene Weiterleitungen nach der SAML-Anmeldung", () => {
    expect(getSafeSamlReturnTo("/examiner")).toBe("/examiner");
    expect(getSafeSamlReturnTo("https://example.org")).toBe("/");
    expect(getSafeSamlReturnTo("//example.org")).toBe("/");
  });
});
