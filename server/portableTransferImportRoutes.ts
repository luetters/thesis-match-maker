import type { Express, Request, Response } from "express";
import multer from "multer";
import unzipper from "unzipper";
import { unlink } from "fs/promises";
import { timingSafeEqual } from "crypto";
import { jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { getDb, getUserByOpenId, getUserRoles } from "./db";
import { sha256, validatePortableTransferManifest, type PortableTransferManifest } from "@shared/portableTransfer";
import * as schema from "../drizzle/schema";
import { storagePut } from "./storageLocal";
import { basename } from "path";

const MAX_TRANSFER_ARCHIVE_BYTES = 128 * 1024 * 1024;
const MAX_TRANSFER_ARCHIVE_ENTRIES = 10_000;
const MAX_TRANSFER_UNCOMPRESSED_BYTES = 512 * 1024 * 1024;

const importUpload = multer({
  dest: "/tmp/thesis-match-maker-transfer-imports",
  limits: { fileSize: MAX_TRANSFER_ARCHIVE_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!["application/zip", "application/x-zip-compressed", "application/octet-stream"].includes(file.mimetype)) {
      callback(new Error("Nur ZIP-Transferarchive sind zulässig."));
      return;
    }
    callback(null, true);
  },
});

async function getSuperadminRequest(req: Request): Promise<{ id: number; role: string } | null> {
  try {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;
    const token = parseCookieHeader(cookieHeader)[COOKIE_NAME];
    if (!token) return null;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    const openId = payload.openId as string | undefined;
    if (!openId) return null;
    const user = await getUserByOpenId(openId);
    if (!user) return null;
    const roles = await getUserRoles(user.id);
    return user.role === "superadmin" || roles.includes("superadmin") ? { id: user.id, role: user.role } : null;
  } catch {
    return null;
  }
}

export function safeArchivePath(path: string): boolean {
  const normalized = String(path ?? "").replace(/\\/g, "/");
  const segments = normalized.split("/");
  return Boolean(normalized)
    && !normalized.startsWith("/")
    && !normalized.includes("\0")
    && normalized.length <= 2048
    && segments.every((segment) => segment && segment !== "." && segment !== "..");
}

export function assertSafeArchiveEntries(entries: Array<{ path: string; uncompressedSize?: number | null }>): void {
  if (entries.length > MAX_TRANSFER_ARCHIVE_ENTRIES) {
    throw new Error("Das Transferarchiv enthält zu viele Dateien.");
  }
  let totalUncompressedBytes = 0;
  for (const entry of entries) {
    if (!safeArchivePath(entry.path)) throw new Error("Das Archiv enthält einen unzulässigen Dateipfad.");
    const size = Number(entry.uncompressedSize ?? 0);
    if (!Number.isSafeInteger(size) || size < 0) throw new Error("Das Transferarchiv enthält eine ungültige Dateigröße.");
    totalUncompressedBytes += size;
    if (totalUncompressedBytes > MAX_TRANSFER_UNCOMPRESSED_BYTES) {
      throw new Error("Das Transferarchiv ist nach dem Entpacken zu groß.");
    }
  }
}

function matchesImportToken(providedToken: string, expectedToken: string | undefined): boolean {
  return Boolean(expectedToken)
    && Buffer.byteLength(providedToken) === Buffer.byteLength(expectedToken!)
    && timingSafeEqual(Buffer.from(providedToken), Buffer.from(expectedToken!));
}

export type PortableTransferPreview = {
  manifest: PortableTransferManifest;
  records: Array<{ name: string; rows: number; sha256Valid: boolean }>;
  assetFiles: number;
  totalAssetBytes: number;
  valid: boolean;
  errors: string[];
};

