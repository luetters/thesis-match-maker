import { createConnection } from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL nicht gesetzt"); process.exit(1); }

const conn = await createConnection(url);

// 1. Nutzer finden
const [users] = await conn.query(
  "SELECT id, name, email, department, programme_id FROM users WHERE email = ?",
  ["max.dopatka@student.htw-berlin.de"]
);
console.log("Nutzer (vorher):", JSON.stringify(users, null, 2));

if (!users.length) {
  console.log("Kein Nutzer gefunden.");
  await conn.end();
  process.exit(0);
}

const userId = users[0].id;

// 2. Studiengang-ID für "BWL" aus der programmes-Tabelle ermitteln
const [progs] = await conn.query(
  "SELECT id, name, abbreviation FROM programmes WHERE name LIKE ? OR abbreviation LIKE ? LIMIT 10",
  ["%BWL%", "%BWL%"]
);
console.log("Gefundene Studiengänge:", JSON.stringify(progs, null, 2));

let programmeId = progs.length ? progs[0].id : null;

// 3. Nutzer-Datensatz aktualisieren: department = FB3, programme_id = BWL-ID
const [userUpdate] = await conn.query(
  "UPDATE users SET department = ?, programme_id = ? WHERE id = ?",
  ["FB3", programmeId, userId]
);
console.log(`users: department=FB3, programme_id=${programmeId}. Betroffene Zeilen: ${userUpdate.affectedRows}`);

// 4. Alle thesis_requests des Nutzers aktualisieren
const [reqs] = await conn.query(
  "SELECT id, title, department, status FROM thesis_requests WHERE studentId = ?",
  [userId]
);
console.log("Anträge (vorher):", JSON.stringify(reqs, null, 2));

for (const req of reqs) {
  const [res] = await conn.query(
    "UPDATE thesis_requests SET department = ? WHERE id = ?",
    ["FB3", req.id]
  );
  console.log(`thesis_requests #${req.id}: department=FB3. Betroffene Zeilen: ${res.affectedRows}`);
}

// 5. Ergebnis prüfen
const [after] = await conn.query(
  "SELECT id, name, email, department, programme_id FROM users WHERE id = ?",
  [userId]
);
console.log("Nutzer (nachher):", JSON.stringify(after, null, 2));

await conn.end();
console.log("Fertig.");
