"use client";

import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BuildingOffice2Icon } from "@heroicons/react/24/outline";
import SekcjaNaglowek from "../../../components/SekcjaNaglowek";
import { zapytanieApi } from "../../../lib/api";
import { pobierzSesje } from "../../../lib/auth";
import { czySupabaseSkonfigurowany, supabase } from "../../../lib/supabase";

const MIESIACE = [
  ["m01", "styczeń", "sty"],
  ["m02", "luty", "lut"],
  ["m03", "marzec", "mar"],
  ["m04", "kwiecień", "kwi"],
  ["m05", "maj", "maj"],
  ["m06", "czerwiec", "cze"],
  ["m07", "lipiec", "lip"],
  ["m08", "sierpień", "sie"],
  ["m09", "wrzesień", "wrz"],
  ["m10", "październik", "paź"],
  ["m11", "listopad", "lis"],
  ["m12", "grudzień", "gru"]
];

const DOMYSLNY_KONTRAHENT = "PORT PRASKI";
const BUCKET_PLIKOW_STORAGE = "eltreko-files";
const uchwytyZapisuPlikow = new Map();
const IDB_NAZWA = "eltreko-odczyty-pliki";
const IDB_WERSJA = 2;
const IDB_STORE = "uchwyty";
const IDB_KLUCZ_EXCEL = "podlaczony-excel";
const IDB_STORE_KOLEJKA = "kolejka-odczytow";
const IDB_STORE_CACHE = "cache-odczytow";
const IDB_KLUCZ_CACHE_LISTA = "lista";

function pustyFormularz() {
  return {
    lp: "",
    typ_licznika: "",
    rodzaj_licznika: "",
    numer_licznika: "",
    kontrahent_id: "",
    import_nazwa: "",
    rok: new Date().getFullYear(),
    m01: "",
    m02: "",
    m03: "",
    m04: "",
    m05: "",
    m06: "",
    m07: "",
    m08: "",
    m09: "",
    m10: "",
    m11: "",
    m12: ""
  };
}

function bezpiecznaNazwaPliku(nazwa) {
  return String(nazwa || "liczniki")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .slice(0, 90);
}

function nazwaPlikowaLiczniki(nazwa) {
  return bezpiecznaNazwaPliku(nazwa || "wszyscy-kontrahenci")
    .replace(/\s+/g, "_")
    .trim();
}

function nazwaPlikuExcelaLiczniki(nazwa) {
  const rdzen = nazwaPlikowaLiczniki(nazwa) || "wszyscy-kontrahenci";
  return `Liczniki_${rdzen}.xlsx`;
}

function nazwaPlikuPdfLiczniki(nazwa, miesiacKod) {
  const rdzen = nazwaPlikowaLiczniki(nazwa) || "wszyscy-kontrahenci";
  const miesiacMeta = MIESIACE.find(([kod]) => kod === miesiacKod);
  const miesiac = nazwaPlikowaLiczniki(miesiacMeta?.[1] || "miesiac");
  return `Liczniki_${rdzen}_${miesiac}.pdf`;
}

function kluczUchwytuEksportu(typ, nazwa, rok, miesiacKod = "") {
  const bezpiecznaNazwa = bezpiecznaNazwaPliku(nazwa || "liczniki");
  return [typ, bezpiecznaNazwa, String(rok || ""), String(miesiacKod || "")]
    .filter(Boolean)
    .join("__");
}

function czyPlikExcelStorage(plik) {
  return /\.(xlsx|xls|ods)$/i.test(String(plik?.name || ""));
}

function normalizujNazwePlikuStorage(nazwa) {
  return normalizujTekst(
    String(nazwa || "")
      .replace(/\.[^.]+$/, "")
      .replace(/^liczniki[\s_-]*/i, "")
      .replace(/[_-]+/g, " ")
  );
}

function listaPoZapisieRekordu(lista = [], rekord) {
  if (!rekord?.id) return Array.isArray(lista) ? [...lista] : [];
  const baza = Array.isArray(lista) ? lista : [];
  const indeks = baza.findIndex((item) => String(item.id) === String(rekord.id));
  if (indeks === -1) {
    return [...baza, rekord];
  }
  const next = [...baza];
  next[indeks] = rekord;
  return next;
}

function otworzBazePlikow() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(null);
      return;
    }
    const request = window.indexedDB.open(IDB_NAZWA, IDB_WERSJA);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
      if (!db.objectStoreNames.contains(IDB_STORE_KOLEJKA)) {
        db.createObjectStore(IDB_STORE_KOLEJKA, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(IDB_STORE_CACHE)) {
        db.createObjectStore(IDB_STORE_CACHE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Nie udało się otworzyć bazy plików."));
  });
}

async function pobierzUchwytZBazy(klucz) {
  const db = await otworzBazePlikow();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const request = store.get(klucz);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("Nie udało się odczytać podpiętego pliku."));
  });
}

async function zapiszUchwytWBazie(klucz, uchwyt) {
  const db = await otworzBazePlikow();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const request = store.put(uchwyt, klucz);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Nie udało się zapisać podpiętego pliku."));
  });
}

async function usunUchwytZBazy(klucz) {
  const db = await otworzBazePlikow();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const request = store.delete(klucz);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Nie udało się usunąć podpiętego pliku."));
  });
}

async function pobierzKolejkeOdczytow() {
  const db = await otworzBazePlikow();
  if (!db) return [];
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_KOLEJKA, "readonly");
    const store = tx.objectStore(IDB_STORE_KOLEJKA);
    const request = store.getAll();
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
    request.onerror = () => reject(request.error || new Error("Nie udało się odczytać lokalnych zapisów."));
  });
}

async function zapiszDoKolejkiOdczytow(wpis) {
  const db = await otworzBazePlikow();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_KOLEJKA, "readwrite");
    const store = tx.objectStore(IDB_STORE_KOLEJKA);
    const request = store.put(wpis);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Nie udało się zapisać lokalnie odczytu."));
  });
}

async function usunZKolejkiOdczytow(id) {
  const db = await otworzBazePlikow();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_KOLEJKA, "readwrite");
    const store = tx.objectStore(IDB_STORE_KOLEJKA);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Nie udało się usunąć lokalnego zapisu."));
  });
}

async function pobierzCacheOdczytow() {
  const db = await otworzBazePlikow();
  if (!db) return [];
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_CACHE, "readonly");
    const store = tx.objectStore(IDB_STORE_CACHE);
    const request = store.get(IDB_KLUCZ_CACHE_LISTA);
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
    request.onerror = () => reject(request.error || new Error("Nie udało się odczytać cache odczytów."));
  });
}

async function zapiszCacheOdczytow(lista) {
  const db = await otworzBazePlikow();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_CACHE, "readwrite");
    const store = tx.objectStore(IDB_STORE_CACHE);
    const request = store.put(lista, IDB_KLUCZ_CACHE_LISTA);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Nie udało się zapisać cache odczytów."));
  });
}

async function pobierzBlob(blob, nazwaPliku) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nazwaPliku;
  a.click();
  window.URL.revokeObjectURL(url);
  return { status: "downloaded", fileName: nazwaPliku };
}

async function zapiszBlobDoPliku(blob, nazwaPliku, typMime, opcje = {}) {
  const klucz = opcje.kluczUchwytu || typMime;
  const showSaveFilePickerFn = typeof window !== "undefined" ? window.showSaveFilePicker : null;
  const { wymusPobranie = false, wymusOknoZapisu = false, uchwytPliku = null } = opcje;

  if (wymusPobranie) {
    return pobierzBlob(blob, nazwaPliku);
  }

  if (typeof showSaveFilePickerFn === "function") {
    try {
      let uchwyt = uchwytPliku || (!wymusOknoZapisu ? uchwytyZapisuPlikow.get(klucz) : null);

      if (!uchwyt && !wymusOknoZapisu) {
        try {
          uchwyt = await pobierzUchwytZBazy(klucz);
          if (uchwyt) {
            uchwytyZapisuPlikow.set(klucz, uchwyt);
          }
        } catch (_error) {
          // Ignorujemy błąd IndexedDB i lecimy dalej do picker'a albo pobrania.
        }
      }

      if (!uchwyt) {
        const rozszerzenie = nazwaPliku.toLowerCase().endsWith(".pdf") ? ".pdf" : ".xlsx";
        uchwyt = await showSaveFilePickerFn({
          suggestedName: nazwaPliku,
          types: [
            {
              description: rozszerzenie === ".pdf" ? "Plik PDF" : "Plik Excel",
              accept: {
                [typMime]: [rozszerzenie]
              }
            }
          ]
        });
        uchwytyZapisuPlikow.set(klucz, uchwyt);
        try {
          await zapiszUchwytWBazie(klucz, uchwyt);
        } catch (_error) {
          // Ignorujemy brak możliwości utrwalenia uchwytu w bazie przeglądarki.
        }
      }

      const writable = await uchwyt.createWritable();
      await writable.write(blob);
      await writable.close();
      return { status: "saved", fileName: uchwyt.name || nazwaPliku };
    } catch (error) {
      if (error?.name === "AbortError") {
        return { status: "cancelled", fileName: nazwaPliku };
      }
      if (!uchwytPliku) {
        uchwytyZapisuPlikow.delete(klucz);
        try {
          await usunUchwytZBazy(klucz);
        } catch (_error) {
          // Ignorujemy.
        }
      }
      if (error?.name === "NoModificationAllowedError" || error?.name === "InvalidStateError") {
        throw new Error("Nie udało się nadpisać pliku. Zamknij go w Excelu lub PDF i spróbuj ponownie.");
      }
      if (error?.name === "NotAllowedError") {
        throw new Error("Brak uprawnienia do zapisu w podpiętym pliku. Podłącz go ponownie.");
      }
    }
  }

  return pobierzBlob(blob, nazwaPliku);
}

async function zapiszBlobDoSupabaseStorage(blob, nazwaPliku, typMime, opcje = {}) {
  if (!czySupabaseSkonfigurowany || !supabase) {
    throw new Error("Supabase Storage nie jest skonfigurowany.");
  }

  const bucket = String(opcje.bucket || BUCKET_PLIKOW_STORAGE).trim();
  const storagePath = String(opcje.storagePath || "").trim();

  if (!bucket || !storagePath) {
    throw new Error("Brak ścieżki pliku w chmurze do zapisania zmian.");
  }

  const { error } = await supabase.storage.from(bucket).upload(storagePath, blob, {
    upsert: true,
    contentType: typMime
  });

  if (error) {
    throw new Error(`Nie udało się zapisać pliku w chmurze: ${error.message}`);
  }

  return {
    status: "cloud-saved",
    fileName: nazwaPliku,
    storagePath
  };
}

