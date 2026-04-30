/**
 * Express-Routen für das Magic-Link-Auth-System.
 * Kein Manus-Account erforderlich – Authentifizierung nur per E-Mail.
 *
 * POST /api/auth/magic-link  → Token erzeugen & E-Mail versenden
 * GET  /api/auth/verify      → Token validieren & Session-Cookie setzen
 * POST /api/auth/logout      → Session-Cookie löschen
 */

import type { Express, Request, Response } from "express";
import { sendMagicLink, verifyMagicLink } from "./magicLinkAuth";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "../shared/const";

export function registerMagicLinkRoutes(app: Express) {
  // --- Magic Link anfordern ------------------------------------------------
  app.post("/api/auth/magic-link", async (req: Request, res: Response) => {
    const { email, role = "student" } = req.body as {
      email?: string;
      role?: string;
    };

    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "Ungültige E-Mail-Adresse" });
      return;
    }

    const validRoles = ["student", "examiner", "admin", "user"];
    const safeRole = validRoles.includes(role) ? role : "student";

    // Origin aus Header lesen (Frontend sendet window.location.origin)
    const origin =
      (req.headers["x-origin"] as string) ||
      `${req.protocol}://${req.headers.host}`;

    try {
      const result = await sendMagicLink(
        email,
        safeRole as "student" | "examiner" | "admin" | "user",
        origin
      );
      res.json(result);
    } catch (err: unknown) {
      console.error("[MagicLink] Fehler:", err);
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      res.status(500).json({ error: message });
    }
  });

  // --- Token verifizieren & Session setzen --------------------------------
  app.get("/api/auth/verify", async (req: Request, res: Response) => {
    const { token } = req.query as { token?: string };

    if (!token) {
      res.status(400).json({ error: "Kein Token angegeben" });
      return;
    }

    try {
      const result = await verifyMagicLink(token);

      if (!result) {
        // Ungültiger oder abgelaufener Token → Redirect zur Login-Seite mit Fehler
        res.redirect("/?error=invalid_token");
        return;
      }

      // Session-Cookie setzen (kompatibel mit bestehendem Auth-System)
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, result.sessionToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Tage
      });

      // Zur rollenspezifischen Seite weiterleiten
      // Nutzer ohne spezifische Rolle ("user") -> Onboarding-Rollenwahl
      const roleRedirects: Record<string, string> = {
        student: "/student",
        examiner: "/examiner",
        admin: "/admin",
        user: "/onboarding",
      };
      const redirect = roleRedirects[result.user.role] ?? "/onboarding";
      res.redirect(redirect);
    } catch (err) {
      console.error("[MagicLink] Verify-Fehler:", err);
      res.redirect("/?error=server_error");
    }
  });

  // --- Logout -------------------------------------------------------------
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
}
