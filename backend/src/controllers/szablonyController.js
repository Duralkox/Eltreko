const db = require("../config/db");

async function listaSzablonow(_req, res) {
  const wynik = await db.query(
    "SELECT id, nazwa, sciezka_pliku, created_at, uploaded_by FROM szablony ORDER BY created_at DESC"
  );
  return res.json(wynik.rows);
}

async function dodajSzablon(req, res) {
  if (!req.file) {
    return res.status(400).json({ blad: "Brak pliku szablonu." });
  }
  const nazwa = req.body.nazwa || req.file.originalname;
  const insert = await db.query(
    `INSERT INTO szablony(nazwa, sciezka_pliku, uploaded_by)
     VALUES(?,?,?)`,
    [nazwa, req.file.path, req.uzytkownik.id]
  );
  const wynik = await db.query("SELECT * FROM szablony WHERE id = ?", [insert.rows.insertId]);
  return res.status(201).json(wynik.rows[0]);
}

async function usunSzablon(req, res) {
  const { id } = req.params;
  const wynik = await db.query("DELETE FROM szablony WHERE id = ?", [id]);
  if (!wynik.rows.affectedRows) {
    return res.status(404).json({ blad: "Nie znaleziono szablonu." });
  }
  return res.json({ komunikat: "Szablon został usunięty." });
}

module.exports = { listaSzablonow, dodajSzablon, usunSzablon };
