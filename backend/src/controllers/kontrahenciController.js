const db = require("../config/db");

let metaKontrahentowGotowe = false;

async function zapewnijTabeleMetaKontrahentow() {
  if (metaKontrahentowGotowe) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS kontrahenci_meta (
      kontrahent_nazwa VARCHAR(220) PRIMARY KEY,
      zlecajacy VARCHAR(220),
      adres_protokolu TEXT,
      updated_by_email VARCHAR(220),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  metaKontrahentowGotowe = true;
}

async function listaMetaKontrahentow(_req, res) {
  await zapewnijTabeleMetaKontrahentow();
  const wynik = await db.query(
    `SELECT kontrahent_nazwa, zlecajacy, adres_protokolu, updated_by_email, created_at, updated_at
     FROM kontrahenci_meta
     ORDER BY kontrahent_nazwa ASC`
  );
  return res.json(wynik.rows);
}

async function zapiszMetaKontrahenta(req, res) {
  await zapewnijTabeleMetaKontrahentow();

  const staraNazwa = String(req.body.stara_nazwa || "").trim();
  const kontrahentNazwa = String(req.body.kontrahent_nazwa || "").trim();
  const zlecajacy = String(req.body.zlecajacy || "").trim() || null;
  const adresProtokolu = String(req.body.adres_protokolu || "").trim() || null;

  if (!kontrahentNazwa) {
    return res.status(400).json({ blad: "Podaj nazwę kontrahenta." });
  }

  const istnieje = await db.query(
    `SELECT kontrahent_nazwa
     FROM kontrahenci_meta
     WHERE LOWER(kontrahent_nazwa) = LOWER(?)`,
    [staraNazwa || kontrahentNazwa]
  );

  if (istnieje.rows.length) {
    await db.query(
      `UPDATE kontrahenci_meta
       SET kontrahent_nazwa=?, zlecajacy=?, adres_protokolu=?, updated_by_email=?, updated_at=NOW()
       WHERE LOWER(kontrahent_nazwa) = LOWER(?)`,
      [kontrahentNazwa, zlecajacy, adresProtokolu, req.uzytkownik?.email || null, staraNazwa || kontrahentNazwa]
    );
  } else {
    await db.query(
      `INSERT INTO kontrahenci_meta (kontrahent_nazwa, zlecajacy, adres_protokolu, updated_by_email)
       VALUES (?, ?, ?, ?)`,
      [kontrahentNazwa, zlecajacy, adresProtokolu, req.uzytkownik?.email || null]
    );
  }

  const wynik = await db.query(
    `SELECT kontrahent_nazwa, zlecajacy, adres_protokolu, updated_by_email, created_at, updated_at
     FROM kontrahenci_meta
     WHERE LOWER(kontrahent_nazwa) = LOWER(?)`,
    [kontrahentNazwa]
  );

  return res.json(wynik.rows[0]);
}

module.exports = {
  listaMetaKontrahentow,
  zapiszMetaKontrahenta
};
