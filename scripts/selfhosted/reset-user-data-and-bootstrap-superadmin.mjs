#!/usr/bin/env node
/**
 * Wird nur über reset-user-data-and-bootstrap-superadmin.sh im App-Container
 * aufgerufen. Die Shell hat bereits Backup, zwei Bestätigungen und die gezielte
 * Entfernung der referenzierten personenbezogenen Dateien durchgeführt.
 */
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import mysql from "mysql2/promise";

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const emailInput = option("--email");
const nameInput = option("--name");
const email = typeof emailInput === "string" ? emailInput.trim().toLowerCase() : "";
const name = typeof nameInput === "string" ? nameInput.trim() : "";

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$/.test(email) || email.length > 320) fail("Ungültige E-Mail-Adresse.");
if (name.length < 2 || name.length > 200) fail("Ungültiger Superadmin-Name.");
if (!process.env.DATABASE_URL) fail("Datenbankverbindung ist nicht konfiguriert.");

const input = await new Promise((resolve, reject) => {
  const chunks = [];
  process.stdin.on("data", (chunk) => chunks.push(chunk));
  process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  process.stdin.on("error", reject);
});
const password = input.replace(/\r?\n$/, "");
if (password.includes("\n") || password.includes("\r")) fail("Passwörter mit Zeilenumbrüchen sind nicht zulässig.");
const categoryCount = [/[a-zäöüß]/.test(password), /[A-ZÄÖÜ]/.test(password), /\d/.test(password), /[^A-Za-zÄÖÜäöüß0-9\s]/.test(password)].filter(Boolean).length;
if (password.length < 12 || password.length > 128 || categoryCount < 3) {
  fail("Das Passwort erfüllt nicht die Portalregel: 12 bis 128 Zeichen und mindestens drei Zeichengruppen.");
}

const operationTables = [
  // Kindtabellen von Thesis- und Kolloquiumsvorgängen zuerst.
  "conditional_document_comments",
  "conditional_documents",
  "thesis_doc_tokens",
  "published_thesis_abstracts",
  "colloquium_scheduling_responses",
  "colloquium_scheduling_slots",
  "colloquium_scheduling_participants",
  "colloquium_scheduling_polls",
  "colloquiums",
  "examiner_action_tokens",
  "examiner_comments",
  "deadline_changes",
  "reminder_schedules",
  "notifications",
  "pav_examiner_proposals",
  "admin_decision_log",
  "thesis_requests",
  // Nutzerbezogene Zuordnungen, Profile, Inhalte und Zugangsdaten.
  "examiner_favorites",
  "student_registration_invitations",
  "examiner_commission_preferences",
  "examiner_programmes",
  "examiner_public_resources",
  "examiner_profiles",
  "examiner_semester_capacities",
  "examiner_email_templates",
  "examiner_departments",
  "examiner_topics",
  "admin_departments",
  "pav_programmes",
  "programme_content_managers",
  "saved_filters",
  "user_roles",
  "two_factor_recovery_codes",
  "two_factor_reminder_emails",
  "examiner_seen_notifications",
  "notification_preferences",
  "password_reset_tokens",
  "login_attempts",
  "magic_links",
  "colloquium_room_blocks",
  "audit_log",
  "users",
];

const preserveAndReassign = [
  { table: "email_templates", column: "updated_by_user_id" },
  { table: "programme_public_links", column: "created_by" },
  { table: "programme_public_links", column: "updated_by" },
  { table: "programme_semester_deadlines", column: "updated_by" },
  { table: "system_settings", column: "updated_by_id" },
];

