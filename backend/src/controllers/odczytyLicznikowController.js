const db = require("../config/db");

const MIESIACE = ["m01", "m02", "m03", "m04", "m05", "m06", "m07", "m08", "m09", "m10", "m11", "m12"];
let kolumnaImportuGotowa = false;
let tabelaPlikowStorageGotowa = false;

async function zapewnijKolumneImportu() {
  if (kolumnaImportuGotowa) return;

  await db.query(`
    ALTER TABLE odczyty_licznikow
    ADD COLUMN IF NOT EXISTS import_nazwa VARCHAR(220) NULL AFTER rok
  `);

  kolumnaImportuGotowa = true;
}

async function zapewnijTabelePlikowStorage() {
  if (tabelaPlikowStorageGotowa) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS odczyty_pliki_storage (
      kontrahent_nazwa VARCHAR(220) PRIMARY KEY,
      bucket_name VARCHAR(120) NOT NULL DEFAULT 'eltreko-files',
      storage_path VARCHAR(400) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      updated_by_email VARCHAR(220) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  tabelaPlikowStorageGotowa = true;
}

function miesiaceZBody(body) {
  const wynik = {};
  for (const pole of MIESIACE) {
    wynik[pole] = body[pole] == null ? "" : String(body[pole]);
  }
  return wynik;
}

async function listaOdczytow(_req, res) {
  await zapewnijKolumneImportu();
  const wynik = await db.query(
    `SELECT o.*, k.nazwa AS kontrahent_nazwa
     FROM odczyty_licznikow o
     LEFT JOIN klienci k ON k.id = o.kontrahent_id
     ORDER BY o.rok DESC, o.lp ASC, o.created_at DESC`
  );

  return res.json(wynik.rows);
}

async function pobierzPodpieciePliku(req, res) {
  await zapewnijTabelePlikowStorage();
  const kontrahent = String(req.query.kontrahent || "").trim();

  if (!kontrahent) {
    return res.json(null);
  }

  const wynik = await db.query(
    `SELECT kontrahent_nazwa, bucket_name, storage_path, file_name, updated_by_email, created_at, updated_at
     FROM odczyty_pliki_storage
     WHERE LOWER(kontrahent_nazwa) = LOWER(?)
     LIMIT 1`,
    [kontrahent]
  );

  return res.json(wynik.rows[0] || null);
}

async function zapiszPodpieciePliku(req, res) {
  await zapewnijTabelePlikowStorage();

  const kontrahentNazwa = String(req.body.kontrahent_nazwa || "").trim();
  const bucketName = String(req.body.bucket_name || "eltreko-files").trim();
  const storagePath = String(req.body.storage_path || "").trim();
  const fileName = String(req.body.file_name || "").trim() || storagePath.split("/").pop() || "";

  if (!kontrahentNazwa || !storagePath || !fileName) {
    return res.status(400).json({ blad: "Podaj kontrahenta i plik do podpięcia." });
  }

  const istnieje = await db.query(
    `SELECT kontrahent_nazwa
     FROM odczyty_pliki_storage
     WHERE LOWER(kontrahent_nazwa) = LOWER(?)
     LIMIT 1`,
    [kontrahentNazwa]
  );

  if (istnieje.rows.length) {
    await db.query(
      `UPDATE odczyty_pliki_storage
       SET bucket_name = ?, storage_path = ?, file_name = ?, updated_by_email = ?, updated_at = CURRENT_TIMESTAMP
       WHERE LOWER(kontrahent_nazwa) = LOWER(?)`,
      [bucketName, storagePath, fileName, req.uzytkownik?.email || null, kontrahentNazwa]
    );
  } else {
    await db.query(
      `INSERT INTO odczyty_pliki_storage (
        kontrahent_nazwa, bucket_name, storage_path, file_name, updated_by_email
      ) VALUES (?, ?, ?, ?, ?)
      RETURNING kontrahent_nazwa`,
      [kontrahentNazwa, bucketName, storagePath, fileName, req.uzytkownik?.email || null]
    );
  }

  const wynik = await db.query(
    `SELECT kontrahent_nazwa, bucket_name, storage_path, file_name, updated_by_email, created_at, updated_at
     FROM odczyty_pliki_storage
     WHERE LOWER(kontrahent_nazwa) = LOWER(?)
     LIMIT 1`,
    [kontrahentNazwa]
  );

  return res.json(wynik.rows[0] || null);
}

async function utworzOdczyt(req, res) {
  await zapewnijKolumneImportu();
  const { lp, typ_licznika, rodzaj_licznika, numer_licznika, kontrahent_id, rok, import_nazwa } = req.body;
  if (!lp || !String(typ_licznika || "").trim()) {
    return res.status(400).json({ blad: "Podaj LP i opis licznika." });
  }

  const miesiace = miesiaceZBody(req.body);

  const insert = await db.query(
    `INSERT INTO odczyty_licznikow(
      lp, typ_licznika, rodzaj_licznika, numer_licznika, kontrahent_id, rok, import_nazwa,
      m01,m02,m03,m04,m05,m06,m07,m08,m09,m10,m11,m12
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      Number(lp),
      String(typ_licznika).trim(),
      String(rodzaj_licznika || "").trim(),
      String(numer_licznika).trim(),
      kontrahent_id || null,
      Number(rok) || new Date().getFullYear(),
      String(import_nazwa || "").trim() || null,
      miesiace.m01,
      miesiace.m02,
      miesiace.m03,
      miesiace.m04,
      miesiace.m05,
      miesiace.m06,
      miesiace.m07,
      miesiace.m08,
      miesiace.m09,
      miesiace.m10,
      miesiace.m11,
      miesiace.m12
    ]
  );

  const wynik = await db.query(
    `SELECT o.*, k.nazwa AS kontrahent_nazwa
     FROM odczyty_licznikow o
     LEFT JOIN klienci k ON k.id = o.kontrahent_id
     WHERE o.id = ?`,
    [insert.rows.insertId]
  );

  return res.status(201).json(wynik.rows[0]);
}

async function edytujOdczyt(req, res) {
  await zapewnijKolumneImportu();
  const { id } = req.params;
  const { lp, typ_licznika, rodzaj_licznika, numer_licznika, kontrahent_id, rok, import_nazwa } = req.body;
  if (!lp || !String(typ_licznika || "").trim()) {
    return res.status(400).json({ blad: "Podaj LP i opis licznika." });
  }
  const miesiace = miesiaceZBody(req.body);

  const update = await db.query(
    `UPDATE odczyty_licznikow
     SET lp=?, typ_licznika=?, rodzaj_licznika=?, numer_licznika=?, kontrahent_id=?, rok=?, import_nazwa=?,
         m01=?,m02=?,m03=?,m04=?,m05=?,m06=?,m07=?,m08=?,m09=?,m10=?,m11=?,m12=?,
         updated_at=NOW()
     WHERE id=?`,
    [
      Number(lp),
      String(typ_licznika).trim(),
      String(rodzaj_licznika || "").trim(),
      String(numer_licznika || "").trim(),
      kontrahent_id || null,
      Number(rok) || new Date().getFullYear(),
      String(import_nazwa || "").trim() || null,
      miesiace.m01,
      miesiace.m02,
      miesiace.m03,
      miesiace.m04,
      miesiace.m05,
      miesiace.m06,
      miesiace.m07,
      miesiace.m08,
      miesiace.m09,
      miesiace.m10,
      miesiace.m11,
      miesiace.m12,
      id
    ]
  );

  if (!update.rows.affectedRows) {
    return res.status(404).json({ blad: "Nie znaleziono odczytu." });
  }

  const wynik = await db.query(
    `SELECT o.*, k.nazwa AS kontrahent_nazwa
     FROM odczyty_licznikow o
     LEFT JOIN klienci k ON k.id = o.kontrahent_id
     WHERE o.id = ?`,
    [id]
  );

  return res.json(wynik.rows[0]);
}

async function usunOdczyt(req, res) {
  await zapewnijKolumneImportu();
  const { id } = req.params;
  const wynik = await db.query("DELETE FROM odczyty_licznikow WHERE id = ?", [id]);
  if (!wynik.rows.affectedRows) {
    return res.status(404).json({ blad: "Nie znaleziono odczytu." });
  }
  return res.json({ komunikat: "Odczyt zostal usuniety." });
}

async function usunWszystkieOdczyty(_req, res) {
  await zapewnijKolumneImportu();
  const wynik = await db.query("DELETE FROM odczyty_licznikow");
  return res.json({
    komunikat: "Wszystkie odczyty zostaly usuniete.",
    usuniete: Number(wynik.rows.affectedRows || 0)
  });
}

module.exports = {
  listaOdczytow,
  pobierzPodpieciePliku,
  zapiszPodpieciePliku,
  utworzOdczyt,
  edytujOdczyt,
  usunOdczyt,
  usunWszystkieOdczyty
};
