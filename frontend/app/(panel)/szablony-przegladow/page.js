"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ExcelJS from "exceljs";
import SekcjaNaglowek from "../../../components/SekcjaNaglowek";
import { pobierzSesje } from "../../../lib/auth";
import { zapytanieApi } from "../../../lib/api";

const pustyFormularz = {
  nazwa: "",
  opis: ""
};

const MIESIACE = [
  "styczeń",
  "luty",
  "marzec",
  "kwiecień",
  "maj",
  "czerwiec",
  "lipiec",
  "sierpień",
  "wrzesień",
  "październik",
  "listopad",
  "grudzień"
];

const NAGLOWKI_LICZNIKOW = ["Lp.", "Opis", "Licznik rodzaj", "Nr. licznika", ...MIESIACE];

function normalizujTekst(wartosc) {
  return String(wartosc || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function pobierzRozszerzenie(nazwaPliku) {
  const czesci = String(nazwaPliku || "").split(".");
  if (czesci.length < 2) return "";
  return `.${czesci.pop().toLowerCase()}`;
}

function nazwaPlikuSzablonuKontrahenta(nazwa) {
  const bezpieczna = String(nazwa || "kontrahent")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_");
  return `Szablon_licznikow_${bezpieczna}.xlsx`;
}

async function pobierzBlobJakoPlik(blob, nazwa) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nazwa;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function zbudujPustyBlok() {
  return {
    kontrahent: "",
    budynek: "NAZWA BUDYNKU",
    rok: "",
    wiersze: Array.from({ length: 10 }, (_, index) => ({
      lp: index === 0 ? "" : "",
      typ_licznika: "",
      rodzaj_licznika: "",
      numer_licznika: "",
      pusty: true
    }))
  };
}

function wartoscKomorki(wartosc) {
  return String(wartosc ?? "").trim();
}

function nazwaKontrahentaZImportu(importNazwa) {
  const nazwa = wartoscKomorki(importNazwa);
  if (!nazwa) return "";
  return nazwa.replace(/\s+\d{4}\b/g, "").trim() || nazwa;
}

function grupujSzablonyKontrahentow(odczyty) {
  const mapaKontrahentow = new Map();
  for (const rekord of Array.isArray(odczyty) ? odczyty : []) {
    const kontrahent = nazwaKontrahentaZImportu(rekord.import_nazwa);
    if (!kontrahent) continue;
    const budynek = wartoscKomorki(rekord.kontrahent_nazwa);
    if (!budynek) continue;

    const kluczKontrahenta = normalizujTekst(kontrahent);
    if (!mapaKontrahentow.has(kluczKontrahenta)) {
      mapaKontrahentow.set(kluczKontrahenta, {
        kontrahent,
        rok: Number(rekord.rok) || "",
        bloki: new Map()
      });
    }

    const kontrahentEntry = mapaKontrahentow.get(kluczKontrahenta);
    if (!kontrahentEntry.rok && rekord.rok) {
      kontrahentEntry.rok = Number(rekord.rok) || "";
    }

    const kluczBudynku = normalizujTekst(budynek);
    if (!kontrahentEntry.bloki.has(kluczBudynku)) {
      kontrahentEntry.bloki.set(kluczBudynku, {
        kontrahent,
        budynek,
        rok: Number(rekord.rok) || kontrahentEntry.rok || "",
        kolejnosc: Number(rekord.id || Number.MAX_SAFE_INTEGER),
        wiersze: []
      });
    }

    const blok = kontrahentEntry.bloki.get(kluczBudynku);
    blok.kolejnosc = Math.min(blok.kolejnosc, Number(rekord.id || Number.MAX_SAFE_INTEGER));
    blok.wiersze.push({
      lp: rekord.lp ?? "",
      typ_licznika: rekord.typ_licznika ?? "",
      rodzaj_licznika: rekord.rodzaj_licznika ?? "",
      numer_licznika: rekord.numer_licznika ?? ""
    });
  }

  return Array.from(mapaKontrahentow.values())
    .map((kontrahentEntry) => ({
      kontrahent: kontrahentEntry.kontrahent,
      rok: kontrahentEntry.rok,
      bloki: Array.from(kontrahentEntry.bloki.values())
        .map((blok) => ({
          ...blok,
          wiersze: blok.wiersze.sort((a, b) => Number(a.lp || 0) - Number(b.lp || 0))
        }))
        .sort((a, b) => a.kolejnosc - b.kolejnosc)
    }))
    .sort((a, b) => a.kontrahent.localeCompare(b.kontrahent, "pl"));
}

async function zbudujWorkbookSzablonuLicznikow(bloki, rokTekst = "") {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Szablon liczników");
  const liczbaKolumn = NAGLOWKI_LICZNIKOW.length;
  const ramka = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } }
  };

  sheet.columns = [
    { width: 7 },
    { width: 34 },
    { width: 22 },
    { width: 18 },
    ...Array.from({ length: 12 }, () => ({ width: 12 }))
  ];

  const naglowek = rokTekst ? `STANY LICZNIKÓW NA ROK ${rokTekst}` : "STANY LICZNIKÓW NA ROK";
  sheet.addRow([naglowek]);
  sheet.mergeCells(1, 1, 1, liczbaKolumn);
  sheet.getCell(1, 1).font = { bold: true, size: 12 };
  sheet.getCell(1, 1).alignment = { horizontal: "left" };

  function dodajBlok(blok, indeks) {
    if (indeks === 0) {
      sheet.addRow([]);
      sheet.addRow([]);
    } else {
      sheet.addRow([]);
      sheet.addRow([]);
      sheet.addRow([]);
    }

    const wierszBudynku = sheet.lastRow.number + 1;
    sheet.addRow([String(blok.budynek || "NAZWA BUDYNKU").toUpperCase()]);
    sheet.mergeCells(wierszBudynku, 1, wierszBudynku, liczbaKolumn);

    for (let col = 1; col <= liczbaKolumn; col += 1) {
      const cell = sheet.getCell(wierszBudynku, col);
      cell.border = ramka;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC7C7C7" } };
      cell.font = { bold: true };
      cell.alignment = { horizontal: "left", vertical: "middle" };
    }

    sheet.addRow(NAGLOWKI_LICZNIKOW);
    const headerRow = sheet.lastRow;
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7CBF3A" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = ramka;
    });

    blok.wiersze.forEach((wiersz, index) => {
      const row = sheet.addRow([
        wiersz.lp ?? "",
        wiersz.typ_licznika ?? "",
        wiersz.rodzaj_licznika ?? "",
        wiersz.numer_licznika ?? "",
        ...Array.from({ length: 12 }, () => "")
      ]);

      row.height = 22;
      row.eachCell((cell, colNumber) => {
        cell.border = ramka;
        cell.alignment = {
          horizontal: colNumber === 2 ? "left" : "center",
          vertical: "middle"
        };
      });

      if (index % 2 === 1) {
        row.eachCell((cell, colNumber) => {
          if (colNumber === 1) return;
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE1EFDA" } };
        });
      }
    });

    const dataRow = sheet.lastRow.number + 1;
    sheet.getCell(dataRow, 2).value = "DATA ODCZYTU :";
    sheet.getCell(dataRow, 2).font = { bold: true };
    sheet.getCell(dataRow, 2).alignment = { horizontal: "right", vertical: "middle" };
    sheet.mergeCells(dataRow, 2, dataRow, liczbaKolumn - 1);
    sheet.getCell(dataRow, liczbaKolumn).alignment = { horizontal: "center", vertical: "middle" };
    for (let col = 2; col <= liczbaKolumn; col += 1) {
      sheet.getCell(dataRow, col).border = ramka;
    }
  }

  bloki.forEach((blok, index) => dodajBlok(blok, index));
  return workbook;
}

