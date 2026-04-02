const fs = require("fs");
const path = require("path");
const db = require("../config/db");
const { klientBazy } = require("../config/db");
const { generujSzablonProtokoluDocx } = require("../services/szablonyDocxService");

let tabelaSzablonowGotowa = false;

function czyAdministrator(req) {
  const email = String(req.uzytkownik?.email || "").toLowerCase();
  return req.uzytkownik?.rola === "Administrator" || email === "dominik@eltreko.pl";
}

async function zapewnijKolumnySzablonow() {
  if (tabelaSzablonowGotowa) return;

  if (klientBazy === "postgres") {
    await db.query("ALTER TABLE szablony_przegladow ADD COLUMN IF NOT EXISTS nazwa_pliku VARCHAR(255)");
    await db.query("ALTER TABLE szablony_przegladow ADD COLUMN IF NOT EXISTS sciezka_pliku TEXT");
    await db.query("ALTER TABLE szablony_przegladow ADD COLUMN IF NOT EXISTS mime_type VARCHAR(180)");
    await db.query("ALTER TABLE szablony_przegladow ADD COLUMN IF NOT EXISTS uploaded_by INTEGER NULL REFERENCES uzytkownicy(id) ON DELETE SET NULL");
  } else {
    await db.query("ALTER TABLE szablony_przegladow ADD COLUMN IF NOT EXISTS nazwa_pliku VARCHAR(255) NULL");
    await db.query("ALTER TABLE szablony_przegladow ADD COLUMN IF NOT EXISTS sciezka_pliku TEXT NULL");
    await db.query("ALTER TABLE szablony_przegladow ADD COLUMN IF NOT EXISTS mime_type VARCHAR(180) NULL");
    await db.query("ALTER TABLE szablony_przegladow ADD COLUMN IF NOT EXISTS uploaded_by INT NULL");
  }

  tabelaSzablonowGotowa = true;
}

async function listaSzablonowPrzegladow(req, res) {
  await zapewnijKolumnySzablonow();
  const wynik = await db.query(
    `SELECT s.*, u.imie_nazwisko
     FROM szablony_przegladow s
     LEFT JOIN uzytkownicy u ON u.id = s.uploaded_by
     ORDER BY s.created_at DESC`
  );

  return res.json(
    wynik.rows.map((wiersz) => ({
      ...wiersz,
      ma_plik: Boolean(wiersz.sciezka_pliku)
    }))
  );
}

async function utworzSzablonPrzegladu(req, res) {
  await zapewnijKolumnySzablonow();

  if (!czyAdministrator(req)) {
    return res.status(403).json({ blad: "Brak uprawnień do dodawania szablonów." });
  }

  const nazwa = String(req.body?.nazwa || "").trim();
  const opis = String(req.body?.opis || "").trim();

  if (!nazwa) {
    return res.status(400).json({ blad: "Podaj nazwę szablonu przeglądu." });
  }

  if (!req.file) {
    return res.status(400).json({ blad: "Dodaj plik szablonu." });
  }

  const insert = await db.query(
    `INSERT INTO szablony_przegladow(nazwa, opis, zawartosc, nazwa_pliku, sciezka_pliku, mime_type, uploaded_by)
     VALUES(?,?,?,?,?,?,?)`,
    [
      nazwa,
      opis,
      "",
      req.file.originalname,
      req.file.path,
      req.file.mimetype || "",
      req.uzytkownik?.id || null
    ]
  );

  const wynik = await db.query(
    `SELECT s.*, u.imie_nazwisko
     FROM szablony_przegladow s
     LEFT JOIN uzytkownicy u ON u.id = s.uploaded_by
     WHERE s.id = ?`,
    [insert.rows.insertId]
  );

  return res.status(201).json({
    ...wynik.rows[0],
    ma_plik: true
  });
}

