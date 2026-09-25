#!/usr/bin/env node
/**
 * Wird ausschließlich durch bootstrap-superadmin.sh innerhalb des App-Containers
 * aufgerufen. Das Kennwort kommt nur über stdin; es wird weder geloggt noch in
 * Argumenten oder Umgebungsvariablen transportiert.
 */
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import mysql from "mysql2/promise";

const args = process.argv.slice(2);
const readOption = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const mode = readOption("--mode");
const emailInput = readOption("--email");
const name = readOption("--name");
const resetTwoFactor = args.includes("--reset-two-factor");
const email = typeof emailInput === "string" ? emailInput.trim().toLowerCase() : "";

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

if (mode !== "initial" && mode !== "recover") fail("Ungültiger Wiederherstellungsmodus.");
if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$/.test(email) || email.length > 320) fail("Ungültige E-Mail-Adresse.");
if (typeof name !== "string" || name.trim().length < 2 || name.length > 200) fail("Ungültiger Kontoname.");
if (!process.env.DATABASE_URL) fail("Datenbankverbindung ist nicht konfiguriert.");

const input = await new Promise((resolve, reject) => {
  const chunks = [];
  process.stdin.on("data", (chunk) => chunks.push(chunk));
  process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  process.stdin.on("error", reject);
});
const password = input.replace(/\r?\n$/, "");
if (password.includes("\n") || password.includes("\r")) fail("Passwörter mit Zeilenumbrüchen sind für diesen lokalen Vorgang nicht zulässig.");

const hasLowercase = /[a-zäöüß]/.test(password);
const hasUppercase = /[A-ZÄÖÜ]/.test(password);
const hasDigit = /\d/.test(password);
const hasSymbol = /[^A-Za-zÄÖÜäöüß0-9\s]/.test(password);
const categoryCount = [hasLowercase, hasUppercase, hasDigit, hasSymbol].filter(Boolean).length;
if (password.length < 12 || password.length > 128 || categoryCount < 3) {
  fail("Das Passwort erfüllt nicht die Portalregel: 12 bis 128 Zeichen und mindestens drei Zeichengruppen.");
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await connection.beginTransaction();
  const [matchingUsers] = await connection.execute(
    "SELECT id FROM users WHERE LOWER(email) = ? ORDER BY id FOR UPDATE",
    [email],
  );

  if (matchingUsers.length > 1) {
    await connection.rollback();
    fail("Mehrere Konten mit dieser E-Mail-Adresse gefunden. Keine Änderung ausgeführt; zuerst Dubletten fachlich klären.");
  }
  if (mode === "initial" && matchingUsers.length !== 0) {
    await connection.rollback();
    fail("Ein Konto mit dieser E-Mail-Adresse existiert bereits. Für eine Wiederherstellung ausschließlich den Modus recover verwenden.");
  }
  if (mode === "recover" && matchingUsers.length !== 1) {
    await connection.rollback();
    fail("Kein vorhandenes Einzelkonto gefunden. Für einen neuen Erstzugang ausschließlich den Modus initial verwenden.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let userId;
  let action;

  if (mode === "initial") {
    const openId = `pw_bootstrap_${randomUUID().replaceAll("-", "")}`;
    const [result] = await connection.execute(
      `INSERT INTO users (openId, name, email, loginMethod, role, roleStatus, passwordHash, lastSignedIn)
       VALUES (?, ?, ?, 'password', 'superadmin', 'approved', ?, NOW())`,
      [openId, name.trim(), email, passwordHash],
    );
    userId = result.insertId;
    action = "SUPERADMIN_INITIAL_ACCESS_PROVISIONED";
  } else {
    userId = matchingUsers[0].id;
    const twoFactorUpdate = resetTwoFactor
      ? ", twoFactorSecret = NULL, twoFactorEnabled = 0, twoFactorConfirmedAt = NULL, twoFactorLastUsedStep = NULL"
      : "";
    await connection.execute(
      `UPDATE users
       SET name = COALESCE(NULLIF(name, ''), ?), loginMethod = 'password', role = 'superadmin',
           roleStatus = 'approved', requestedRole = NULL, passwordHash = ?, lastSignedIn = NOW()${twoFactorUpdate}
       WHERE id = ?`,
      [name.trim(), passwordHash, userId],
    );
    if (resetTwoFactor) {
      await connection.execute("DELETE FROM two_factor_recovery_codes WHERE user_id = ?", [userId]);
    }
    action = resetTwoFactor
      ? "SUPERADMIN_ACCESS_RECOVERED_WITH_2FA_RESET"
      : "SUPERADMIN_ACCESS_RECOVERED";
  }

  const [existingRole] = await connection.execute(
    "SELECT id FROM user_roles WHERE user_id = ? AND role = 'superadmin' LIMIT 1 FOR UPDATE",
    [userId],
  );
  if (existingRole.length === 0) {
    await connection.execute(
      "INSERT INTO user_roles (user_id, role, assigned_by, assigned_at) VALUES (?, 'superadmin', ?, NOW())",
      [userId, userId],
    );
  }

  await connection.execute(
    `INSERT INTO audit_log (actorId, actorRole, action, reason, metadata)
     VALUES (?, 'superadmin', ?, 'Kontrollierter lokaler Superadmin-Erstzugang oder Wiederherstellung.', ?)`,
    [userId, action, JSON.stringify({ mode, resetTwoFactor })],
  );

  await connection.commit();
  process.stdout.write(mode === "initial"
    ? "Superadmin-Konto angelegt und revisionssicher protokolliert.\n"
    : "Superadmin-Konto wiederhergestellt und revisionssicher protokolliert.\n");
} catch (error) {
  try {
    await connection.rollback();
  } catch {
    // Die ursprüngliche Fehlermeldung bleibt maßgeblich.
  }
  process.stderr.write("Superadmin-Erstzugang fehlgeschlagen. Prüfen Sie die lokale Containerdiagnose und den Kontostatus; es wurden keine Zugangsdaten ausgegeben.\n");
  process.exitCode = 1;
} finally {
  await connection.end();
}
