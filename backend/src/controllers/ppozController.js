const db = require("../config/db");

let kolumnyPpozGotowe = false;
let constraintStatusuGotowy = false;

function normalizujStatus(status) {
  const mapa = {
    "planowany": "Planowany",
    "w realizacji": "W realizacji",
    "zakonczony": "Zakończony",
    "zakończony": "Zakończony"
  };

  const klucz = String(status || "").trim().toLowerCase();
  return mapa[klucz] || "Planowany";
}

async function zapewnijKolumnyPpoz() {
  if (kolumnyPpozGotowe) return;

  await db.query(`
    ALTER TABLE ppoz_przeglady
    ADD COLUMN IF NOT EXISTS kontrahent_nazwa VARCHAR(220) NULL
  `);

  await db.query(`
    ALTER TABLE ppoz_przeglady
    ADD COLUMN IF NOT EXISTS budynek_nazwa VARCHAR(220) NULL
  `);

  kolumnyPpozGotowe = true;
}

async function zapewnijConstraintStatusu() {
  if (constraintStatusuGotowy || db.klientBazy !== "postgres") return;

  await db.query(`
    ALTER TABLE ppoz_przeglady
    DROP CONSTRAINT IF EXISTS ppoz_przeglady_status_check
  `);

  await db.query(`
    ALTER TABLE ppoz_przeglady
    ADD CONSTRAINT ppoz_przeglady_status_check
    CHECK (status IN ('Planowany', 'W realizacji', 'Zakończony'))
  `);

  constraintStatusuGotowy = true;
}

async function przygotujPpoz() {
  await zapewnijKolumnyPpoz();
  await zapewnijConstraintStatusu();
}

async function listaPpozPrzegladow(req, res) {
  await przygotujPpoz();

  const q = `%${req.query.q || ""}%`;
  const wynik = await db.query(
    `SELECT
        p.*,
        COALESCE(p.kontrahent_nazwa, k.nazwa) AS kontrahent_nazwa
     FROM ppoz_przeglady p
     LEFT JOIN klienci k ON k.id = p.kontrahent_id
     WHERE p.nazwa LIKE ?
        OR p.opis LIKE ?
        OR COALESCE(p.kontrahent_nazwa, k.nazwa, '') LIKE ?
        OR COALESCE(p.budynek_nazwa, '') LIKE ?
     ORDER BY p.data_przegladu DESC, p.created_at DESC`,
    [q, q, q, q]
  );

  return res.json(wynik.rows);
}

async function utworzPpozPrzeglad(req, res) {
  await przygotujPpoz();

  const { nazwa, data_przegladu, kontrahent_id, kontrahent_nazwa, budynek_nazwa, opis, status } = req.body;
  if (!String(nazwa || "").trim()) {
    return res.status(400).json({ blad: "Podaj nazwę przeglądu PPOŻ." });
  }

  const insert = await db.query(
    `INSERT INTO ppoz_przeglady(nazwa, data_przegladu, kontrahent_id, kontrahent_nazwa, budynek_nazwa, opis, status)
     VALUES(?,?,?,?,?,?,?)`,
    [
      String(nazwa).trim(),
      data_przegladu || null,
      kontrahent_id || null,
      String(kontrahent_nazwa || "").trim() || null,
      String(budynek_nazwa || "").trim() || null,
      opis || "",
      normalizujStatus(status)
    ]
  );

  const wynik = await db.query(
    `SELECT
        p.*,
        COALESCE(p.kontrahent_nazwa, k.nazwa) AS kontrahent_nazwa
     FROM ppoz_przeglady p
     LEFT JOIN klienci k ON k.id = p.kontrahent_id
     WHERE p.id = ?`,
    [insert.rows.insertId]
  );

  return res.status(201).json(wynik.rows[0]);
}

async function edytujPpozPrzeglad(req, res) {
  await przygotujPpoz();

  const { id } = req.params;
  const { nazwa, data_przegladu, kontrahent_id, kontrahent_nazwa, budynek_nazwa, opis, status } = req.body;
  if (!String(nazwa || "").trim()) {
    return res.status(400).json({ blad: "Podaj nazwę przeglądu PPOŻ." });
  }

  const update = await db.query(
    `UPDATE ppoz_przeglady
     SET nazwa=?, data_przegladu=?, kontrahent_id=?, kontrahent_nazwa=?, budynek_nazwa=?, opis=?, status=?, updated_at=NOW()
     WHERE id=?`,
    [
      String(nazwa).trim(),
      data_przegladu || null,
      kontrahent_id || null,
      String(kontrahent_nazwa || "").trim() || null,
      String(budynek_nazwa || "").trim() || null,
      opis || "",
      normalizujStatus(status),
      id
    ]
  );

  if (!update.rows.affectedRows) {
    return res.status(404).json({ blad: "Nie znaleziono przeglądu PPOŻ." });
  }

  const wynik = await db.query(
    `SELECT
        p.*,
        COALESCE(p.kontrahent_nazwa, k.nazwa) AS kontrahent_nazwa
     FROM ppoz_przeglady p
     LEFT JOIN klienci k ON k.id = p.kontrahent_id
     WHERE p.id = ?`,
    [id]
  );

  return res.json(wynik.rows[0]);
}

async function usunPpozPrzeglad(req, res) {
  await przygotujPpoz();

  const wynik = await db.query("DELETE FROM ppoz_przeglady WHERE id = ?", [req.params.id]);
  if (!wynik.rows.affectedRows) {
    return res.status(404).json({ blad: "Nie znaleziono przeglądu PPOŻ." });
  }

  return res.json({ komunikat: "Przegląd PPOŻ został usunięty." });
}

module.exports = { listaPpozPrzegladow, utworzPpozPrzeglad, edytujPpozPrzeglad, usunPpozPrzeglad };