async function pobierzSzablonLicznikowDlaBlokow(bloki, nazwaPliku, rokTekst = "") {
  const workbook = await zbudujWorkbookSzablonuLicznikow(bloki, rokTekst);
  const buffer = await workbook.xlsx.writeBuffer();
  await pobierzBlobJakoPlik(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }),
    nazwaPliku
  );
}

async function pobierzLogoDataUrl() {
  try {
    const response = await fetch("/logo.png");
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

function zbudujHtmlSzablonuProtokolu(logoDataUrl = "") {
  return `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <title>Szablon protokołu</title>
    <style>
      body { font-family: Arial, sans-serif; color: #15212b; margin: 30px; line-height: 1.4; }
      .rama { border: 1px solid #e3e9ee; border-radius: 18px; padding: 22px; }
      .naglowek { border: 1px solid #e8f0dd; background: #f2f8ea; border-radius: 16px; padding: 20px 22px; display: table; width: 100%; box-sizing: border-box; }
      .kolumna { display: table-cell; vertical-align: middle; }
      .kolumna-logo { width: 190px; }
      .kolumna-kontakt { width: 150px; text-align: left; }
      .kolumna-firma { width: 170px; text-align: right; }
      .logo { width: 150px; height: auto; display: block; }
      .kontakt { font-size: 12px; color: #8e99a6; line-height: 1.55; }
      .firma-nazwa { font-size: 10px; font-weight: 700; color: #15212b; line-height: 1.35; }
      .firma-dane { font-size: 12px; color: #8e99a6; line-height: 1.55; margin-top: 6px; }
      .hero { margin-top: 18px; border: 1px solid #e6ebef; border-radius: 14px; padding: 16px 18px; display: table; width: 100%; box-sizing: border-box; }
      .hero-left { display: table-cell; vertical-align: middle; }
      .hero-right { display: table-cell; width: 130px; vertical-align: middle; text-align: center; }
      .tytul { font-size: 22px; font-weight: 700; margin: 0; color: #15212b; }
      .numer { margin-top: 8px; font-size: 12px; color: #8e99a6; }
      .badge { background: #eef6e6; border-radius: 10px; padding: 10px 14px; }
      .badge-etykieta { font-size: 9px; font-weight: 700; color: #5f7f31; text-transform: uppercase; letter-spacing: 0.12em; }
      .badge-wartosc { margin-top: 5px; font-size: 13px; font-weight: 700; color: #15212b; }
      .siatka { width: 100%; border-collapse: collapse; margin-top: 18px; }
      .siatka td { width: 50%; vertical-align: top; padding: 18px 18px 16px 0; }
      .sekcja-linia { border-top: 1px solid #e7edf1; margin-top: 18px; }
      .etykieta { font-size: 10px; font-weight: 700; color: #253641; margin-bottom: 10px; }
      .wartosc { min-height: 22px; font-size: 12px; color: #17212b; border-bottom: 1px solid #e7edf1; padding-bottom: 10px; }
      .blok { margin-top: 18px; }
      .duzy-tekst { min-height: 64px; font-size: 12px; color: #17212b; border-bottom: 1px solid #e7edf1; padding-bottom: 12px; }
    </style>
  </head>
  <body>
    <div class="rama">
      <div class="naglowek">
        <div class="kolumna kolumna-logo">
          ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" alt="Eltreko logo" />` : `<div style="font-size:32px;font-weight:700;color:#7ac13f;">ELTREKO</div>`}
        </div>
        <div class="kolumna kolumna-kontakt">
          <div class="kontakt">
            tel. 513 086 511<br />
            tel. 602 559 188<br />
            e-mail: eltreko@gmail.com<br />
            Warszawa
          </div>
        </div>
        <div class="kolumna kolumna-firma">
          <div class="firma-nazwa">
            ELTREKO M. DURALSKI, A. PIETRAK<br />
            SPÓŁKA JAWNA
          </div>
          <div class="firma-dane">
            ul. Van Gogha 3A / 21<br />
            03-188 Warszawa<br />
            NIP: 5242673461
          </div>
        </div>
      </div>
      <div class="hero">
        <div class="hero-left">
          <p class="tytul">Protokół przyjęcia zlecenia</p>
          <div class="numer">Nr [</div>
        </div>
        <div class="hero-right">
          <div class="badge">
            <div class="badge-etykieta">Data przyjęcia</div>
            <div class="badge-wartosc">dd.mm.rrrr</div>
          </div>
        </div>
      </div>

      <table class="siatka">
        <tr>
          <td><div class="etykieta">Zlecający</div><div class="wartosc"></div></td>
          <td><div class="etykieta">Przyjmujący zlecenie</div><div class="wartosc"></div></td>
        </tr>
      </table>

      <div class="sekcja-linia"></div>
      <table class="siatka" style="margin-top:0;">
        <tr>
          <td><div class="etykieta">Obiekt</div><div class="wartosc"></div></td>
          <td><div class="etykieta">Adres obiektu</div><div class="wartosc"></div></td>
        </tr>
      </table>

      <div class="sekcja-linia"></div>
      <div class="blok">
        <div class="etykieta">Lokalizacja usterki</div>
        <div class="duzy-tekst"></div>
      </div>

      <div class="blok">
        <div class="etykieta">Kategoria usterki</div>
        <div class="wartosc"></div>
      </div>

      <div class="blok">
        <div class="etykieta">Czynności serwisowe</div>
        <div class="duzy-tekst"></div>
      </div>

      <div class="sekcja-linia"></div>
      <div class="blok">
        <div class="etykieta">Opis usterki</div>
        <div class="duzy-tekst" style="min-height:80px;"></div>
      </div>

      <div class="sekcja-linia"></div>
      <div class="blok">
        <div class="etykieta">Użyte części</div>
        <div class="duzy-tekst"></div>
      </div>

      <div class="sekcja-linia"></div>
      <table class="siatka" style="margin-top:0;">
        <tr>
          <td><div class="etykieta">Planowana data wykonania naprawy</div><div class="wartosc"></div></td>
          <td><div class="etykieta">Uwagi do usługi</div><div class="duzy-tekst" style="min-height:40px;border-bottom:none;padding-bottom:0;"></div></td>
        </tr>
      </table>
    </div>
  </body>
</html>`;
}

async function pobierzSzablonProtokolu() {
  const blob = await zapytanieApi("/szablony-przegladow/protokol/docx", { zwrocBinarnie: true });
  await pobierzBlobJakoPlik(blob, "Szablon_protokolu.docx");
}

function KartaInformacyjna({ children }) {
  return <article className="rounded-2xl border border-white/10 bg-white/5 p-4">{children}</article>;
}

export default function SzablonyPrzegladowPage() {
  const sesja = useMemo(() => pobierzSesje(), []);
  const czyAdmin =
    sesja?.uzytkownik?.rola === "Administrator" ||
    normalizujTekst(sesja?.uzytkownik?.email) === "dominik@eltreko.pl";

  const [lista, setLista] = useState([]);
  const [odczytyLicznikow, setOdczytyLicznikow] = useState([]);
  const [formularz, setFormularz] = useState(pustyFormularz);
  const [plik, setPlik] = useState(null);
  const [edytowany, setEdytowany] = useState(null);
  const [ladowanie, setLadowanie] = useState(false);
  const [ladowanieBudynkow, setLadowanieBudynkow] = useState(false);
  const [pobierany, setPobierany] = useState("");
  const [pokazPodglad, setPokazPodglad] = useState(false);
  const [typPodgladu, setTypPodgladu] = useState("liczniki");
  const [podgladBloki, setPodgladBloki] = useState([zbudujPustyBlok()]);
  const [podgladTytul, setPodgladTytul] = useState("Podgląd szablonu liczników");
  const [podgladOpis, setPodgladOpis] = useState("Układ i kolory jak w arkuszu do importu liczników.");
  const [komunikat, setKomunikat] = useState("");
  const [blad, setBlad] = useState("");
  const [wyszukiwarkaKontrahentow, setWyszukiwarkaKontrahentow] = useState("");
  const [sekcjeOtwarte, setSekcjeOtwarte] = useState({
    pusty: true,
    kontrahenci: false
  });
  const podgladTabelaRef = useRef(null);

  const szablonyKontrahentow = useMemo(
    () => grupujSzablonyKontrahentow(odczytyLicznikow),
    [odczytyLicznikow]
  );

  const widoczneSzablonyKontrahentow = useMemo(() => {
    const fraza = normalizujTekst(wyszukiwarkaKontrahentow);
    if (!fraza) return szablonyKontrahentow;
    return szablonyKontrahentow.filter((kontrahent) => normalizujTekst(kontrahent.kontrahent).includes(fraza));
  }, [szablonyKontrahentow, wyszukiwarkaKontrahentow]);

  async function odswiez() {
    const wynik = await zapytanieApi("/szablony-przegladow");
    setLista(Array.isArray(wynik) ? wynik : []);
  }

  async function odswiezBudynkiLicznikow() {
    setLadowanieBudynkow(true);
    try {
      const wynik = await zapytanieApi("/odczyty-licznikow");
      setOdczytyLicznikow(Array.isArray(wynik) ? wynik : []);
    } finally {
      setLadowanieBudynkow(false);
    }
  }

  useEffect(() => {
    odswiez().catch((error) => setBlad(error.message));
    odswiezBudynkiLicznikow().catch((error) => setBlad(error.message));
  }, []);

  useLayoutEffect(() => {
    if (!pokazPodglad || !podgladTabelaRef.current) return;

    const element = podgladTabelaRef.current;
    const wyzerujScroll = () => {
      element.scrollLeft = 0;
      element.scrollTo({ left: 0, behavior: "auto" });
    };

    wyzerujScroll();
    const frameId = window.requestAnimationFrame(wyzerujScroll);
    const timeoutId = window.setTimeout(wyzerujScroll, 40);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [pokazPodglad, podgladBloki]);

  function wyczyscFormularz() {
    setFormularz(pustyFormularz);
    setPlik(null);
    setEdytowany(null);
  }

  function przelaczSekcje(klucz) {
    setSekcjeOtwarte((prev) => ({ ...prev, [klucz]: !prev[klucz] }));
  }

  function otworzPodglad(bloki, tytul, opis) {
    setTypPodgladu("liczniki");
    setPodgladBloki(bloki);
    setPodgladTytul(tytul);
    setPodgladOpis(opis);
    setPokazPodglad(true);
  }

  function otworzPodgladProtokolu() {
    setTypPodgladu("protokol");
    setPodgladTytul("Podgląd szablonu protokołu");
    setPodgladOpis("Gotowy układ protokołu przyjęcia zlecenia do dalszej edycji.");
    setPokazPodglad(true);
  }

  async function pobierzPustySzablon() {
    await pobierzSzablonLicznikowDlaBlokow([zbudujPustyBlok()], "Szablon_licznikow_pusty.xlsx");
  }

  async function pobierzSzablonKontrahenta(kontrahent) {
    await pobierzSzablonLicznikowDlaBlokow(
      kontrahent.bloki,
      nazwaPlikuSzablonuKontrahenta(kontrahent.kontrahent),
      kontrahent.rok || ""
    );
  }

  async function zapisz(e) {
    e.preventDefault();
    setBlad("");
    setKomunikat("");
    setLadowanie(true);

    try {
      const body = new FormData();
      body.append("nazwa", formularz.nazwa.trim());
      body.append("opis", formularz.opis.trim());
      if (plik) body.append("plik", plik);

      if (edytowany) {
        await zapytanieApi(`/szablony-przegladow/${edytowany}`, {
          method: "PUT",
          body
        });
        setKomunikat("Szablon został zaktualizowany.");
      } else {
        await zapytanieApi("/szablony-przegladow", {
          method: "POST",
          body
        });
        setKomunikat("Szablon został dodany.");
      }

      wyczyscFormularz();
      await odswiez();
    } catch (error) {
      setBlad(error.message);
    } finally {
      setLadowanie(false);
    }
  }

  async function pobierzSzablon(id, nazwa) {
    setBlad("");
    setPobierany(String(id));
    try {
      const blob = await zapytanieApi(`/szablony-przegladow/${id}/pobierz`, {
        zwrocBinarnie: true
      });
      await pobierzBlobJakoPlik(blob, nazwa || "szablon");
    } catch (error) {
      setBlad(error.message);
    } finally {
      setPobierany("");
    }
  }

  async function usunSzablon(id) {
    setBlad("");
    setKomunikat("");
    try {
      await zapytanieApi(`/szablony-przegladow/${id}`, { method: "DELETE" });
      setKomunikat("Szablon został usunięty.");
      if (String(edytowany) === String(id)) wyczyscFormularz();
      await odswiez();
    } catch (error) {
      setBlad(error.message);
    }
  }

  return (
    <div className="space-y-6">
      <SekcjaNaglowek
        tytul="Szablony przeglądów"
        opis="Pobieraj gotowe wzory do pracy terenowej i obsługi liczników."
      />

      {blad ? (
        <p className="rounded-2xl border border-red-400/15 bg-red-500/10 px-4 py-3 text-sm text-red-300">{blad}</p>
      ) : null}
      {komunikat ? (
        <p className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {komunikat}
        </p>
      ) : null}

      {czyAdmin ? (
        <form onSubmit={zapisz} className="karta-szklana space-y-4 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-100">{edytowany ? "Edycja szablonu" : "Dodaj szablon"}</p>
              <p className="mt-1 text-sm text-slate-400">Obsługiwane pliki: .doc, .docx, .xls, .xlsx, .ods</p>
            </div>
            {edytowany ? (
              <button type="button" className="przycisk-wtorny" onClick={wyczyscFormularz}>
                Anuluj
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
            <input
              className="pole"
              placeholder="Nazwa szablonu"
              value={formularz.nazwa}
              onChange={(e) => setFormularz((prev) => ({ ...prev, nazwa: e.target.value }))}
              required
            />
            <input
              className="pole"
              placeholder="Opis"
              value={formularz.opis}
              onChange={(e) => setFormularz((prev) => ({ ...prev, opis: e.target.value }))}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <label className="mb-2 block text-sm font-medium text-slate-200">Plik szablonu</label>
            <input
              type="file"
              accept=".doc,.docx,.xls,.xlsx,.ods"
              className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:font-medium file:text-slate-950 hover:file:bg-emerald-400"
              onChange={(e) => setPlik(e.target.files?.[0] || null)}
            />
            {plik ? <p className="mt-2 text-sm text-emerald-200">Wybrany plik: {plik.name}</p> : null}
            {edytowany && !plik ? (
              <p className="mt-2 text-sm text-slate-400">Możesz zostawić obecny plik albo podmienić go nowym.</p>
            ) : null}
          </div>

          <button className="przycisk-glowny" disabled={ladowanie}>
            {ladowanie ? "Zapisywanie..." : edytowany ? "Zapisz zmiany" : "Dodaj szablon"}
          </button>
        </form>
      ) : null}

      <section className="karta-szklana space-y-4 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-slate-100">Lista szablonów</p>
            <p className="mt-1 text-sm text-slate-400">Pobieraj gotowe pliki do pracy terenowej i obsługi liczników.</p>
          </div>
          <div className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
            Szablonów: {lista.length + 2}
          </div>
        </div>

        <KartaInformacyjna>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-slate-100">Szablony liczników</p>
              <p className="mt-2 text-sm text-slate-300">
                Wybierz pusty wzór albo gotowy układ całego kontrahenta z zachowaną strukturą i pustymi miesiącami.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                  .xlsx
                </span>
                <span>Bardzo ważne: zachowaj strukturę szablonu podczas edycji.</span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/10 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Pusty szablon liczników</p>
                  <p className="mt-1 text-xs text-slate-400">Czysty arkusz bez wpisanych pozycji i bez miesięcy.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="przycisk-wtorny px-3 py-1.5 text-sm"
                    onClick={() =>
                      otworzPodglad(
                        [zbudujPustyBlok()],
                        "Podgląd pustego szablonu liczników",
                        "W pełni pusty arkusz z zachowaną strukturą importu."
                      )
                    }
                  >
                    Podgląd
                  </button>
                  <button type="button" className="przycisk-glowny" onClick={pobierzPustySzablon}>
                    Pobierz
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/10">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                onClick={() => przelaczSekcje("kontrahenci")}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-100">Szablony kontrahentów</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Gotowe układy całych kontrahentów z obecnymi pozycjami liczników, ale bez wpisanych miesięcy.
                  </p>
                </div>
                <span className="text-sm text-slate-300">
                  {sekcjeOtwarte.kontrahenci ? `Ukryj (${szablonyKontrahentow.length})` : `Pokaż (${szablonyKontrahentow.length})`}
                </span>
              </button>

              {sekcjeOtwarte.kontrahenci ? (
                <div className="border-t border-white/10 px-4 py-4">
                  <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                    <input
                      className="pole"
                      placeholder="Wyszukaj kontrahenta"
                      value={wyszukiwarkaKontrahentow}
                      onChange={(e) => setWyszukiwarkaKontrahentow(e.target.value)}
                    />
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                      {ladowanieBudynkow ? "Ładowanie kontrahentów..." : `Dostępnych kontrahentów: ${widoczneSzablonyKontrahentow.length}`}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {widoczneSzablonyKontrahentow.map((kontrahent) => (
                      <div
                        key={kontrahent.kontrahent}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{kontrahent.kontrahent}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            Budynków: {kontrahent.bloki.length} • Pozycji:{" "}
                            {kontrahent.bloki.reduce((suma, blok) => suma + blok.wiersze.length, 0)}
                            {kontrahent.rok ? ` • Rok bazowy: ${kontrahent.rok}` : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="przycisk-wtorny px-3 py-1.5 text-sm"
                            onClick={() =>
                              otworzPodglad(
                                kontrahent.bloki,
                                `Podgląd szablonu: ${kontrahent.kontrahent}`,
                                "Układ całego kontrahenta z bieżącymi pozycjami, ale z pustymi miesiącami."
                              )
                            }
                          >
                            Podgląd
                          </button>
                          <button
                            type="button"
                            className="przycisk-glowny"
                            onClick={() => pobierzSzablonKontrahenta(kontrahent)}
                          >
                            Pobierz
                          </button>
                        </div>
                      </div>
                    ))}

                    {!ladowanieBudynkow && !widoczneSzablonyKontrahentow.length ? (
                      <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                        Nie znaleziono kontrahentów pasujących do wyszukiwania.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </KartaInformacyjna>

        <KartaInformacyjna>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-slate-100">Szablon protokołów</p>
              <p className="mt-2 text-sm text-slate-300">
                Gotowy szablon protokołu przyjęcia zlecenia do pobrania i dalszej edycji.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                  .docx
                </span>
                <span>Bardzo ważne: zachowaj strukturę szablonu podczas edycji.</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-sm przycisk-wtorny"
                onClick={otworzPodgladProtokolu}
              >
                Podgląd
              </button>
              <button type="button" className="przycisk-glowny" onClick={pobierzSzablonProtokolu}>
                Pobierz
              </button>
            </div>
          </div>
        </KartaInformacyjna>

        <div className="space-y-3">
          {lista.map((wpis) => (
            <KartaInformacyjna key={wpis.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-slate-100">{wpis.nazwa}</p>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                      {pobierzRozszerzenie(wpis.nazwa_pliku)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{wpis.opis || "Brak opisu."}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                    {wpis.nazwa_pliku ? <span>Plik: {wpis.nazwa_pliku}</span> : null}
                    {wpis.imie_nazwisko ? <span>Dodał: {wpis.imie_nazwisko}</span> : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="przycisk-glowny"
                    onClick={() => pobierzSzablon(wpis.id, wpis.nazwa_pliku || `${wpis.nazwa}.plik`)}
                    disabled={String(pobierany) === String(wpis.id)}
                  >
                    {String(pobierany) === String(wpis.id) ? "Pobieranie..." : "Pobierz"}
                  </button>
                  {czyAdmin ? (
                    <>
                      <button
                        type="button"
                        className="przycisk-wtorny"
                        onClick={() => {
                          setEdytowany(wpis.id);
                          setFormularz({
                            nazwa: wpis.nazwa || "",
                            opis: wpis.opis || ""
                          });
                          setPlik(null);
                        }}
                      >
                        Edytuj
                      </button>
                      <button type="button" className="przycisk-wtorny" onClick={() => usunSzablon(wpis.id)}>
                        Usuń
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </KartaInformacyjna>
          ))}
        </div>
      </section>

      {pokazPodglad ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm">
          <div className="karta-szklana h-[92vh] max-h-[92vh] w-[96vw] max-w-[1500px] overflow-hidden rounded-2xl border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-lg font-semibold text-slate-100">{podgladTytul}</p>
                <p className="mt-1 text-sm text-slate-400">{podgladOpis}</p>
              </div>
              <button type="button" className="przycisk-wtorny" onClick={() => setPokazPodglad(false)}>
                Zamknij
              </button>
            </div>

            <div className="h-[calc(92vh-88px)] overflow-y-auto overflow-x-hidden p-5">
              {typPodgladu === "liczniki" ? (
                <div ref={podgladTabelaRef} className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-4 min-w-[1560px] border border-black bg-white">
                    <div className="border-b border-black px-3 py-2 text-sm font-bold text-slate-950">
                      {podgladBloki[0]?.rok ? `STANY LICZNIKÓW NA ROK ${podgladBloki[0].rok}` : "STANY LICZNIKÓW NA ROK"}
                    </div>

                    {podgladBloki.map((blok, indeks) => (
                      <div key={`${blok.budynek}-${indeks}`}>
                        <div className="h-4 bg-white" />
                        <div className="h-4 bg-white" />
                        <div className="border-b border-black bg-[#C7C7C7] px-3 py-2 text-sm font-bold uppercase text-slate-950">
                          {String(blok.budynek || "NAZWA BUDYNKU").toUpperCase()}
                        </div>
                        <table className="w-full border-collapse text-xs text-slate-950">
                          <colgroup>
                            <col style={{ width: "56px" }} />
                            <col style={{ width: "260px" }} />
                            <col style={{ width: "170px" }} />
                            <col style={{ width: "160px" }} />
                            {Array.from({ length: 12 }).map((_, indexKolumny) => (
                              <col key={indexKolumny} style={{ width: "95px" }} />
                            ))}
                          </colgroup>
                          <thead>
                            <tr>
                              {NAGLOWKI_LICZNIKOW.map((naglowek) => (
                                <th key={naglowek} className="border border-black bg-[#7CBF3A] px-2 py-2 text-center font-bold">
                                  {naglowek}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {blok.wiersze.map((wiersz, indexWiersza) => (
                              <tr key={`${blok.budynek}-${indexWiersza}`} className={indexWiersza % 2 === 1 ? "bg-[#E1EFDA]" : "bg-white"}>
                                <td className="border border-black px-2 py-3 text-center">{wiersz.lp || "\u00A0"}</td>
                                <td className="border border-black px-2 py-3 text-left">{wiersz.typ_licznika || "\u00A0"}</td>
                                <td className="border border-black px-2 py-3 text-center">{wiersz.rodzaj_licznika || "\u00A0"}</td>
                                <td className="border border-black px-2 py-3 text-center">{wiersz.numer_licznika || "\u00A0"}</td>
                                {Array.from({ length: 12 }).map((_, indexMiesiaca) => (
                                  <td key={indexMiesiaca} className="border border-black px-2 py-3 text-center">
                                    &nbsp;
                                  </td>
                                ))}
                              </tr>
                            ))}
                            <tr className="bg-white">
                              <td className="border border-black px-2 py-3 text-center">&nbsp;</td>
                              <td colSpan={14} className="border border-black px-3 py-3 text-right font-bold">
                                DATA ODCZYTU :
                              </td>
                              <td className="border border-black px-2 py-3 text-center">&nbsp;</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-[940px] rounded-[22px] border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
                  <div className="rounded-[22px] border border-[#e8f0dd] bg-[#f2f8ea] px-6 py-5">
                    <div className="grid grid-cols-[180px_1fr_180px] items-center gap-6">
                      <div>
                        <img src="/logo.png" alt="Eltreko logo" className="h-auto w-[150px]" />
                      </div>
                      <div className="text-sm leading-6 text-slate-500">
                        <p>tel. 513 086 511</p>
                        <p>tel. 602 559 188</p>
                        <p>e-mail: eltreko@gmail.com</p>
                        <p>Warszawa</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase leading-4 tracking-[0.02em] text-slate-900">
                          Eltreko M. Duralski, A. Pietrak
                        </p>
                        <p className="text-[10px] font-bold uppercase leading-4 tracking-[0.02em] text-slate-900">
                          Spółka Jawna
                        </p>
                        <div className="mt-2 text-sm leading-6 text-slate-500">
                          <p>ul. Van Gogha 3A / 21</p>
                          <p>03-188 Warszawa</p>
                          <p>NIP: 5242673461</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[18px] border border-slate-200 px-7 py-5">
                    <div className="flex items-start justify-between gap-6">
                      <div>
                        <p className="text-[2rem] font-bold text-slate-900">Protokół przyjęcia zlecenia</p>
                        <p className="mt-2 text-sm text-slate-500">Nr [</p>
                      </div>
                      <div className="rounded-[12px] bg-[#eef6e6] px-5 py-3 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#5f7f31]">Data przyjęcia</p>
                        <p className="mt-1 text-base font-bold text-slate-900">dd.mm.rrrr</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-x-10 gap-y-0 text-slate-900">
                    {[
                      ["Zlecający", ""],
                      ["Przyjmujący zlecenie", ""],
                      ["Obiekt", ""],
                      ["Adres obiektu", ""]
                    ].map(([etykieta, wartosc]) => (
                      <div key={etykieta} className="border-b border-[#e7edf1] py-5">
                        <p className="text-[11px] font-bold text-[#253641]">{etykieta}</p>
                        <div className="mt-4 text-[1.05rem] font-medium">
                          {wartosc || "\u00A0"}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-b border-[#e7edf1] py-5">
                    <p className="text-[11px] font-bold text-[#253641]">Lokalizacja usterki</p>
                    <div className="mt-4 min-h-[54px] text-[1.02rem]">&nbsp;</div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-10">
                    {["Kategoria usterki", "Czynności serwisowe"].map((etykieta) => (
                      <div key={etykieta}>
                        <div className="border-b border-[#e7edf1] py-5">
                          <p className="text-[11px] font-bold text-[#253641]">{etykieta}</p>
                          <div className="mt-4 min-h-[54px] text-[1.02rem]">&nbsp;</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-b border-[#e7edf1] py-5">
                    <p className="text-[11px] font-bold text-[#253641]">Opis usterki</p>
                    <div className="mt-4 min-h-[72px] text-[1.02rem]">&nbsp;</div>
                  </div>

                  <div className="border-b border-[#e7edf1] py-5">
                    <p className="text-[11px] font-bold text-[#253641]">Użyte części</p>
                    <div className="mt-4 min-h-[58px] text-[1.02rem]">&nbsp;</div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-10">
                    <div className="py-5">
                      <p className="text-[11px] font-bold text-[#253641]">Planowana data wykonania naprawy</p>
                      <div className="mt-4 min-h-[40px] text-[1.02rem]">&nbsp;</div>
                    </div>
                    <div className="py-5">
                      <p className="text-[11px] font-bold text-[#253641]">Uwagi do usługi</p>
                      <div className="mt-4 min-h-[40px] text-[1.02rem]">&nbsp;</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
