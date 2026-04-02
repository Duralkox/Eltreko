const db = require("../config/db");
const {
  generujPdf
} = require("../services/dokumentyService");

let kolumnyProtokolowGotowe = false;

async function zapewnijKolumnyProtokolow() {
  if (kolumnyProtokolowGotowe) return;

  await db.query("ALTER TABLE protokoly ADD COLUMN IF NOT EXISTS zlecajacy VARCHAR(220) NULL");
  await db.query("ALTER TABLE protokoly ADD COLUMN IF NOT EXISTS przyjmujacy_zlecenie VARCHAR(220) NULL");
  await db.query("ALTER TABLE protokoly ADD COLUMN IF NOT EXISTS obiekt VARCHAR(220) NULL");
  await db.query("ALTER TABLE protokoly ADD COLUMN IF NOT EXISTS adres_obiektu TEXT NULL");
  await db.query("ALTER TABLE protokoly ADD COLUMN IF NOT EXISTS lokalizacja_usterki TEXT NULL");
  await db.query("ALTER TABLE protokoly ADD COLUMN IF NOT EXISTS opis_usterki TEXT NULL");
  await db.query("ALTER TABLE protokoly ADD COLUMN IF NOT EXISTS planowana_data_naprawy DATE NULL");
  await db.query("ALTER TABLE protokoly ADD COLUMN IF NOT EXISTS uwagi_do_uslugi TEXT NULL");
  await db.query("ALTER TABLE protokoly ADD COLUMN IF NOT EXISTS kategoria_usterki_nazwa VARCHAR(220) NULL");
  await db.query("ALTER TABLE protokoly ADD COLUMN IF NOT EXISTS czynnosci_serwisowe_json LONGTEXT NULL");
  await db.query("ALTER TABLE protokoly ADD COLUMN IF NOT EXISTS uzyte_czesci_json LONGTEXT NULL");

  kolumnyProtokolowGotowe = true;
}

function normalizujNazweProtokolu(wartosc) {
  return String(wartosc || "").trim();
}

