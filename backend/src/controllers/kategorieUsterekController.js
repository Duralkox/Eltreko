const db = require("../config/db");

let domyslneKategorieGotowe = false;

async function zapewnijDomyslneKategorie() {
  if (domyslneKategorieGotowe) return;

  const wynik = await db.query("SELECT COUNT(*) AS liczba FROM kategorie_usterek");
  const liczba = Number(wynik.rows?.[0]?.liczba || 0);
  if (!liczba) {
    const domyslne = [
      ["Domofon", "Zgłoszenia związane z instalacją domofonową."],
      ["Kontrola dostępu", "Awaria lub konfiguracja systemu KD."],
      ["Monitoring", "Kamery, rejestrator lub okablowanie monitoringu."],
      ["PPOŻ", "Elementy systemu przeciwpożarowego."],
      ["Elektryka", "Zasilanie, zabezpieczenia i obwody elektryczne."]
    ];
    for (const [nazwa, opis] of domyslne) {
      await db.query("INSERT INTO kategorie_usterek(nazwa, opis) VALUES(?,?)", [nazwa, opis]);
    }
  }

  domyslneKategorieGotowe = true;
}

async function listaKategorii(_req, res) {
  await zapewnijDomyslneKategorie();
  const wynik = await db.query("SELECT * FROM kategorie_usterek ORDER BY nazwa ASC");
  return res.json(wynik.rows);
}

async function utworzKategorie(req, res) {
  const nazwa = String(req.body.nazwa || "").trim();
  if (!nazwa) return res.status(400).json({ blad: "Podaj nazwe kategorii." });
  const insert = await db.query("INSERT INTO kategorie_usterek(nazwa, opis) VALUES(?,?)", [nazwa, req.body.opis || ""]);
  const wynik = await db.query("SELECT * FROM kategorie_usterek WHERE id = ?", [insert.rows.insertId]);
  return res.status(201).json(wynik.rows[0]);
}

async function edytujKategorie(req, res) {
  const { id } = req.params;
  const nazwa = String(req.body.nazwa || "").trim();
  const update = await db.query("UPDATE kategorie_usterek SET nazwa=?, opis=?, updated_at=NOW() WHERE id=?", [nazwa, req.body.opis || "", id]);
  if (!update.rows.affectedRows) return res.status(404).json({ blad: "Nie znaleziono kategorii." });
  const wynik = await db.query("SELECT * FROM kategorie_usterek WHERE id = ?", [id]);
  return res.json(wynik.rows[0]);
}

async function usunKategorie(req, res) {
  const wynik = await db.query("DELETE FROM kategorie_usterek WHERE id = ?", [req.params.id]);
  if (!wynik.rows.affectedRows) return res.status(404).json({ blad: "Nie znaleziono kategorii." });
  return res.json({ komunikat: "Kategoria zostala usunieta." });
}

module.exports = { listaKategorii, utworzKategorie, edytujKategorie, usunKategorie };
