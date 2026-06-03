// Script: Studiengang-Logos in der Datenbank aktualisieren
import { createConnection } from "mysql2/promise";
import { config } from "dotenv";

config({ path: ".env" });

const logoMap = {
  1:  "/manus-storage/FB3_BWL_3d488961.jpg",       // BWL
  2:  "/manus-storage/FB3_BWL_3d488961.jpg",       // BWLfern (gleiche Grafik)
  3:  "/manus-storage/FB3_IW_6f183ca1.jpg",        // IW – Immobilienwirtschaft
  4:  "/manus-storage/FB3_IBBachelor_e8ce6551.jpg", // IB – International Business (Bachelor)
  5:  "/manus-storage/FB3_MaNGo_f87f4aaf.jpg",     // PuMa – Public und Nonprofit-Management
  6:  "/manus-storage/EWP_92571f1e.jpg",            // WiPo – Wirtschaft und Politik
  7:  "/manus-storage/FB3_WR_5e021d48.jpg",         // WiRe – Wirtschaftsrecht (Bachelor)
  8:  "/manus-storage/FB3_MAP_884be908.jpg",        // MAP – Arbeits- und Personalmanagement
  9:  "/manus-storage/EWP_92571f1e.jpg",            // EWP – Europäische Wirtschaftspolitik
  10: "/manus-storage/FB3_FACT_96882a9d.jpg",       // FACT
  11: "/manus-storage/BIfAW_GeneralManagement_03d13bcd.jpg", // GEM – General Management
  12: "/manus-storage/FB3_MISIM_c56548b5.jpg",      // MISIM
  13: "/manus-storage/FB3_MIDE_b71e5c7c.jpg",       // MIDE
  14: "/manus-storage/FB3_MIB_5f52ea40.jpg",        // MIB – International Business (Master)
  15: "/manus-storage/FB3_MaNGo_f87f4aaf.jpg",     // Mango – Nonprofit-Management
  16: "/manus-storage/BIfAW_MPMD_56708140.jpg",     // MPMD – Project Management and Data Science
  17: "/manus-storage/FB3MUST_594bac9f.jpg",        // USR – Unternehmenssteuerrecht
  18: "/manus-storage/FB3_WR_5e021d48.jpg",         // MWR – Wirtschaftsrecht (Master)
  // 19: REM – kein Logo vorhanden, bleibt unverändert
};

async function main() {
  const conn = await createConnection(process.env.DATABASE_URL);
  let updated = 0;
  for (const [id, url] of Object.entries(logoMap)) {
    const [result] = await conn.execute(
      "UPDATE programmes SET pictogram_url = ? WHERE id = ?",
      [url, parseInt(id)]
    );
    console.log(`ID ${id}: ${result.affectedRows} Zeile(n) aktualisiert → ${url}`);
    updated += result.affectedRows;
  }
  console.log(`\nGesamt: ${updated} Studiengänge aktualisiert.`);
  await conn.end();
}

main().catch(console.error);
