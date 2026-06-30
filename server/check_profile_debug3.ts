import { getDb } from './db';

async function main() {
  const db = await getDb();
  if (!db) { console.log('DB not available'); return; }
  
  // Direkte SQL-Abfrage wie in getProfile
  const epRows = await db.execute(`SELECT languages, tags, bio, researchFocus FROM examiner_profiles WHERE userId = 1920001 LIMIT 1`);
  const ep = (epRows[0] as any)[0];
  console.log('Direct SQL result:', JSON.stringify({
    bio: ep?.bio ? ep.bio.substring(0, 80) : null,
    researchFocus: ep?.researchFocus ? ep.researchFocus.substring(0, 80) : null,
    languages: ep?.languages,
    tags: ep?.tags,
  }, null, 2));
  
  process.exit(0);
}
main().catch(console.error);