export async function previewPortableTransferArchive(filePath: string): Promise<PortableTransferPreview> {
  const directory = await unzipper.Open.file(filePath);
  assertSafeArchiveEntries(directory.files);
  const manifestEntry = directory.files.find((file) => file.path === "manifest.json");
  if (!manifestEntry) throw new Error("Das Transfermanifest fehlt.");
  const parsed = validatePortableTransferManifest(JSON.parse((await manifestEntry.buffer()).toString("utf8")));
  if (!parsed.valid) throw new Error(parsed.error);
  const manifest = parsed.manifest;
  const errors: string[] = [];
  const records = [] as PortableTransferPreview["records"];

  for (const section of manifest.sections) {
    const entry = directory.files.find((file) => file.path === `records/${section.name}.json`);
    if (!entry) {
      errors.push(`Datensektion fehlt: ${section.name}`);
      records.push({ name: section.name, rows: 0, sha256Valid: false });
      continue;
    }
    const data = await entry.buffer();
    let rows: unknown;
    try { rows = JSON.parse(data.toString("utf8")); } catch { rows = null; }
    const validRows = Array.isArray(rows) && rows.length === section.rows;
    const sha256Valid = sha256(data) === section.sha256;
    if (!validRows) errors.push(`Ungültige Zeilenzahl in ${section.name}`);
    if (!sha256Valid) errors.push(`Prüfsumme stimmt nicht überein: ${section.name}`);
    records.push({ name: section.name, rows: Array.isArray(rows) ? rows.length : 0, sha256Valid });
  }

  const assetEntries = directory.files.filter((file) => file.path.startsWith("assets/") && !file.type.includes("Directory"));
  const totalAssetBytes = assetEntries.reduce((sum, file) => sum + (file.uncompressedSize ?? 0), 0);
  const valid = errors.length === 0 && assetEntries.length === manifest.assets.length;
  if (assetEntries.length !== manifest.assets.length) errors.push("Die Anzahl der Dateien stimmt nicht mit dem Manifest überein.");
  return { manifest, records, assetFiles: assetEntries.length, totalAssetBytes, valid, errors };
}

const IMPORT_TABLES: Record<string, any> = {
  programmes: schema.programmes, users: schema.users, user_roles: schema.userRoles,
  examiner_profiles: schema.examinerProfiles, examiner_departments: schema.examinerDepartments,
  examiner_topics: schema.examinerTopics, examiner_programmes: schema.examinerProgrammes,
  examiner_commission_preferences: schema.examinerCommissionPreferences, examiner_semester_capacities: schema.examinerSemesterCapacities,
  thesis_requests: schema.thesisRequests, published_thesis_abstracts: schema.publishedThesisAbstracts,
  email_templates: schema.emailTemplates, examiner_email_templates: schema.examinerEmailTemplates,
  reminder_templates: schema.reminderTemplates, programme_semester_deadlines: schema.programmeSemesterDeadlines,
  deadline_changes: schema.deadlineChanges, pav_programmes: schema.pavProgrammes, pav_examiner_proposals: schema.pavExaminerProposals,
  colloquiums: schema.colloquiums, colloquium_scheduling_polls: schema.colloquiumSchedulingPolls,
  colloquium_scheduling_participants: schema.colloquiumSchedulingParticipants, colloquium_scheduling_slots: schema.colloquiumSchedulingSlots,
  colloquium_scheduling_responses: schema.colloquiumSchedulingResponses, conditional_documents: schema.conditionalDocuments,
  conditional_document_comments: schema.conditionalDocumentComments, examiner_comments: schema.examinerComments, audit_log: schema.auditLog,
};

const IMPORT_ORDER = ["programmes", "users", "user_roles", "examiner_profiles", "examiner_departments", "examiner_topics", "examiner_programmes", "examiner_commission_preferences", "examiner_semester_capacities", "thesis_requests", "published_thesis_abstracts", "email_templates", "examiner_email_templates", "reminder_templates", "programme_semester_deadlines", "deadline_changes", "pav_programmes", "pav_examiner_proposals", "colloquiums", "colloquium_scheduling_polls", "colloquium_scheduling_participants", "colloquium_scheduling_slots", "colloquium_scheduling_responses", "conditional_documents", "conditional_document_comments", "examiner_comments", "audit_log"];