function nazwaImportuZPliku(nazwaPliku) {
  return String(nazwaPliku || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function nazwaKontrahentaZImportu(importNazwa) {
  const nazwa = wartoscKomorki(importNazwa);
  if (!nazwa) return "";
  return nazwa.replace(/\s+\d{4}\b/g, "").trim() || nazwa;
}

function dzisiajPl() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function formatujDateOdczytu(wartosc) {
  const tekst = wartoscKomorki(wartosc);
  if (!tekst) return dzisiajPl();
  const iso = tekst.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return `${iso[3]}.${iso[2]}.${iso[1]}`;
  }
  return tekst;
}

function zbudujBlokiEksportu(wiersze, rok, naglowekKontrahenta = null) {
  return Array.from(
    wiersze.reduce((mapa, wiersz) => {
      const budynek = wartoscKomorki(wiersz.kontrahent_nazwa) || "Brak budynku";
      const kontrahent = wartoscKomorki(naglowekKontrahenta) || wartoscKomorki(wiersz.import_nazwa) || "Brak kontrahenta";
      const rokBloku = String(wiersz.rok || rok || new Date().getFullYear());
      const klucz = `${kontrahent}__${budynek}__${rokBloku}`;
      if (!mapa.has(klucz)) {
        mapa.set(klucz, {
          kontrahent,
          budynek,
          rok: rokBloku,
          kolejnoscImportu: Number(wiersz.id || Number.MAX_SAFE_INTEGER),
          wiersze: []
        });
      }
      const blok = mapa.get(klucz);
      blok.kolejnoscImportu = Math.min(blok.kolejnoscImportu, Number(wiersz.id || Number.MAX_SAFE_INTEGER));
      blok.wiersze.push(wiersz);
      return mapa;
    }, new Map()).values()
  ).sort((a, b) => a.kolejnoscImportu - b.kolejnoscImportu);
}

function normalizujTekst(wartosc) {
  return String(wartosc || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function poleMiesiacaPoNaglowku(naglowek) {
  const klucz = normalizujTekst(naglowek).replace(/\./g, "");
  for (const [kod, nazwa, skrot] of MIESIACE) {
    if (klucz === normalizujTekst(nazwa) || klucz === normalizujTekst(skrot)) {
      return kod;
    }
  }
  return null;
}

function wartoscKomorki(wartosc) {
  if (wartosc == null) return "";
  return String(wartosc).trim();
}

function wartoscMiesiecznaTekst(wartosc) {
  return wartosc == null ? "" : String(wartosc);
}

function przywrocScrollPoZapisie(pozycja) {
  if (typeof window === "undefined") return;
  const x = window.scrollX;
  const ustaw = () => window.scrollTo({ top: pozycja, left: x, behavior: "auto" });
  window.requestAnimationFrame(ustaw);
  window.setTimeout(ustaw, 80);
}

function zastepczaKreska(wartosc) {
  const tekst = wartoscKomorki(wartosc);
  return tekst || "-";
}

function wartoscDoExcelaLiczbowa(wartosc) {
  const tekst = wartoscKomorki(wartosc);
  if (!tekst) return "";

  const znormalizowana = tekst.replace(/\s+/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(znormalizowana)) {
    return tekst;
  }

  const liczba = Number(znormalizowana);
  return Number.isFinite(liczba) ? liczba : tekst;
}

let pdfFontPromise = null;

async function zaladujFontPdf(doc) {
  if (!pdfFontPromise) {
    pdfFontPromise = fetch("/fonts/arial.ttf")
      .then((res) => {
        if (!res.ok) throw new Error("Nie udało się wczytać fontu PDF.");
        return res.arrayBuffer();
      })
      .then((buffer) => {
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 1) {
          binary += String.fromCharCode(bytes[i]);
        }
        return binary;
      });
  }

  const fontBinary = await pdfFontPromise;
  doc.addFileToVFS("arial.ttf", fontBinary);
  doc.addFont("arial.ttf", "ArialPL", "normal");
  doc.addFont("arial.ttf", "ArialPL", "bold");
  doc.setFont("ArialPL", "normal");
}

function frazaFiltrowania(wartosc, etykietaWszystko = "") {
  const tekst = String(wartosc || "").trim().toLowerCase();
  if (!tekst) return "";
  if (etykietaWszystko && tekst === etykietaWszystko.trim().toLowerCase()) {
    return "";
  }
  return tekst;
}

function duzaLitera(wartosc) {
  const tekst = String(wartosc || "");
  if (!tekst) return "";
  return tekst.charAt(0).toUpperCase() + tekst.slice(1);
}

function czyDokladnieWybranaOpcja(wartosc, opcje = [], etykietaWszystko = "") {
  const szukana = normalizujTekst(wartosc);
  if (!szukana) return false;
  if (etykietaWszystko && szukana === normalizujTekst(etykietaWszystko)) return true;

  return opcje.some((opcja) => {
    if (Array.isArray(opcja)) {
      return opcja.some((wartoscOpcji) => normalizujTekst(wartoscOpcji) === szukana);
    }
    if (opcja && typeof opcja === "object") {
      return Object.values(opcja).some((wartoscOpcji) => normalizujTekst(wartoscOpcji) === szukana);
    }
    return normalizujTekst(opcja) === szukana;
  });
}

function zbudujWierszOdczytu(dane = {}) {
  return {
    lp: wartoscKomorki(dane.lp),
    typ_licznika: wartoscKomorki(dane.typ_licznika),
    rodzaj_licznika: wartoscKomorki(dane.rodzaj_licznika),
    numer_licznika: wartoscKomorki(dane.numer_licznika),
    m01: wartoscKomorki(dane.m01),
    m02: wartoscKomorki(dane.m02),
    m03: wartoscKomorki(dane.m03),
    m04: wartoscKomorki(dane.m04),
    m05: wartoscKomorki(dane.m05),
    m06: wartoscKomorki(dane.m06),
    m07: wartoscKomorki(dane.m07),
    m08: wartoscKomorki(dane.m08),
    m09: wartoscKomorki(dane.m09),
    m10: wartoscKomorki(dane.m10),
    m11: wartoscKomorki(dane.m11),
    m12: wartoscKomorki(dane.m12)
  };
}

function stworzLokalnyId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function czyBladPolaczenia(error) {
  if (!error) return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return String(error.message || "").includes("Błąd połączenia z API");
}

function zastosujKolejkeDoListy(listaBazowa, kolejka) {
  const wynik = [...listaBazowa];

  for (const wpis of kolejka) {
    if (wpis.typ === "create" && wpis.lokalnyRekord) {
      const istnieje = wynik.some((item) => String(item.id) === String(wpis.lokalnyRekord.id));
      if (!istnieje) {
        wynik.push(wpis.lokalnyRekord);
      }
    }

    if ((wpis.typ === "update" || wpis.typ === "update-month") && wpis.rekordId) {
      const index = wynik.findIndex((item) => String(item.id) === String(wpis.rekordId));
      if (index >= 0 && wpis.lokalnyRekord) {
        wynik[index] = { ...wynik[index], ...wpis.lokalnyRekord, _lokalne: true, _kolejkaId: wpis.id };
      }
    }
  }

  return wynik;
}

function czyToWierszNaglowkaLubTechniczny(pozycja) {
  const lpLiczba = Number(wartoscKomorki(pozycja.lp));
  const opis = normalizujTekst(pozycja.typ_licznika);
  const rodzaj = normalizujTekst(pozycja.rodzaj_licznika);
  const numer = normalizujTekst(pozycja.numer_licznika);

  const wygladaJakNaglowek =
    opis === "opis" ||
    opis === "licznik / podlicznik" ||
    opis === "licznik podlicznik" ||
    rodzaj === "licznik rodzaj" ||
    numer === "nr licznika" ||
    opis === "data odczytu :" ||
    opis === "stany licznikow na rok";

  const brakDanychMiesiecy = MIESIACE.every(([kod]) => !wartoscKomorki(pozycja[kod]));
  const lpNiepoprawne = !Number.isFinite(lpLiczba) || lpLiczba <= 0;

  return wygladaJakNaglowek || (lpNiepoprawne && brakDanychMiesiecy);
}

function czyNaglowekTabeli(row) {
  const komorki = Array.isArray(row) ? row.map((cell) => normalizujTekst(cell).replace(/\./g, "")) : [];
  const maOpis =
    komorki.includes("opis") ||
    komorki.includes("licznik / podlicznik") ||
    komorki.includes("licznik podlicznik");
  return komorki.includes("lp") && maOpis && komorki.includes("nr licznika");
}

function zmapujKolumnyNaglowka(row) {
  const mapowanieKolumn = {};

  row.forEach((naglowek, index) => {
    const klucz = normalizujTekst(naglowek).replace(/\./g, "");
    if (klucz === "lp") mapowanieKolumn.lp = index;
    if (["opis", "licznik / podlicznik", "licznik podlicznik"].includes(klucz)) mapowanieKolumn.typ_licznika = index;
    if (klucz === "licznik rodzaj") mapowanieKolumn.rodzaj_licznika = index;
    if (klucz === "nr licznika") mapowanieKolumn.numer_licznika = index;
    const miesiac = poleMiesiacaPoNaglowku(naglowek);
    if (miesiac) mapowanieKolumn[miesiac] = index;
  });

  return mapowanieKolumn;
}

function wykryjNazweKontrahenta(row) {
  if (!Array.isArray(row)) return "";

  const komorki = row.map((cell) => wartoscKomorki(cell)).filter(Boolean);
  if (!komorki.length) return "";

  const pierwsza = normalizujTekst(komorki[0]);
  if (
    pierwsza.includes("stany licznikow na rok") ||
    pierwsza === "data odczytu :" ||
    komorki.some((cell) => poleMiesiacaPoNaglowku(cell)) ||
    komorki.some((cell) => ["lp", "opis", "licznik / podlicznik", "licznik podlicznik", "nr licznika"].includes(normalizujTekst(cell).replace(/\./g, "")))
  ) {
    return "";
  }

  const pierwszyElementWiersza = wartoscKomorki(row[0]);
  if (pierwszyElementWiersza && Number.isFinite(Number(pierwszyElementWiersza))) {
    return "";
  }

  if (komorki.length > 3) {
    return "";
  }

  return komorki[0];
}

async function znajdzLubUtworzKontrahenta(kontrahenci, kontrahentNazwa) {
  if (!wartoscKomorki(kontrahentNazwa)) {
    throw new Error("W pliku nie znaleziono nazwy kontrahenta.");
  }

  const istniejacy = kontrahenci.find((item) => normalizujTekst(item.nazwa) === normalizujTekst(kontrahentNazwa));
  if (istniejacy) {
    return { kontrahent: istniejacy, utworzony: false };
  }

  const nowyKontrahent = await zapytanieApi("/klienci", {
    method: "POST",
    body: JSON.stringify({
      nazwa: kontrahentNazwa,
      adres: "Do uzupełnienia",
      telefon: "",
      email: "",
      notatki: "Dodano automatycznie podczas importu odczytów liczników."
    })
  });

  return { kontrahent: nowyKontrahent, utworzony: true };
}

function parsujPlikOdczytow(XLSX, workbook) {
  const nazwaArkusza = workbook.SheetNames?.[0];
  if (!nazwaArkusza) {
    throw new Error("Plik Excel nie zawiera żadnego arkusza.");
  }

  const sheet = workbook.Sheets[nazwaArkusza];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
  const maNaglowek = rows.some((row) => czyNaglowekTabeli(row));
  if (!maNaglowek) {
    throw new Error("Nie rozpoznano formatu pliku. Oczekiwany jest eksport odczytów liczników.");
  }

  const tytul = rows.flat().map((cell) => wartoscKomorki(cell)).find((cell) => /\d{4}/.test(cell)) || "";
  const dopasowanieRoku = tytul.match(/(\d{4})/);
  const rok = dopasowanieRoku ? dopasowanieRoku[1] : "";
  const bloki = [];
  let aktualnyKontrahent = "";
  let aktualnyBlok = null;
  let ostatnieMapowanieKolumn = null;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] || [];
    const czyPusta = row.every((cell) => !wartoscKomorki(cell));

    if (czyPusta) {
      continue;
    }

    const znalezionyKontrahent = wykryjNazweKontrahenta(row);
    if (znalezionyKontrahent) {
      aktualnyKontrahent = znalezionyKontrahent;
      if (ostatnieMapowanieKolumn) {
        aktualnyBlok = {
          kontrahentNazwa: aktualnyKontrahent,
          rok,
          mapowanieKolumn: ostatnieMapowanieKolumn,
          wiersze: []
        };
        bloki.push(aktualnyBlok);
      }
      continue;
    }

    if (czyNaglowekTabeli(row)) {
      ostatnieMapowanieKolumn = zmapujKolumnyNaglowka(row);
      aktualnyBlok = {
        kontrahentNazwa: aktualnyKontrahent,
        rok,
        mapowanieKolumn: ostatnieMapowanieKolumn,
        wiersze: []
      };
      bloki.push(aktualnyBlok);
      continue;
    }

    if (!aktualnyBlok) {
      continue;
    }

    const pozycja = zbudujWierszOdczytu({
      lp: row[aktualnyBlok.mapowanieKolumn.lp],
      typ_licznika: row[aktualnyBlok.mapowanieKolumn.typ_licznika],
      rodzaj_licznika: row[aktualnyBlok.mapowanieKolumn.rodzaj_licznika],
      numer_licznika: row[aktualnyBlok.mapowanieKolumn.numer_licznika],
      ...Object.fromEntries(MIESIACE.map(([kod]) => [kod, row[aktualnyBlok.mapowanieKolumn[kod]]]))
    });

    if (!pozycja.lp || !pozycja.typ_licznika) {
      continue;
    }

    if (czyToWierszNaglowkaLubTechniczny(pozycja)) {
      continue;
    }

    aktualnyBlok.wiersze.push(pozycja);
  }

  const blokiZPojami = bloki.filter((blok) => blok.wiersze.length);

  if (!blokiZPojami.length) {
    throw new Error("Nie znaleziono żadnych wierszy do importu.");
  }

  return { rok, bloki: blokiZPojami };
}

async function eksportujDoExcela(wiersze, rok, nazwa = "liczniki", miesiacKod = "m01", naglowekKontrahenta = null, dataOdczytu = "", opcjeZapisu = {}) {
  const ExcelJSImport = await import("exceljs");
  const ExcelJS = ExcelJSImport.Workbook ? ExcelJSImport : ExcelJSImport.default;
  const naglowki = ["Lp.", "Opis", "Licznik rodzaj", "Nr. licznika", ...MIESIACE.map(([, n]) => n)];
  const liczbaKolumn = naglowki.length;
  const dataOdczytuFormat = formatujDateOdczytu(dataOdczytu);

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Odczyty");
  const ramka = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } }
  };

  ws.columns = [
    { width: 7 },
    { width: 34 },
    { width: 22 },
    { width: 18 },
    ...Array.from({ length: 12 }, () => ({ width: 12 }))
  ];

  const bloki = zbudujBlokiEksportu(wiersze, rok, naglowekKontrahenta);

  ws.addRow([`STANY LICZNIKÓW NA ROK ${rok}`]);
  ws.mergeCells(1, 1, 1, liczbaKolumn);
  ws.getCell(1, 1).font = { bold: true, size: 12 };
  ws.getCell(1, 1).alignment = { horizontal: "left" };

  function dodajBlokDoArkusza(arkusz, blok, indeksBloku) {
    if (indeksBloku === 0) {
      arkusz.addRow([]);
      arkusz.addRow([]);
    } else {
      arkusz.addRow([]);
      arkusz.addRow([]);
      arkusz.addRow([]);
    }

    const infoRow = arkusz.lastRow.number + 1;
    arkusz.addRow([String(blok.budynek || "").toUpperCase()]);
    arkusz.mergeCells(infoRow, 1, infoRow, liczbaKolumn);
    arkusz.getCell(infoRow, 1).font = { bold: true };
    arkusz.getCell(infoRow, 1).alignment = { horizontal: "left" };
    arkusz.getCell(infoRow, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC7C7C7" } };
    for (let col = 1; col <= liczbaKolumn; col += 1) {
      const cell = arkusz.getCell(infoRow, col);
      cell.border = ramka;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC7C7C7" } };
    }

    arkusz.addRow(naglowki);
    const headerRow = arkusz.lastRow;
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7CBF3A" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = ramka;
    });

    for (let i = 0; i < blok.wiersze.length; i += 1) {
      const w = blok.wiersze[i];
      const row = arkusz.addRow([
        w.lp ?? "",
        w.typ_licznika ?? "",
        zastepczaKreska(w.rodzaj_licznika),
        zastepczaKreska(w.numer_licznika),
        ...MIESIACE.map(([kod]) => wartoscDoExcelaLiczbowa(w[kod]))
      ]);
      row.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: colNumber === 2 ? "left" : "center", vertical: "middle" };
      });
      if (i % 2 === 1) {
        row.eachCell((cell, colNumber) => {
          if (colNumber === 1) return;
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE1EFDA" } };
        });
      }
      row.eachCell((cell) => {
        cell.border = ramka;
      });
    }

    const dataRow = arkusz.lastRow.number + 1;
    arkusz.getCell(dataRow, 2).value = "DATA ODCZYTU :";
    arkusz.getCell(dataRow, 2).font = { bold: true };
    arkusz.getCell(dataRow, 2).alignment = { horizontal: "right" };
    arkusz.mergeCells(dataRow, 2, dataRow, liczbaKolumn - 1);
    arkusz.getCell(dataRow, liczbaKolumn).value = dataOdczytuFormat;
    arkusz.getCell(dataRow, liczbaKolumn).alignment = { horizontal: "center" };
    for (let col = 2; col <= liczbaKolumn; col += 1) {
      arkusz.getCell(dataRow, col).border = ramka;
    }
  }

  function dopasujSzerokosciKolumn(arkusz) {
    const minimalne = [7, 18, 16, 18, ...Array.from({ length: 12 }, () => 12)];
    const maksymalne = [10, 50, 28, 38, ...Array.from({ length: 12 }, () => 16)];

    arkusz.columns.forEach((column, index) => {
      let maxLength = 0;

      column.eachCell({ includeEmpty: true }, (cell) => {
        const value = cell.value;
        if (value == null) return;

        let text = "";
        if (typeof value === "object" && value.richText) {
          text = value.richText.map((part) => part.text || "").join("");
        } else {
          text = String(value);
        }

        const cellLength = text
          .split(/\r?\n/)
          .reduce((max, line) => Math.max(max, line.trim().length), 0);

        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      });

      const min = minimalne[index] || 10;
      const max = maksymalne[index] || 30;
      column.width = Math.max(min, Math.min(max, maxLength + 2));
    });
  }

  bloki.forEach((blok, indeks) => {
    blok.wiersze.sort((a, b) => Number(a.lp || 0) - Number(b.lp || 0));
    dodajBlokDoArkusza(ws, blok, indeks);
  });

  dopasujSzerokosciKolumn(ws);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const nazwaPliku = nazwaPlikuExcelaLiczniki(nazwa);
  if (opcjeZapisu.storagePath) {
    return zapiszBlobDoSupabaseStorage(
      blob,
      nazwaPliku,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      {
        bucket: opcjeZapisu.bucket || BUCKET_PLIKOW_STORAGE,
        storagePath: opcjeZapisu.storagePath
      }
    );
  }
  return zapiszBlobDoPliku(
    blob,
    nazwaPliku,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    {
      ...opcjeZapisu,
      kluczUchwytu: opcjeZapisu.kluczUchwytu || kluczUchwytuEksportu("excel", nazwa, rok)
    }
  );
}

