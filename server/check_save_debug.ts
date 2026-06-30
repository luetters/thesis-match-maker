import { upsertExaminerProfile } from './db';

async function main() {
  // Reset test data
  await upsertExaminerProfile({
    userId: 690079,
    bio: null as any,
    researchFocus: null as any,
    languages: null as any,
  });
  console.log('Reset done');
  process.exit(0);
}
main().catch(console.error);
