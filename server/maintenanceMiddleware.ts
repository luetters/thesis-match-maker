/**
 * Wartungsmodus-Middleware
 *
 * Liest die systemSettings-Tabelle und blockiert alle Anfragen
 * (außer /api/auth/*, /api/trpc/auth.*, /maintenance)
 * wenn maintenanceMode === "true" und der Nutzer kein Superadmin ist.
 */
import type { Request, Response, NextFunction } from "express";
import { getDb } from "./db";
import { systemSettings, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { jwtVerify, importJWK } from "jose";

const BYPASS_PATHS = [
  "/api/auth",
  "/api/oauth",
  "/api/trpc/auth.me",
  "/api/trpc/auth.loginWithPassword",
  "/api/trpc/auth.requestPasswordReset",
  "/api/trpc/auth.resetPassword",
  "/api/trpc/superadmin",
  "/maintenance",
  "/manus-storage",
];

async function isMaintenanceActive(): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const rows = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, "maintenanceMode"))
      .limit(1);
    return rows[0]?.value === "true";
  } catch {
    return false;
  }
}

async function isSuperadmin(req: Request): Promise<boolean> {
  try {
    const cookie = req.headers.cookie ?? "";
    const match = cookie.match(/app_session_id=([^;]+)/);
    if (!match) return false;
    const token = decodeURIComponent(match[1]);
    const secret = process.env.JWT_SECRET ?? "";
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    // Session payload uses `openId` (not `userId`) – same format as sdk.verifySession
    const openId = (payload as { openId?: string }).openId;
    if (!openId) return false;
    const db = await getDb();
    if (!db) return false;
    const rows = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.openId, openId))
      .limit(1);
    return rows[0]?.role === "superadmin";
  } catch {
    return false;
  }
}

export function maintenanceMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    // Bypass-Pfade immer durchlassen
    if (BYPASS_PATHS.some((p) => path.startsWith(p))) {
      return next();
    }

    const active = await isMaintenanceActive();
    if (!active) return next();

    // Superadmins dürfen immer durch
    const superadmin = await isSuperadmin(req);
    if (superadmin) return next();

    // API-Anfragen: JSON-Fehler zurückgeben
    if (path.startsWith("/api/")) {
      return res.status(503).json({
        error: "maintenance",
        message:
          "Das System befindet sich derzeit im Wartungsmodus. Bitte versuchen Sie es später erneut.",
      });
    }

    // Alle anderen Anfragen: auf /maintenance umleiten
    return res.redirect("/maintenance");
  };
}