async function edytujSzablonPrzegladu(req, res) {
  await zapewnijKolumnySzablonow();

  if (!czyAdministrator(req)) {
    return res.status(403).json({ blad: "Brak uprawnień do edycji szablonów." });
  }

  const { id } = req.params;
  const nazwa = String(req.body?.nazwa || "").trim();
  const opis = String(req.body?.opis || "").trim();

  const obecny = await db.query("SELECT * FROM szablony_przegladow WHERE id = ?", [id]);
  if (!obecny.rows.length) {
    return res.status(404).json({ blad: "Nie znaleziono szablonu przeglądu." });
  }

  const szablon = obecny.rows[0];
  let nazwaPliku = szablon.nazwa_pliku || null;
  let sciezkaPliku = szablon.sciezka_pliku || null;
  let mimeType = szablon.mime_type || null;

  if (req.file) {
    if (sciezkaPliku && fs.existsSync(sciezkaPliku)) {
      fs.unlinkSync(sciezkaPliku);
    }
    nazwaPliku = req.file.originalname;
    sciezkaPliku = req.file.path;
    mimeType = req.file.mimetype || "";
  }

  const update = await db.query(
    "UPDATE szablony_przegladow SET nazwa=?, opis=?, nazwa_pliku=?, sciezka_pliku=?, mime_type=?, updated_at=NOW() WHERE id=?",
    [nazwa || szablon.nazwa, opis, nazwaPliku, sciezkaPliku, mimeType, id]
  );

  if (!update.rows.affectedRows) {
    return res.status(404).json({ blad: "Nie znaleziono szablonu przeglądu." });
  }

  const wynik = await db.query(
    `SELECT s.*, u.imie_nazwisko
     FROM szablony_przegladow s
     LEFT JOIN uzytkownicy u ON u.id = s.uploaded_by
     WHERE s.id = ?`,
    [id]
  );

  return res.json({
    ...wynik.rows[0],
    ma_plik: Boolean(wynik.rows[0]?.sciezka_pliku)
  });
}

async function usunSzablonPrzegladu(req, res) {
  await zapewnijKolumnySzablonow();

  if (!czyAdministrator(req)) {
    return res.status(403).json({ blad: "Brak uprawnień do usuwania szablonów." });
  }

  const przed = await db.query("SELECT sciezka_pliku FROM szablony_przegladow WHERE id = ?", [req.params.id]);
  const wynik = await db.query("DELETE FROM szablony_przegladow WHERE id = ?", [req.params.id]);

  if (!wynik.rows.affectedRows) {
    return res.status(404).json({ blad: "Nie znaleziono szablonu przeglądu." });
  }

  const sciezkaPliku = przed.rows[0]?.sciezka_pliku;
  if (sciezkaPliku && fs.existsSync(sciezkaPliku)) {
    fs.unlinkSync(sciezkaPliku);
  }

  return res.json({ komunikat: "Szablon przeglądu został usunięty." });
}

async function pobierzSzablonPrzegladu(req, res) {
  await zapewnijKolumnySzablonow();

  const wynik = await db.query("SELECT nazwa, nazwa_pliku, sciezka_pliku, mime_type FROM szablony_przegladow WHERE id = ?", [req.params.id]);
  const szablon = wynik.rows[0];

  if (!szablon) {
    return res.status(404).json({ blad: "Nie znaleziono szablonu przeglądu." });
  }

  if (!szablon.sciezka_pliku || !fs.existsSync(szablon.sciezka_pliku)) {
    return res.status(404).json({ blad: "Plik szablonu nie jest dostępny." });
  }

  if (szablon.mime_type) {
    res.setHeader("Content-Type", szablon.mime_type);
  }

  const rozszerzenie = path.extname(szablon.nazwa_pliku || "") || path.extname(szablon.sciezka_pliku || "");
  const nazwaPobrania = `${(szablon.nazwa || "szablon").replace(/[\\/:*?"<>|]+/g, "-")}${rozszerzenie}`;
  return res.download(szablon.sciezka_pliku, nazwaPobrania);
}

async function pobierzSzablonProtokoluDocx(req, res) {
  const buffer = await generujSzablonProtokoluDocx();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  res.setHeader("Content-Disposition", 'attachment; filename="Szablon_protokolu.docx"');
  return res.send(buffer);
}

module.exports = {
  listaSzablonowPrzegladow,
  utworzSzablonPrzegladu,
  edytujSzablonPrzegladu,
  usunSzablonPrzegladu,
  pobierzSzablonPrzegladu,
  pobierzSzablonProtokoluDocx
};
