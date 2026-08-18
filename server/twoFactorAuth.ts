import crypto from "crypto";
import * as OTPAuth from "otpauth";

const ISSUER = "Thesis Match – HTW Berlin";
const PERIOD_SECONDS = 30;
const DIGITS = 6;

function encryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET fehlt für die Zwei-Faktor-Authentifizierung.");
  return crypto.createHash("sha256").update(secret).digest();
}

export function isAdminAccount(role: string | null | undefined): boolean {
  return role === "admin" || role === "superadmin";
}

export function createTwoFactorSetup(email: string) {
  const totp = new OTPAuth.TOTP({ issuer: ISSUER, label: email, algorithm: "SHA1", digits: DIGITS, period: PERIOD_SECONDS });
  return { secret: totp.secret.base32, otpauthUrl: totp.toString() };
}

export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export function encryptTwoFactorSecret(secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptTwoFactorSecret(encryptedValue: string): string {
  const payload = Buffer.from(encryptedValue, "base64url");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function verifyTwoFactorCode(secret: string, code: string): { valid: boolean; step: number } {
  const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), algorithm: "SHA1", digits: DIGITS, period: PERIOD_SECONDS });
  const delta = totp.validate({ token: code.replace(/\s/g, ""), window: 1 });
  const step = Math.floor(Date.now() / 1000 / PERIOD_SECONDS) + (delta ?? 0);
  return { valid: delta !== null, step };
}
