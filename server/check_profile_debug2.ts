import { getProfile } from './db';

async function main() {
  // User ID 1920001 = holger.luetters@htw-berlin.de
  const profile = await getProfile(1920001);
  if (!profile) { console.log('Profile not found'); return; }
  console.log('examinerLanguages type:', typeof profile.examinerLanguages);
  console.log('examinerLanguages value:', JSON.stringify(profile.examinerLanguages));
  console.log('examinerBio type:', typeof profile.examinerBio);
  console.log('examinerBio length:', profile.examinerBio?.length ?? 0);
  console.log('examinerResearchFocus:', profile.examinerResearchFocus ? profile.examinerResearchFocus.substring(0, 50) : null);
  process.exit(0);
}
main().catch(console.error);
