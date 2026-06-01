import mysql2 from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function main() {
  const conn = await mysql2.createConnection(process.env.DATABASE_URL);
  
  // Read journal
  const journal = JSON.parse(fs.readFileSync('./drizzle/meta/_journal.json', 'utf8'));
  
  // Get existing migrations
  const [existing] = await conn.query('SELECT hash FROM __drizzle_migrations');
  const existingHashes = new Set(existing.map(r => r.hash));
  console.log('Existing hashes in DB:', existingHashes.size);
  
  // For each journal entry, compute hash from snapshot and insert if missing
  for (const entry of journal.entries) {
    const snapshotPath = path.join('./drizzle/meta', String(entry.idx).padStart(4, '0') + '_snapshot.json');
    
    let snapshotContent;
    try {
      snapshotContent = fs.readFileSync(snapshotPath, 'utf8');
    } catch {
      console.log('No snapshot for', entry.tag, '- skipping');
      continue;
    }
    
    const hash = crypto.createHash('sha256').update(snapshotContent).digest('hex');
    
    const alreadyExists = existingHashes.has(hash);
    if (!alreadyExists) {
      await conn.query('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)', [hash, entry.when]);
      console.log('Inserted migration:', entry.tag, hash.substring(0, 20));
    } else {
      console.log('Already exists:', entry.tag);
    }
  }
  
  await conn.end();
  console.log('Done!');
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