function nazwaPlikuBezpieczna(wartosc) {
  return (
    normalizujNazweProtokolu(wartosc)
      .replace(/[<>:\"/\\|?*\x00-\x1F]/g, "-")
      .replace(/\s+/g, " ")
      .slice(0, 120) || "protokol"
  );
}

function normalizujFrazeWyszukiwania(wartosc) {
  return String(wartosc || "")
    .trim()
    .toUpperCase()
    .replace(/[\/\s-]+/g, "");
}

function frazaLike(wartosc) {
  return `%${String(wartosc || "").trim().toLowerCase()}%`;
}

async function wygenerujNumerProtokolu(dataWejsciowa) {
  const rok = (() => {
    if (!dataWejsciowa) return new Date().getFullYear();
    const parsed = new Date(dataWejsciowa);
    if (Number.isNaN(parsed.getTime())) return new Date().getFullYear();
    return parsed.getFullYear();
  })();

  const wynik = await db.query(
    `SELECT numer_protokolu
     FROM protokoly
     WHERE numer_protokolu LIKE ?
     ORDER BY id DESC`,
    [`NP/%/${rok}`]
  );

  let maxNumer = 0;
  for (const rekord of wynik.rows) {
    const dopasowanie = String(rekord.numer_protokolu || "").match(/^NP\/(\d+)\/(\d{4})$/i);
    if (!dopasowanie) continue;
    const numer = Number(dopasowanie[1]);
    const rokRekordu = Number(dopasowanie[2]);
    if (rokRekordu === rok && Number.isFinite(numer) && numer > maxNumer) {
      maxNumer = numer;
    }
  }

  return `NP/${maxNumer + 1}/${rok}`;
}

async function listaProtokolow(req, res) {
  await zapewnijKolumnyProtokolow();
  const { q, data, technik_id } = req.query;
  const warunki = [];
  const wartosci = [];

  if (q) {
    const frazaNumeru = normalizujFrazeWyszukiwania(q);
    warunki.push(`(
      REPLACE(REPLACE(REPLACE(UPPER(COALESCE(p.numer_protokolu, '')), '/', ''), ' ', ''), '-', '') LIKE ?
      OR LOWER(COALESCE(p.numer_protokolu, '')) LIKE ?
      OR LOWER(COALESCE(p.klient, '')) LIKE ?
      OR LOWER(COALESCE(p.zlecajacy, '')) LIKE ?
      OR LOWER(COALESCE(p.obiekt, '')) LIKE ?
      OR LOWER(COALESCE(p.opis_usterki, '')) LIKE ?
      OR LOWER(COALESCE(p.opis_pracy, '')) LIKE ?
    )`);
    wartosci.push(
      `%${frazaNumeru}%`,
      frazaLike(q),
      frazaLike(q),
      frazaLike(q),
      frazaLike(q),
      frazaLike(q),
      frazaLike(q)
    );
  }
  if (data) {
    warunki.push("DATE(p.data) = ?");
    wartosci.push(data);
  }
  if (technik_id) {
    warunki.push("p.technik_id = ?");
    wartosci.push(technik_id);
  }

  const where = warunki.length ? `WHERE ${warunki.join(" AND ")}` : "";
  const wynik = await db.query(
    `SELECT p.*, u.imie_nazwisko AS technik_nazwa
     FROM protokoly p
     LEFT JOIN uzytkownicy u ON u.id = p.technik_id
     ${where}
     ORDER BY p.created_at DESC`,
    wartosci
  );
  return res.json(wynik.rows);
}

async function pobierzProtokol(req, res) {
  await zapewnijKolumnyProtokolow();
  const { id } = req.params;
  const wynik = await db.query(
    `SELECT p.*, u.imie_nazwisko AS technik_nazwa
     FROM protokoly p
     LEFT JOIN uzytkownicy u ON u.id = p.technik_id
     WHERE p.id = ?`,
    [id]
  );
  if (!wynik.rows.length) {
    return res.status(404).json({ blad: "Nie znaleziono protokolu." });
  }
  return res.json(wynik.rows[0]);
}

async function nowyProtokol(req, res) {
  await zapewnijKolumnyProtokolow();
  const {
    numer_protokolu,
    data,
    klient,
    adres,
    telefon,
    opis_pracy,
    usterki,
    technik_id,
    podpis_technika,
    podpis_klienta,
    zlecajacy,
    przyjmujacy_zlecenie,
    obiekt,
    adres_obiektu,
    lokalizacja_usterki,
    opis_usterki,
    planowana_data_naprawy,
    uwagi_do_uslugi,
    kategoria_usterki_nazwa,
    czynnosci_serwisowe,
    uzyte_czesci
  } = req.body;
  const nazwaProtokolu = normalizujNazweProtokolu(numer_protokolu) || (await wygenerujNumerProtokolu(data));

  const insert = await db.query(
    `INSERT INTO protokoly(
      numer_protokolu, data, klient, adres, telefon, opis_pracy, usterki, technik_id, podpis_technika, podpis_klienta,
      zlecajacy, przyjmujacy_zlecenie, obiekt, adres_obiektu, lokalizacja_usterki, opis_usterki, planowana_data_naprawy, uwagi_do_uslugi,
      kategoria_usterki_nazwa, czynnosci_serwisowe_json, uzyte_czesci_json
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      nazwaProtokolu,
      data,
      klient || zlecajacy || "",
      adres || adres_obiektu || "",
      telefon || "",
      opis_pracy || opis_usterki || "",
      usterki || lokalizacja_usterki || "",
      technik_id || null,
      podpis_technika,
      podpis_klienta,
      zlecajacy || klient || "",
      przyjmujacy_zlecenie || "",
      obiekt || "",
      adres_obiektu || adres || "",
      lokalizacja_usterki || usterki || "",
      opis_usterki || opis_pracy || "",
      planowana_data_naprawy || null,
      uwagi_do_uslugi || "",
      kategoria_usterki_nazwa || "",
      JSON.stringify(Array.isArray(czynnosci_serwisowe) ? czynnosci_serwisowe : []),
      JSON.stringify(Array.isArray(uzyte_czesci) ? uzyte_czesci : [])
    ]
  );
  const wynik = await db.query("SELECT * FROM protokoly WHERE id = ?", [insert.rows.insertId]);
  return res.status(201).json(wynik.rows[0]);
}

async function edytujProtokol(req, res) {
  await zapewnijKolumnyProtokolow();
  const { id } = req.params;
  const {
    numer_protokolu,
    data,
    klient,
    adres,
    telefon,
    opis_pracy,
    usterki,
    technik_id,
    podpis_technika,
    podpis_klienta,
    zlecajacy,
    przyjmujacy_zlecenie,
    obiekt,
    adres_obiektu,
    lokalizacja_usterki,
    opis_usterki,
    planowana_data_naprawy,
    uwagi_do_uslugi,
    kategoria_usterki_nazwa,
    czynnosci_serwisowe,
    uzyte_czesci
  } = req.body;
  const nazwaProtokolu = normalizujNazweProtokolu(numer_protokolu) || (await wygenerujNumerProtokolu(data));

  const update = await db.query(
    `UPDATE protokoly
     SET numer_protokolu=?, data=?, klient=?, adres=?, telefon=?, opis_pracy=?, usterki=?, technik_id=?,
         podpis_technika=?, podpis_klienta=?, zlecajacy=?, przyjmujacy_zlecenie=?, obiekt=?, adres_obiektu=?,
         lokalizacja_usterki=?, opis_usterki=?, planowana_data_naprawy=?, uwagi_do_uslugi=?, kategoria_usterki_nazwa=?,
         czynnosci_serwisowe_json=?, uzyte_czesci_json=?, updated_at=NOW()
     WHERE id=?`,
    [
      nazwaProtokolu,
      data,
      klient || zlecajacy || "",
      adres || adres_obiektu || "",
      telefon || "",
      opis_pracy || opis_usterki || "",
      usterki || lokalizacja_usterki || "",
      technik_id || null,
      podpis_technika,
      podpis_klienta,
      zlecajacy || klient || "",
      przyjmujacy_zlecenie || "",
      obiekt || "",
      adres_obiektu || adres || "",
      lokalizacja_usterki || usterki || "",
      opis_usterki || opis_pracy || "",
      planowana_data_naprawy || null,
      uwagi_do_uslugi || "",
      kategoria_usterki_nazwa || "",
      JSON.stringify(Array.isArray(czynnosci_serwisowe) ? czynnosci_serwisowe : []),
      JSON.stringify(Array.isArray(uzyte_czesci) ? uzyte_czesci : []),
      id
    ]
  );
  if (!update.rows.affectedRows) {
    return res.status(404).json({ blad: "Nie znaleziono protokolu." });
  }
  const wynik = await db.query("SELECT * FROM protokoly WHERE id = ?", [id]);
  return res.json(wynik.rows[0]);
}

async function usunProtokol(req, res) {
  const { id } = req.params;
  const wynik = await db.query("DELETE FROM protokoly WHERE id = ?", [id]);
  if (!wynik.rows.affectedRows) {
    return res.status(404).json({ blad: "Nie znaleziono protokolu." });
  }
  return res.json({ komunikat: "Protokol zostal usuniety." });
}

async function dodajZdjecia(req, res) {
  await zapewnijKolumnyProtokolow();
  const { id } = req.params;
  if (!req.files || !req.files.length) {
    return res.status(400).json({ blad: "Brak zdjec do przeslania." });
  }

  const protokol = await db.query("SELECT id FROM protokoly WHERE id = ?", [id]);
  if (!protokol.rows.length) {
    return res.status(404).json({ blad: "Nie znaleziono protokolu." });
  }

  const dodane = [];
  for (const plik of req.files) {
    const insert = await db.query(
      `INSERT INTO protokol_zdjecia(protokol_id, nazwa_pliku, sciezka_pliku)
       VALUES(?,?,?)`,
      [id, plik.originalname, plik.path]
    );
    const wynik = await db.query("SELECT * FROM protokol_zdjecia WHERE id = ?", [insert.rows.insertId]);
    dodane.push(wynik.rows[0]);
  }

  return res.status(201).json(dodane);
}

async function eksportujDokument(req, res) {
  await zapewnijKolumnyProtokolow();
  const { id } = req.params;
  const { typ = "pdf" } = req.query;

  const wynik = await db.query(
    `SELECT p.*, u.imie_nazwisko AS technik_nazwa
     FROM protokoly p
     LEFT JOIN uzytkownicy u ON u.id = p.technik_id
     WHERE p.id = ?`,
    [id]
  );
  if (!wynik.rows.length) {
    return res.status(404).json({ blad: "Nie znaleziono protokolu." });
  }
  const dane = wynik.rows[0];
  const nazwaPliku = nazwaPlikuBezpieczna(dane.numer_protokolu);

  if (typ === "pdf") {
    const buf = await generujPdf(dane, "klient");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${nazwaPliku}.pdf\"`);
    return res.send(buf);
  }

  return res.status(400).json({ blad: "Nieobslugiwany typ eksportu." });
}

module.exports = {
  listaProtokolow,
  pobierzProtokol,
  nowyProtokol,
  edytujProtokol,
  usunProtokol,
  dodajZdjecia,
  eksportujDokument
};