async function eksportujArkusz2DoPdf(wiersze, rok, nazwa = "liczniki", miesiacKod = "m01", naglowekKontrahenta = null, dataOdczytu = "", opcjeZapisu = {}) {
  const jsPDFModule = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  await zaladujFontPdf(doc);
  const bloki = zbudujBlokiEksportu(wiersze, rok, naglowekKontrahenta);
  const dataOdczytuFormat = formatujDateOdczytu(dataOdczytu);
  const miesiacMeta = MIESIACE.find(([kod]) => kod === miesiacKod) || MIESIACE[0];
  const miesiacNazwa = miesiacMeta[1];
  let currentY = 52;
  const szerokoscTabeliPdf = 509;
  const startX = 40;

  doc.setTextColor(0, 0, 0);
  doc.setFont("ArialPL", "bold");
  doc.setFontSize(17);
  doc.text(`STANY LICZNIKÓW NA ROK ${rok}`, startX, currentY);
  doc.setDrawColor(146, 208, 80);
  doc.setLineWidth(2);
  doc.line(startX, currentY + 10, startX + 170, currentY + 10);
  currentY += 24;

  bloki.forEach((blok, indeks) => {
    if (indeks > 0) {
      currentY += 14;
    }

    if (currentY > 690) {
      doc.addPage();
      doc.setTextColor(0, 0, 0);
      currentY = 52;
    }

    blok.wiersze.sort((a, b) => Number(a.lp || 0) - Number(b.lp || 0));

    doc.setFillColor(241, 245, 241);
    doc.setDrawColor(208, 214, 208);
    doc.setLineWidth(0.7);
    doc.roundedRect(startX, currentY - 4, szerokoscTabeliPdf, 36, 10, 10, "FD");
    doc.setFillColor(199, 199, 199);
    doc.roundedRect(startX, currentY, szerokoscTabeliPdf, 22, 10, 10, "F");
    doc.setFillColor(146, 208, 80);
    doc.roundedRect(startX, currentY, 8, 22, 4, 4, "F");
    doc.setFontSize(11);
    doc.setFont("ArialPL", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(String(blok.budynek || "").toUpperCase(), startX + 16, currentY + 15);

    autoTable(doc, {
      startY: currentY + 28,
      head: [["Lp.", "Opis", "Licznik rodzaj", "Nr. licznika", miesiacNazwa]],
      body: blok.wiersze.map((w) => [
        w.lp ?? "",
        w.typ_licznika ?? "",
        zastepczaKreska(w.rodzaj_licznika),
        zastepczaKreska(w.numer_licznika),
        wartoscDoExcelaLiczbowa(w[miesiacKod])
      ]),
      theme: "grid",
      styles: {
        font: "ArialPL",
        fontSize: 10,
        textColor: [0, 0, 0],
        halign: "center",
        valign: "middle",
        lineColor: [96, 96, 96],
        lineWidth: 0.35,
        overflow: "linebreak",
        cellPadding: 5
      },
      headStyles: {
        fillColor: [124, 191, 58],
        textColor: [0, 0, 0],
        fontStyle: "bold"
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 34, fillColor: false },
        1: { halign: "left", cellWidth: 220 },
        2: { halign: "center", cellWidth: 95 },
        3: { halign: "center", cellWidth: 92 },
        4: { halign: "center", cellWidth: 68 }
      },
      didParseCell: (hookData) => {
        if (hookData.section === "head") {
          hookData.cell.styles.lineWidth = 0.5;
        }
        if (hookData.section === "body") {
          const kolorWiersza = hookData.row.index % 2 === 0 ? [255, 255, 255] : [225, 239, 218];
          hookData.cell.styles.fillColor = hookData.column.index === 0 ? [255, 255, 255] : kolorWiersza;
        }
      }
    });

    const koniecTabeli = doc.lastAutoTable?.finalY || currentY + 28;
    doc.setFillColor(247, 250, 247);
    doc.setDrawColor(208, 214, 208);
    doc.roundedRect(startX, currentY - 4, szerokoscTabeliPdf, koniecTabeli + 40 - (currentY - 4), 10, 10);
    doc.setFont("ArialPL", "bold");
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(240, 244, 240);
    doc.roundedRect(320, koniecTabeli + 10, 140, 22, 6, 6, "FD");
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(460, koniecTabeli + 10, 78, 22, 6, 6, "FD");
    doc.text("DATA ODCZYTU :", 452, koniecTabeli + 23, { align: "right" });
    doc.setFont("ArialPL", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(dataOdczytuFormat, 499, koniecTabeli + 24, { align: "center" });
    currentY = koniecTabeli + 46;
  });

  const blob = doc.output("blob");
  return zapiszBlobDoPliku(blob, nazwaPlikuPdfLiczniki(nazwa, miesiacKod), "application/pdf", {
    ...opcjeZapisu,
    kluczUchwytu: opcjeZapisu.kluczUchwytu || kluczUchwytuEksportu("pdf", nazwa, rok, miesiacKod)
  });
}

const OdczytRow = memo(function OdczytRow({
  w,
  miesiacWidoku,
  czyEdycjaCalkowita,
  isEditing,
  editedValue,
  aktywnaKomorka,
  wartoscAktywnejKomorki,
  zapisywanaKomorka,
  onEditedValueChange,
  onStartCellEdit,
  onCellValueChange,
  onEdit,
  onDelete,
  onCellSave,
  onCellCancel,
  onSave,
  onCancel
}) {
  const miesiaceWiersza = MIESIACE.filter(([kod]) => !miesiacWidoku || kod === miesiacWidoku);
  const trybMiesieczny = miesiacWidoku && isEditing && !czyEdycjaCalkowita;

  function skrotPodgladuMiesiaca(wartosc) {
    const pelnaWartosc = String(wartosc || "").trim();
    if (!pelnaWartosc) return "";
    if (miesiacWidoku || pelnaWartosc.length <= 4) return pelnaWartosc;
    return `${pelnaWartosc.slice(0, 3)}+`;
  }

  function renderujEdytowalnaKomorke(pole, wartosc, opcje = {}) {
    const kluczKomorki = `${w.id}:${pole}`;
    const aktywna = aktywnaKomorka === kluczKomorki;
    const zapisywana = zapisywanaKomorka === kluczKomorki;
    const placeholderMinus = opcje.placeholderMinus && zastepczaKreska(wartosc) === "-";
    const wartoscWyswietlana = placeholderMinus ? "-" : wartosc || "";
    const klasyKomorki = `${miesiacWidoku ? "py-1.5" : "py-2"} ${opcje.tdClassName || ""}`;

    if (aktywna) {
      return (
        <td className={klasyKomorki}>
          <input
            className={`pole h-10 w-full px-2 py-1 ${opcje.inputClassName || ""}`}
            type="text"
            inputMode={opcje.inputMode || "text"}
            value={wartoscAktywnejKomorki}
            onChange={(e) => onCellValueChange(e.target.value)}
            onBlur={() => onCellSave(w, pole)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onCellSave(w, pole);
              }
              if (e.key === "Escape") {
                e.preventDefault();
                onCellCancel();
              }
            }}
            autoFocus
          />
        </td>
      );
    }

    const wyrenderowanaWartosc = placeholderMinus ? (
      <div className="flex w-full justify-center text-center">-</div>
    ) : (
      wartoscWyswietlana
    );

    if (!czyEdycjaCalkowita) {
      return <td className={klasyKomorki}>{wyrenderowanaWartosc}</td>;
    }

    return (
      <td className={klasyKomorki}>
        <button
          type="button"
          className={`block w-full rounded-lg px-2 py-2 text-left transition ${
            placeholderMinus ? "text-center text-slate-400" : ""
          } ${zapisywana ? "opacity-60" : "hover:bg-emerald-500/10 focus-visible:bg-emerald-500/10"}`}
          onClick={() => onStartCellEdit(w, pole)}
        >
          {wyrenderowanaWartosc}
        </button>
      </td>
    );
  }

  return (
    <tr className="border-t border-white/10">
      {renderujEdytowalnaKomorke("lp", w.lp, {
        tdClassName: "pr-2 text-left"
      })}
      {renderujEdytowalnaKomorke("typ_licznika", w.typ_licznika, {
        tdClassName: "pr-3 text-left"
      })}
      {renderujEdytowalnaKomorke("rodzaj_licznika", w.rodzaj_licznika, {
        tdClassName: `${miesiacWidoku ? "hidden sm:table-cell" : ""} ${zastepczaKreska(w.rodzaj_licznika) === "-" ? "" : "pr-3 text-left"}`,
        placeholderMinus: true
      })}
      {renderujEdytowalnaKomorke("numer_licznika", w.numer_licznika, {
        tdClassName: `${miesiacWidoku ? "hidden sm:table-cell" : ""} tabular-nums ${zastepczaKreska(w.numer_licznika) === "-" ? "" : "pr-3 text-left"}`,
        placeholderMinus: true
      })}
      {miesiaceWiersza.map(([kod]) => (
        <td key={kod} className={`${miesiacWidoku ? "py-1.5 text-base font-semibold" : "py-2"} text-center tabular-nums`}>
          {trybMiesieczny ? (
            <input
              className="pole mx-auto h-12 w-28 py-1 text-center text-base font-semibold"
              type="text"
              inputMode="decimal"
              value={editedValue}
              onChange={(e) => onEditedValueChange(wartoscMiesiecznaTekst(e.target.value))}
              autoFocus
            />
          ) : czyEdycjaCalkowita && aktywnaKomorka === `${w.id}:${kod}` ? (
            <input
              className="pole mx-auto h-12 w-28 py-1 text-center text-base font-semibold"
              type="text"
              inputMode="decimal"
              value={wartoscAktywnejKomorki}
              onChange={(e) => onCellValueChange(wartoscMiesiecznaTekst(e.target.value))}
              onBlur={() => onCellSave(w, kod)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onCellSave(w, kod);
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  onCellCancel();
                }
              }}
              autoFocus
            />
          ) : czyEdycjaCalkowita ? (
            <button
              type="button"
              className={`mx-auto block min-h-[40px] rounded-lg px-2 py-2 text-center transition ${
                zapisywanaKomorka === `${w.id}:${kod}` ? "opacity-60" : "hover:bg-emerald-500/10"
              }`}
              onClick={() => onStartCellEdit(w, kod)}
              title={w[kod] || ""}
            >
              {skrotPodgladuMiesiaca(w[kod])}
            </button>
          ) : (
            <span title={w[kod] || ""}>{skrotPodgladuMiesiaca(w[kod])}</span>
          )}
        </td>
      ))}
      <td className={`${miesiacWidoku ? "py-1.5" : "py-2"}`}>
        <div className={`flex ${miesiacWidoku ? "flex-col justify-end sm:flex-row" : ""} gap-2`}>
          {trybMiesieczny ? (
            <>
              <button className="przycisk-wtorny min-w-0 px-3 py-1.5 text-sm" onClick={() => onSave(w)} type="button">
                Zapisz
              </button>
              <button className="przycisk-wtorny min-w-0 px-3 py-1.5 text-sm" onClick={onCancel} type="button">
                Anuluj
              </button>
            </>
          ) : (
            <>
              {!czyEdycjaCalkowita ? (
                <button className={`${miesiacWidoku ? "min-w-0 px-3 py-1.5 text-sm" : ""} przycisk-wtorny`} onClick={() => onEdit(w)} type="button">
                  Edytuj
                </button>
              ) : null}
              <button className={`${miesiacWidoku ? "min-w-0 px-3 py-1.5 text-sm" : ""} przycisk-wtorny`} onClick={() => onDelete(w.id)} type="button">
                Usuń
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
});

const OdczytMobileCard = memo(function OdczytMobileCard({
  w,
  miesiacWidoku,
  czyEdycjaCalkowita,
  isEditing,
  editedValue,
  aktywnaKomorka,
  wartoscAktywnejKomorki,
  zapisywanaKomorka,
  onEditedValueChange,
  onStartCellEdit,
  onCellValueChange,
  onEdit,
  onDelete,
  onCellSave,
  onCellCancel,
  onSave,
  onCancel
}) {
  if (!miesiacWidoku) return null;

  const kluczKomorki = `${w.id}:${miesiacWidoku}`;
  const aktywna = aktywnaKomorka === kluczKomorki;
  const zapisywana = zapisywanaKomorka === kluczKomorki;
  const trybMiesieczny = isEditing && !czyEdycjaCalkowita;
  const miesiacNazwa = MIESIACE.find(([kod]) => kod === miesiacWidoku)?.[1] || "";

  function wartoscMiesiaca() {
    if (trybMiesieczny) {
      return (
        <input
          className="pole h-14 w-full text-center text-lg font-semibold"
          type="text"
          inputMode="decimal"
          value={editedValue}
          onChange={(e) => onEditedValueChange(wartoscMiesiecznaTekst(e.target.value))}
          autoFocus
        />
      );
    }

    if (czyEdycjaCalkowita && aktywna) {
      return (
        <input
          className="pole h-14 w-full text-center text-lg font-semibold"
          type="text"
          inputMode="decimal"
          value={wartoscAktywnejKomorki}
          onChange={(e) => onCellValueChange(wartoscMiesiecznaTekst(e.target.value))}
          onBlur={() => onCellSave(w, miesiacWidoku)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onCellSave(w, miesiacWidoku);
            }
            if (e.key === "Escape") {
              e.preventDefault();
              onCellCancel();
            }
          }}
          autoFocus
        />
      );
    }

    if (czyEdycjaCalkowita) {
      return (
        <button
          type="button"
          className={`pole flex h-14 w-full items-center justify-center text-lg font-semibold ${zapisywana ? "opacity-60" : ""}`}
          onClick={() => onStartCellEdit(w, miesiacWidoku)}
        >
          {w[miesiacWidoku] || "-"}
        </button>
      );
    }

    return (
      <div className="flex h-14 items-center justify-center rounded-2xl border border-emerald-300/12 bg-emerald-500/[0.07] text-lg font-semibold text-emerald-100">
        {w[miesiacWidoku] || "-"}
      </div>
    );
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.12)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Lp. {w.lp || "-"}</p>
          <h4 className="mt-1 text-base font-semibold text-slate-50">{w.typ_licznika || "Licznik"}</h4>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {w.rodzaj_licznika ? `${w.rodzaj_licznika}` : "Rodzaj: -"}
            {w.numer_licznika ? ` | Nr: ${w.numer_licznika}` : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-300/15 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          {miesiacNazwa}
        </span>
      </div>

      <div className="mt-3">
        {wartoscMiesiaca()}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {trybMiesieczny ? (
          <>
            <button className="przycisk-wtorny px-3 py-2 text-sm" onClick={() => onSave(w)} type="button">
              Zapisz
            </button>
            <button className="przycisk-wtorny px-3 py-2 text-sm" onClick={onCancel} type="button">
              Anuluj
            </button>
          </>
        ) : (
          <>
            {!czyEdycjaCalkowita ? (
              <button className="przycisk-wtorny px-3 py-2 text-sm" onClick={() => onEdit(w)} type="button">
                Edytuj
              </button>
            ) : null}
            <button className="przycisk-wtorny px-3 py-2 text-sm" onClick={() => onDelete(w.id)} type="button">
              Usuń
            </button>
          </>
        )}
      </div>
    </article>
  );
});

