import type { Express, Request, Response } from "express";
import { jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { randomBytes } from "crypto";
import { COOKIE_NAME } from "@shared/const";
import { createAuditLogEntry, getUserByOpenId, getUserRoles } from "./db";
import { streamPortableTransferArchive } from "./portableTransfer";

const DOWNLOAD_TTL_MS = 5 * 60 * 1000;
const downloadTokens = new Map<string, { userId: number; expiresAt: number }>();

export function createPortableTransferDownloadToken(userId: number): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + DOWNLOAD_TTL_MS;
  downloadTokens.set(token, { userId, expiresAt });
  return { token, expiresAt: new Date(expiresAt).toISOString() };
}

function consumePortableTransferDownloadToken(token: string | undefined, userId: number): boolean {
  if (!token) return false;
  const entry = downloadTokens.get(token);
  downloadTokens.delete(token);
  return Boolean(entry && entry.userId === userId && entry.expiresAt > Date.now());
}

async function getSuperadminFromRequest(req: Request): Promise<{ id: number; role: string } | null> {
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
    return roles.includes("superadmin") || user.role === "superadmin" ? { id: user.id, role: user.role } : null;
  } catch {
    return null;
  }
}

export function registerPortableTransferRoutes(app: Express) {
  app.get("/api/admin/portable-transfer/export", async (req: Request, res: Response) => {
    const user = await getSuperadminFromRequest(req);
    if (!user) return res.status(403).json({ error: "Nur Superadmins dürfen den portablen Datenexport erstellen." });
    if (!consumePortableTransferDownloadToken(typeof req.query.token === "string" ? req.query.token : undefined, user.id)) {
      return res.status(403).json({ error: "Der Downloadlink ist ungültig oder abgelaufen. Bitte erzeugen Sie einen neuen Link." });
    }
    try {
      const summary = await streamPortableTransferArchive(res);
      await createAuditLogEntry({
        actorId: user.id,
        actorRole: user.role,
        action: "PORTABLE_TRANSFER_EXPORT_CREATED",
        metadata: {
          archiveId: summary.archiveId,
          sectionCount: summary.sections.length,
          assetCount: summary.assets.length,
          warningCount: summary.warnings.length,
          expiresInSeconds: DOWNLOAD_TTL_MS / 1000,
        },
      });
    } catch (error) {
      console.error("[PortableTransfer] Export fehlgeschlagen", error);
      if (!res.headersSent) res.status(500).json({ error: "Der portable Datenexport konnte nicht erstellt werden." });
    }
  });
}
