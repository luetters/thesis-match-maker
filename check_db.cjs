const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();
(async () => {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.query('SELECT id, status, examiner_id, wanted_examiner_id FROM thesis_requests LIMIT 10');
  console.log(JSON.stringify(rows, null, 2));
  await conn.end();
})().catch(e => console.error(e.message));
