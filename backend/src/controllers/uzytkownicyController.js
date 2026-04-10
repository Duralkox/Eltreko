const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../config/db");

async function generujTechnicznyHash() {
  return bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);
}

async function listaUzytkownikow(_req, res) {
  const wynik = await db.query(
    "SELECT id, email, imie_nazwisko, rola, aktywny, created_at FROM uzytkownicy ORDER BY created_at DESC"
  );
  return res.json(wynik.rows);
}

async function listaTechnikow(_req, res) {
  const wynik = await db.query(
    "SELECT id, email, imie_nazwisko FROM uzytkownicy WHERE rola = 'Technik' AND aktywny = 1 ORDER BY imie_nazwisko"
  );
  return res.json(wynik.rows);
}

async function utworzUzytkownika(req, res) {
  const { email, imie_nazwisko, rola } = req.body;
  const hash = await generujTechnicznyHash();
  const insert = await db.query(
    `INSERT INTO uzytkownicy(email, haslo_hash, imie_nazwisko, rola)
     VALUES(?,?,?,?)`,
    [email, hash, imie_nazwisko, rola]
  );
  const wynik = await db.query(
    "SELECT id, email, imie_nazwisko, rola, aktywny FROM uzytkownicy WHERE id = ?",
    [insert.rows.insertId]
  );
  return res.status(201).json(wynik.rows[0]);
}

async function edytujUzytkownika(req, res) {
  const { id } = req.params;
  const { email, imie_nazwisko, rola, aktywny } = req.body;

  const update = await db.query(
    `UPDATE uzytkownicy
     SET email=?, imie_nazwisko=?, rola=?, aktywny=?, updated_at=NOW()
     WHERE id=?`,
    [email, imie_nazwisko, rola, aktywny, id]
  );

  if (!update.rows.affectedRows) {
    return res.status(404).json({ blad: "Nie znaleziono użytkownika." });
  }

  const wynik = await db.query(
    "SELECT id, email, imie_nazwisko, rola, aktywny FROM uzytkownicy WHERE id = ?",
    [id]
  );
  return res.json(wynik.rows[0]);
}

async function usunUzytkownika(req, res) {
  const { id } = req.params;
  const wynik = await db.query("DELETE FROM uzytkownicy WHERE id = ?", [id]);
  if (!wynik.rows.affectedRows) {
    return res.status(404).json({ blad: "Nie znaleziono użytkownika." });
  }
  return res.json({ komunikat: "Użytkownik został usunięty." });
}

module.exports = {
  listaUzytkownikow,
  listaTechnikow,
  utworzUzytkownika,
  edytujUzytkownika,
  usunUzytkownika
};
