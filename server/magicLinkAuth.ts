/**
 * Magic-Link-Authentifizierung – kein externer OAuth-Provider erforderlich.
 * Ablauf:
 *  1. Nutzer gibt E-Mail ein → sendMagicLink() erzeugt Token und versendet E-Mail.
 *  2. Nutzer klickt Link → verifyMagicLink() validiert Token, erstellt/aktualisiert User,
 *     setzt Session-Cookie.
 */

import crypto from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "./db";
import { magicLinks, users } from "../drizzle/schema";
import { sendEmail } from "./emailHelper";
import { ENV } from "./_core/env";
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(ENV.cookieSecret);
const LINK_EXPIRY_MINUTES = 30;

// --- Token generieren ---------------------------------------------------------

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

// --- Magic Link versenden -----------------------------------------------------

export async function sendMagicLink(
  email: string,
  role: "student" | "examiner" | "admin" | "user",
  origin: string
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");

  const token = generateToken();
  const expiresAt = new Date(Date.now() + LINK_EXPIRY_MINUTES * 60 * 1000);

  await db.insert(magicLinks).values({ email, token, role, expiresAt });

  const link = `${origin}/auth/verify?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #76b900; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">HTW Berlin – Thesis Match Maker</h1>
      </div>
      <div style="padding: 32px; background: #ffffff; border: 1px solid #d6d6d6;">
        <h2 style="color: #1a1a1a;">Ihr Anmeldelink</h2>
        <p style="color: #474747; line-height: 1.6;">
          Sie haben eine Anmeldung beim Thesis Match Maker der HTW Berlin angefordert.
          Klicken Sie auf den folgenden Button, um sich anzumelden:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${link}"
             style="background: #76b900; color: white; padding: 14px 32px;
                    text-decoration: none; border-radius: 6px; font-weight: bold;
                    font-size: 16px; display: inline-block;">
            Jetzt anmelden
          </a>
        </div>
        <p style="color: #474747; font-size: 14px;">
          Dieser Link ist <strong>${LINK_EXPIRY_MINUTES} Minuten</strong> gültig.
          Falls Sie keine Anmeldung angefordert haben, können Sie diese E-Mail ignorieren.
        </p>
        <hr style="border: none; border-top: 1px solid #d6d6d6; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">
          HTW Berlin – Hochschule für Technik und Wirtschaft Berlin
        </p>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject: "Ihr Anmeldelink – HTW Berlin Thesis Match Maker",
      html,
    });
  } catch (err) {
    console.warn("[MagicLink] E-Mail-Versand fehlgeschlagen:", err);
    // Im Dev-Modus trotzdem Token zurückgeben
    if (process.env.NODE_ENV !== "production") {
      console.log(`[MagicLink DEV] Link: ${link}`);
      return { success: true, message: "DEV: Link in Server-Log ausgegeben" };
    }
    throw new Error("E-Mail konnte nicht versendet werden");
  }

  return { success: true, message: "Anmeldelink wurde an Ihre E-Mail-Adresse gesendet" };
}

// --- Token verifizieren & Session erstellen -----------------------------------

export async function verifyMagicLink(token: string): Promise<{
  sessionToken: string;
  user: { id: number; email: string; name: string | null; role: string };
} | null> {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();

  // Token in DB suchen
  const rows = await db
    .select()
    .from(magicLinks)
    .where(
      and(
        eq(magicLinks.token, token),
        eq(magicLinks.used, 0),
        gt(magicLinks.expiresAt, now)
      )
    )
    .limit(1);

  if (rows.length === 0) return null;

  const link = rows[0];

  // Token als verwendet markieren
  await db
    .update(magicLinks)
    .set({ used: 1 })
    .where(eq(magicLinks.id, link.id));

  // User upsert: openId = email (für eigenes Auth-System)
  const openId = `magic:${link.email}`;
  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  let user;
  if (existingUsers.length > 0) {
    // Bestehenden User aktualisieren
    await db
      .update(users)
      .set({ lastSignedIn: now, loginMethod: "magic_link" })
      .where(eq(users.openId, openId));
    user = existingUsers[0];
  } else {
    // Neuen User anlegen
    const role = (link.role === "user" ? "student" : link.role) as
      | "student"
      | "examiner"
      | "admin";
    await db.insert(users).values({
      openId,
      email: link.email,
      name: link.email.split("@")[0],
      loginMethod: "magic_link",
      role,
      lastSignedIn: now,
    });
    const newUsers = await db
      .select()
      .from(users)
      .where(eq(users.openId, openId))
      .limit(1);
    user = newUsers[0];
  }

  if (!user) return null;

  // JWT-Session-Token erstellen (kompatibel mit bestehendem Cookie-System)
  const sessionToken = await new SignJWT({
    id: user.id,
    openId: user.openId,
    email: user.email,
    name: user.name,
    role: user.role,
    loginMethod: "magic_link",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);

  return {
    sessionToken,
    user: {
      id: user.id,
      email: user.email ?? link.email,
      name: user.name,
      role: user.role,
    },
  };
}
