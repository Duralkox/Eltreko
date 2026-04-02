const db = require("../config/db");

let domyslneCzesciGotowe = false;

async function zapewnijDomyslneCzesci() {
  if (domyslneCzesciGotowe) return;

  const wynik = await db.query("SELECT COUNT(*) AS liczba FROM definicje_czesci");
  const liczba = Number(wynik.rows?.[0]?.liczba || 0);
  if (!liczba) {
    const domyslne = [
      ["Zasilacz", "szt", "ZAS-001", "Zasilacz systemowy"],
      ["Czujka dymu", "szt", "PP-002", "Czujka do systemu PPOŻ"],
      ["Elektrozaczep", "szt", "KD-004", "Element kontroli dostępu"],
      ["Przewód YTDY", "m", "OK-010", "Przewód instalacyjny niskoprądowy"],
      ["Akumulator", "szt", "AKU-007", "Akumulator buforowy"]
    ];
    for (const [nazwa, jednostka, kod, opis] of domyslne) {
      await db.query(
        "INSERT INTO definicje_czesci(nazwa, jednostka, kod, opis) VALUES(?,?,?,?)",
        [nazwa, jednostka, kod, opis]
      );
    }
  }

  domyslneCzesciGotowe = true;
}

async function listaCzesci(_req, res) {
  await zapewnijDomyslneCzesci();
  const wynik = await db.query("SELECT * FROM definicje_czesci ORDER BY nazwa ASC");
  return res.json(wynik.rows);
}

async function utworzCzesc(req, res) {
  const nazwa = String(req.body.nazwa || "").trim();
  if (!nazwa) return res.status(400).json({ blad: "Podaj nazwe czesci." });
  const insert = await db.query(
    "INSERT INTO definicje_czesci(nazwa, jednostka, kod, opis) VALUES(?,?,?,?)",
    [nazwa, req.body.jednostka || "szt", req.body.kod || "", req.body.opis || ""]
  );
  const wynik = await db.query("SELECT * FROM definicje_czesci WHERE id = ?", [insert.rows.insertId]);
  return res.status(201).json(wynik.rows[0]);
}

async function edytujCzesc(req, res) {
  const { id } = req.params;
  const nazwa = String(req.body.nazwa || "").trim();
  const update = await db.query(
    "UPDATE definicje_czesci SET nazwa=?, jednostka=?, kod=?, opis=?, updated_at=NOW() WHERE id=?",
    [nazwa, req.body.jednostka || "szt", req.body.kod || "", req.body.opis || "", id]
  );
  if (!update.rows.affectedRows) return res.status(404).json({ blad: "Nie znaleziono czesci." });
  const wynik = await db.query("SELECT * FROM definicje_czesci WHERE id = ?", [id]);
  return res.json(wynik.rows[0]);
}

async function usunCzesc(req, res) {
  const wynik = await db.query("DELETE FROM definicje_czesci WHERE id = ?", [req.params.id]);
  if (!wynik.rows.affectedRows) return res.status(404).json({ blad: "Nie znaleziono czesci." });
  return res.json({ komunikat: "Czesc zostala usunieta." });
}

module.exports = { listaCzesci, utworzCzesc, edytujCzesc, usunCzesc };
