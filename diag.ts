import { db } from './server/db';
import { users, examinerProfiles } from './drizzle/schema';
import { or, like } from 'drizzle-orm';

async function main() {
  const us = await db.select({ id: users.id, email: users.email, secondEmail: users.secondEmail, role: users.role })
    .from(users)
    .where(or(like(users.email, '%luetters%'), like(users.secondEmail, '%luetters%'), like(users.email, '%holger%')));
  console.log('USERS:', JSON.stringify(us, null, 2));

  const eps = await db.select().from(examinerProfiles);
  console.log('ALL examiner_profiles:', JSON.stringify(
    eps.map(e => ({ userId: e.userId, bio: e.bio?.substring(0, 80), researchFocus: e.researchFocus?.substring(0, 80), languages: e.languages })),
    null, 2
  ));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
