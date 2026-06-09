import { createConnection } from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL nicht gesetzt"); process.exit(1); }

const conn = await createConnection(url);

// Fachbereich-Zuordnung nach Studiengang-ID
// FB3 = Wirtschaftswissenschaften (alle hier aufgeführten Studiengänge)
// Weitere FBs können ergänzt werden sobald Studiengänge angelegt werden
const assignments = [
  // FB3 – Wirtschaftswissenschaften (IDs 1-19 aus der DB)
  { ids: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19], fachbereich: "FB3" },
];

for (const { ids, fachbereich } of assignments) {
  for (const id of ids) {
    const [res] = await conn.query(
      "UPDATE programmes SET fachbereich = ? WHERE id = ? AND (fachbereich IS NULL OR fachbereich = '')",
      [fachbereich, id]
    );
    if (res.affectedRows > 0) {
      console.log(`Programme #${id}: fachbereich=${fachbereich} gesetzt`);
    }
  }
}

// Ergebnis prüfen
const [rows] = await conn.query("SELECT id, name, abbreviation, level, fachbereich FROM programmes ORDER BY id");
console.log("\nAlle Studiengänge:");
for (const r of rows) {
  console.log(`  #${r.id} ${r.abbreviation} (${r.level}) → ${r.fachbereich ?? 'NULL'}`);
}

await conn.end();
console.log("\nFertig.");