function assetFields(section: string): string[] {
  return section === "users" ? ["avatarKey", "bannerImageKey"] : section === "examiner_profiles" ? ["photoKey"] : section === "thesis_requests" ? ["exposeKey"] : section === "conditional_documents" ? ["storageKey"] : [];
}

export async function importPortableTransferArchive(filePath: string, actor: { id: number | null; role: string }) {
  const preview = await previewPortableTransferArchive(filePath);
  if (!preview.valid) throw new Error(`Der Import wurde blockiert: ${preview.errors.join(" ")}`);
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar.");
  const [users, requests] = await Promise.all([db.select().from(schema.users), db.select().from(schema.thesisRequests)]);
  if (users.length > 0 || requests.length > 0) throw new Error("Der Import ist nur in eine leere Zielumgebung zulässig.");
  const directory = await unzipper.Open.file(filePath);
  const entries = new Map(directory.files.map((entry) => [entry.path, entry]));
  const assets = new Map<string, { key: string; url: string }>();
  for (const asset of preview.manifest.assets) {
    const entry = entries.get(asset.path);
    if (!entry) throw new Error(`Datei fehlt: ${asset.path}`);
    const data = await entry.buffer();
    if (sha256(data) !== asset.sha256) throw new Error(`Dateiprüfsumme stimmt nicht: ${asset.sourceKey}`);
    assets.set(asset.sourceKey, await storagePut(`portable-import/${preview.manifest.archiveId}/${basename(asset.sourceKey)}`, data, asset.mimeType));
  }
  let importedRows = 0;
  await db.transaction(async (tx) => {
    for (const name of IMPORT_ORDER) {
      const entry = entries.get(`records/${name}.json`);
      if (!entry) continue;
      const rows = JSON.parse((await entry.buffer()).toString("utf8")) as Array<Record<string, unknown>>;
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const prepared = rows.map((row) => {
        const copy = { ...row } as Record<string, unknown>;
        if (name === "users") {
          copy.openId = `portable-${preview.manifest.archiveId}-${String(copy.id)}`.slice(0, 64);
          copy.passwordHash = null;
          copy.loginMethod = "password";
        }
        for (const field of assetFields(name)) {
          const imported = typeof copy[field] === "string" ? assets.get(copy[field] as string) : undefined;
          if (imported) copy[field] = imported.key;
        }
        return copy;
      });
      await tx.insert(IMPORT_TABLES[name]).values(prepared as any);
      importedRows += prepared.length;
    }
  });
  await db.insert(schema.auditLog).values({
    actorId: actor.id,
    actorRole: actor.role,
    action: "PORTABLE_TRANSFER_IMPORT_COMPLETED",
    metadata: { archiveId: preview.manifest.archiveId, importedRows, importedAssets: assets.size, passwordResetRequired: true },
  });
  return { archiveId: preview.manifest.archiveId, importedRows, importedAssets: assets.size, passwordResetRequired: true };
}

