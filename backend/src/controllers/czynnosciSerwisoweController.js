const db = require("../config/db");

let domyslneCzynnosciGotowe = false;

async function zapewnijDomyslneCzynnosci() {
  if (domyslneCzynnosciGotowe) return;

  const wynik = await db.query("SELECT COUNT(*) AS liczba FROM czynnosci_serwisowe");
  const liczba = Number(wynik.rows?.[0]?.liczba || 0);
  if (!liczba) {
    const domyslne = [
      ["Diagnostyka", "Sprawdzenie i weryfikacja przyczyny usterki."],
      ["Konserwacja", "Czyszczenie, regulacja i czynności utrzymaniowe."],
      ["Naprawa", "Usunięcie usterki i przywrócenie działania."],
      ["Wymiana elementu", "Wymiana uszkodzonego podzespołu."],
      ["Test końcowy", "Sprawdzenie działania po wykonanej usłudze."]
    ];
    for (const [nazwa, opis] of domyslne) {
      await db.query("INSERT INTO czynnosci_serwisowe(nazwa, opis) VALUES(?,?)", [nazwa, opis]);
    }
  }

  domyslneCzynnosciGotowe = true;
}

async function listaCzynnosci(_req, res) {
  await zapewnijDomyslneCzynnosci();
  const wynik = await db.query("SELECT * FROM czynnosci_serwisowe ORDER BY nazwa ASC");
  return res.json(wynik.rows);
}

async function utworzCzynnosc(req, res) {
  const nazwa = String(req.body.nazwa || "").trim();
  if (!nazwa) return res.status(400).json({ blad: "Podaj nazwe czynnosci." });
  const insert = await db.query("INSERT INTO czynnosci_serwisowe(nazwa, opis) VALUES(?,?)", [nazwa, req.body.opis || ""]);
  const wynik = await db.query("SELECT * FROM czynnosci_serwisowe WHERE id = ?", [insert.rows.insertId]);
  return res.status(201).json(wynik.rows[0]);
}

async function edytujCzynnosc(req, res) {
  const { id } = req.params;
  const nazwa = String(req.body.nazwa || "").trim();
  const update = await db.query("UPDATE czynnosci_serwisowe SET nazwa=?, opis=?, updated_at=NOW() WHERE id=?", [nazwa, req.body.opis || "", id]);
  if (!update.rows.affectedRows) return res.status(404).json({ blad: "Nie znaleziono czynnosci." });
  const wynik = await db.query("SELECT * FROM czynnosci_serwisowe WHERE id = ?", [id]);
  return res.json(wynik.rows[0]);
}

async function usunCzynnosc(req, res) {
  const wynik = await db.query("DELETE FROM czynnosci_serwisowe WHERE id = ?", [req.params.id]);
  if (!wynik.rows.affectedRows) return res.status(404).json({ blad: "Nie znaleziono czynnosci." });
  return res.json({ komunikat: "Czynnosc zostala usunieta." });
}

module.exports = { listaCzynnosci, utworzCzynnosc, edytujCzynnosc, usunCzynnosc };
