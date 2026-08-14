import { SAML, ValidateInResponseTo, type Profile } from "@node-saml/node-saml";

export const SAML_SETTING_KEYS = {
  enabled: "samlEnabled",
  idpEntryPoint: "samlIdpEntryPoint",
  idpIssuer: "samlIdpIssuer",
  idpCertificate: "samlIdpCertificate",
  spEntityId: "samlSpEntityId",
  acsUrl: "samlAcsUrl",
  emailAttribute: "samlEmailAttribute",
  givenNameAttribute: "samlGivenNameAttribute",
  surnameAttribute: "samlSurnameAttribute",
} as const;

export type SamlConfiguration = {
  enabled: boolean;
  idpEntryPoint: string;
  idpIssuer: string;
  idpCertificate: string;
  spEntityId: string;
  acsUrl: string;
  emailAttribute: string;
  givenNameAttribute: string;
  surnameAttribute: string;
};

const DEFAULT_CONFIGURATION: SamlConfiguration = {
  enabled: false,
  idpEntryPoint: "",
  idpIssuer: "",
  idpCertificate: "",
  spEntityId: "https://thesis.htw-berlin.com/saml/metadata",
  acsUrl: "https://thesis.htw-berlin.com/api/auth/saml/acs",
  emailAttribute: "mail",
  givenNameAttribute: "givenName",
  surnameAttribute: "sn",
};

const requestCache = new Map<string, { value: string; createdAt: number }>();
const requestIdCacheProvider = {
  async saveAsync(key: string, value: string) {
    const item = { value, createdAt: Date.now() };
    requestCache.set(key, item);
    return item;
  },
  async getAsync(key: string) {
    const item = requestCache.get(key);
    if (!item || Date.now() - item.createdAt > 5 * 60 * 1000) {
      requestCache.delete(key);
      return null;
    }
    return item.value;
  },
  async removeAsync(key: string | null) {
    if (!key) return null;
    const item = requestCache.get(key);
    requestCache.delete(key);
    return item?.value ?? null;
  },
};

export function parseSamlConfiguration(settings: Record<string, string | undefined>): SamlConfiguration {
  return {
    enabled: settings[SAML_SETTING_KEYS.enabled] === "true",
    idpEntryPoint: settings[SAML_SETTING_KEYS.idpEntryPoint]?.trim() || DEFAULT_CONFIGURATION.idpEntryPoint,
    idpIssuer: settings[SAML_SETTING_KEYS.idpIssuer]?.trim() || DEFAULT_CONFIGURATION.idpIssuer,
    idpCertificate: settings[SAML_SETTING_KEYS.idpCertificate]?.trim() || DEFAULT_CONFIGURATION.idpCertificate,
    spEntityId: settings[SAML_SETTING_KEYS.spEntityId]?.trim() || DEFAULT_CONFIGURATION.spEntityId,
    acsUrl: settings[SAML_SETTING_KEYS.acsUrl]?.trim() || DEFAULT_CONFIGURATION.acsUrl,
    emailAttribute: settings[SAML_SETTING_KEYS.emailAttribute]?.trim() || DEFAULT_CONFIGURATION.emailAttribute,
    givenNameAttribute: settings[SAML_SETTING_KEYS.givenNameAttribute]?.trim() || DEFAULT_CONFIGURATION.givenNameAttribute,
    surnameAttribute: settings[SAML_SETTING_KEYS.surnameAttribute]?.trim() || DEFAULT_CONFIGURATION.surnameAttribute,
  };
}

export function getSamlConfigurationIssues(configuration: SamlConfiguration): string[] {
  const issues: string[] = [];
  if (!configuration.idpEntryPoint.startsWith("https://")) issues.push("Die SSO-URL des Identity Providers muss eine HTTPS-URL sein.");
  if (!configuration.idpIssuer) issues.push("Die Entity ID des Identity Providers fehlt.");
  if (!configuration.idpCertificate.includes("BEGIN CERTIFICATE")) issues.push("Das X.509-Signaturzertifikat des Identity Providers fehlt oder ist ungültig.");
  if (!configuration.spEntityId.startsWith("https://")) issues.push("Die Service-Provider-Entity-ID muss eine HTTPS-URI sein.");
  if (!configuration.acsUrl.startsWith("https://")) issues.push("Die ACS-URL muss eine HTTPS-URL sein.");
  return issues;
}

export function isSamlConfigurationReady(configuration: SamlConfiguration): boolean {
  return getSamlConfigurationIssues(configuration).length === 0;
}

export function createSamlClient(configuration: SamlConfiguration): SAML {
  const issues = getSamlConfigurationIssues(configuration);
  if (issues.length > 0) throw new Error(issues.join(" "));

  return new SAML({
    issuer: configuration.spEntityId,
    callbackUrl: configuration.acsUrl,
    entryPoint: configuration.idpEntryPoint,
    idpIssuer: configuration.idpIssuer,
    idpCert: configuration.idpCertificate,
    identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified",
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: true,
    validateInResponseTo: ValidateInResponseTo.always,
    requestIdExpirationPeriodMs: 5 * 60 * 1000,
    cacheProvider: requestIdCacheProvider,
    disableRequestedAuthnContext: true,
  });
}

function getProfileString(profile: Profile, attribute: string): string | null {
  const value = profile[attribute];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) return value[0].trim();
  return null;
}

export function getSamlProfileIdentity(profile: Profile, configuration: SamlConfiguration) {
  const email = getProfileString(profile, configuration.emailAttribute) ?? profile.email ?? profile.mail ?? profile["urn:oid:0.9.2342.19200300.100.1.3"];
  const givenName = getProfileString(profile, configuration.givenNameAttribute);
  const surname = getProfileString(profile, configuration.surnameAttribute);
  return {
    subject: profile.nameID?.trim() || null,
    issuer: profile.issuer?.trim() || configuration.idpIssuer,
    email: typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null,
    givenName,
    surname,
  };
}

export function getSafeSamlReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
