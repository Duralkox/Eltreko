const db = require("../config/db");

async function listaZgloszen(req, res) {
  const { q = "", status = "" } = req.query;
  const fraza = `%${q}%`;
  const warunki = ["(z.tytul LIKE ? OR z.opis LIKE ? OR k.nazwa LIKE ? OR c.nazwa LIKE ?)"];
  const params = [fraza, fraza, fraza, fraza];

  if (status) {
    warunki.push("z.status = ?");
    params.push(status);
  }

  const wynik = await db.query(
    `SELECT z.*, c.nazwa AS kontrahent_nazwa, k.nazwa AS kategoria_nazwa
     FROM zgloszenia z
     LEFT JOIN klienci c ON c.id = z.kontrahent_id
     LEFT JOIN kategorie_usterek k ON k.id = z.kategoria_usterki_id
     WHERE ${warunki.join(" AND ")}
     ORDER BY z.created_at DESC`,
    params
  );

  return res.json(wynik.rows);
}

async function utworzZgloszenie(req, res) {
  const { tytul, opis, kontrahent_id, kategoria_usterki_id, status, priorytet } = req.body;
  if (!String(tytul || "").trim()) {
    return res.status(400).json({ blad: "Podaj tytul zgloszenia." });
  }

  const insert = await db.query(
    `INSERT INTO zgloszenia(tytul, opis, kontrahent_id, kategoria_usterki_id, status, priorytet)
     VALUES(?,?,?,?,?,?)`,
    [
      String(tytul).trim(),
      opis || "",
      kontrahent_id || null,
      kategoria_usterki_id || null,
      status || "Nowe",
      priorytet || "Normalny"
    ]
  );

  const wynik = await db.query(
    `SELECT z.*, c.nazwa AS kontrahent_nazwa, k.nazwa AS kategoria_nazwa
     FROM zgloszenia z
     LEFT JOIN klienci c ON c.id = z.kontrahent_id
     LEFT JOIN kategorie_usterek k ON k.id = z.kategoria_usterki_id
     WHERE z.id = ?`,
    [insert.rows.insertId]
  );

  return res.status(201).json(wynik.rows[0]);
}

async function edytujZgloszenie(req, res) {
  const { id } = req.params;
  const { tytul, opis, kontrahent_id, kategoria_usterki_id, status, priorytet } = req.body;

  const update = await db.query(
    `UPDATE zgloszenia
     SET tytul=?, opis=?, kontrahent_id=?, kategoria_usterki_id=?, status=?, priorytet=?, updated_at=NOW()
     WHERE id=?`,
    [
      String(tytul || "").trim(),
      opis || "",
      kontrahent_id || null,
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
    `SELECT z.*, c.nazwa AS kontrahent_nazwa, k.nazwa AS kategoria_nazwa
     FROM zgloszenia z
     LEFT JOIN klienci c ON c.id = z.kontrahent_id
     LEFT JOIN kategorie_usterek k ON k.id = z.kategoria_usterki_id
     WHERE z.id = ?`,
    [id]
  );

  return res.json(wynik.rows[0]);
}

async function usunZgloszenie(req, res) {
  const { id } = req.params;
  const wynik = await db.query("DELETE FROM zgloszenia WHERE id = ?", [id]);
  if (!wynik.rows.affectedRows) {
    return res.status(404).json({ blad: "Nie znaleziono zgloszenia." });
  }
  return res.json({ komunikat: "Zgloszenie zostalo usuniete." });
}

module.exports = { listaZgloszen, utworzZgloszenie, edytujZgloszenie, usunZgloszenie };
