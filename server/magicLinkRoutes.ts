/**
 * Auth-Routen (Legacy-Datei – Magic-Link wurde entfernt).
 * Nur noch: POST /api/auth/logout → Session-Cookie löschen
 *
 * Die Logout-Route wird weiterhin benötigt, da das Frontend sie aufruft.
 * Magic-Link-Routen (POST /api/auth/magic-link, GET /api/auth/verify) wurden
 * entfernt. Anmeldung erfolgt ausschließlich per E-Mail und Passwort.
 */

import type { Express, Request, Response } from "express";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "../shared/const";

export function registerMagicLinkRoutes(app: Express) {
  // --- Logout -------------------------------------------------------------
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
}
