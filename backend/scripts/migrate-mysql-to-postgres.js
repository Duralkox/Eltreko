require("dotenv").config();

const mysql = require("mysql2/promise");
const { Pool } = require("pg");

const tabele = [
  "uzytkownicy",
  "klienci",
  "kategorie_usterek",
  "czynnosci_serwisowe",
  "definicje_czesci",
  "szablony_przegladow",
  "protokoly",
  "protokol_zdjecia",
  "szablony",
  "zgloszenia",
  "odczyty_licznikow",
  "ppoz_przeglady"
];

function sourceMysql() {
  return mysql.createPool({
    host: process.env.MYSQL_SOURCE_HOST || process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_SOURCE_PORT || process.env.DB_PORT || 3306),
    user: process.env.MYSQL_SOURCE_USER || process.env.DB_USER || "root",
    password: process.env.MYSQL_SOURCE_PASSWORD || process.env.DB_PASSWORD || "",
    database: process.env.MYSQL_SOURCE_NAME || process.env.DB_NAME || "eltrekoapp",
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: 5
  });
}

function targetPostgres() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: String(process.env.DB_SSL || "true").toLowerCase() !== "false" ? { rejectUnauthorized: false } : false
  });
}

function escapeIdentifier(name) {
  return `"${String(name).replace(/"/g, "\"\"")}"`;
}

async function pobierzKolumny(mysqlPool, tabela) {
  const [rows] = await mysqlPool.query(`SHOW COLUMNS FROM \`${tabela}\``);
  return rows.map((row) => row.Field);
}

async function kopiujTabele(mysqlPool, pgPool, tabela) {
  const kolumny = await pobierzKolumny(mysqlPool, tabela);
  const [rows] = await mysqlPool.query(`SELECT * FROM \`${tabela}\``);

  await pgPool.query(`TRUNCATE TABLE ${escapeIdentifier(tabela)} RESTART IDENTITY CASCADE`);

  if (!rows.length) {
    console.log(`Pominięto ${tabela}: brak rekordów`);
    return;
  }

  const quotedColumns = kolumny.map(escapeIdentifier).join(", ");

  for (const row of rows) {
    const values = kolumny.map((kolumna) => row[kolumna]);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
    await pgPool.query(
      `INSERT INTO ${escapeIdentifier(tabela)} (${quotedColumns}) OVERRIDING SYSTEM VALUE VALUES (${placeholders})`,
      values
    );
  }

  const sequenceName = `${tabela}_id_seq`;
  await pgPool.query(
    `SELECT setval($1, COALESCE((SELECT MAX(id) FROM ${escapeIdentifier(tabela)}), 1), true)`,
    [sequenceName]
  ).catch(() => {});

  console.log(`Skopiowano ${tabela}: ${rows.length} rekordów`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Brak DATABASE_URL do Postgresa/Supabase.");
  }

  const mysqlPool = sourceMysql();
  const pgPool = targetPostgres();

  try {
    for (const tabela of tabele) {
      await kopiujTabele(mysqlPool, pgPool, tabela);
    }
    console.log("Migracja danych MySQL -> Postgres zakończona.");
  } finally {
    await mysqlPool.end();
    await pgPool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
