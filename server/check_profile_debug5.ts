import { getDb } from './db';

async function main() {
  const db = await getDb();
  if (!db) { console.log('DB not available'); return; }
  
  const epRows = await db.execute(`SELECT userId, SUBSTRING(bio, 1, 50) as bio, SUBSTRING(researchFocus, 1, 50) as rf, languages FROM examiner_profiles WHERE userId = 690079`);
  console.log('After test update:', JSON.stringify((epRows[0] as any)[0], null, 2));
  
  process.exit(0);
}
main().catch(console.error);
