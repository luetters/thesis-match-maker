import type { Response } from "express";
import { ZipArchive } from "archiver";
import { lookup as mimeLookup } from "mime-types";
import * as schema from "../drizzle/schema";
import { getDb } from "./db";
import { getStorageMode, localReadFile, s3ReadFile, storageGetSignedUrl } from "./storageLocal";
import { createPortableTransferManifest, omitSensitiveTransferFields, sha256, type PortableTransferManifest, type PortableTransferSection, TRANSFER_EXCLUSIONS } from "@shared/portableTransfer";

type AnyRow = Record<string, unknown>;

/** Nur fachliche Daten. Sitzungstoken, Geheimnisse und Betriebsdaten bleiben ausgeschlossen. */
const TRANSFER_TABLES: Array<{ name: PortableTransferSection; table: any }> = [
  { name: "programmes", table: schema.programmes },
  { name: "users", table: schema.users },
  { name: "user_roles", table: schema.userRoles },
  { name: "examiner_profiles", table: schema.examinerProfiles },
  { name: "examiner_departments", table: schema.examinerDepartments },
  { name: "examiner_topics", table: schema.examinerTopics },
  { name: "examiner_programmes", table: schema.examinerProgrammes },
  { name: "examiner_commission_preferences", table: schema.examinerCommissionPreferences },
  { name: "examiner_semester_capacities", table: schema.examinerSemesterCapacities },
  { name: "thesis_requests", table: schema.thesisRequests },
  { name: "published_thesis_abstracts", table: schema.publishedThesisAbstracts },
  { name: "email_templates", table: schema.emailTemplates },
  { name: "examiner_email_templates", table: schema.examinerEmailTemplates },
  { name: "reminder_templates", table: schema.reminderTemplates },
  { name: "programme_semester_deadlines", table: schema.programmeSemesterDeadlines },
  { name: "deadline_changes", table: schema.deadlineChanges },
  { name: "pav_programmes", table: schema.pavProgrammes },
  { name: "pav_examiner_proposals", table: schema.pavExaminerProposals },
  { name: "colloquiums", table: schema.colloquiums },
  { name: "colloquium_scheduling_polls", table: schema.colloquiumSchedulingPolls },
  { name: "colloquium_scheduling_participants", table: schema.colloquiumSchedulingParticipants },
  { name: "colloquium_scheduling_slots", table: schema.colloquiumSchedulingSlots },
  { name: "colloquium_scheduling_responses", table: schema.colloquiumSchedulingResponses },
  { name: "conditional_documents", table: schema.conditionalDocuments },
  { name: "conditional_document_comments", table: schema.conditionalDocumentComments },
  { name: "examiner_comments", table: schema.examinerComments },
  { name: "audit_log", table: schema.auditLog },
];

function collectAssetKeys(records: Map<string, AnyRow[]>): string[] {
  const keys = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === "string" && value.trim().length > 0 && value.length <= 1024) keys.add(value);
  };
  for (const row of records.get("users") ?? []) { add(row.avatarKey); add(row.bannerImageKey); }
  for (const row of records.get("examiner_profiles") ?? []) add(row.photoKey);
  for (const row of records.get("thesis_requests") ?? []) add(row.exposeKey);
  for (const row of records.get("conditional_documents") ?? []) add(row.storageKey);
  return Array.from(keys);
}

async function readStorageAsset(key: string): Promise<{ data: Buffer; exists: boolean }> {
  const mode = getStorageMode();
  if (mode === "local") return localReadFile(key);
  if (mode === "s3") return s3ReadFile(key);
  const signedUrl = await storageGetSignedUrl(key);
  const response = await fetch(signedUrl);
  if (!response.ok) return { data: Buffer.alloc(0), exists: false };
  return { data: Buffer.from(await response.arrayBuffer()), exists: true };
}

export type PortableTransferSummary = Pick<PortableTransferManifest, "archiveId" | "createdAt" | "sections" | "assets" | "warnings">;

/**
 * Streamt ein portables ZIP direkt an die Antwort. Es wird kein Archiv auf dem
 * Server abgelegt; der Export ist ausschließlich für Superadmins bestimmt.
 */
export async function streamPortableTransferArchive(res: Response): Promise<PortableTransferSummary> {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar.");

  const records = new Map<string, AnyRow[]>();
  const sections: PortableTransferManifest["sections"] = [];
  const warnings: string[] = [];

  for (const { name, table } of TRANSFER_TABLES) {
    const rawRows = await db.select().from(table as any) as AnyRow[];
    const rows = rawRows.map((row) => omitSensitiveTransferFields(row, name));
    records.set(name, rows);
    const payload = Buffer.from(JSON.stringify(rows));
    sections.push({ name, rows: rows.length, sha256: sha256(payload) });
  }

  const assetKeys = collectAssetKeys(records);
  const assets: PortableTransferManifest["assets"] = [];
  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on("warning", (error: Error) => warnings.push(`Archivwarnung: ${error.message}`));
  archive.on("error", (error: Error) => { throw error; });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Disposition", `attachment; filename="thesis-match-maker-datenexport-${new Date().toISOString().slice(0, 10)}.zip"`);
  archive.pipe(res);

  for (const section of sections) {
    archive.append(JSON.stringify(records.get(section.name) ?? []), { name: `records/${section.name}.json` });
  }

  for (const key of assetKeys) {
    try {
      const result = await readStorageAsset(key);
      if (!result.exists) {
        warnings.push(`Datei nicht lesbar und nicht exportiert: ${key}`);
        continue;
      }
      const path = `assets/${key.replace(/^\/+/, "")}`;
      const mimeType = mimeLookup(key) || "application/octet-stream";
      assets.push({ path, sourceKey: key, bytes: result.data.length, sha256: sha256(result.data), mimeType });
      archive.append(result.data, { name: path });
    } catch (error) {
      warnings.push(`Datei konnte nicht exportiert werden: ${key} (${error instanceof Error ? error.message : "unbekannter Fehler"})`);
    }
  }

  const manifest = createPortableTransferManifest({ sections, assets, exclusions: [...TRANSFER_EXCLUSIONS], warnings });
  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
  archive.append([
    "# Portabler Datenexport – Thesis Match Maker",
    `Archiv-ID: ${manifest.archiveId}`,
    `Erstellt: ${manifest.createdAt}`,
    "",
    "Dieses Archiv enthält nur fachliche Portal- und Dateidaten.",
    "Passwörter, Zwei-Faktor-Geheimnisse, Sitzungen, Tokens und Infrastrukturgeheimnisse sind ausgeschlossen.",
    "Ein Import ist ausschließlich nach erfolgreicher Vorschauprüfung und expliziter Superadmin-Freigabe zulässig.",
  ].join("\n"), { name: "README.md" });

  await archive.finalize();
  return { archiveId: manifest.archiveId, createdAt: manifest.createdAt, sections, assets, warnings };
}
