const db = require("../config/db");

let tabelaZgloszenRozszerzona = false;

function normalizujZdjecia(zdjecia) {
  if (!Array.isArray(zdjecia)) return [];

  return zdjecia
    .map((zdjecie) => {
      if (typeof zdjecie === "string") {
        return {
          name: zdjecie.split("/").pop() || "zdjecie",
          path: zdjecie
        };
      }

      if (!zdjecie || typeof zdjecie !== "object") {
        return null;
      }

      const name = String(zdjecie.name || zdjecie.fileName || zdjecie.path || "").trim();
      const path = String(zdjecie.path || "").trim();
      const url = String(zdjecie.url || "").trim();
      const bucket = String(zdjecie.bucket || "").trim();
      const contentType = String(zdjecie.contentType || "").trim();

      if (!name && !path && !url) {
        return null;
      }

      return {
        name: name || path.split("/").pop() || "zdjecie",
        path: path || null,
        url: url || null,
        bucket: bucket || null,
        contentType: contentType || null
      };
    })
    .filter(Boolean);
}

function sparsujZdjecia(wartosc) {
  if (!wartosc) return [];

  try {
    return normalizujZdjecia(JSON.parse(wartosc));
  } catch (_error) {
    return [];
  }
}

function mapujWierszZgloszenia(wiersz) {
  if (!wiersz) return wiersz;

  return {
    ...wiersz,
    osiedle_nazwa: wiersz.osiedle_nazwa || wiersz.kontrahent_nazwa || "",
    kontrahent_nazwa: wiersz.kontrahent_glowny_nazwa || wiersz.kontrahent_nazwa || "",
    zdjecia: sparsujZdjecia(wiersz.zdjecia_json)
  };
}

async function zapewnijRozszerzonaTabeleZgloszen() {
  if (tabelaZgloszenRozszerzona) return;

  await db.query(`
    ALTER TABLE zgloszenia
    ADD COLUMN IF NOT EXISTS osiedle_nazwa VARCHAR(220) NULL AFTER kontrahent_id
  `);

  await db.query(`
    ALTER TABLE zgloszenia
    ADD COLUMN IF NOT EXISTS kontrahent_nazwa VARCHAR(220) NULL AFTER osiedle_nazwa
  `);

  await db.query(`
    ALTER TABLE zgloszenia
    ADD COLUMN IF NOT EXISTS zglaszajacy_email VARCHAR(220) NULL AFTER kontrahent_nazwa
  `);

  await db.query(`
    ALTER TABLE zgloszenia
    ADD COLUMN IF NOT EXISTS zdjecia_json LONGTEXT NULL AFTER zglaszajacy_email
  `);

  tabelaZgloszenRozszerzona = true;
}

async function listaZgloszen(req, res) {
  await zapewnijRozszerzonaTabeleZgloszen();
  const { q = "", status = "" } = req.query;
  const fraza = `%${q}%`;
  const warunki = [
    "(z.tytul LIKE ? OR z.opis LIKE ? OR COALESCE(z.osiedle_nazwa, k.nazwa, '') LIKE ? OR COALESCE(z.kontrahent_nazwa, '') LIKE ? OR COALESCE(k.nazwa, '') LIKE ?)"
  ];
  const params = [fraza, fraza, fraza, fraza, fraza];

  if (status) {
    warunki.push("z.status = ?");
    params.push(status);
  }

  const wynik = await db.query(
    `SELECT z.*,
            COALESCE(z.osiedle_nazwa, c.nazwa) AS osiedle_nazwa,
            COALESCE(z.kontrahent_nazwa, '') AS kontrahent_glowny_nazwa,
            c.nazwa AS kontrahent_nazwa,
            k.nazwa AS kategoria_nazwa
     FROM zgloszenia z
     LEFT JOIN klienci c ON c.id = z.kontrahent_id
     LEFT JOIN kategorie_usterek k ON k.id = z.kategoria_usterki_id
     WHERE ${warunki.join(" AND ")}
     ORDER BY z.created_at DESC`,
    params
  );

  return res.json(wynik.rows.map(mapujWierszZgloszenia));
}

async function listaOpcjiZgloszen(_req, res) {
  await zapewnijRozszerzonaTabeleZgloszen();

  const wynik = await db.query(
    `SELECT
        o.kontrahent_id AS id,
        NULLIF(k.nazwa, '') AS osiedle_nazwa,
        MAX(COALESCE(NULLIF(o.import_nazwa, ''), '')) AS kontrahent_nazwa
     FROM odczyty_licznikow o
     LEFT JOIN klienci k ON k.id = o.kontrahent_id
     WHERE o.kontrahent_id IS NOT NULL
       AND NULLIF(k.nazwa, '') IS NOT NULL
     GROUP BY
       o.kontrahent_id,
       NULLIF(k.nazwa, '')
     ORDER BY
       MAX(COALESCE(NULLIF(o.import_nazwa, ''), '')),
       NULLIF(k.nazwa, '')`
  );

  const opcje = wynik.rows
    .map((wiersz) => ({
      id: wiersz.id,
      osiedle_nazwa: String(wiersz.osiedle_nazwa || "").trim(),
      kontrahent_nazwa: String(wiersz.kontrahent_nazwa || "").trim()
    }))
    .filter((wiersz) => wiersz.id && wiersz.osiedle_nazwa);

  return res.json(opcje);
}

