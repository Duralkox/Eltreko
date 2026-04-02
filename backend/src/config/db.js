const mysql = require("mysql2/promise");
const { Pool } = require("pg");

const klientBazy = String(process.env.DB_CLIENT || "mysql").toLowerCase();

function skonfigurujMysql() {
  return mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "eltrekoapp",
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: 10
  });
}

function skonfigurujPostgres() {
  const sslWlaczone = String(process.env.DB_SSL || "true").toLowerCase() !== "false";

  return new Pool({
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.DB_HOST || undefined,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    user: process.env.DB_USER || undefined,
    password: process.env.DB_PASSWORD || undefined,
    database: process.env.DB_NAME || undefined,
    ssl: sslWlaczone ? { rejectUnauthorized: false } : false,
    max: 10
  });
}

const pool = klientBazy === "postgres" ? skonfigurujPostgres() : skonfigurujMysql();

function zamienPlaceholdery(sql) {
  let indeks = 0;
  return sql.replace(/\?/g, () => `$${++indeks}`);
}

function poprawSqlDlaPostgresa(sql) {
  let wynik = sql;

  wynik = wynik.replace(/\s+AFTER\s+[a-zA-Z_][a-zA-Z0-9_]*/gi, "");
  wynik = wynik.replace(/`/g, "");
  wynik = wynik.replace(/\bTINYINT\s*\(\s*1\s*\)/gi, "SMALLINT");
  wynik = wynik.replace(/\bDATETIME\b/gi, "TIMESTAMP");
  wynik = wynik.replace(/\bLONGTEXT\b/gi, "TEXT");

  return zamienPlaceholdery(wynik);
}

async function queryMysql(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return { rows };
}

async function queryPostgres(sql, params = []) {
  let finalSql = poprawSqlDlaPostgresa(sql);
  const insertBezReturning = /^\s*INSERT\s+INTO\s+/i.test(finalSql) && !/\bRETURNING\b/i.test(finalSql);

  if (insertBezReturning) {
    finalSql = `${finalSql.trim()} RETURNING id`;
  }

  const result = await pool.query(finalSql, params);

  if (/^\s*SELECT\b/i.test(finalSql)) {
    return { rows: result.rows };
  }

  if (insertBezReturning) {
    return {
      rows: {
        insertId: result.rows?.[0]?.id ?? null,
        affectedRows: result.rowCount ?? 0
      }
    };
  }

  return {
    rows: {
      affectedRows: result.rowCount ?? 0
    }
  };
}

async function query(sql, params = []) {
  if (klientBazy === "postgres") {
    return queryPostgres(sql, params);
  }

  return queryMysql(sql, params);
}

module.exports = { query, pool, klientBazy };
