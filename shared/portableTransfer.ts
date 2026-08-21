import { createHash, randomBytes } from "crypto";

export const PORTABLE_TRANSFER_FORMAT = "htw-berlin-thesis-match-maker";
export const PORTABLE_TRANSFER_VERSION = 1;

export const PORTABLE_TRANSFER_SECTIONS = [
  "programmes",
  "users",
  "user_roles",
  "examiner_profiles",
  "examiner_departments",
  "examiner_topics",
  "examiner_programmes",
  "examiner_commission_preferences",
  "examiner_semester_capacities",
  "thesis_requests",
  "published_thesis_abstracts",
  "email_templates",
  "examiner_email_templates",
  "reminder_templates",
  "programme_semester_deadlines",
  "deadline_changes",
  "pav_programmes",
  "pav_examiner_proposals",
  "colloquiums",
  "colloquium_scheduling_polls",
  "colloquium_scheduling_participants",
  "colloquium_scheduling_slots",
  "colloquium_scheduling_responses",
  "conditional_documents",
  "conditional_document_comments",
  "examiner_comments",
  "audit_log",
] as const;

export type PortableTransferSection = (typeof PORTABLE_TRANSFER_SECTIONS)[number];

export type PortableTransferManifest = {
  format: typeof PORTABLE_TRANSFER_FORMAT;
  version: typeof PORTABLE_TRANSFER_VERSION;
  archiveId: string;
  createdAt: string;
  application: "Thesis Match Maker";
  checksumAlgorithm: "sha256";
  sections: Array<{ name: PortableTransferSection; rows: number; sha256: string }>;
  assets: Array<{ path: string; sourceKey: string; bytes: number; sha256: string; mimeType: string }>;
  exclusions: string[];
  warnings: string[];
};

export const TRANSFER_EXCLUSIONS = [
  "Passworthashes und Passwortzurücksetzungstoken",
  "TOTP-Geheimnisse, Wiederherstellungscodes und Zwei-Faktor-Sitzungsdaten",
  "SAML-Zuordnungen und externe OAuth-/Plattformkennungen",
  "aktive Einladungs-, Magic-Link- und Aktions-Token",
  "Login-IP-Adressen, User-Agent-Daten sowie reine Sitzungs- und Betriebsdaten",
  "SMTP-, S3-, Datenbank- und sonstige Infrastrukturgeheimnisse",
] as const;

export const SENSITIVE_USER_FIELDS = [
  "passwordHash",
  "twoFactorSecret",
  "twoFactorLastUsedStep",
  "samlSubject",
  "samlIssuer",
  "samlLinkedAt",
  "openId",
] as const;

const SENSITIVE_TOKEN_FIELDS = [
  "token",
  "actionToken",
  "studentInviteToken",
  "secondExaminerInviteToken",
  "scheduleCronTaskUid",
] as const;

export function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createArchiveId(): string {
  return `tmm-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${randomBytes(8).toString("hex")}`;
}

export function omitSensitiveTransferFields<T extends Record<string, unknown>>(row: T, section: string): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...row };
  if (section === "users") {
    for (const field of SENSITIVE_USER_FIELDS) delete copy[field];
    // Ein Passwortreset ist nach einem Import bewusst erforderlich.
    copy.loginMethod = "password";
    copy.twoFactorEnabled = 0;
    copy.twoFactorConfirmedAt = null;
  }
  for (const field of SENSITIVE_TOKEN_FIELDS) delete copy[field];
  return copy;
}

export function createPortableTransferManifest(input: Omit<PortableTransferManifest, "format" | "version" | "archiveId" | "createdAt" | "application" | "checksumAlgorithm">): PortableTransferManifest {
  return {
    format: PORTABLE_TRANSFER_FORMAT,
    version: PORTABLE_TRANSFER_VERSION,
    archiveId: createArchiveId(),
    createdAt: new Date().toISOString(),
    application: "Thesis Match Maker",
    checksumAlgorithm: "sha256",
    ...input,
  };
}

export function validatePortableTransferManifest(value: unknown): { valid: true; manifest: PortableTransferManifest } | { valid: false; error: string } {
  if (!value || typeof value !== "object") return { valid: false, error: "Manifest fehlt oder ist ungültig." };
  const manifest = value as Partial<PortableTransferManifest>;
  if (manifest.format !== PORTABLE_TRANSFER_FORMAT) return { valid: false, error: "Dieses Archiv gehört nicht zum Thesis Match Maker." };
  if (manifest.version !== PORTABLE_TRANSFER_VERSION) return { valid: false, error: `Nicht unterstützte Archivversion: ${String(manifest.version)}.` };
  if (!Array.isArray(manifest.sections) || !Array.isArray(manifest.assets) || !Array.isArray(manifest.exclusions)) {
    return { valid: false, error: "Das Transfermanifest ist unvollständig." };
  }
  return { valid: true, manifest: manifest as PortableTransferManifest };
}