export default function OdczytyLicznikowPage() {
  const biezacyRok = String(new Date().getFullYear());
  const kontenerEksportuBudynkuRef = useRef(null);
  const [lista, setLista] = useState([]);
  const [kontrahenci, setKontrahenci] = useState([]);
  const [formularz, setFormularz] = useState(pustyFormularz());
  const [edytowany, setEdytowany] = useState(null);
  const [edytowanyMiesiacId, setEdytowanyMiesiacId] = useState(null);
  const [wartoscEdytowanegoMiesiaca, setWartoscEdytowanegoMiesiaca] = useState("");
  const [grupaEdycjiCalkowitej, setGrupaEdycjiCalkowitej] = useState("");
  const [edytowanaKomorka, setEdytowanaKomorka] = useState("");
  const [wartoscEdytowanejKomorki, setWartoscEdytowanejKomorki] = useState("");
  const [zapisywanaKomorka, setZapisywanaKomorka] = useState("");
  const [blad, setBlad] = useState("");
  const [pokazListeKontrahentow, setPokazListeKontrahentow] = useState(false);
  const [qBudynek, setQBudynek] = useState("");
  const [pokazListeBudynkow, setPokazListeBudynkow] = useState(false);
  const [qFiltrKontrahent, setQFiltrKontrahent] = useState("");
  const [pokazListeFiltrowKontrahentow, setPokazListeFiltrowKontrahentow] = useState(false);
  const [qFiltrBudynek, setQFiltrBudynek] = useState("");
  const [pokazListeFiltrowBudynkow, setPokazListeFiltrowBudynkow] = useState(false);
  const [qFiltrMiesiac, setQFiltrMiesiac] = useState("");
  const [pokazListeFiltrowMiesiecy, setPokazListeFiltrowMiesiecy] = useState(false);
  const [qKontrahentEksportu, setQKontrahentEksportu] = useState("");
  const [pokazListeKontrahentowEksportu, setPokazListeKontrahentowEksportu] = useState(false);
  const [qMiesiacEksportu, setQMiesiacEksportu] = useState("");
  const [pokazListeMiesiecyEksportu, setPokazListeMiesiecyEksportu] = useState(false);
  const [pokazOknoEksportu, setPokazOknoEksportu] = useState(false);
  const [otwartyEksportBudynkuKey, setOtwartyEksportBudynkuKey] = useState("");
  const [dataOdczytuEksportu, setDataOdczytuEksportu] = useState("");
  const [filtrBudynekId, setFiltrBudynekId] = useState("");
  const [filtrRok, setFiltrRok] = useState("");
  const [filtrKontrahentNazwa, setFiltrKontrahentNazwa] = useState("");
  const [trybSeryjny, setTrybSeryjny] = useState(true);
  const [miesiacWidoku, setMiesiacWidoku] = useState("");
  const [kontrahentEksportu, setKontrahentEksportu] = useState("");
  const [miesiacEksportu, setMiesiacEksportu] = useState("");
  const [importowanie, setImportowanie] = useState(false);
  const [wybranyPlikImportu, setWybranyPlikImportu] = useState(null);
  const [komunikatImportu, setKomunikatImportu] = useState("");
  const [typKomunikatuImportu, setTypKomunikatuImportu] = useState("");
  const [bladKontrahentaImportu, setBladKontrahentaImportu] = useState(false);
  const [komunikatEksportu, setKomunikatEksportu] = useState("");
  const [bladDatyEksportu, setBladDatyEksportu] = useState(false);
  const [bladDatyEksportuBudynku, setBladDatyEksportuBudynku] = useState(false);
  const [bladKontrahentaEksportu, setBladKontrahentaEksportu] = useState(false);
  const [bladMiesiacaEksportu, setBladMiesiacaEksportu] = useState(false);
  const [podlaczonyPlikExcel, setPodlaczonyPlikExcel] = useState(null);
  const [plikiStorageExcel, setPlikiStorageExcel] = useState([]);
  const [ladowaniePlikowStorage, setLadowaniePlikowStorage] = useState(false);
  const [pokazListePlikowStorage, setPokazListePlikowStorage] = useState(false);
  const [qPlikStorage, setQPlikStorage] = useState("");
  const [nazwaKontrahentaImportu, setNazwaKontrahentaImportu] = useState("");
  const [nazwaOstatniegoImportu, setNazwaOstatniegoImportu] = useState("");
  const [wierszeOstatniegoImportu, setWierszeOstatniegoImportu] = useState([]);
  const [rokOstatniegoImportu, setRokOstatniegoImportu] = useState("");
  const [komunikatLokalny, setKomunikatLokalny] = useState("");
  const [liczbaLokalnychZapisow, setLiczbaLokalnychZapisow] = useState(0);
  const sesja = useMemo(() => pobierzSesje(), []);
  const czyKontoAdmin = normalizujTekst(sesja?.uzytkownik?.email) === "dominik@eltreko.pl";
  const czyKontoSerwis =
    normalizujTekst(sesja?.uzytkownik?.email) === "serwis@eltreko.pl" ||
    normalizujTekst(sesja?.uzytkownik?.imieNazwisko || sesja?.uzytkownik?.imie_nazwisko) === normalizujTekst("Michał Serwis");
  const czyAdminGlowny =
    czyKontoAdmin ||
    normalizujTekst(sesja?.uzytkownik?.rola) === "administrator";
  const kontrahentDostepuOgraniczonego = DOMYSLNY_KONTRAHENT;

  async function odswiez() {
    setBlad("");
    const [o, k, cacheLista, kolejka] = await Promise.allSettled([
      zapytanieApi("/odczyty-licznikow"),
      zapytanieApi("/klienci"),
      pobierzCacheOdczytow(),
      pobierzKolejkeOdczytow()
    ]);

    const listaKolejki = kolejka.status === "fulfilled" ? kolejka.value : [];
    setLiczbaLokalnychZapisow(listaKolejki.length);

    if (o.status === "fulfilled") {
      const rows = Array.isArray(o.value) ? o.value : [];
      const listaPoKolejce = zastosujKolejkeDoListy(rows, listaKolejki);
      setLista(listaPoKolejce);
      zapiszCacheOdczytow(listaPoKolejce).catch(() => {});
    } else {
      const cacheRows = cacheLista.status === "fulfilled" ? cacheLista.value : [];
      const listaPoKolejce = zastosujKolejkeDoListy(cacheRows, listaKolejki);
      setLista(listaPoKolejce);
    }

    if (k.status === "fulfilled") {
      const listaKlientow = Array.isArray(k.value) ? k.value : [];
      setKontrahenci(listaKlientow.filter((x) => x && x.id && x.nazwa));
    } else {
      setKontrahenci([]);
      setBlad("Nie udało się pobrać kontrahentów z tabeli klienci.");
    }
  }

  async function synchronizujLokalneOdczyty() {
    const kolejka = await pobierzKolejkeOdczytow();
    if (!kolejka.length || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      setLiczbaLokalnychZapisow(kolejka.length);
      return;
    }

    let zsynchronizowane = 0;

    for (const wpis of kolejka) {
      try {
        if (wpis.typ === "update-month" && wpis.rekordId && wpis.payload) {
          await zapytanieApi(`/odczyty-licznikow/${wpis.rekordId}`, {
            method: "PUT",
            body: JSON.stringify(wpis.payload)
          });
          await usunZKolejkiOdczytow(wpis.id);
          zsynchronizowane += 1;
        }
      } catch (error) {
        if (czyBladPolaczenia(error)) {
          break;
        }
      }
    }

    if (zsynchronizowane) {
      setKomunikatLokalny(`Zsynchronizowano lokalne zmiany: ${zsynchronizowane}.`);
    }

    await odswiez();
  }

  async function odswiezPlikiStorageExcel() {
    if (!czySupabaseSkonfigurowany || !supabase) {
      setPlikiStorageExcel([]);
      return;
    }

    setLadowaniePlikowStorage(true);
    const { data, error } = await supabase.storage.from(BUCKET_PLIKOW_STORAGE).list("", {
      limit: 200,
      sortBy: { column: "name", order: "asc" }
    });
    setLadowaniePlikowStorage(false);

    if (error) {
      setPlikiStorageExcel([]);
      setKomunikatEksportu(`Nie udało się pobrać plików z chmury: ${error.message}`);
      return;
    }

    const pliki = (Array.isArray(data) ? data : [])
      .filter((plik) => plik?.name && czyPlikExcelStorage(plik))
      .map((plik) => ({
        name: plik.name,
        path: plik.name,
        bucket: BUCKET_PLIKOW_STORAGE
      }));

    setPlikiStorageExcel(pliki);
  }

  async function pobierzPodpieciePlikuDlaKontrahenta(kontrahentNazwa) {
    const nazwa = String(kontrahentNazwa || "").trim();
    if (!nazwa) {
      setPodlaczonyPlikExcel(null);
      setQPlikStorage("");
      return;
    }

    try {
      const wynik = await zapytanieApi(`/odczyty-licznikow/podpiecie-pliku?kontrahent=${encodeURIComponent(nazwa)}`);
      const oczekiwanaNazwa = nazwaPlikuExcelaLiczniki(nazwa);
      const dopasowanyZBucketu =
        plikiStorageExcel.find((plik) => normalizujTekst(plik.name) === normalizujTekst(oczekiwanaNazwa)) ||
        plikiStorageExcel.find((plik) => normalizujNazwePlikuStorage(plik.name) === normalizujTekst(nazwa)) ||
        plikiStorageExcel.find((plik) => normalizujNazwePlikuStorage(plik.name).includes(normalizujTekst(nazwa))) ||
        null;

      const aktywnyPlik =
        dopasowanyZBucketu ||
        (wynik?.storage_path
          ? {
              name: wynik.file_name || wynik.storage_path.split("/").pop() || "Podpięty plik",
              path: wynik.storage_path,
              bucket: wynik.bucket_name || BUCKET_PLIKOW_STORAGE
            }
          : null);

      if (dopasowanyZBucketu && wynik?.storage_path && wynik.storage_path !== dopasowanyZBucketu.path && czyAdminGlowny) {
        try {
          await zapytanieApi("/odczyty-licznikow/podpiecie-pliku", {
            method: "POST",
            body: JSON.stringify({
              kontrahent_nazwa: nazwa,
              bucket_name: dopasowanyZBucketu.bucket || BUCKET_PLIKOW_STORAGE,
              storage_path: dopasowanyZBucketu.path,
              file_name: dopasowanyZBucketu.name
            })
          });
        } catch (_error) {
          // Ignorujemy i i tak pokazujemy świeższą nazwę z bucketu.
        }
      }

      if (aktywnyPlik?.path) {
        setPodlaczonyPlikExcel(aktywnyPlik);
        setQPlikStorage(aktywnyPlik.name || "");
        return;
      }

      if (wynik?.storage_path) {
        setPodlaczonyPlikExcel({
          name: wynik.file_name || wynik.storage_path.split("/").pop() || "Podpięty plik",
          path: wynik.storage_path,
          bucket: wynik.bucket_name || BUCKET_PLIKOW_STORAGE
        });
        setQPlikStorage(wynik.file_name || wynik.storage_path.split("/").pop() || "");
        return;
      }
    } catch (_error) {
      // Ignorujemy brak powiązania.
    }

    setPodlaczonyPlikExcel(null);
    setQPlikStorage("");
  }

  async function podlaczPlikStorage(plik) {
    const nazwaKontrahenta = String(kontrahentEksportu || qKontrahentEksportu || "").trim();
    if (!nazwaKontrahenta || nazwaKontrahenta === "Wybór kontrahenta") {
      setBladKontrahentaEksportu(true);
      setKomunikatEksportu("Najpierw wybierz kontrahenta, żeby podpiąć plik.");
      return;
    }

    const payload = {
      kontrahent_nazwa: nazwaKontrahenta,
      bucket_name: plik.bucket || BUCKET_PLIKOW_STORAGE,
      storage_path: plik.path,
      file_name: plik.name
    };

    const wynik = await zapytanieApi("/odczyty-licznikow/podpiecie-pliku", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    setPodlaczonyPlikExcel({
      name: wynik.file_name,
      path: wynik.storage_path,
      bucket: wynik.bucket_name || BUCKET_PLIKOW_STORAGE
    });
    setQPlikStorage(wynik.file_name || "");
    setPokazListePlikowStorage(false);
    setKomunikatEksportu(`Podpięto plik w chmurze: ${wynik.file_name}.`);
  }

  useEffect(() => {
    odswiez().catch((e) => setBlad(e.message));
  }, []);

  useEffect(() => {
    synchronizujLokalneOdczyty().catch(() => {});

    function obsluzPowrotOnline() {
      synchronizujLokalneOdczyty().catch(() => {});
    }

    window.addEventListener("online", obsluzPowrotOnline);
    return () => window.removeEventListener("online", obsluzPowrotOnline);
  }, []);

  useEffect(() => {
    if (!lista.length) return;
    zapiszCacheOdczytow(lista).catch(() => {});
  }, [lista]);

  useEffect(() => {
    if (!czyKontoSerwis) return;
    setQFiltrKontrahent(kontrahentDostepuOgraniczonego);
    setFiltrKontrahentNazwa(kontrahentDostepuOgraniczonego);
    setQKontrahentEksportu(kontrahentDostepuOgraniczonego);
    setKontrahentEksportu(kontrahentDostepuOgraniczonego);
    setFormularz((prev) => ({ ...prev, import_nazwa: kontrahentDostepuOgraniczonego }));
  }, [czyKontoSerwis]);

  useEffect(() => {
    odswiezPlikiStorageExcel().catch(() => {});
  }, []);

  useEffect(() => {
    pobierzPodpieciePlikuDlaKontrahenta(kontrahentEksportu).catch(() => {});
  }, [kontrahentEksportu, plikiStorageExcel, czyAdminGlowny]);

  useEffect(() => {
    if (!pokazOknoEksportu || !czyAdminGlowny) return;
    odswiezPlikiStorageExcel().catch(() => {});
  }, [pokazOknoEksportu, czyAdminGlowny]);

  useEffect(() => {
    if (!otwartyEksportBudynkuKey) return undefined;

    function obsluzKlikPoza(event) {
      if (!kontenerEksportuBudynkuRef.current) return;
      if (!kontenerEksportuBudynkuRef.current.contains(event.target)) {
        setOtwartyEksportBudynkuKey("");
      }
    }

    document.addEventListener("mousedown", obsluzKlikPoza);
    return () => document.removeEventListener("mousedown", obsluzKlikPoza);
  }, [otwartyEksportBudynkuKey]);

  function ustawLubDodajOdczyt(rekord) {
    if (!rekord?.id) return;
    setLista((prev) => {
      const indeks = prev.findIndex((item) => String(item.id) === String(rekord.id));
      if (indeks === -1) {
        return [...prev, rekord];
      }
      const next = [...prev];
      next[indeks] = rekord;
      return next;
    });
  }

  function usunOdczytZListy(id) {
    setLista((prev) => prev.filter((item) => String(item.id) !== String(id)));
  }

  const listaDostepna = useMemo(() => {
    if (!czyKontoSerwis) return lista;
    return lista.filter(
      (wiersz) => normalizujTekst(nazwaKontrahentaZImportu(wiersz.import_nazwa)) === normalizujTekst(kontrahentDostepuOgraniczonego)
    );
  }, [czyKontoSerwis, lista]);

  const kontrahenciImportowi = useMemo(() => {
    const mapa = new Map();

    for (const wiersz of listaDostepna) {
      const nazwa = nazwaKontrahentaZImportu(wiersz.import_nazwa);
      const klucz = normalizujTekst(nazwa);
      if (!klucz || mapa.has(klucz)) continue;
      mapa.set(klucz, nazwa);
    }

    const wynik = Array.from(mapa.values()).sort((a, b) => a.localeCompare(b, "pl"));
    if (!wynik.some((nazwa) => normalizujTekst(nazwa) === normalizujTekst(DOMYSLNY_KONTRAHENT))) {
      wynik.unshift(DOMYSLNY_KONTRAHENT);
    }
    return wynik;
  }, [listaDostepna]);

  const przefiltrowaniKontrahenci = useMemo(() => {
    if (czyDokladnieWybranaOpcja(formularz.import_nazwa, kontrahenciImportowi)) {
      return kontrahenciImportowi;
    }
    const fraza = frazaFiltrowania(formularz.import_nazwa);
    if (!fraza) return kontrahenciImportowi;
    return kontrahenciImportowi.filter((nazwa) => nazwa.toLowerCase().includes(fraza));
  }, [kontrahenciImportowi, formularz.import_nazwa]);

  const budynkiDlaWybranegoKontrahenta = useMemo(() => {
    const wybranyKlucz = normalizujTekst(formularz.import_nazwa);
    const mapa = new Map();

    for (const wiersz of listaDostepna) {
      if (wybranyKlucz && normalizujTekst(nazwaKontrahentaZImportu(wiersz.import_nazwa)) !== wybranyKlucz) {
        continue;
      }

      const id = String(wiersz.kontrahent_id || "");
      const nazwa = wartoscKomorki(wiersz.kontrahent_nazwa);
      if (!id || !nazwa || mapa.has(id)) continue;
      mapa.set(id, { id, nazwa });
    }

    return Array.from(mapa.values()).sort((a, b) => a.nazwa.localeCompare(b.nazwa, "pl"));
  }, [listaDostepna, formularz.import_nazwa]);

  const przefiltrowaneBudynki = useMemo(() => {
    if (czyDokladnieWybranaOpcja(qBudynek, budynkiDlaWybranegoKontrahenta)) {
      return budynkiDlaWybranegoKontrahenta;
    }
    const fraza = frazaFiltrowania(qBudynek);
    if (!fraza) return budynkiDlaWybranegoKontrahenta;
    return budynkiDlaWybranegoKontrahenta.filter((budynek) => budynek.nazwa.toLowerCase().includes(fraza));
  }, [budynkiDlaWybranegoKontrahenta, qBudynek]);

  const listaFiltrowana = useMemo(() => {
    const wybranoWszystkichKontrahentow = qFiltrKontrahent === "Wszyscy kontrahenci";
    const wybranoWszystkieBudynki = qFiltrBudynek === "Wszystkie budynki";
    const aktywnyFiltrGlowny = Boolean(filtrKontrahentNazwa || filtrBudynekId || wybranoWszystkichKontrahentow || wybranoWszystkieBudynki);
    if (!aktywnyFiltrGlowny) {
      return [];
    }

    return listaDostepna.filter((w) => {
      const okBudynek = !filtrBudynekId || String(w.kontrahent_id || "") === String(filtrBudynekId);
      const okRok = !filtrRok || String(w.rok || "") === String(filtrRok);
      const okKontrahent =
        !filtrKontrahentNazwa || normalizujTekst(nazwaKontrahentaZImportu(w.import_nazwa)) === normalizujTekst(filtrKontrahentNazwa);
      return okBudynek && okRok && okKontrahent;
    });
  }, [listaDostepna, filtrBudynekId, filtrRok, filtrKontrahentNazwa, qFiltrKontrahent, qFiltrBudynek]);

  const budynkiFiltrowania = useMemo(() => {
    const wybranyKlucz = normalizujTekst(filtrKontrahentNazwa);
    const mapa = new Map();

    for (const wiersz of listaDostepna) {
      if (wybranyKlucz && normalizujTekst(nazwaKontrahentaZImportu(wiersz.import_nazwa)) !== wybranyKlucz) {
        continue;
      }

      const id = String(wiersz.kontrahent_id || "");
      const nazwa = wartoscKomorki(wiersz.kontrahent_nazwa);
      if (!id || !nazwa || mapa.has(id)) continue;
      mapa.set(id, { id, nazwa });
    }

    return Array.from(mapa.values()).sort((a, b) => a.nazwa.localeCompare(b.nazwa, "pl"));
  }, [listaDostepna, filtrKontrahentNazwa]);

  const przefiltrowaniKontrahenciDlaFiltrow = useMemo(() => {
    if (czyDokladnieWybranaOpcja(qFiltrKontrahent, kontrahenciImportowi, "Wszyscy kontrahenci")) {
      return kontrahenciImportowi;
    }
    const fraza = frazaFiltrowania(qFiltrKontrahent, "Wszyscy kontrahenci");
    if (!fraza) return kontrahenciImportowi;
    return kontrahenciImportowi.filter((nazwa) => nazwa.toLowerCase().includes(fraza));
  }, [kontrahenciImportowi, qFiltrKontrahent]);

  const przefiltrowaneBudynkiDlaFiltrow = useMemo(() => {
    if (czyDokladnieWybranaOpcja(qFiltrBudynek, budynkiFiltrowania, "Wszystkie budynki")) {
      return budynkiFiltrowania;
    }
    const fraza = frazaFiltrowania(qFiltrBudynek, "Wszystkie budynki");
    if (!fraza) return budynkiFiltrowania;
    return budynkiFiltrowania.filter((budynek) => budynek.nazwa.toLowerCase().includes(fraza));
  }, [budynkiFiltrowania, qFiltrBudynek]);

  const przefiltrowaneMiesiace = useMemo(() => {
    if (czyDokladnieWybranaOpcja(qFiltrMiesiac, MIESIACE, "Wszystkie miesiące")) {
      return MIESIACE;
    }
    const fraza = frazaFiltrowania(qFiltrMiesiac, "Wszystkie miesiące");
    if (!fraza) return MIESIACE;
    return MIESIACE.filter(([, nazwa, skrot]) => nazwa.toLowerCase().includes(fraza) || skrot.toLowerCase().includes(fraza));
  }, [qFiltrMiesiac]);

  const przefiltrowaneMiesiaceEksportu = useMemo(() => {
    if (czyDokladnieWybranaOpcja(qMiesiacEksportu, MIESIACE)) {
      return MIESIACE;
    }
    const fraza = frazaFiltrowania(qMiesiacEksportu);
    if (!fraza) return MIESIACE;
    return MIESIACE.filter(([, nazwa, skrot]) => nazwa.toLowerCase().includes(fraza) || skrot.toLowerCase().includes(fraza));
  }, [qMiesiacEksportu]);

  const przefiltrowaniKontrahenciEksportu = useMemo(() => {
    if (czyDokladnieWybranaOpcja(qKontrahentEksportu, kontrahenciImportowi, "Wszyscy kontrahenci")) {
      return kontrahenciImportowi;
    }
    const fraza = frazaFiltrowania(qKontrahentEksportu, "Wszyscy kontrahenci");
    if (!fraza) return kontrahenciImportowi;
    return kontrahenciImportowi.filter((nazwa) => nazwa.toLowerCase().includes(fraza));
  }, [kontrahenciImportowi, qKontrahentEksportu]);

  const przefiltrowanePlikiStorageExcel = useMemo(() => {
    if (czyDokladnieWybranaOpcja(qPlikStorage, plikiStorageExcel)) {
      return plikiStorageExcel;
    }

    const fraza = frazaFiltrowania(qPlikStorage);
    if (!fraza) return plikiStorageExcel;

    return plikiStorageExcel.filter((plik) => plik.name.toLowerCase().includes(fraza));
  }, [plikiStorageExcel, qPlikStorage]);

  const automatycznieDopasowanyPlikStorage = useMemo(() => {
    const kontrahent = String(kontrahentEksportu || "").trim();
    if (!kontrahent) return null;

    const oczekiwanaNazwa = nazwaPlikuExcelaLiczniki(kontrahent);
    const oczekiwanyKlucz = normalizujTekst(oczekiwanaNazwa);
    const kluczKontrahenta = normalizujTekst(kontrahent);

    return (
      plikiStorageExcel.find((plik) => normalizujTekst(plik.name) === oczekiwanyKlucz) ||
      plikiStorageExcel.find((plik) => normalizujNazwePlikuStorage(plik.name) === kluczKontrahenta) ||
      plikiStorageExcel.find((plik) => normalizujNazwePlikuStorage(plik.name).includes(kluczKontrahenta)) ||
      null
    );
  }, [plikiStorageExcel, kontrahentEksportu]);

  useEffect(() => {
    if (!automatycznieDopasowanyPlikStorage) return;
    if (podlaczonyPlikExcel?.path === automatycznieDopasowanyPlikStorage.path) {
      if (podlaczonyPlikExcel?.name !== automatycznieDopasowanyPlikStorage.name) {
        setPodlaczonyPlikExcel((prev) =>
          prev
            ? {
                ...prev,
                name: automatycznieDopasowanyPlikStorage.name,
                path: automatycznieDopasowanyPlikStorage.path,
                bucket: automatycznieDopasowanyPlikStorage.bucket
              }
            : prev
        );
      }
      setQPlikStorage(automatycznieDopasowanyPlikStorage.name);
      return;
    }
    if (podlaczonyPlikExcel?.path) return;
    setQPlikStorage(automatycznieDopasowanyPlikStorage.name);
  }, [podlaczonyPlikExcel?.path, automatycznieDopasowanyPlikStorage]);

  useEffect(() => {
    if (!czyAdminGlowny) return;
    if (!kontrahentEksportu || !automatycznieDopasowanyPlikStorage) return;
    if (podlaczonyPlikExcel?.path === automatycznieDopasowanyPlikStorage.path) return;

    podlaczPlikStorage(automatycznieDopasowanyPlikStorage).catch(() => {});
  }, [czyAdminGlowny, kontrahentEksportu, podlaczonyPlikExcel?.path, automatycznieDopasowanyPlikStorage]);

  const grupy = useMemo(() => {
    const mapa = new Map();

    for (const w of listaFiltrowana) {
      const kid = w.kontrahent_id || "brak";
      const kontrahentNazwa = nazwaKontrahentaZImportu(w.import_nazwa) || "Bez kontrahenta";
      const key = `${kid}__${w.rok}__${normalizujTekst(kontrahentNazwa)}`;
      if (!mapa.has(key)) {
        mapa.set(key, {
          key,
          budynekId: w.kontrahent_id || null,
          budynekNazwa: w.kontrahent_nazwa || "Bez budynku",
          kontrahentNazwa,
          rok: w.rok,
          wiersze: []
        });
      }
      mapa.get(key).wiersze.push(w);
    }

    const out = Array.from(mapa.values());
    for (const g of out) {
      g.wiersze.sort((a, b) => Number(a.lp || 0) - Number(b.lp || 0));
    }
    out.sort((a, b) => {
      const kontrahentCmp = String(a.kontrahentNazwa).localeCompare(String(b.kontrahentNazwa), "pl");
      if (kontrahentCmp !== 0) return kontrahentCmp;
      const budynekCmp = String(a.budynekNazwa).localeCompare(String(b.budynekNazwa), "pl");
      if (budynekCmp !== 0) return budynekCmp;
      return Number(b.rok || 0) - Number(a.rok || 0);
    });
    return out;
  }, [listaFiltrowana]);

  const nazwaEksportuFiltrow = useMemo(() => {
    return kontrahentEksportu || "wszyscy-kontrahenci";
  }, [kontrahentEksportu]);

  const listaEksportu = useMemo(() => {
    return listaDostepna.filter((w) => {
      const okKontrahent =
        !kontrahentEksportu || normalizujTekst(nazwaKontrahentaZImportu(w.import_nazwa)) === normalizujTekst(kontrahentEksportu);
      return okKontrahent;
    });
  }, [listaDostepna, kontrahentEksportu]);

  const kluczLokalnegoPlikuEksportu = useMemo(() => {
    return kluczUchwytuEksportu(
      "excel-local",
      kontrahentEksportu || qKontrahentEksportu || "wszyscy-kontrahenci",
      listaEksportu[0]?.rok || new Date().getFullYear()
    );
  }, [kontrahentEksportu, qKontrahentEksportu, listaEksportu]);

  const zapiszZmianyDoChmuryPoRekordzie = useCallback(async (rekord, listaPoZmianie) => {
    const kontrahentNazwa = nazwaKontrahentaZImportu(rekord?.import_nazwa);
    if (!kontrahentNazwa) return;

    let plikDocelowy = null;
    if (
      podlaczonyPlikExcel?.path &&
      normalizujTekst(kontrahentEksportu) === normalizujTekst(kontrahentNazwa)
    ) {
      plikDocelowy = podlaczonyPlikExcel;
    } else {
      try {
        const wynik = await zapytanieApi(`/odczyty-licznikow/podpiecie-pliku?kontrahent=${encodeURIComponent(kontrahentNazwa)}`);
        if (wynik?.storage_path) {
          plikDocelowy = {
            name: wynik.file_name || wynik.storage_path.split("/").pop() || "plik.xlsx",
            path: wynik.storage_path,
            bucket: wynik.bucket_name || BUCKET_PLIKOW_STORAGE
          };
        }
      } catch (_error) {
        return;
      }
    }

    if (!plikDocelowy?.path) return;

    const listaKontrahenta = (Array.isArray(listaPoZmianie) ? listaPoZmianie : []).filter(
      (wiersz) => normalizujTekst(nazwaKontrahentaZImportu(wiersz.import_nazwa)) === normalizujTekst(kontrahentNazwa)
    );

    if (!listaKontrahenta.length) return;

    try {
      await eksportujDoExcela(
        listaKontrahenta,
        listaKontrahenta[0]?.rok || rekord?.rok || new Date().getFullYear(),
        `${kontrahentNazwa}-eksport`,
        miesiacEksportu,
        kontrahentNazwa,
        dataOdczytuEksportu || dzisiajPl(),
        { storagePath: plikDocelowy.path, bucket: plikDocelowy.bucket || BUCKET_PLIKOW_STORAGE }
      );
    } catch (_error) {
      setKomunikatLokalny("Zapisano dane, ale nie udało się zaktualizować pliku Excel w chmurze.");
    }
  }, [dataOdczytuEksportu, kontrahentEksportu, miesiacEksportu, podlaczonyPlikExcel]);

  function ustawKomunikatPoZapisie(wynik) {
    if (!wynik || wynik.status === "cancelled") return;
    if (wynik.status === "cloud-saved") {
      setKomunikatEksportu("Pomyślnie zapisano zmiany w chmurze.");
      return;
    }
    if (wynik.status === "saved") {
      setKomunikatEksportu("Pomyślnie zapisano zmiany.");
      return;
    }
    if (wynik.status === "downloaded") {
      setKomunikatEksportu("Pomyślnie pobrano plik.");
    }
  }

  function sprawdzPolaEksportu() {
    const brakDaty = !String(dataOdczytuEksportu || "").trim();
    const wartoscKontrahenta = String(kontrahentEksportu || qKontrahentEksportu || "").trim();
    const brakKontrahenta = !wartoscKontrahenta || wartoscKontrahenta === "Wybór kontrahenta";

    setBladDatyEksportu(brakDaty);
    setBladKontrahentaEksportu(brakKontrahenta);

    if (brakDaty && brakKontrahenta) {
      setKomunikatEksportu("Uzupełnij datę odczytu i wybierz kontrahenta.");
      return false;
    }

    if (brakDaty) {
      setKomunikatEksportu("Wpisz datę odczytu.");
      return false;
    }

    if (brakKontrahenta) {
      setKomunikatEksportu("Wybierz kontrahenta.");
      return false;
    }

    return true;
  }

  function sprawdzMiesiacEksportuPdf() {
    const brakMiesiaca = !String(miesiacEksportu || "").trim() || !String(qMiesiacEksportu || "").trim();
    setBladMiesiacaEksportu(brakMiesiaca);

    if (brakMiesiaca) {
      setKomunikatEksportu("Wybierz miesiąc do PDF.");
      return false;
    }

    return true;
  }

  async function podlaczPlikExcel() {
    if (!czyAdminGlowny) {
      setKomunikatEksportu("Podpięcie pliku w chmurze może zmieniać tylko administrator.");
      return;
    }

    setKomunikatEksportu("");
    setPokazListePlikowStorage((prev) => !prev);
    if (!plikiStorageExcel.length) {
      await odswiezPlikiStorageExcel();
    }
  }

  async function zapiszZmianyDoPodlaczonegoPliku() {
    setKomunikatEksportu("");
    if (!sprawdzPolaEksportu()) return;
    if (!listaEksportu.length) return;
    const plikDoZapisu = podlaczonyPlikExcel || automatycznieDopasowanyPlikStorage;
    if (!plikDoZapisu?.path) {
      setKomunikatEksportu("Najpierw podepnij plik Excel w chmurze.");
      return;
    }

    try {
      const wynikChmura = await eksportujDoExcela(
        listaEksportu,
        listaEksportu[0]?.rok || new Date().getFullYear(),
        nazwaEksportuFiltrow,
        miesiacEksportu,
        kontrahentEksportu || null,
        dataOdczytuEksportu,
        { storagePath: plikDoZapisu.path, bucket: plikDoZapisu.bucket || BUCKET_PLIKOW_STORAGE }
      );
      const wynikLokalny = await eksportujDoExcela(
        listaEksportu,
        listaEksportu[0]?.rok || new Date().getFullYear(),
        nazwaEksportuFiltrow,
        miesiacEksportu,
        kontrahentEksportu || null,
        dataOdczytuEksportu,
        { kluczUchwytu: kluczLokalnegoPlikuEksportu }
      );

      if (wynikLokalny?.status === "saved") {
        setKomunikatEksportu("Pomyślnie zapisano zmiany w chmurze i lokalnym pliku.");
        return;
      }

      if (wynikLokalny?.status === "downloaded") {
        setKomunikatEksportu("Pomyślnie zapisano zmiany w chmurze. Lokalny plik nie był podpięty do nadpisania.");
        return;
      }

      ustawKomunikatPoZapisie(wynikChmura);
    } catch (e) {
      setKomunikatEksportu(e.message);
    }
  }

  async function pobierzPlikExcelDlaEksportu() {
    setKomunikatEksportu("");
    if (!sprawdzPolaEksportu()) return;

    try {
      const wynik = await eksportujDoExcela(
        listaEksportu,
        listaEksportu[0]?.rok || new Date().getFullYear(),
        nazwaEksportuFiltrow,
        miesiacEksportu,
        kontrahentEksportu || null,
        dataOdczytuEksportu,
        { wymusOknoZapisu: true, kluczUchwytu: kluczLokalnegoPlikuEksportu }
      );
      ustawKomunikatPoZapisie(wynik);
    } catch (e) {
      setKomunikatEksportu(e.message);
    }
  }

  async function zapisz(e) {
    e.preventDefault();
    setBlad("");

    try {
      if (edytowany) {
        const wynik = await zapytanieApi(`/odczyty-licznikow/${edytowany}`, { method: "PUT", body: JSON.stringify(formularz) });
        ustawLubDodajOdczyt(wynik);
        void zapiszZmianyDoChmuryPoRekordzie(wynik, listaPoZapisieRekordu(lista, wynik));
        setEdytowany(null);
        setEdytowanyMiesiacId(null);
        setFormularz(pustyFormularz());
        setQBudynek("");
      } else {
        const wynik = await zapytanieApi("/odczyty-licznikow", { method: "POST", body: JSON.stringify(formularz) });
        ustawLubDodajOdczyt(wynik);
        void zapiszZmianyDoChmuryPoRekordzie(wynik, listaPoZapisieRekordu(lista, wynik));

        if (trybSeryjny) {
          const nextLp = Number(formularz.lp || 0) + 1;
          setFormularz({
            ...pustyFormularz(),
            kontrahent_id: formularz.kontrahent_id,
            import_nazwa: formularz.import_nazwa,
            rok: formularz.rok,
            lp: nextLp > 0 ? String(nextLp) : ""
          });
          setQBudynek("");
        } else {
          setFormularz(pustyFormularz());
          setQBudynek("");
        }
      }
    } catch (e2) {
      setBlad(e2.message);
    }
  }

  const anulujEdycjeMiesiaca = useCallback(() => {
    setEdytowanyMiesiacId(null);
    setWartoscEdytowanegoMiesiaca("");
  }, []);

  const anulujEdycjeKomorki = useCallback(() => {
    setEdytowanaKomorka("");
    setWartoscEdytowanejKomorki("");
    setZapisywanaKomorka("");
  }, []);

  const aktualizujWartoscEdytowanegoMiesiaca = useCallback((wartosc) => {
    setWartoscEdytowanegoMiesiaca(wartosc);
  }, []);

  const aktualizujWartoscEdytowanejKomorki = useCallback((wartosc) => {
    setWartoscEdytowanejKomorki(wartosc);
  }, []);

  const rozpocznijEdycjeKomorki = useCallback((w, pole, grupaKey) => {
    if (!czyAdminGlowny || grupaEdycjiCalkowitej !== grupaKey) return;
    const wartoscPoczatkowa = pole.startsWith("m")
      ? wartoscMiesiecznaTekst(w[pole])
      : wartoscKomorki(w[pole]);
    setEdytowanyMiesiacId(null);
    setWartoscEdytowanegoMiesiaca("");
    setEdytowanaKomorka(`${w.id}:${pole}`);
    setWartoscEdytowanejKomorki(wartoscPoczatkowa);
  }, [czyAdminGlowny, grupaEdycjiCalkowitej]);

  const edytuj = useCallback((w) => {
    if (miesiacWidoku) {
      setEdytowanyMiesiacId(w.id);
      setWartoscEdytowanegoMiesiaca(w[miesiacWidoku] || "");
      return;
    }

    setGrupaEdycjiCalkowitej("");
    setEdytowanaKomorka("");
    setWartoscEdytowanejKomorki("");
    setEdytowany(w.id);
    setEdytowanyMiesiacId(null);
    setFormularz({
      lp: w.lp,
      typ_licznika: w.typ_licznika,
      rodzaj_licznika: w.rodzaj_licznika || "",
      numer_licznika: w.numer_licznika,
      kontrahent_id: w.kontrahent_id || "",
      import_nazwa: nazwaKontrahentaZImportu(w.import_nazwa),
      rok: w.rok,
      m01: w.m01 || "",
      m02: w.m02 || "",
      m03: w.m03 || "",
      m04: w.m04 || "",
      m05: w.m05 || "",
      m06: w.m06 || "",
      m07: w.m07 || "",
      m08: w.m08 || "",
      m09: w.m09 || "",
      m10: w.m10 || "",
      m11: w.m11 || "",
      m12: w.m12 || ""
    });
    setQBudynek(w.kontrahent_nazwa || "");
  }, [miesiacWidoku]);

  const zapiszMiesiac = useCallback(async (w) => {
    if (!miesiacWidoku) return;
    const scrollPrzedZapisem = typeof window !== "undefined" ? window.scrollY : 0;
    setBlad("");
    setKomunikatLokalny("");

    const payload = {
      ...w,
      import_nazwa: w.import_nazwa || formularz.import_nazwa || null,
      [miesiacWidoku]: wartoscEdytowanegoMiesiaca
    };

    try {
      const wynik = await zapytanieApi(`/odczyty-licznikow/${w.id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      ustawLubDodajOdczyt(wynik);
      void zapiszZmianyDoChmuryPoRekordzie(wynik, listaPoZapisieRekordu(lista, wynik));
      setEdytowanyMiesiacId(null);
      setWartoscEdytowanegoMiesiaca("");
      przywrocScrollPoZapisie(scrollPrzedZapisem);
    } catch (e) {
      if (czyBladPolaczenia(e)) {
        const lokalnyRekord = { ...w, ...payload, _lokalne: true };
        const wpisKolejki = {
          id: stworzLokalnyId(),
          typ: "update-month",
          rekordId: w.id,
          payload,
          lokalnyRekord,
          utworzono: Date.now()
        };
        await zapiszDoKolejkiOdczytow(wpisKolejki);
        ustawLubDodajOdczyt(lokalnyRekord);
        setEdytowanyMiesiacId(null);
        setWartoscEdytowanegoMiesiaca("");
        setKomunikatLokalny("Brak połączenia. Zmiana została zapisana lokalnie i zsynchronizuje się po powrocie internetu.");
        setLiczbaLokalnychZapisow((prev) => prev + 1);
        zapiszCacheOdczytow(
          lista.map((item) => (String(item.id) === String(w.id) ? lokalnyRekord : item))
        ).catch(() => {});
        przywrocScrollPoZapisie(scrollPrzedZapisem);
        return;
      }
      setBlad(e.message);
    }
  }, [formularz.import_nazwa, lista, miesiacWidoku, wartoscEdytowanegoMiesiaca, zapiszZmianyDoChmuryPoRekordzie]);

  const zapiszKomorke = useCallback(async (w, pole) => {
    const kluczKomorki = `${w.id}:${pole}`;
    if (edytowanaKomorka !== kluczKomorki) return;
    const scrollPrzedZapisem = typeof window !== "undefined" ? window.scrollY : 0;

    const nowaWartosc = pole.startsWith("m")
      ? wartoscMiesiecznaTekst(wartoscEdytowanejKomorki)
      : wartoscKomorki(wartoscEdytowanejKomorki);
    const poprzedniaWartosc = pole.startsWith("m")
      ? wartoscMiesiecznaTekst(w[pole])
      : wartoscKomorki(w[pole]);

    if (nowaWartosc === poprzedniaWartosc) {
      anulujEdycjeKomorki();
      return;
    }

    setBlad("");
    setKomunikatLokalny("");
    setZapisywanaKomorka(kluczKomorki);

    const payload = {
      ...w,
      import_nazwa: w.import_nazwa || formularz.import_nazwa || null,
      [pole]: nowaWartosc
    };

    try {
      const wynik = await zapytanieApi(`/odczyty-licznikow/${w.id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      ustawLubDodajOdczyt(wynik);
      void zapiszZmianyDoChmuryPoRekordzie(wynik, listaPoZapisieRekordu(lista, wynik));
      anulujEdycjeKomorki();
      przywrocScrollPoZapisie(scrollPrzedZapisem);
    } catch (e) {
      if (pole.startsWith("m") && czyBladPolaczenia(e)) {
        const lokalnyRekord = { ...w, ...payload, _lokalne: true };
        const wpisKolejki = {
          id: stworzLokalnyId(),
          typ: "update-month",
          rekordId: w.id,
          payload,
          lokalnyRekord,
          utworzono: Date.now()
        };
        await zapiszDoKolejkiOdczytow(wpisKolejki);
        ustawLubDodajOdczyt(lokalnyRekord);
        anulujEdycjeKomorki();
        setKomunikatLokalny("Brak połączenia. Zmiana została zapisana lokalnie i zsynchronizuje się po powrocie internetu.");
        setLiczbaLokalnychZapisow((prev) => prev + 1);
        zapiszCacheOdczytow(
          lista.map((item) => (String(item.id) === String(w.id) ? lokalnyRekord : item))
        ).catch(() => {});
        przywrocScrollPoZapisie(scrollPrzedZapisem);
        return;
      }
      setBlad(e.message);
      setZapisywanaKomorka("");
    }
  }, [anulujEdycjeKomorki, edytowanaKomorka, formularz.import_nazwa, lista, wartoscEdytowanejKomorki, zapiszZmianyDoChmuryPoRekordzie]);

  const usun = useCallback(async (id) => {
    if (!window.confirm("Usunąć odczyt?")) return;
    setBlad("");
    try {
      if (!id) {
        throw new Error("Brak identyfikatora odczytu do usunięcia.");
      }
      await zapytanieApi(`/odczyty-licznikow/${id}`, { method: "DELETE" });
      usunOdczytZListy(id);
    } catch (e) {
      setBlad(e.message);
    }
  }, []);

  async function usunWszystko() {
    if (!window.confirm("Usunąć wszystkie odczyty liczników? Tej operacji nie da się cofnąć.")) return;
    setBlad("");
    setKomunikatImportu("");
    try {
      const wynik = await zapytanieApi("/odczyty-licznikow", { method: "DELETE" });
      setFormularz(pustyFormularz());
      setEdytowany(null);
      setEdytowanyMiesiacId(null);
      setWartoscEdytowanegoMiesiaca("");
      setQBudynek("");
      setFiltrBudynekId("");
      setFiltrRok("");
      setFiltrKontrahentNazwa("");
      setQFiltrKontrahent("");
      setQFiltrBudynek("");
      setQFiltrMiesiac("");
      setMiesiacWidoku("");
      setQKontrahentEksportu("");
      setKontrahentEksportu("");
      setQMiesiacEksportu("");
      setMiesiacEksportu("m01");
      setDataOdczytuEksportu("");
      setKomunikatImportu(`Usunięto wszystkie odczyty (${wynik.usuniete || 0}).`);
      await odswiez();
    } catch (e) {
      setBlad(e.message);
    }
  }

  async function importujZExcela(plikDoImportu) {
    const plik = plikDoImportu || wybranyPlikImportu;
    if (!plik) return;

    const kontrahentDlaImportu = wartoscKomorki(nazwaKontrahentaImportu);
    if (!kontrahentDlaImportu) {
      setBladKontrahentaImportu(true);
      setKomunikatImportu("Wpisz kontrahenta dla importu.");
      setTypKomunikatuImportu("error");
      return;
    }

    setImportowanie(true);
    setBlad("");
    setKomunikatImportu("");
    setTypKomunikatuImportu("");
    setBladKontrahentaImportu(false);
    setNazwaOstatniegoImportu("");
    setWierszeOstatniegoImportu([]);
    setRokOstatniegoImportu("");

    try {
      const XLSXImport = await import("xlsx");
      const XLSX = XLSXImport.read ? XLSXImport : XLSXImport.default;
      const bufor = await plik.arrayBuffer();
      const workbook = XLSX.read(bufor, { type: "array" });
      const { rok, bloki } = parsujPlikOdczytow(XLSX, workbook);
      const listaRobocza = [...lista];
      const kontrahenciRoboczy = [...kontrahenci];

      let dodane = 0;
      let zaktualizowane = 0;
      let utworzeniKontrahenci = 0;
      let ostatniKontrahent = null;
      let ostatnieWiersze = [];
      const zapisaneWierszeImportu = [];

      for (const blok of bloki) {
        const nazwaKontrahenta = wartoscKomorki(blok.kontrahentNazwa);
        const { kontrahent, utworzony } = await znajdzLubUtworzKontrahenta(kontrahenciRoboczy, nazwaKontrahenta);
        if (utworzony) {
          kontrahenciRoboczy.push(kontrahent);
          utworzeniKontrahenci += 1;
        }

        ostatniKontrahent = kontrahent;
        ostatnieWiersze = blok.wiersze;

        for (const wiersz of blok.wiersze) {
          const payload = {
            ...wiersz,
            kontrahent_id: kontrahent.id,
            rok: blok.rok || rok || new Date().getFullYear(),
            import_nazwa: kontrahentDlaImportu
          };

          const istniejacy = listaRobocza.find((item) => {
            const pasujeNumer =
              wartoscKomorki(payload.numer_licznika) &&
              normalizujTekst(item.numer_licznika) === normalizujTekst(payload.numer_licznika);
            const pasujeOpis = normalizujTekst(item.typ_licznika) === normalizujTekst(payload.typ_licznika);

            return (
              String(item.kontrahent_id || "") === String(kontrahent.id) &&
              String(item.rok || "") === String(payload.rok) &&
              String(item.lp || "") === String(payload.lp) &&
              (pasujeNumer || pasujeOpis)
            );
          });

          if (istniejacy) {
            const wynik = await zapytanieApi(`/odczyty-licznikow/${istniejacy.id}`, {
              method: "PUT",
              body: JSON.stringify(payload)
            });
            const indexIstniejacego = listaRobocza.findIndex((item) => item.id === istniejacy.id);
            if (indexIstniejacego >= 0) {
              listaRobocza[indexIstniejacego] = wynik;
            }
            zapisaneWierszeImportu.push(wynik);
            zaktualizowane += 1;
          } else {
            const wynik = await zapytanieApi("/odczyty-licznikow", {
              method: "POST",
              body: JSON.stringify(payload)
            });
            listaRobocza.push(wynik);
            zapisaneWierszeImportu.push(wynik);
            dodane += 1;
          }
        }
      }

      const nastepneLp = String(
        Math.max(
          0,
          ...ostatnieWiersze.map((wiersz) => Number(wiersz.lp || 0))
        ) + 1
      );

      setFormularz({
        ...pustyFormularz(),
        kontrahent_id: ostatniKontrahent?.id || "",
        import_nazwa: kontrahentDlaImportu,
        rok: rok || new Date().getFullYear(),
        lp: nastepneLp
      });
      setQBudynek(ostatniKontrahent?.nazwa || "");
      setEdytowanyMiesiacId(null);
      setWartoscEdytowanegoMiesiaca("");
      setFiltrBudynekId(bloki.length === 1 && ostatniKontrahent ? String(ostatniKontrahent.id) : "");
      setFiltrRok(String(rok || new Date().getFullYear()));
      setFiltrKontrahentNazwa(kontrahentDlaImportu);
      setQFiltrKontrahent(kontrahentDlaImportu);
      setQFiltrBudynek(ostatniKontrahent?.nazwa || "");
      setQFiltrMiesiac("");
      setMiesiacWidoku("");
      setQKontrahentEksportu(kontrahentDlaImportu);
      setKontrahentEksportu(kontrahentDlaImportu);
      setQMiesiacEksportu("styczeń");
      setMiesiacEksportu("m01");
      setDataOdczytuEksportu("");
      setNazwaOstatniegoImportu(plik.name);
      setWierszeOstatniegoImportu(zapisaneWierszeImportu);
      setRokOstatniegoImportu(String(rok || new Date().getFullYear()));
      setKomunikatImportu(
        `Zakończono importowanie. Bloków: ${bloki.length}, dodano: ${dodane}, zaktualizowano: ${zaktualizowane}.${utworzeniKontrahenci ? ` Utworzono kontrahentów: ${utworzeniKontrahenci}.` : ""}`
      );
      setTypKomunikatuImportu("success");
      setBladKontrahentaImportu(false);
      setNazwaKontrahentaImportu("");
      setWybranyPlikImportu(null);
      await odswiez();
    } catch (e2) {
      setKomunikatImportu(e2.message);
      setTypKomunikatuImportu("error");
    } finally {
      setImportowanie(false);
    }
  }

  return (
    <div className="space-y-6">
      <SekcjaNaglowek
        tytul="Odczyty liczników"
        opis={nazwaOstatniegoImportu ? `Ostatni import: ${nazwaOstatniegoImportu}` : "Wiele liczników dla jednego kontrahenta i roku, grupowane w jednym zestawie."}
      />

      {komunikatLokalny ? (
        <div className="rounded-2xl border border-emerald-400/16 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-200">
          {komunikatLokalny}
          {liczbaLokalnychZapisow ? ` Oczekujące lokalne zmiany: ${liczbaLokalnychZapisow}.` : ""}
        </div>
      ) : null}

      {czyKontoAdmin ? (
      <section className="karta-szklana anim-sekcja rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Import z Excela</h2>
            <p className="text-sm text-slate-300">
              Wczytaj plik <span className="font-semibold text-emerald-300">.xlsx</span>, <span className="font-semibold text-emerald-300">.xls</span> albo{" "}
              <span className="font-semibold text-emerald-300">.ods</span>. Import obsługuje wiele tabel w jednym arkuszu i czyta nazwę budynku wpisaną nad tabelą.
            </p>
          </div>
          <label className={`przycisk-glowny cursor-pointer ${importowanie ? "pointer-events-none opacity-60" : ""}`}>
            <input
              type="file"
              accept=".xlsx,.xls,.ods,application/vnd.oasis.opendocument.spreadsheet"
              className="hidden"
              onChange={(e) => {
                const plik = e.target.files?.[0] || null;
                setWybranyPlikImportu(plik);
                setKomunikatImportu("");
                setTypKomunikatuImportu("");
                e.target.value = "";
              }}
              disabled={importowanie}
            />
            Wybierz plik Excel
          </label>
        </div>
        {wybranyPlikImportu ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/16 bg-emerald-500/[0.05] px-4 py-3">
            <p className="text-sm text-slate-200">
              Wybrany plik: <span className="font-medium text-emerald-200">{wybranyPlikImportu.name}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="przycisk-wtorny px-3 py-2 text-sm"
                onClick={() => setWybranyPlikImportu(null)}
                disabled={importowanie}
              >
                Usuń plik
              </button>
              <button
                type="button"
                className="przycisk-glowny px-4 py-2 text-sm"
                onClick={() => importujZExcela()}
                disabled={importowanie}
              >
                {importowanie ? "Importowanie..." : "Importuj plik"}
              </button>
            </div>
          </div>
        ) : null}
        <input
          className={`pole ${bladKontrahentaImportu ? "border-red-500/90 ring-1 ring-red-500/60" : ""}`}
          placeholder="Wpisz kontrahenta dla importu, np. PORT PRASKI"
          value={nazwaKontrahentaImportu}
          onChange={(e) => {
            setNazwaKontrahentaImportu(e.target.value);
            if (e.target.value.trim()) {
              setBladKontrahentaImportu(false);
              setKomunikatImportu("");
              setTypKomunikatuImportu("");
            }
          }}
          onBlur={(e) => {
            if (!String(e.target.value || "").trim()) {
              setBladKontrahentaImportu(true);
            }
          }}
        />
        <p className="text-xs text-slate-400">
          Kontrahent jest wymagany przed importem. Nazwa budynku nad tabelą jest czytana automatycznie z arkusza.
        </p>
        {komunikatImportu ? (
          <p className={`text-sm ${typKomunikatuImportu === "error" ? "text-red-300" : "text-emerald-300"}`}>{komunikatImportu}</p>
        ) : null}
      </section>
      ) : null}

      {czyKontoAdmin || edytowany ? (
      <form onSubmit={zapisz} className="karta-szklana anim-sekcja rounded-2xl p-4 space-y-4">
        <div className="grid items-start gap-3 md:grid-cols-2 lg:grid-cols-12">
          <input
            className="pole h-11 py-2 lg:col-span-2"
            type="number"
            placeholder="Lp."
            value={formularz.lp}
            onChange={(e) => setFormularz({ ...formularz, lp: e.target.value })}
            required
          />
          <input
            className="pole h-11 py-2 lg:col-span-5"
            placeholder="Licznik/Podlicznik (np. Garaż)"
            value={formularz.typ_licznika}
            onChange={(e) => setFormularz({ ...formularz, typ_licznika: e.target.value })}
            required
          />
          <input
            className="pole h-11 py-2 lg:col-span-2"
            placeholder="Rodzaj licznika"
            value={formularz.rodzaj_licznika}
            onChange={(e) => setFormularz({ ...formularz, rodzaj_licznika: e.target.value })}
          />
          <input
            className="pole h-11 py-2 lg:col-span-2"
            placeholder="Nr. licznika"
            value={formularz.numer_licznika}
            onChange={(e) => setFormularz({ ...formularz, numer_licznika: e.target.value })}
          />
          <input
            className="pole h-11 py-2 lg:col-span-2"
            type="number"
            placeholder="Rok"
            value={formularz.rok}
            onChange={(e) => setFormularz({ ...formularz, rok: e.target.value })}
            required
          />

          <div className="space-y-3 md:col-span-2 lg:col-span-12">
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs text-slate-400">Dostępnych kontrahentów: {przefiltrowaniKontrahenci.length}</p>
                <div className="relative">
                  <input
                    className="pole h-11 py-2"
                    value={formularz.import_nazwa}
                    onChange={(e) => {
                      setFormularz({ ...formularz, import_nazwa: e.target.value, kontrahent_id: "" });
                      setPokazListeKontrahentow(true);
                    }}
                    onFocus={() => setPokazListeKontrahentow(true)}
                    onBlur={() => window.setTimeout(() => setPokazListeKontrahentow(false), 150)}
                    placeholder="Wpisz albo wybierz kontrahenta"
                    required
                  />
                  {pokazListeKontrahentow && przefiltrowaniKontrahenci.length ? (
                    <div className="anim-dropdown absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-emerald-500/20 bg-slate-900/95 p-1 shadow-2xl divide-y divide-emerald-500/25">
                      {przefiltrowaniKontrahenci.map((nazwa) => (
                        <button
                          key={nazwa}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-emerald-500/10"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setFormularz({ ...formularz, import_nazwa: nazwa, kontrahent_id: "" });
                            setQBudynek("");
                            setPokazListeKontrahentow(false);
                          }}
                        >
                          {nazwa}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-400">Dostępnych budynków: {budynkiDlaWybranegoKontrahenta.length}</p>
                <div className="relative">
                  <input
                    className="pole h-11 py-2"
                    value={qBudynek}
                    onChange={(e) => {
                      setQBudynek(e.target.value);
                      setFormularz({ ...formularz, kontrahent_id: "" });
                      setPokazListeBudynkow(true);
                    }}
                    onFocus={() => setPokazListeBudynkow(true)}
                    onBlur={() => window.setTimeout(() => setPokazListeBudynkow(false), 150)}
                    placeholder="Wpisz albo wybierz budynek"
                    required
                  />
                  {pokazListeBudynkow && przefiltrowaneBudynki.length ? (
                    <div className="anim-dropdown absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-emerald-500/20 bg-slate-900/95 p-1 shadow-2xl divide-y divide-emerald-500/25">
                      {przefiltrowaneBudynki.map((budynek) => (
                        <button
                          key={budynek.id}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-emerald-500/10"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setQBudynek(budynek.nazwa);
                            setFormularz({ ...formularz, kontrahent_id: budynek.id });
                            setPokazListeBudynkow(false);
                          }}
                        >
                          {budynek.nazwa}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/8 bg-white/[0.025] p-2">
          <table className="min-w-[860px] text-sm">
            <thead>
              <tr className="text-slate-300">
                {MIESIACE.map(([, nazwa, skrot]) => (
                  <th key={nazwa} className="px-2 py-2 text-center uppercase" title={nazwa}>
                    {skrot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {MIESIACE.map(([kod, nazwa, skrot]) => (
                  <td key={kod} className="px-1 py-1">
                    <input
                      className="pole h-11 text-center"
                      type="text"
                      inputMode="decimal"
                      title={nazwa}
                      value={formularz[kod]}
                      onChange={(e) => setFormularz({ ...formularz, [kod]: wartoscMiesiecznaTekst(e.target.value) })}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={trybSeryjny} onChange={(e) => setTrybSeryjny(e.target.checked)} />
          Dodawanie seryjne: po zapisie zostaw kontrahenta i rok, zwiększ LP o 1
        </label>

        {blad ? <p className="text-sm text-red-300">{blad}</p> : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button className="przycisk-glowny">{edytowany ? "Zapisz zmiany" : "Dodaj odczyt"}</button>
          {edytowany ? (
            <button type="button" className="przycisk-wtorny" onClick={() => { setEdytowany(null); setFormularz(pustyFormularz()); setQBudynek(""); }}>
              Anuluj
            </button>
          ) : null}
        </div>
      </form>
      ) : null}

      <section className="karta-szklana anim-panel rounded-2xl p-4 space-y-4">
        <div className="mx-auto grid max-w-[1080px] gap-3 xl:grid-cols-[minmax(0,1fr)_210px]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Filtry widoku</p>
                <p className="mt-1 text-xs text-slate-500">Te pola zmieniają tylko to, co widzisz na stronie.</p>
              </div>
            </div>
            <div className="grid gap-2 xl:grid-cols-2">
              <div className="relative">
                <input
                  className="pole h-9 px-3 py-1"
                  value={qFiltrKontrahent}
                  onChange={(e) => {
                    const wartosc = e.target.value;
                    setQFiltrKontrahent(wartosc);
                    setFiltrKontrahentNazwa(wartosc);
                    setFiltrBudynekId("");
                    setQFiltrBudynek("");
                    setPokazListeFiltrowKontrahentow(true);
                  }}
                  onFocus={() => setPokazListeFiltrowKontrahentow(true)}
                  onBlur={() => window.setTimeout(() => setPokazListeFiltrowKontrahentow(false), 150)}
                  placeholder="Wpisz albo wybierz kontrahenta"
                />
                {pokazListeFiltrowKontrahentow && przefiltrowaniKontrahenciDlaFiltrow.length ? (
                  <div className="anim-dropdown absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-emerald-500/20 bg-slate-900/95 p-1 shadow-2xl divide-y divide-emerald-500/25">
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-emerald-500/10"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setQFiltrKontrahent("Wszyscy kontrahenci");
                        setFiltrKontrahentNazwa("");
                        setFiltrBudynekId("");
                        setQFiltrBudynek("Wszystkie budynki");
                        setPokazListeFiltrowKontrahentow(false);
                      }}
                    >
                      Wszyscy kontrahenci
                    </button>
                    {przefiltrowaniKontrahenciDlaFiltrow.map((nazwa) => (
                      <button
                        key={nazwa}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-emerald-500/10"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setQFiltrKontrahent(nazwa);
                          setFiltrKontrahentNazwa(nazwa);
                          setFiltrBudynekId("");
                          setQFiltrBudynek("");
                          setPokazListeFiltrowKontrahentow(false);
                        }}
                      >
                        {nazwa}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="relative">
                <input
                  className="pole h-9 px-3 py-1"
                  value={qFiltrBudynek}
                  onChange={(e) => {
                    const wartosc = e.target.value;
                    setQFiltrBudynek(wartosc);
                    setFiltrBudynekId("");
                    setPokazListeFiltrowBudynkow(true);
                  }}
                  onFocus={() => setPokazListeFiltrowBudynkow(true)}
                  onBlur={() => window.setTimeout(() => setPokazListeFiltrowBudynkow(false), 150)}
                  placeholder="Wpisz albo wybierz budynek"
                />
                {pokazListeFiltrowBudynkow && przefiltrowaneBudynkiDlaFiltrow.length ? (
                  <div className="anim-dropdown absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-emerald-500/20 bg-slate-900/95 p-1 shadow-2xl divide-y divide-emerald-500/25">
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-emerald-500/10"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setQFiltrBudynek("Wszystkie budynki");
                        setFiltrBudynekId("");
                        setPokazListeFiltrowBudynkow(false);
                      }}
                    >
                      Wszystkie budynki
                    </button>
                    {przefiltrowaneBudynkiDlaFiltrow.map((budynek) => (
                      <button
                        key={budynek.id}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-emerald-500/10"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setQFiltrBudynek(budynek.nazwa);
                          setFiltrBudynekId(budynek.id);
                          setPokazListeFiltrowBudynkow(false);
                        }}
                      >
                        {budynek.nazwa}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="relative">
                <input
                  className="pole h-9 px-3 py-1"
                  value={qFiltrMiesiac}
                  onChange={(e) => {
                    const wartosc = duzaLitera(e.target.value);
                    setQFiltrMiesiac(wartosc);
                    setMiesiacWidoku("");
                    setPokazListeFiltrowMiesiecy(true);
                  }}
                  onFocus={() => setPokazListeFiltrowMiesiecy(true)}
                  onBlur={() => window.setTimeout(() => setPokazListeFiltrowMiesiecy(false), 150)}
                  placeholder="Wpisz albo wybierz miesiąc"
                />
                {pokazListeFiltrowMiesiecy && przefiltrowaneMiesiace.length ? (
                  <div className="anim-dropdown absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-emerald-500/20 bg-slate-900/95 p-1 shadow-2xl divide-y divide-emerald-500/25">
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-emerald-500/10"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setQFiltrMiesiac("Wszystkie miesiące");
                        setMiesiacWidoku("");
                        setPokazListeFiltrowMiesiecy(false);
                      }}
                    >
                      Wszystkie miesiące
                    </button>
                    {przefiltrowaneMiesiace.map(([kod, nazwa]) => (
                      <button
                        key={kod}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-emerald-500/10"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setQFiltrMiesiac(duzaLitera(nazwa));
                          setMiesiacWidoku(kod);
                          setPokazListeFiltrowMiesiecy(false);
                        }}
                      >
                        {duzaLitera(nazwa)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <input
                className="pole h-9 px-3 py-1"
                type="number"
                min="2000"
                max="2100"
                step="1"
                inputMode="numeric"
                placeholder={`Filtr roku (${biezacyRok})`}
                value={filtrRok}
                onFocus={() => {
                  if (!String(filtrRok || "").trim()) {
                    setFiltrRok(biezacyRok);
                  }
                }}
                onChange={(e) => {
                  const czyste = String(e.target.value || "").replace(/\D/g, "").slice(0, 4);
                  if (!czyste) {
                    setFiltrRok("");
                    return;
                  }
                  const rok = Number(czyste);
                  if (rok < 2000) {
                    setFiltrRok("2000");
                    return;
                  }
                  if (rok > 2100) {
                    setFiltrRok("2100");
                    return;
                  }
                  setFiltrRok(czyste);
                }}
              />
            </div>
          </div>
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="mb-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Eksport</p>
              <p className="mt-2 text-sm leading-5 text-slate-500">Kliknij, aby wyeksportować dane.</p>
            </div>
            <div className="flex min-h-[68px] items-start justify-center">
              <button
                className="przycisk-glowny flex h-9 min-w-[180px] items-center justify-center px-5 py-1.5 text-center text-sm"
                type="button"
                onClick={() => {
                  setKomunikatEksportu("");
                  setPokazOknoEksportu(true);
                }}
              >
                Eksportuj
              </button>
            </div>

            {pokazOknoEksportu ? (
              <div className="anim-dropdown absolute right-0 top-[calc(100%+12px)] z-30 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-panel p-4 shadow-2xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Eksport</h3>
                    <p className="text-sm text-slate-400">Ustaw parametry eksportu.</p>
                  </div>
                  <button className="przycisk-wtorny h-9 px-3 py-1 text-sm" type="button" onClick={() => setPokazOknoEksportu(false)}>
                    Zamknij
                  </button>
                </div>

                <div className="space-y-3">
                  {komunikatEksportu ? <p className="text-sm text-emerald-300">{komunikatEksportu}</p> : null}

                  <input
                    className={`pole h-10 px-3 py-1.5 ${bladDatyEksportu ? "border-red-500/90 ring-1 ring-red-500/60" : ""}`}
                    type="date"
                    value={dataOdczytuEksportu}
                    onChange={(e) => {
                      setDataOdczytuEksportu(e.target.value);
                      if (e.target.value) {
                        setBladDatyEksportu(false);
                      }
                    }}
                    onBlur={(e) => {
                      if (!String(e.target.value || "").trim()) {
                        setBladDatyEksportu(true);
                      }
                    }}
                  />

                  <div className="relative">
                    <input
                      className={`pole h-10 px-3 py-1.5 ${bladKontrahentaEksportu ? "border-red-500/90 ring-1 ring-red-500/60" : ""}`}
                      value={qKontrahentEksportu}
                      onChange={(e) => {
                        setQKontrahentEksportu(e.target.value);
                        setKontrahentEksportu(e.target.value);
                        if (e.target.value.trim()) {
                          setBladKontrahentaEksportu(false);
                        }
                        setPokazListeKontrahentowEksportu(true);
                      }}
                      onFocus={() => setPokazListeKontrahentowEksportu(true)}
                      onBlur={() => window.setTimeout(() => setPokazListeKontrahentowEksportu(false), 150)}
                      onBlurCapture={(e) => {
                        if (!String(e.target.value || "").trim()) {
                          setBladKontrahentaEksportu(true);
                        }
                      }}
                      placeholder="Wybór kontrahenta"
                    />
                    {pokazListeKontrahentowEksportu && przefiltrowaniKontrahenciEksportu.length ? (
                      <div className="anim-dropdown absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-emerald-500/20 bg-slate-900/95 p-1 shadow-2xl divide-y divide-emerald-500/25">
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-emerald-500/10"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setQKontrahentEksportu("Wszyscy kontrahenci");
                            setKontrahentEksportu("");
                            setBladKontrahentaEksportu(false);
                            setPokazListeKontrahentowEksportu(false);
                          }}
                        >
                          Wszyscy kontrahenci
                        </button>
                        {przefiltrowaniKontrahenciEksportu.map((nazwa) => (
                          <button
                            key={nazwa}
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-emerald-500/10"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setQKontrahentEksportu(nazwa);
                              setKontrahentEksportu(nazwa);
                              setBladKontrahentaEksportu(false);
                              setPokazListeKontrahentowEksportu(false);
                            }}
                          >
                            {nazwa}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="relative">
                    <input
                      className={`pole h-10 px-3 py-1.5 ${bladMiesiacaEksportu ? "!border-red-400/90 !ring-1 !ring-red-400/70 focus:!border-red-400" : ""}`}
                      value={qMiesiacEksportu}
                      onChange={(e) => {
                        setQMiesiacEksportu(duzaLitera(e.target.value));
                        setBladMiesiacaEksportu(false);
                        setPokazListeMiesiecyEksportu(true);
                      }}
                      onFocus={() => {
                        setBladMiesiacaEksportu(false);
                        setPokazListeMiesiecyEksportu(true);
                      }}
                      onBlur={() => window.setTimeout(() => setPokazListeMiesiecyEksportu(false), 150)}
                      placeholder="Wybór miesiąca do PDF"
                    />
                    {pokazListeMiesiecyEksportu && przefiltrowaneMiesiaceEksportu.length ? (
                      <div className="anim-dropdown absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-emerald-500/20 bg-slate-900/95 p-1 shadow-2xl divide-y divide-emerald-500/25">
                        {przefiltrowaneMiesiaceEksportu.map(([kod, nazwa]) => (
                          <button
                            key={kod}
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-emerald-500/10"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setQMiesiacEksportu(duzaLitera(nazwa));
                              setMiesiacEksportu(kod);
                              setBladMiesiacaEksportu(false);
                              setPokazListeMiesiecyEksportu(false);
                            }}
                          >
                            {duzaLitera(nazwa)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    {czyAdminGlowny && pokazListePlikowStorage ? (
                      <div className="relative">
                        <input
                          className="pole h-11 w-full pr-3"
                          value={qPlikStorage}
                          onChange={(e) => {
                            setQPlikStorage(e.target.value);
                            setPokazListePlikowStorage(true);
                          }}
                          onFocus={() => setPokazListePlikowStorage(true)}
                          placeholder="Wybierz plik Excel z chmury"
                        />
                        <div className="absolute z-30 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-emerald-500/20 bg-slate-950/95 shadow-2xl shadow-emerald-950/30">
                          {ladowaniePlikowStorage ? (
                            <p className="px-3 py-2 text-sm text-slate-400">Ładowanie plików z chmury...</p>
                          ) : przefiltrowanePlikiStorageExcel.length ? (
                            przefiltrowanePlikiStorageExcel.map((plik) => (
                              <button
                                key={plik.path}
                                type="button"
                                className="block w-full border-b border-emerald-500/15 px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-emerald-500/10"
                                onMouseDown={async (e) => {
                                  e.preventDefault();
                                  try {
                                    await podlaczPlikStorage(plik);
                                  } catch (error) {
                                    setKomunikatEksportu(error.message || "Nie udało się podpiąć pliku z chmury.");
                                  }
                                }}
                              >
                                {plik.name}
                              </button>
                            ))
                          ) : (
                            <p className="px-3 py-2 text-sm text-slate-400">Brak plików Excel w Supabase Storage.</p>
                          )}
                        </div>
                      </div>
                    ) : null}
                    <p className="text-center text-xs text-slate-400">
                      {podlaczonyPlikExcel?.name
                        ? `Podpięty plik w chmurze: ${podlaczonyPlikExcel.name}`
                        : automatycznieDopasowanyPlikStorage?.name
                          ? `Dopasowany plik: ${automatycznieDopasowanyPlikStorage.name}`
                          : "Brak podpiętego pliku Excel w chmurze."}
                    </p>
                    <button
                      className="przycisk-glowny flex h-10 items-center justify-center px-3 py-1 text-center text-sm"
                      type="button"
                      onClick={pobierzPlikExcelDlaEksportu}
                      disabled={!listaEksportu.length}
                    >
                      Pobierz
                    </button>
                    <button
                      className="flex h-10 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-center text-sm font-semibold text-cyan-100 shadow-[0_10px_30px_rgba(34,211,238,0.08)] transition hover:border-cyan-300/40 hover:bg-cyan-500/16 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      onClick={async () => {
                        setKomunikatEksportu("");
                        if (!sprawdzPolaEksportu()) return;
                        if (!sprawdzMiesiacEksportuPdf()) return;
                        try {
                          const wynik = await eksportujArkusz2DoPdf(
                            listaEksportu,
                            listaEksportu[0]?.rok || new Date().getFullYear(),
                            nazwaEksportuFiltrow,
                            miesiacEksportu,
                            kontrahentEksportu || null,
                            dataOdczytuEksportu,
                            { wymusOknoZapisu: true }
                          );
                          ustawKomunikatPoZapisie(wynik);
                        } catch (e) {
                          setKomunikatEksportu(e.message);
                        }
                      }}
                      disabled={!listaEksportu.length}
                    >
                      Pobierz PDF
                    </button>
                    <button
                      className="przycisk-wtorny flex h-10 items-center justify-center px-3 py-1 text-center text-sm"
                      type="button"
                      onClick={zapiszZmianyDoPodlaczonegoPliku}
                      disabled={!listaEksportu.length || !podlaczonyPlikExcel?.path}
                    >
                      Zapisz zmiany
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {!grupy.length ? (
          <p className="text-sm text-slate-400">
            {filtrKontrahentNazwa || filtrBudynekId
              ? "Brak zestawów dla wybranego filtra."
              : "Wybierz kontrahenta albo budynek, żeby wyświetlić odczyty."}
          </p>
        ) : null}

        {grupy.map((grupa, index) => {
          const poprzedniaGrupa = index > 0 ? grupy[index - 1] : null;
          const pokazSeparatorKontrahenta =
            !!grupa.kontrahentNazwa &&
            (!poprzedniaGrupa || normalizujTekst(grupa.kontrahentNazwa) !== normalizujTekst(poprzedniaGrupa.kontrahentNazwa));

          return (
            <Fragment key={grupa.key}>
              <div className={pokazSeparatorKontrahenta ? "mt-4" : ""}>
              <div
                className={`rounded-xl border border-white/10 bg-white/5 ${
                  miesiacWidoku ? "" : "overflow-x-auto"
                }`}
              >
                {pokazSeparatorKontrahenta ? (
                  <div className="border-b border-slate-400/35 px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="px-2 py-1">
                        <div className="flex items-center gap-2 text-[16px] font-semibold tracking-[0.04em] text-emerald-200">
                          <BuildingOffice2Icon className="h-5 w-5 text-slate-100" />
                          <span className="uppercase tracking-[0.18em]">{grupa.kontrahentNazwa}</span>
                        </div>
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-emerald-400/34 via-emerald-400/14 to-transparent" />
                    </div>
                  </div>
                ) : null}
                <div className="p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold uppercase tracking-[0.08em] text-slate-50">
                      {grupa.budynekNazwa}
                    </h3>
                    <div className="mt-2 h-px w-full max-w-[360px] bg-gradient-to-r from-emerald-400/75 via-emerald-300/45 to-transparent" />
                    <p className="mt-1 text-sm text-slate-400">
                      Rok: <span className="font-medium text-slate-200">{grupa.rok}</span>
                      <span className="mx-2 text-emerald-300/25">|</span>
                      Liczników: <span className="font-medium text-slate-200">{grupa.wiersze.length}</span>
                    </p>
                  </div>
                  <div className="relative flex flex-wrap items-center gap-2" ref={otwartyEksportBudynkuKey === grupa.key ? kontenerEksportuBudynkuRef : null}>
                    {czyAdminGlowny ? (
                      <button
                        className="przycisk-wtorny"
                        onClick={() => {
                          const wlacz = grupaEdycjiCalkowitej !== grupa.key;
                          setGrupaEdycjiCalkowitej(wlacz ? grupa.key : "");
                          setEdytowanyMiesiacId(null);
                          setWartoscEdytowanegoMiesiaca("");
                          setEdytowany(null);
                          anulujEdycjeKomorki();
                        }}
                        type="button"
                      >
                        {grupaEdycjiCalkowitej === grupa.key ? "Zamknij edycję" : "Edycja całości"}
                      </button>
                    ) : null}
                    <button
                      className="przycisk-glowny !bg-[#59C97E] hover:!bg-[#7BE8A3]"
                      onClick={() => {
                        setOtwartyEksportBudynkuKey((aktualny) => (aktualny === grupa.key ? "" : grupa.key));
                        if (!String(dataOdczytuEksportu || "").trim()) {
                          setBladDatyEksportuBudynku(true);
                        }
                      }}
                      type="button"
                    >
                      Pobierz
                    </button>
                    {otwartyEksportBudynkuKey === grupa.key ? (
                      <div className="anim-dropdown absolute right-0 top-[calc(100%+10px)] z-20 min-w-[260px] overflow-hidden rounded-xl border border-emerald-400/18 bg-slate-900/95 p-2 shadow-2xl">
                        <input
                          className={`pole mb-2 h-10 px-3 py-1.5 ${bladDatyEksportuBudynku ? "border-red-500/90 ring-1 ring-red-500/60" : ""}`}
                          type="date"
                          value={dataOdczytuEksportu}
                          onChange={(e) => {
                            setDataOdczytuEksportu(e.target.value);
                            if (e.target.value) {
                              setBladDatyEksportuBudynku(false);
                            }
                          }}
                          onBlur={(e) => {
                            if (!String(e.target.value || "").trim()) {
                              setBladDatyEksportuBudynku(true);
                            }
                          }}
                        />
                        <button
                          className="block w-full rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-left text-sm font-medium text-cyan-100 transition hover:border-cyan-300/35 hover:bg-cyan-500/16 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-cyan-500/10"
                          type="button"
                          disabled={!String(dataOdczytuEksportu || "").trim()}
                          onMouseDown={async (e) => {
                            e.preventDefault();
                            if (!String(dataOdczytuEksportu || "").trim()) {
                              setBladDatyEksportuBudynku(true);
                              return;
                            }
                            setOtwartyEksportBudynkuKey("");
                            await eksportujDoExcela(
                              grupa.wiersze,
                              grupa.rok,
                              `${grupa.budynekNazwa}-zestaw`,
                              miesiacWidoku || "m01",
                              grupa.kontrahentNazwa || null,
                              dataOdczytuEksportu,
                              { wymusOknoZapisu: true }
                            );
                          }}
                        >
                          Pobierz Excel
                        </button>
                        <button
                          className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                          type="button"
                          disabled={!String(dataOdczytuEksportu || "").trim()}
                          onMouseDown={async (e) => {
                            e.preventDefault();
                            if (!String(dataOdczytuEksportu || "").trim()) {
                              setBladDatyEksportuBudynku(true);
                              return;
                            }
                            setOtwartyEksportBudynkuKey("");
                            await eksportujArkusz2DoPdf(
                              grupa.wiersze,
                              grupa.rok,
                              `${grupa.budynekNazwa}-zestaw`,
                              miesiacWidoku || miesiacEksportu || "m01",
                              grupa.kontrahentNazwa || null,
                              dataOdczytuEksportu,
                              { wymusOknoZapisu: true }
                            );
                          }}
                        >
                          Pobierz PDF
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {miesiacWidoku ? (
                  <div className="space-y-3 sm:hidden">
                    {grupa.wiersze.map((w) => (
                      <OdczytMobileCard
                        key={w.id}
                        w={w}
                        miesiacWidoku={miesiacWidoku}
                        czyEdycjaCalkowita={czyAdminGlowny && grupaEdycjiCalkowitej === grupa.key}
                        isEditing={edytowanyMiesiacId === w.id}
                        editedValue={edytowanyMiesiacId === w.id ? wartoscEdytowanegoMiesiaca : ""}
                        aktywnaKomorka={edytowanaKomorka}
                        wartoscAktywnejKomorki={wartoscEdytowanejKomorki}
                        zapisywanaKomorka={zapisywanaKomorka}
                        onEditedValueChange={aktualizujWartoscEdytowanegoMiesiaca}
                        onStartCellEdit={(rekord, pole) => rozpocznijEdycjeKomorki(rekord, pole, grupa.key)}
                        onCellValueChange={aktualizujWartoscEdytowanejKomorki}
                        onEdit={edytuj}
                        onDelete={usun}
                        onCellSave={zapiszKomorke}
                        onCellCancel={anulujEdycjeKomorki}
                        onSave={zapiszMiesiac}
                        onCancel={anulujEdycjeMiesiaca}
                      />
                    ))}
                  </div>
                ) : null}

                <table className={`${miesiacWidoku ? "hidden w-full table-fixed text-sm sm:table" : "min-w-[1180px] table-fixed text-sm"}`}>
                  <thead>
                    <tr className="text-slate-300">
                      <th className={`${miesiacWidoku ? "w-10" : "w-12"} py-2 text-left`}>Lp.</th>
                      <th className={`${miesiacWidoku ? "w-[46%] sm:w-[40%]" : "w-[34%]"} py-2 text-left`}>Licznik/Podlicznik</th>
                      <th className={`${miesiacWidoku ? "hidden w-28 sm:table-cell" : "w-44"} py-2 text-left`}>Rodzaj</th>
                      <th className={`${miesiacWidoku ? "hidden w-28 sm:table-cell" : "w-40"} py-2 text-left`}>Nr. licznika</th>
                      {MIESIACE.filter(([kod]) => !miesiacWidoku || kod === miesiacWidoku).map(([, nazwa, skrot]) => (
                        <th key={nazwa} className={`${miesiacWidoku ? "w-28" : "w-16"} py-2 text-center text-xs font-semibold uppercase tracking-tight`} title={nazwa}>
                          {miesiacWidoku ? nazwa : skrot}
                        </th>
                      ))}
                      <th className={`${miesiacWidoku ? "w-24 sm:w-36" : "w-40"} py-2`}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupa.wiersze.map((w) => (
                      <OdczytRow
                        key={w.id}
                        w={w}
                        miesiacWidoku={miesiacWidoku}
                        czyEdycjaCalkowita={czyAdminGlowny && grupaEdycjiCalkowitej === grupa.key}
                        isEditing={edytowanyMiesiacId === w.id}
                        editedValue={edytowanyMiesiacId === w.id ? wartoscEdytowanegoMiesiaca : ""}
                        aktywnaKomorka={edytowanaKomorka}
                        wartoscAktywnejKomorki={wartoscEdytowanejKomorki}
                        zapisywanaKomorka={zapisywanaKomorka}
                        onEditedValueChange={aktualizujWartoscEdytowanegoMiesiaca}
                        onStartCellEdit={(rekord, pole) => rozpocznijEdycjeKomorki(rekord, pole, grupa.key)}
                        onCellValueChange={aktualizujWartoscEdytowanejKomorki}
                        onEdit={edytuj}
                        onDelete={usun}
                        onCellSave={zapiszKomorke}
                        onCellCancel={anulujEdycjeKomorki}
                        onSave={zapiszMiesiac}
                        onCancel={anulujEdycjeMiesiaca}
                      />
                    ))}
                  </tbody>
                </table>
                {miesiacWidoku ? (
                  <p className="mt-3 rounded-xl border border-emerald-300/10 bg-emerald-500/[0.055] px-3 py-2 text-xs text-emerald-100/85">
                    Widok miesiąca: {MIESIACE.find(([kod]) => kod === miesiacWidoku)?.[1] || ""}
                  </p>
                ) : null}
                </div>
              </div>
              </div>
            </Fragment>
          );
        })}
      </section>

    </div>
  );
}