async function utworzZgloszenie(req, res) {
  await zapewnijRozszerzonaTabeleZgloszen();

  const {
    tytul,
    opis,
    kontrahent_id,
    osiedle_nazwa,
    kontrahent_nazwa,
    zglaszajacy_email,
    zdjecia,
    kategoria_usterki_id,
    status,
    priorytet
  } = req.body;

  if (!String(tytul || "").trim()) {
    return res.status(400).json({ blad: "Podaj tytul zgloszenia." });
  }

  const zdjeciaJson = JSON.stringify(normalizujZdjecia(zdjecia));

  const insert = await db.query(
    `INSERT INTO zgloszenia(
      tytul, opis, kontrahent_id, osiedle_nazwa, kontrahent_nazwa, zglaszajacy_email, zdjecia_json,
      kategoria_usterki_id, status, priorytet
     )
     VALUES(?,?,?,?,?,?,?,?,?,?)`,
    [
      String(tytul).trim(),
      opis || "",
      kontrahent_id || null,
      String(osiedle_nazwa || "").trim() || null,
      String(kontrahent_nazwa || "").trim() || null,
      String(zglaszajacy_email || req.uzytkownik?.email || "").trim() || null,
      zdjeciaJson,
      kategoria_usterki_id || null,
      status || "Nowe",
      priorytet || "Normalny"
    ]
  );

  const wynik = await db.query(
    `SELECT z.*,
            COALESCE(z.osiedle_nazwa, c.nazwa) AS osiedle_nazwa,
            COALESCE(z.kontrahent_nazwa, '') AS kontrahent_glowny_nazwa,
            c.nazwa AS kontrahent_nazwa,
            k.nazwa AS kategoria_nazwa
     FROM zgloszenia z
     LEFT JOIN klienci c ON c.id = z.kontrahent_id
     LEFT JOIN kategorie_usterek k ON k.id = z.kategoria_usterki_id
     WHERE z.id = ?`,
    [insert.rows.insertId]
  );

  return res.status(201).json(mapujWierszZgloszenia(wynik.rows[0]));
}

async function edytujZgloszenie(req, res) {
  await zapewnijRozszerzonaTabeleZgloszen();
  const { id } = req.params;
  const {
    tytul,
    opis,
    kontrahent_id,
    osiedle_nazwa,
    kontrahent_nazwa,
    zglaszajacy_email,
    zdjecia,
    kategoria_usterki_id,
    status,
    priorytet
  } = req.body;

  const zdjeciaJson = JSON.stringify(normalizujZdjecia(zdjecia));

  const update = await db.query(
    `UPDATE zgloszenia
     SET tytul=?, opis=?, kontrahent_id=?, osiedle_nazwa=?, kontrahent_nazwa=?, zglaszajacy_email=?, zdjecia_json=?,
         kategoria_usterki_id=?, status=?, priorytet=?, updated_at=NOW()
     WHERE id=?`,
    [
      String(tytul || "").trim(),
      opis || "",
      kontrahent_id || null,
      String(osiedle_nazwa || "").trim() || null,
      String(kontrahent_nazwa || "").trim() || null,
      String(zglaszajacy_email || req.uzytkownik?.email || "").trim() || null,
      zdjeciaJson,
      kategoria_usterki_id || null,
      status || "Nowe",
      priorytet || "Normalny",
      id
    ]
  );

  if (!update.rows.affectedRows) {
    return res.status(404).json({ blad: "Nie znaleziono zgloszenia." });
  }

  const wynik = await db.query(
    `SELECT z.*,
            COALESCE(z.osiedle_nazwa, c.nazwa) AS osiedle_nazwa,
            COALESCE(z.kontrahent_nazwa, '') AS kontrahent_glowny_nazwa,
            c.nazwa AS kontrahent_nazwa,
            k.nazwa AS kategoria_nazwa
     FROM zgloszenia z
     LEFT JOIN klienci c ON c.id = z.kontrahent_id
     LEFT JOIN kategorie_usterek k ON k.id = z.kategoria_usterki_id
     WHERE z.id = ?`,
    [id]
  );

  return res.json(mapujWierszZgloszenia(wynik.rows[0]));
}

async function usunZgloszenie(req, res) {
  const { id } = req.params;
  const wynik = await db.query("DELETE FROM zgloszenia WHERE id = ?", [id]);
  if (!wynik.rows.affectedRows) {
    return res.status(404).json({ blad: "Nie znaleziono zgloszenia." });
  }
  return res.json({ komunikat: "Zgłoszenie zostało usunięte." });
}

module.exports = { listaZgloszen, listaOpcjiZgloszen, utworzZgloszenie, edytujZgloszenie, usunZgloszenie };
