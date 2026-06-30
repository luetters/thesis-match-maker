import { getProfile } from './db';

async function main() {
  // User ID 1920001 = holger.luetters@htw-berlin.de
  const profile = await getProfile(1920001);
  if (!profile) { console.log('Profile not found'); return; }
  console.log('isExaminer:', profile.isExaminer);
  console.log('role:', profile.role);
  console.log('examinerBio:', profile.examinerBio ? profile.examinerBio.substring(0, 80) : null);
  console.log('examinerResearchFocus:', profile.examinerResearchFocus ? profile.examinerResearchFocus.substring(0, 80) : null);
  console.log('examinerLanguages:', profile.examinerLanguages);
  console.log('examinerKeywords:', profile.examinerKeywords);
  process.exit(0);
}
main().catch(console.error);
