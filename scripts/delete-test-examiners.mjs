import mysql from 'mysql2/promise';

// IDs der zu behaltenden echten Nutzer
const KEEP_IDS = [
  1920001, // holger.luetters@htw-berlin.de – Prof. Dr. Holger Lütters
  4080481, // holger@luetters.net – holger
  5701393, // lehmtine@htw-berlin.de – Tine Lehmann
];

// IDs der zu löschenden Testprüfer
const DELETE_IDS = [
  690081,  // firstsupervisor@htw-berlin.com – Prof. Dr. Anna Schmidt (Erstprüferin)
  690082,  // secondsupervisor@htw-berlin.com – Dr. Klaus Weber (Zweitprüfer)
  1560005, // clara.walter@htw-berlin.de
  1560008, // markus.vogel@htw-berlin.de
  1560009, // peter.kuehn@htw-berlin.de
  1560021, // luisa.haas@htw-berlin.de
  1560022, // dirk.schwarz@htw-berlin.de
  1560023, // dominik.vogel@htw-berlin.de
  1560025, // juergen.frank@htw-berlin.de
  1560027, // gisela.bergmann@htw-berlin.de
  1560042, // frank.becker@htw-berlin.de
  1560054, // brigitte.lorenz@htw-berlin.de
  1560056, // thorsten.frank@htw-berlin.de
  1560058, // dominik.fischer@htw-berlin.de
  1560062, // guenter.becker@htw-berlin.de
  1560063, // sarah.bauer@htw-berlin.de
  1560064, // lukas.martin@htw-berlin.de
];

const placeholders = DELETE_IDS.map(() => '?').join(',');

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('Verbunden. Starte Löschvorgang...\n');

  // Sicherheitscheck: Keine der KEEP_IDs darf in DELETE_IDS sein
  const overlap = DELETE_IDS.filter(id => KEEP_IDS.includes(id));
  if (overlap.length > 0) {
    console.error('FEHLER: Überschneidung zwischen KEEP und DELETE:', overlap);
    process.exit(1);
  }

  // Abhängige Tabellen zuerst löschen (Foreign Key Reihenfolge)
  const tables = [
    'examiner_profiles',
    'thesis_requests',
    'favorites',
    'colloquium_slots',
    'audit_logs',
    'magic_links',
    'password_reset_tokens',
    'notifications',
  ];

  for (const table of tables) {
    try {
      const [res] = await conn.execute(
        `DELETE FROM \`${table}\` WHERE user_id IN (${placeholders})`,
        DELETE_IDS
      );
      console.log(`  ${table}: ${res.affectedRows} Zeilen gelöscht`);
    } catch (err) {
      // Tabelle existiert möglicherweise nicht oder hat anderen FK-Namen
      if (err.code === 'ER_NO_SUCH_TABLE') {
        console.log(`  ${table}: Tabelle nicht vorhanden, übersprungen`);
      } else {
        console.warn(`  ${table}: ${err.message}`);
      }
    }
  }

  // thesis_requests auch nach examiner_id und second_examiner_id bereinigen
  try {
    const [r1] = await conn.execute(
      `UPDATE thesis_requests SET examiner_id = NULL WHERE examiner_id IN (${placeholders})`,
      DELETE_IDS
    );
    console.log(`  thesis_requests.examiner_id: ${r1.affectedRows} Zeilen geleert`);

    const [r2] = await conn.execute(
      `UPDATE thesis_requests SET second_examiner_id = NULL WHERE second_examiner_id IN (${placeholders})`,
      DELETE_IDS
    );
    console.log(`  thesis_requests.second_examiner_id: ${r2.affectedRows} Zeilen geleert`);

    const [r3] = await conn.execute(
      `UPDATE thesis_requests SET wanted_examiner_id = NULL WHERE wanted_examiner_id IN (${placeholders})`,
      DELETE_IDS
    );
    console.log(`  thesis_requests.wanted_examiner_id: ${r3.affectedRows} Zeilen geleert`);
  } catch (err) {
    console.warn('  thesis_requests FK-Update:', err.message);
  }

  // Nutzer selbst löschen
  const [res] = await conn.execute(
    `DELETE FROM users WHERE id IN (${placeholders})`,
    DELETE_IDS
  );
  console.log(`\n✅ users: ${res.affectedRows} Testprüfer:innen gelöscht`);

  // Verbleibende Prüfer anzeigen
  const [remaining] = await conn.execute(
    `SELECT id, email, name FROM users WHERE role = 'examiner' ORDER BY name`
  );
  console.log('\nVerbleibende Prüfer:innen:');
  remaining.forEach(r => console.log(`  [${r.id}] ${r.email} | ${r.name}`));

  await conn.end();
}

main().catch(err => {
  console.error('Fehler:', err.message);
  process.exit(1);
});
