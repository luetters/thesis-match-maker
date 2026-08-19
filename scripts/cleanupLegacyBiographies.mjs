import mysql from "mysql2/promise";

function sanitizeBiographyText(value) {
  return String(value)
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/<(?:br\s*\/?)\s*>/gi, "\n")
    .replace(/<\/?(?:p|div|h[1-6]|li|blockquote|ul|ol)[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/[<>]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 10_000);
}

async function cleanColumn(connection, table, idColumn, column) {
  const [rows] = await connection.execute(
    `SELECT \`${idColumn}\` AS id, \`${column}\` AS value FROM \`${table}\` WHERE \`${column}\` IS NOT NULL`,
  );
  let updated = 0;
  for (const row of rows) {
    const cleaned = sanitizeBiographyText(row.value);
    if (cleaned === row.value) continue;
    await connection.execute(
      `UPDATE \`${table}\` SET \`${column}\` = ? WHERE \`${idColumn}\` = ?`,
      [cleaned || null, row.id],
    );
    updated += 1;
  }
  return updated;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL ist für den Bereinigungslauf erforderlich.");
}

const database = new URL(databaseUrl);
const connection = await mysql.createConnection({
  host: database.hostname,
  port: database.port ? Number(database.port) : 3306,
  user: decodeURIComponent(database.username),
  password: decodeURIComponent(database.password),
  database: database.pathname.replace(/^\//, ""),
  ssl: database.searchParams.get("ssl") === "false" ? undefined : { rejectUnauthorized: false },
});

try {
  await connection.beginTransaction();
  const usersBio = await cleanColumn(connection, "users", "id", "bio");
  const examinerBio = await cleanColumn(connection, "examiner_profiles", "id", "bio");
  const examinerResearchFocus = await cleanColumn(connection, "examiner_profiles", "id", "researchFocus");
  await connection.commit();
  console.log(JSON.stringify({ usersBio, examinerBio, examinerResearchFocus, total: usersBio + examinerBio + examinerResearchFocus }));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}

process.exit(0);