export function registerPortableTransferImportRoutes(app: Express) {
  app.post("/api/admin/portable-transfer/preview", (req, res, next) => {
    if (req.headers["x-thesis-transfer-confirmation"] !== "VORSCHAU") return res.status(400).json({ error: "Eine ausdrückliche Vorschaufreigabe fehlt." });
    importUpload.single("archive")(req, res, (error) => {
      if (error) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: error.message });
      next();
    });
  }, async (req: Request, res: Response) => {
    if (!(await getSuperadminRequest(req))) return res.status(403).json({ error: "Nur Superadmins dürfen Transferarchive prüfen." });
    if (!req.file) return res.status(400).json({ error: "Kein Transferarchiv übermittelt." });
    try {
      const preview = await previewPortableTransferArchive(req.file.path);
      return res.json(preview);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Das Transferarchiv ist ungültig." });
    } finally {
      await unlink(req.file.path).catch(() => undefined);
    }
  });

  app.post("/api/admin/portable-transfer/import", (req, res, next) => {
    const importToken = process.env.TRANSFER_IMPORT_TOKEN;
    const providedToken = typeof req.headers["x-thesis-transfer-token"] === "string" ? req.headers["x-thesis-transfer-token"] : "";
    if (req.headers["x-thesis-transfer-confirmation"] !== "IMPORTIEREN" || !matchesImportToken(providedToken, importToken)) {
      return res.status(400).json({ error: "Die finale Importfreigabe oder der Import-Schlüssel fehlt." });
    }
    importUpload.single("archive")(req, res, (error) => {
      if (error) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: error.message });
      next();
    });
  }, async (req: Request, res: Response) => {
    const actor = await getSuperadminRequest(req);
    if (!actor) return res.status(403).json({ error: "Nur Superadmins dürfen Daten importieren." });
    if (!req.file) return res.status(400).json({ error: "Kein Transferarchiv übermittelt." });
    try {
      return res.json({ success: true, ...(await importPortableTransferArchive(req.file.path, actor)) });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Der Import wurde abgebrochen." });
    } finally {
      await unlink(req.file.path).catch(() => undefined);
    }
  });

  app.post("/api/bootstrap/portable-transfer/import", (req, res, next) => {
    const remoteAddress = req.socket.remoteAddress ?? "";
    const isLoopback = remoteAddress === "127.0.0.1" || remoteAddress === "::1" || remoteAddress === "::ffff:127.0.0.1";
    const expectedToken = process.env.TRANSFER_IMPORT_TOKEN;
    const providedToken = typeof req.headers["x-thesis-transfer-token"] === "string" ? req.headers["x-thesis-transfer-token"] : "";
    const tokenMatches = matchesImportToken(providedToken, expectedToken);
    if (!isLoopback || req.headers["x-thesis-transfer-confirmation"] !== "BOOTSTRAP_IMPORT" || !tokenMatches) {
      return res.status(403).json({ error: "Der Bootstrap-Import ist ausschließlich lokal mit einem gültigen Import-Schlüssel zulässig." });
    }
    importUpload.single("archive")(req, res, (error) => {
      if (error) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: error.message });
      next();
    });
  }, async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: "Kein Transferarchiv übermittelt." });
    try {
      return res.json({ success: true, ...(await importPortableTransferArchive(req.file.path, { id: null, role: "bootstrap" })) });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Der Bootstrap-Import wurde abgebrochen." });
    } finally {
      await unlink(req.file.path).catch(() => undefined);
    }
  });

  app.post("/api/bootstrap/portable-transfer/preview", (req, res, next) => {
    const remoteAddress = req.socket.remoteAddress ?? "";
    const isLoopback = remoteAddress === "127.0.0.1" || remoteAddress === "::1" || remoteAddress === "::ffff:127.0.0.1";
    const expectedToken = process.env.TRANSFER_IMPORT_TOKEN;
    const providedToken = typeof req.headers["x-thesis-transfer-token"] === "string" ? req.headers["x-thesis-transfer-token"] : "";
    const tokenMatches = matchesImportToken(providedToken, expectedToken);
    if (!isLoopback || req.headers["x-thesis-transfer-confirmation"] !== "BOOTSTRAP_PREVIEW" || !tokenMatches) {
      return res.status(403).json({ error: "Die Bootstrap-Vorschau ist ausschließlich lokal mit einem gültigen Import-Schlüssel zulässig." });
    }
    importUpload.single("archive")(req, res, (error) => {
      if (error) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: error.message });
      next();
    });
  }, async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: "Kein Transferarchiv übermittelt." });
    try {
      const [preview, db] = await Promise.all([previewPortableTransferArchive(req.file.path), getDb()]);
      if (!db) throw new Error("Datenbank nicht verfügbar.");
      const [users, requests] = await Promise.all([db.select({ id: schema.users.id }).from(schema.users), db.select({ id: schema.thesisRequests.id }).from(schema.thesisRequests)]);
      return res.json({
        success: true,
        preview,
        targetIsEmpty: users.length === 0 && requests.length === 0,
        targetCounts: { users: users.length, thesisRequests: requests.length },
      });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Die Bootstrap-Vorschau wurde abgebrochen." });
    } finally {
      await unlink(req.file.path).catch(() => undefined);
    }
  });
}
