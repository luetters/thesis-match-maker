import { getDb } from './db';

async function main() {
  const db = await getDb();
  if (!db) { console.log('DB not available'); return; }
  
  // Prüfen ob examiner_profiles Eintrag für holger@luetters.net (ID 690079) existiert
  const epRows = await db.execute(`SELECT userId, SUBSTRING(bio, 1, 100) as bio_preview, SUBSTRING(researchFocus, 1, 100) as rf_preview, languages, tags FROM examiner_profiles WHERE userId = 690079`);
  const rows = (epRows[0] as any);
  console.log('ExaminerProfile for holger@luetters.net (690079):', JSON.stringify(rows, null, 2));
  
  // Auch User-Info
  const userRows = await db.execute(`SELECT id, email, role FROM users WHERE id = 690079`);
  console.log('User:', JSON.stringify((userRows[0] as any)[0], null, 2));
  
  process.exit(0);
}
main().catch(console.error);