const safeIdentifier = (identifier) => /^[a-z_]+$/.test(identifier);
if (![...operationTables, ...preserveAndReassign.map(({ table }) => table)].every(safeIdentifier)) {
  fail("Ungültige interne Tabellenliste.");
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const [missingRequiredTables] = await connection.execute(
    `SELECT required.table_name
     FROM (
       SELECT 'users' AS table_name UNION ALL SELECT 'user_roles' UNION ALL SELECT 'system_settings' UNION ALL SELECT 'audit_log'
     ) required
     LEFT JOIN information_schema.tables actual
       ON actual.table_schema = DATABASE() AND actual.table_name = required.table_name
     WHERE actual.table_name IS NULL`,
  );
  if (missingRequiredTables.length > 0) {
    fail("Die Datenbankstruktur ist noch unvollständig. Zuerst die Schema-Reparatur abschließen.");
  }

  const [referencingTables] = await connection.execute(
    `SELECT DISTINCT table_name
     FROM information_schema.key_column_usage
     WHERE table_schema = DATABASE() AND referenced_table_name = 'users'`,
  );
  const notCovered = referencingTables.map(({ table_name }) => table_name).filter((table) => !operationTables.includes(table));
  if (notCovered.length > 0) {
    fail("Eine referenzierende Tabelle ist nicht vom Resetplan erfasst. Keine Daten wurden geändert.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await connection.beginTransaction();

  for (const table of operationTables) {
    const [present] = await connection.execute(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1",
      [table],
    );
    if (present.length > 0) {
      await connection.query(`DELETE FROM \`${table}\``);
    }
  }

  const openId = `pw_bootstrap_${randomUUID().replaceAll("-", "")}`;
  const [result] = await connection.execute(
    `INSERT INTO users (openId, name, email, loginMethod, role, roleStatus, passwordHash, two_factor_enabled, lastSignedIn)
     VALUES (?, ?, ?, 'password', 'superadmin', 'approved', ?, 0, NOW())`,
    [openId, name, email, passwordHash],
  );
  const superadminId = result.insertId;
  await connection.execute(
    "INSERT INTO user_roles (user_id, role, assigned_by, assigned_at) VALUES (?, 'superadmin', ?, NOW())",
    [superadminId, superadminId],
  );

  for (const { table, column } of preserveAndReassign) {
    const [present] = await connection.execute(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1",
      [table, column],
    );
    if (present.length > 0) {
      await connection.query(`UPDATE \`${table}\` SET \`${column}\` = ?`, [superadminId]);
    }
  }

  // Während der Ersteinrichtung ist 2FA nicht verpflichtend; die neue Person kann
  // sie später gezielt im Portal aktivieren.
  await connection.execute("DELETE FROM system_settings WHERE `key` = 'twoFactorRequiredRoles'");
  await connection.execute(
    "INSERT INTO system_settings (`key`, value, updated_by_id) VALUES ('twoFactorRequiredRoles', '[]', ?)",
    [superadminId],
  );

  await connection.execute(
    `INSERT INTO audit_log (actorId, actorRole, action, reason, metadata)
     VALUES (?, 'superadmin', 'USER_AND_PROCESS_DATA_RESET', 'Manueller Reset von Nutzer- und Vorgangsdaten mit bestätigtem Backup.', ?)`,
    [superadminId, JSON.stringify({ preserved: ["programmes", "programme_public_links", "programme_semester_deadlines", "email_templates", "reminder_templates", "system_settings", "faq_feedback", "faq_rating_totals", "guide_download_totals"], twoFactorRequiredRoles: [] })],
  );

  await connection.commit();
  process.stdout.write("Nutzer- und Vorgangsdaten gelöscht; ein neues Superadmin-Konto wurde angelegt. Die globale 2FA-Pflicht ist deaktiviert.\n");
} catch (error) {
  try {
    await connection.rollback();
  } catch {
    // Die ursprüngliche Fehlermeldung bleibt maßgeblich.
  }
  process.stderr.write("Der Datenreset wurde abgebrochen. Prüfen Sie den lokalen Serverzustand und das erzeugte Backup; keine Zugangsdaten wurden ausgegeben.\n");
  process.exitCode = 1;
} finally {
  await connection.end();
}
