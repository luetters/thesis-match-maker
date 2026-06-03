import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();

const conn = await createConnection(process.env.DATABASE_URL);
const [result] = await conn.execute(
  "UPDATE users SET name = ? WHERE email = ?",
  ['Prof. Dr. Holger Lütters', 'holger.luetters@htw-berlin.de']
);
console.log('Affected rows:', result.affectedRows);
await conn.end();
