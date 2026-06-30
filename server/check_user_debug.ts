import { getDb } from './db';

async function main() {
  const db = await getDb();
  if (!db) { console.log('DB not available'); return; }
  
  const rows = await db.execute(`SELECT id, email, name, role, roleStatus FROM users WHERE email = 'holger.luetters@htw-berlin.de' LIMIT 1`);
  const user = (rows[0] as any)[0];
  console.log('User:', JSON.stringify(user, null, 2));
  
  if (user) {
    const epRows = await db.execute(`SELECT bio, researchFocus, languages, tags FROM examiner_profiles WHERE userId = ${user.id} LIMIT 1`);
    console.log('ExaminerProfile:', JSON.stringify((epRows[0] as any)[0], null, 2));
    
    const urRows = await db.execute(`SELECT role FROM user_roles WHERE user_id = ${user.id}`);
    console.log('UserRoles:', JSON.stringify(urRows[0], null, 2));
  }
  process.exit(0);
}
main().catch(console.error);
