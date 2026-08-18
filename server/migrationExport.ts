/**
 * Migrations-Export: Erstellt ein ZIP-Archiv mit statischen Assets
 * und einem Datenbank-Schema-Dump für die IONOS/Hetzner-Migration.
 *
 * Sicherheit: Nur für Superadmins zugänglich.
 */

import type { Express, Request, Response } from "express";
import { jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { getUserByOpenId, getUserRoles } from "./db";
import { getStorageMode, localReadFile } from "./storageLocal";
import { readdirSync, statSync, existsSync } from "fs";
import { join } from "path";
import { ZipArchive } from "archiver";

async function getSuperadminFromRequest(req: Request): Promise<boolean> {
  try {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return false;
    const cookies = parseCookieHeader(cookieHeader);
    const token = cookies[COOKIE_NAME];
    if (!token) return false;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    const openId = payload.openId as string | undefined;
    if (!openId) return false;
    const user = await getUserByOpenId(openId);
    if (!user) return false;
    const roles = await getUserRoles(user.id);
    return roles.includes("superadmin") || user.role === "superadmin";
  } catch {
    return false;
  }
}

/** Sammelt alle Dateien in einem Verzeichnis rekursiv. */
function walkDir(dir: string, prefix = ""): Array<{ path: string; relativePath: string }> {
  const results: Array<{ path: string; relativePath: string }> = [];
  if (!existsSync(dir)) return results;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relPath = prefix ? `${prefix}/${entry}` : entry;
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...walkDir(fullPath, relPath));
    } else {
      results.push({ path: fullPath, relativePath: relPath });
    }
  }
  return results;
}

export function registerMigrationExportRoutes(app: Express) {
  /**
   * GET /api/admin/export/migration
   * Erstellt ein ZIP mit:
   *   - storage-assets/ (alle lokalen Storage-Dateien)
   *   - drizzle/ (Schema und Migrationen)
   *   - deploy/ (Docker-Konfiguration)
   *   - docs/ (Migrationsleitfaden)
   */
  app.get("/api/admin/export/migration", async (req: Request, res: Response) => {
    const isSuperadmin = await getSuperadminFromRequest(req);
    if (!isSuperadmin) {
      res.status(403).json({ error: "Nur Superadmins können den Migrations-Export durchführen." });
      return;
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="thesis-match-migration-${new Date().toISOString().slice(0, 10)}.zip"`);

    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.on("error", (err: Error) => {
      console.error("[MigrationExport] Fehler:", err);
      if (!res.headersSent) res.status(500).send("Export fehlgeschlagen.");
    });
    archive.pipe(res);

    // 1. Lokale Storage-Dateien
    const storageDir = process.env.STORAGE_LOCAL_DIR || join(process.cwd(), "storage-data");
    if (existsSync(storageDir)) {
      const files = walkDir(storageDir);
      for (const file of files) {
        archive.file(file.path, { name: `storage-assets/${file.relativePath}` });
      }
    }

    // 2. Drizzle-Schema und Migrationen
    const drizzleDir = join(process.cwd(), "drizzle");
    if (existsSync(drizzleDir)) {
      const files = walkDir(drizzleDir);
      for (const file of files) {
        archive.file(file.path, { name: `drizzle/${file.relativePath}` });
      }
    }

    // 3. Deploy-Konfiguration
    const deployDir = join(process.cwd(), "deploy");
    if (existsSync(deployDir)) {
      const files = walkDir(deployDir);
      for (const file of files) {
        archive.file(file.path, { name: `deploy/${file.relativePath}` });
      }
    }

    // 4. Dokumentation
    const docsDir = join(process.cwd(), "docs");
    if (existsSync(docsDir)) {
      const files = walkDir(docsDir);
      for (const file of files) {
        archive.file(file.path, { name: `docs/${file.relativePath}` });
      }
    }

    // 5. Info-Datei mit aktuellem Status
    const info = [
      `# Migrations-Export`,
      `Datum: ${new Date().toISOString()}`,
      `Speichermodus: ${getStorageMode()}`,
      ``,
      `## Enthaltene Dateien`,
      `- storage-assets/: Alle lokalen Speicherdateien`,
      `- drizzle/: Datenbankschema und Migrationen`,
      `- deploy/: Docker-Konfiguration (Dockerfile, docker-compose.yml)`,
      `- docs/: Migrationsleitfaden und Dokumentation`,
      ``,
      `## Nächste Schritte`,
      `1. Datenbank separat exportieren: mysqldump über die Datenbankverwaltung`,
      `2. ZIP auf dem Zielserver entpacken`,
      `3. Anleitung in docs/IONOS_Migrationsleitfaden.md befolgen`,
    ].join("\n");
    archive.append(info, { name: "README.md" });

    await archive.finalize();
  });
}
