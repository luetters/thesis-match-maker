/**
 * Seed-Skript: Legt 5 Testkonten mit Passwort-Hash in der Datenbank an.
 * Ausführen: node seed-testusers.mjs
 */
import { createConnection } from "mysql2/promise";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL nicht gesetzt");
  process.exit(1);
}

const SALT_ROUNDS = 12;
const PASSWORD = "Borschtsch05";

const USERS = [
  {
    email: "holger@luetters.net",
    name: "Prof. Dr. Holger Lütters",
    role: "admin",
    openId: "pw_holger_luetters_net",
  },
  {
    email: "student@htw-berlin.com",
    name: "Max Mustermann (Student)",
    role: "student",
    openId: "pw_student_htw_berlin_com",
  },
  {
    email: "firstsupervisor@htw-berlin.com",
    name: "Prof. Dr. Anna Schmidt (Erstprüferin)",
    role: "examiner",
    openId: "pw_firstsupervisor_htw_berlin_com",
  },
  {
    email: "secondsupervisor@htw-berlin.com",
    name: "Dr. Klaus Weber (Zweitprüfer)",
    role: "examiner",
    openId: "pw_secondsupervisor_htw_berlin_com",
  },
  {
    email: "verwaltung@htw-berlin.com",
    name: "Sabine Müller (Verwaltung)",
    role: "admin",
    openId: "pw_verwaltung_htw_berlin_com",
  },
];

async function main() {
  const conn = await createConnection(DATABASE_URL);
  const hash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  console.log(`Passwort-Hash generiert (${SALT_ROUNDS} Runden)`);

  for (const user of USERS) {
    try {
      await conn.execute(
        `INSERT INTO users (openId, name, email, role, loginMethod, passwordHash, lastSignedIn, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 'password', ?, NOW(), NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           role = VALUES(role),
           passwordHash = VALUES(passwordHash),
           loginMethod = 'password',
           updatedAt = NOW()`,
        [user.openId, user.name, user.email, user.role, hash]
      );
      console.log(`✓ ${user.email} (${user.role}) angelegt/aktualisiert`);
    } catch (err) {
      console.error(`✗ Fehler bei ${user.email}:`, err.message);
    }
  }

  // Prüfer-Profile für Erstprüfer und Zweitprüfer anlegen
  const examinerEmails = [
    "firstsupervisor@htw-berlin.com",
    "secondsupervisor@htw-berlin.com",
  ];
  for (const email of examinerEmails) {
    try {
      const [rows] = await conn.execute(
        "SELECT id FROM users WHERE email = ? LIMIT 1",
        [email]
      );
      if (rows.length > 0) {
        const userId = rows[0].id;
        await conn.execute(
          `INSERT INTO examiner_profiles (userId, title, department, maxSupervisions)
           VALUES (?, ?, ?, 5)
           ON DUPLICATE KEY UPDATE updatedAt = NOW()`,
          [
            userId,
            email === "firstsupervisor@htw-berlin.com" ? "Prof. Dr." : "Dr.",
            "Wirtschaftsinformatik",
          ]
        );
        console.log(`✓ Prüfer-Profil für ${email} angelegt`);
      }
    } catch (err) {
      console.error(`✗ Prüfer-Profil Fehler für ${email}:`, err.message);
    }
  }

  await conn.end();
  console.log("\n✅ Alle Testkonten erfolgreich angelegt.");
  console.log("Passwort für alle Konten: Borschtsch05");
}

main().catch(console.error);
