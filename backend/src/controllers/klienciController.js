const db = require("../config/db");

async function listaKlientow(req, res) {
  const fraza = req.query.q ? `%${req.query.q}%` : "%%";
  const wynik = await db.query(
    `SELECT * FROM klienci
     WHERE nazwa LIKE ? OR adres LIKE ? OR email LIKE ? OR telefon LIKE ?
     ORDER BY created_at DESC`,
    [fraza, fraza, fraza, fraza]
  );
  return res.json(wynik.rows);
}

async function utworzKlienta(req, res) {
  const { nazwa, adres, telefon, email, notatki } = req.body;
  const insert = await db.query(
    `INSERT INTO klienci(nazwa, adres, telefon, email, notatki)
     VALUES(?,?,?,?,?)`,
    [nazwa, adres, telefon, email, notatki]
  );
  const wynik = await db.query("SELECT * FROM klienci WHERE id = ?", [insert.rows.insertId]);
  return res.status(201).json(wynik.rows[0]);
}

async function edytujKlienta(req, res) {
  const { id } = req.params;
  const { nazwa, adres, telefon, email, notatki } = req.body;
  const update = await db.query(
    `UPDATE klienci
     SET nazwa=?, adres=?, telefon=?, email=?, notatki=?, updated_at=NOW()
     WHERE id=?`,
    [nazwa, adres, telefon, email, notatki, id]
  );
  if (!update.rows.affectedRows) {
    return res.status(404).json({ blad: "Nie znaleziono klienta." });
  }
  const wynik = await db.query("SELECT * FROM klienci WHERE id = ?", [id]);
  return res.json(wynik.rows[0]);
}

async function usunKlienta(req, res) {
  const { id } = req.params;
  const wynik = await db.query("DELETE FROM klienci WHERE id = ?", [id]);
  if (!wynik.rows.affectedRows) {
    return res.status(404).json({ blad: "Nie znaleziono klienta." });
  }
  return res.json({ komunikat: "Klient został usunięty." });
}

module.exports = { listaKlientow, utworzKlienta, edytujKlienta, usunKlienta };
