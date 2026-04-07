"use client";

import { useEffect, useMemo, useState } from "react";
import SekcjaNaglowek from "../../../components/SekcjaNaglowek";
import { zapytanieApi } from "../../../lib/api";
import { pobierzSesje } from "../../../lib/auth";

const EMAIL_SERWISU = "serwis@eltreko.pl";
const KONTRAHENT_SERWISU = "Port Praski";

const pustyFormularz = {
  data: new Date().toISOString().slice(0, 10),
  kontrahent_nazwa: "",
  budynek_nazwa: "",
  zlecajacy: "",
  przyjmujacy_zlecenie: "",
  obiekt: "",
  adres_obiektu: "",
  telefon: "",
  kategoria_usterki_nazwa: "",
  czynnosci_serwisowe: [],
  uzyte_czesci: [],
  lokalizacja_usterki: "",
  opis_usterki: "",
  planowana_data_naprawy: "",
  uwagi_do_uslugi: "",
  technik_id: ""
};

function bezpiecznaNazwaPliku(nazwa) {
  return String(nazwa || "protokol")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function formatujDate(data) {
  if (!data) return "-";
  const parsed = new Date(data);
  if (Number.isNaN(parsed.getTime())) return String(data);
  return parsed.toLocaleDateString("pl-PL");
}

function wartoscPola(wartosc) {
  return wartosc ? String(wartosc) : "-";
}

function wartoscTekstowa(wartosc) {
  return String(wartosc || "").trim();
}

function normalizujTekst(wartosc) {
  return String(wartosc || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function nazwaKontrahentaZImportu(importNazwa) {
  const nazwa = wartoscTekstowa(importNazwa);
  if (!nazwa) return "";
  return nazwa.replace(/\s+\d{4}\b/g, "").trim() || nazwa;
}

function EtykietaPola({ children }) {
  return <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{children}</p>;
}

function parsujListeJson(wartosc) {
  if (Array.isArray(wartosc)) return wartosc;
  try {
    return JSON.parse(wartosc || "[]");
  } catch {
    return [];
  }
}

function PoleDropdown({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  emptyLabel = "Brak wyników",
  resetAfterSelect = false
}) {
  const [otwarte, setOtwarte] = useState(false);
  const [wartoscPola, setWartoscPola] = useState(value || "");

  useEffect(() => {
    setWartoscPola(value || "");
  }, [value]);

  const przefiltrowaneOpcje = useMemo(() => {
    const lista = Array.isArray(options) ? options : [];
    const wpisana = normalizujTekst(wartoscPola);
    const czyDokladneDopasowanie = lista.some((opcja) => normalizujTekst(opcja) === wpisana);

    if (!wpisana || czyDokladneDopasowanie) {
      return lista;
    }

    return lista.filter((opcja) => normalizujTekst(opcja).includes(wpisana));
  }, [options, wartoscPola]);

  return (
    <div className="relative">
      <input
        className="pole pr-10"
        value={wartoscPola}
        onChange={(e) => {
          const nowaWartosc = e.target.value;
          setWartoscPola(nowaWartosc);
          onChange(nowaWartosc);
        }}
        onFocus={() => {
          if (!disabled) setOtwarte(true);
        }}
        onBlur={() => window.setTimeout(() => setOtwarte(false), 150)}
        placeholder={placeholder}
        disabled={disabled}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">▾</span>
      {otwarte ? (
        <div className="anim-dropdown absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-emerald-500/20 bg-slate-900/95 p-1 shadow-2xl divide-y divide-emerald-500/25">
          {przefiltrowaneOpcje.length ? (
            przefiltrowaneOpcje.map((opcja) => (
              <button
                key={opcja}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-emerald-500/10"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setWartoscPola(resetAfterSelect ? "" : opcja);
                  onChange(opcja);
                  setOtwarte(false);
                }}
              >
                {opcja}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-slate-400">{emptyLabel}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function Protokoly() {
  const sesja = useMemo(() => pobierzSesje(), []);
  const czyKontoSerwis = normalizujTekst(sesja?.uzytkownik?.email) === EMAIL_SERWISU;
  const [lista, setLista] = useState([]);
  const [technicy, setTechnicy] = useState([]);
  const [odczyty, setOdczyty] = useState([]);
  const [metaKontrahentow, setMetaKontrahentow] = useState({});
  const [kategorieUsterek, setKategorieUsterek] = useState([]);
  const [czynnosciSerwisowe, setCzynnosciSerwisowe] = useState([]);
  const [definicjeCzesci, setDefinicjeCzesci] = useState([]);
  const [formularz, setFormularz] = useState(pustyFormularz);
  const [edytowanyId, setEdytowanyId] = useState(null);
  const [filtry, setFiltry] = useState({ q: "", data: "", technik_id: "" });
  const [filtryDebounced, setFiltryDebounced] = useState({ q: "", data: "", technik_id: "" });
  const [rozwinieteProtokoly, setRozwinieteProtokoly] = useState({});
  const [blad, setBlad] = useState("");
  const [informacja, setInformacja] = useState("");
  const [zapisywanie, setZapisywanie] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filtryDebounced).forEach(([klucz, wartosc]) => {
      if (wartosc) params.set(klucz, wartosc);
    });
    return params.toString() ? `?${params.toString()}` : "";
  }, [filtryDebounced]);

  const mapaKontrahentow = useMemo(() => {
    const mapa = new Map();

    for (const wiersz of odczyty) {
      const kontrahentNazwa = nazwaKontrahentaZImportu(wiersz.import_nazwa);
      const klucz = normalizujTekst(kontrahentNazwa);
      const budynekNazwa = wartoscTekstowa(wiersz.budynek_nazwa || wiersz.kontrahent_nazwa);
      if (!klucz || !kontrahentNazwa) continue;
      if (czyKontoSerwis && klucz !== normalizujTekst(KONTRAHENT_SERWISU)) continue;

      if (!mapa.has(klucz)) {
        const meta = metaKontrahentow[klucz];
        mapa.set(klucz, {
          klucz,
          nazwa: kontrahentNazwa,
          zlecajacy: meta?.zlecajacy || kontrahentNazwa,
          adresProtokolu: meta?.adres_protokolu || "",
          budynki: new Set()
        });
      }

      if (budynekNazwa) {
        mapa.get(klucz).budynki.add(budynekNazwa);
      }
    }

    if (czyKontoSerwis && !mapa.has(normalizujTekst(KONTRAHENT_SERWISU))) {
      mapa.set(normalizujTekst(KONTRAHENT_SERWISU), {
        klucz: normalizujTekst(KONTRAHENT_SERWISU),
        nazwa: KONTRAHENT_SERWISU,
        zlecajacy: KONTRAHENT_SERWISU,
        adresProtokolu: "",
        budynki: new Set()
      });
    }

    return Array.from(mapa.values())
      .map((item) => ({
        ...item,
        budynkiLista: Array.from(item.budynki).sort((a, b) => a.localeCompare(b, "pl"))
      }))
      .sort((a, b) => a.nazwa.localeCompare(b.nazwa, "pl"));
  }, [czyKontoSerwis, metaKontrahentow, odczyty]);

  const wybranyKontrahent = useMemo(
    () => mapaKontrahentow.find((item) => item.nazwa === formularz.kontrahent_nazwa) || null,
    [formularz.kontrahent_nazwa, mapaKontrahentow]
  );
  const listaTechnikow = useMemo(
    () => technicy.map((technik) => technik.imie_nazwisko).filter(Boolean).sort((a, b) => a.localeCompare(b, "pl")),
    [technicy]
  );
  const listaKategorii = useMemo(
    () => kategorieUsterek.map((kategoria) => kategoria.nazwa).filter(Boolean).sort((a, b) => a.localeCompare(b, "pl")),
    [kategorieUsterek]
  );

  async function odswiezListeProtokolow() {
    const protokoly = await zapytanieApi(`/protokoly${query}`);
    setLista(Array.isArray(protokoly) ? protokoly : []);
  }

  async function odswiezDanePomocnicze() {
    const [technicyApi, odczytyApi, metaApi, kategorieApi, czynnosciApi, czesciApi] = await Promise.all([
      zapytanieApi("/technicy"),
      zapytanieApi("/odczyty-licznikow"),
      zapytanieApi("/kontrahenci/meta"),
      zapytanieApi("/kategorie-usterek"),
      zapytanieApi("/czynnosci-serwisowe"),
      zapytanieApi("/definicje-czesci")
    ]);

    setTechnicy(Array.isArray(technicyApi) ? technicyApi : []);
    setOdczyty(Array.isArray(odczytyApi) ? odczytyApi : []);
    setKategorieUsterek(Array.isArray(kategorieApi) ? kategorieApi : []);
    setCzynnosciSerwisowe(Array.isArray(czynnosciApi) ? czynnosciApi : []);
    setDefinicjeCzesci(Array.isArray(czesciApi) ? czesciApi : []);

    const mapa = {};
    for (const rekord of Array.isArray(metaApi) ? metaApi : []) {
      mapa[normalizujTekst(rekord.kontrahent_nazwa)] = rekord;
    }
    setMetaKontrahentow(mapa);
  }

  useEffect(() => {
    Promise.all([odswiezDanePomocnicze(), odswiezListeProtokolow()]).catch((error) => setBlad(error.message));
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFiltryDebounced(filtry);
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [filtry]);

  useEffect(() => {
    odswiezListeProtokolow().catch((error) => setBlad(error.message));
  }, [query]);

  useEffect(() => {
    if (!formularz.technik_id) return;
    const technik = technicy.find((item) => String(item.id) === String(formularz.technik_id));
    if (!technik) return;
    setFormularz((prev) => ({
      ...prev,
      przyjmujacy_zlecenie: prev.przyjmujacy_zlecenie || technik.imie_nazwisko || ""
    }));
  }, [formularz.technik_id, technicy]);

  useEffect(() => {
    if (!czyKontoSerwis) return;
    if (normalizujTekst(formularz.kontrahent_nazwa) === normalizujTekst(KONTRAHENT_SERWISU)) return;

    setFormularz((prev) => ({
      ...prev,
      kontrahent_nazwa: KONTRAHENT_SERWISU,
      budynek_nazwa: "",
      zlecajacy: KONTRAHENT_SERWISU,
      adres_obiektu: "",
      obiekt: ""
    }));
  }, [czyKontoSerwis, formularz.kontrahent_nazwa]);

  useEffect(() => {
    if (!wybranyKontrahent) return;
    setFormularz((prev) => ({
      ...prev,
      zlecajacy: prev.zlecajacy || wybranyKontrahent.zlecajacy || prev.kontrahent_nazwa,
      adres_obiektu: prev.adres_obiektu || wybranyKontrahent.adresProtokolu || ""
    }));
  }, [wybranyKontrahent]);

  useEffect(() => {
    if (!formularz.budynek_nazwa) return;
    setFormularz((prev) => ({
      ...prev,
      obiekt: prev.budynek_nazwa
    }));
  }, [formularz.budynek_nazwa]);

  async function zapiszProtokol(e) {
    e.preventDefault();
    setBlad("");
    setInformacja("");
    setZapisywanie(true);

    try {
      const endpoint = edytowanyId ? `/protokoly/${edytowanyId}` : "/protokoly";
      const method = edytowanyId ? "PUT" : "POST";
      const payload = {
        ...formularz,
        numer_protokolu: edytowanyId ? formularz.numer_protokolu || undefined : undefined,
        klient: czyKontoSerwis ? KONTRAHENT_SERWISU : formularz.kontrahent_nazwa,
        adres: formularz.adres_obiektu,
        opis_pracy: formularz.opis_usterki,
        usterki: formularz.lokalizacja_usterki,
        kategoria_usterki_nazwa: formularz.kategoria_usterki_nazwa,
        czynnosci_serwisowe: formularz.czynnosci_serwisowe,
        uzyte_czesci: formularz.uzyte_czesci
      };

      const wynik = await zapytanieApi(endpoint, { method, body: JSON.stringify(payload) });

      setFormularz(pustyFormularz);
      setEdytowanyId(null);
      setInformacja(
        edytowanyId
          ? `Zapisano zmiany w protokole ${wynik.numer_protokolu || formularz.numer_protokolu}.`
          : `Protokół ${wynik.numer_protokolu} został zapisany.`
      );
      await odswiezListeProtokolow();
    } catch (error) {
      setBlad(error.message);
    } finally {
      setZapisywanie(false);
    }
  }

  function rozpocznijEdycje(wiersz) {
    const kontrahentNazwa = wiersz.klient || "";
    const budynekNazwa = wiersz.obiekt || "";

    setEdytowanyId(wiersz.id);
    setFormularz({
      numer_protokolu: wiersz.numer_protokolu || "",
      data: wiersz.data?.slice(0, 10) || "",
      kontrahent_nazwa: kontrahentNazwa,
      budynek_nazwa: budynekNazwa,
      zlecajacy: wiersz.zlecajacy || kontrahentNazwa || "",
      przyjmujacy_zlecenie: wiersz.przyjmujacy_zlecenie || wiersz.technik_nazwa || "",
      obiekt: budynekNazwa,
      adres_obiektu: wiersz.adres_obiektu || wiersz.adres || "",
      telefon: wiersz.telefon || "",
      kategoria_usterki_nazwa: wiersz.kategoria_usterki_nazwa || "",
      czynnosci_serwisowe: parsujListeJson(wiersz.czynnosci_serwisowe || wiersz.czynnosci_serwisowe_json),
      uzyte_czesci: parsujListeJson(wiersz.uzyte_czesci || wiersz.uzyte_czesci_json),
      lokalizacja_usterki: wiersz.lokalizacja_usterki || wiersz.usterki || "",
      opis_usterki: wiersz.opis_usterki || wiersz.opis_pracy || "",
      planowana_data_naprawy: wiersz.planowana_data_naprawy?.slice(0, 10) || "",
      uwagi_do_uslugi: wiersz.uwagi_do_uslugi || "",
      technik_id: wiersz.technik_id || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function usun(id) {
    if (!window.confirm("Czy na pewno usunąć protokół?")) return;
    await zapytanieApi(`/protokoly/${id}`, { method: "DELETE" });
    await odswiezListeProtokolow();
  }

  async function eksportuj(wiersz) {
    const blob = await zapytanieApi(`/protokoly/${wiersz.id}/eksport?typ=pdf`, { zwrocBinarnie: true });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const nazwa = bezpiecznaNazwaPliku(wiersz.numer_protokolu);
    a.download = `${nazwa}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function przelaczCzynnosc(nazwa) {
    setFormularz((prev) => ({
      ...prev,
      czynnosci_serwisowe: prev.czynnosci_serwisowe.includes(nazwa)
        ? prev.czynnosci_serwisowe.filter((item) => item !== nazwa)
        : [...prev.czynnosci_serwisowe, nazwa]
    }));
  }

  function przelaczRozwiniecie(id) {
    setRozwinieteProtokoly((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  }

  function dodajCzesc(definicja) {
    setFormularz((prev) => ({
      ...prev,
      uzyte_czesci: [...prev.uzyte_czesci, { nazwa: definicja.nazwa, ilosc: "1", jednostka: definicja.jednostka || "szt" }]
    }));
  }

  function ustawCzesc(index, pole, wartosc) {
    setFormularz((prev) => ({
      ...prev,
      uzyte_czesci: prev.uzyte_czesci.map((item, itemIndex) => (itemIndex === index ? { ...item, [pole]: wartosc } : item))
    }));
  }

  function usunCzesc(index) {
    setFormularz((prev) => ({
      ...prev,
      uzyte_czesci: prev.uzyte_czesci.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  return (
    <div className="space-y-6">
      <SekcjaNaglowek tytul="Protokoły" opis="Formularze przyjęcia zleceń i generowanie gotowych protokołów PDF." />

      <form onSubmit={zapiszProtokol} className="karta-szklana rounded-3xl p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/8 pb-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-100">
              {edytowanyId ? "Edycja protokołu przyjęcia zlecenia" : "Nowy protokół przyjęcia zlecenia"}
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Wybierz kontrahenta i budynek, a dane do protokołu uzupełnią się automatycznie.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300">Format dokumentu</p>
            <p className="mt-1 text-sm font-medium text-slate-100">Eksport PDF</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div>
            <EtykietaPola>Kontrahent</EtykietaPola>
            <div className="mt-1.5">
              <PoleDropdown
                value={formularz.kontrahent_nazwa}
                onChange={(wartosc) =>
                  setFormularz((prev) => ({
                    ...prev,
                    kontrahent_nazwa: wartosc,
                    budynek_nazwa: "",
                    zlecajacy: "",
                    adres_obiektu: "",
                    obiekt: ""
                  }))
                }
                options={mapaKontrahentow.map((kontrahent) => kontrahent.nazwa)}
                placeholder="Wpisz albo wybierz kontrahenta"
              />
            </div>
          </div>

          <div>
            <EtykietaPola>Budynek</EtykietaPola>
            <div className="mt-1.5">
              <PoleDropdown
                value={formularz.budynek_nazwa}
                onChange={(wartosc) => setFormularz((prev) => ({ ...prev, budynek_nazwa: wartosc, obiekt: wartosc }))}
                options={wybranyKontrahent?.budynkiLista || []}
                placeholder={wybranyKontrahent ? "Wpisz albo wybierz budynek" : "Najpierw wybierz kontrahenta"}
                disabled={!wybranyKontrahent}
              />
            </div>
          </div>

          <div>
            <EtykietaPola>Data przyjęcia zlecenia</EtykietaPola>
            <input
              className="pole mt-1.5"
              type="date"
              value={formularz.data}
              onChange={(e) => setFormularz({ ...formularz, data: e.target.value })}
              required
            />
          </div>

          <div>
            <EtykietaPola>Przyjmujący zlecenie</EtykietaPola>
            <div className="mt-1.5">
              <PoleDropdown
                value={formularz.przyjmujacy_zlecenie}
                onChange={(wartosc) => {
                  const technik = technicy.find((item) => item.imie_nazwisko === wartosc);
                  setFormularz((prev) => ({
                    ...prev,
                    technik_id: technik?.id ? String(technik.id) : "",
                    przyjmujacy_zlecenie: wartosc
                  }));
                }}
                options={listaTechnikow}
                placeholder="Wpisz albo wybierz technika"
              />
            </div>
          </div>

          <input
            className="pole"
            placeholder="Zlecający"
            value={formularz.zlecajacy}
            onChange={(e) => setFormularz({ ...formularz, zlecajacy: e.target.value })}
            required
          />

          <input
            className="pole"
            placeholder="Obiekt"
            value={formularz.obiekt}
            onChange={(e) => setFormularz({ ...formularz, obiekt: e.target.value })}
            required
          />

          <input
            className="pole"
            placeholder="Telefon"
            value={formularz.telefon}
            onChange={(e) => setFormularz({ ...formularz, telefon: e.target.value })}
          />

          <div className="md:col-span-2">
            <EtykietaPola>Kategoria usterki</EtykietaPola>
            <div className="mt-1.5">
              <PoleDropdown
                value={formularz.kategoria_usterki_nazwa}
                onChange={(wartosc) => setFormularz({ ...formularz, kategoria_usterki_nazwa: wartosc })}
                options={listaKategorii}
                placeholder="Wpisz albo wybierz kategorię usterki"
              />
            </div>
          </div>

          <input
            className="pole md:col-span-2"
            placeholder="Adres obiektu"
            value={formularz.adres_obiektu}
            onChange={(e) => setFormularz({ ...formularz, adres_obiektu: e.target.value })}
            required
          />

          <input
            className="pole md:col-span-2"
            placeholder="Lokalizacja usterki"
            value={formularz.lokalizacja_usterki}
            onChange={(e) => setFormularz({ ...formularz, lokalizacja_usterki: e.target.value })}
          />

          <div className="md:col-span-2 space-y-3 rounded-2xl border border-white/[0.045] bg-white/[0.016] shadow-[inset_0_1px_0_rgba(255,255,255,0.012)] p-4">
            <div>
              <p className="text-sm font-medium text-slate-200">Czynności serwisowe</p>
              <p className="mt-1 text-xs text-slate-500">Zaznacz wykonane lub planowane czynności do tego protokołu.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {czynnosciSerwisowe.map((czynnosc) => {
                const aktywna = formularz.czynnosci_serwisowe.includes(czynnosc.nazwa);
                return (
                  <button
                    key={czynnosc.id}
                    type="button"
                    className={`rounded-full border px-3 py-2 text-sm transition ${
                      aktywna
                        ? "border-emerald-400/22 bg-emerald-500/[0.085] text-emerald-200"
                        : "border-white/[0.055] bg-white/[0.02] text-slate-300 hover:bg-white/[0.04]"
                    }`}
                    onClick={() => przelaczCzynnosc(czynnosc.nazwa)}
                  >
                    {czynnosc.nazwa}
                  </button>
                );
              })}
            </div>
          </div>

          <textarea
            className="pole md:col-span-2 min-h-[160px]"
            placeholder="Opis usterki"
            value={formularz.opis_usterki}
            onChange={(e) => setFormularz({ ...formularz, opis_usterki: e.target.value })}
          />

          <div className="md:col-span-2 space-y-3 rounded-2xl border border-white/[0.045] bg-white/[0.016] shadow-[inset_0_1px_0_rgba(255,255,255,0.012)] p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
              <div>
                <p className="text-sm font-medium text-slate-200">Użyte części</p>
                <p className="mt-1 text-xs text-slate-500">Dodaj części z definicji i podaj ilość używaną w usłudze.</p>
              </div>
              <PoleDropdown
                value=""
                onChange={(wartosc) => {
                  const definicja = definicjeCzesci.find((item) => item.nazwa === wartosc);
                  if (definicja) dodajCzesc(definicja);
                }}
                options={definicjeCzesci.map((czesc) => czesc.nazwa)}
                placeholder="Dodaj część z listy"
                resetAfterSelect
              />
            </div>

            {formularz.uzyte_czesci.length ? (
              <div className="space-y-2">
                {formularz.uzyte_czesci.map((czesc, index) => (
                  <div key={`${czesc.nazwa}-${index}`} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_110px_110px_100px]">
                    <input
                      className="pole h-10"
                      value={czesc.nazwa || ""}
                      onChange={(e) => ustawCzesc(index, "nazwa", e.target.value)}
                      placeholder="Nazwa części"
                    />
                    <input
                      className="pole h-10"
                      value={czesc.ilosc || ""}
                      onChange={(e) => ustawCzesc(index, "ilosc", e.target.value)}
                      placeholder="Ilość"
                    />
                    <input
                      className="pole h-10"
                      value={czesc.jednostka || ""}
                      onChange={(e) => ustawCzesc(index, "jednostka", e.target.value)}
                      placeholder="Jednostka"
                    />
                    <button type="button" className="przycisk-wtorny h-10 px-3 py-2 text-sm" onClick={() => usunCzesc(index)}>
                      Usuń
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Brak dodanych części.</p>
            )}
          </div>

          <textarea
            className="pole md:col-span-2 min-h-[120px]"
            placeholder="Uwagi do usługi"
            value={formularz.uwagi_do_uslugi}
            onChange={(e) => setFormularz({ ...formularz, uwagi_do_uslugi: e.target.value })}
          />

          <div className="md:col-span-2 md:max-w-xs">
            <EtykietaPola>Planowana data wykonania usługi</EtykietaPola>
            <input
              className="pole mt-1.5"
              type="date"
              value={formularz.planowana_data_naprawy}
              onChange={(e) => setFormularz({ ...formularz, planowana_data_naprawy: e.target.value })}
            />
          </div>

        </div>

        {blad ? <p className="mt-5 text-sm text-red-300">{blad}</p> : null}
        {informacja ? <p className="mt-5 text-sm text-emerald-300">{informacja}</p> : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button className="przycisk-glowny" type="submit" disabled={zapisywanie}>
            {zapisywanie ? "Zapisywanie..." : edytowanyId ? "Zapisz zmiany" : "Zapisz protokół"}
          </button>
          {edytowanyId ? (
            <button
              type="button"
              className="przycisk-wtorny"
              onClick={() => {
                setEdytowanyId(null);
                setFormularz(pustyFormularz);
                setBlad("");
                setInformacja("");
              }}
            >
              Anuluj edycję
            </button>
          ) : null}
        </div>
      </form>

      <section className="karta-szklana rounded-3xl p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/8 pb-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-100">Lista protokołów</h3>
            <p className="mt-1 text-sm text-slate-400">Szybkie filtrowanie, edycja i eksport wygenerowanych dokumentów.</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-2 text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Wszystkich protokołów</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{lista.length}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div>
            <EtykietaPola>Szukaj</EtykietaPola>
            <input className="pole mt-1.5" placeholder="Szukaj..." value={filtry.q} onChange={(e) => setFiltry({ ...filtry, q: e.target.value })} />
          </div>
          <div>
            <EtykietaPola>Data</EtykietaPola>
            <input className="pole mt-1.5" type="date" value={filtry.data} onChange={(e) => setFiltry({ ...filtry, data: e.target.value })} />
          </div>
          <div>
            <EtykietaPola>Technik</EtykietaPola>
            <div className="mt-1.5">
              <PoleDropdown
                value={technicy.find((technik) => String(technik.id) === String(filtry.technik_id))?.imie_nazwisko || ""}
                onChange={(wartosc) => {
                  const technik = technicy.find((item) => item.imie_nazwisko === wartosc);
                  setFiltry({ ...filtry, technik_id: technik?.id ? String(technik.id) : "" });
                }}
                options={listaTechnikow}
                placeholder="Wpisz albo wybierz technika"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {lista.map((wiersz) => {
            const rozwiniety = !!rozwinieteProtokoly[wiersz.id];

            return (
              <article
                key={wiersz.id}
                className="relative overflow-hidden rounded-3xl bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-4 shadow-[0_14px_32px_rgba(8,15,24,0.16)] ring-1 ring-white/[0.045] md:p-5"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/35 to-transparent" />
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="text-xl font-semibold text-slate-100 drop-shadow-[0_1px_0_rgba(255,255,255,0.03)]">
                        {wartoscPola(wiersz.numer_protokolu)}
                      </h4>
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                        {wartoscPola(wiersz.klient)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      Utworzono: {formatujDate(wiersz.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <button className="przycisk-wtorny" type="button" onClick={() => przelaczRozwiniecie(wiersz.id)}>
                      {rozwiniety ? "Zwiń" : "Rozwiń"}
                    </button>
                    <button className="przycisk-wtorny" type="button" onClick={() => rozpocznijEdycje(wiersz)}>
                      Edytuj
                    </button>
                    <button className="przycisk-wtorny" type="button" onClick={() => usun(wiersz.id)}>
                      Usuń
                    </button>
                    <button className="przycisk-wtorny" type="button" onClick={() => eksportuj(wiersz)}>
                      PDF
                    </button>
                  </div>
                </div>

                {rozwiniety ? (
                  <>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="border-t border-white/10 pt-3">
                        <EtykietaPola>Zlecający</EtykietaPola>
                        <p className="mt-2 text-sm text-slate-200">{wartoscPola(wiersz.zlecajacy || wiersz.klient)}</p>
                      </div>
                      <div className="border-t border-white/10 pt-3">
                        <EtykietaPola>Przyjmujący zlecenie</EtykietaPola>
                        <p className="mt-2 text-sm text-slate-200">{wartoscPola(wiersz.przyjmujacy_zlecenie || wiersz.technik_nazwa)}</p>
                      </div>
                      <div className="border-t border-white/10 pt-3">
                        <EtykietaPola>Budynek / obiekt</EtykietaPola>
                        <p className="mt-2 text-sm text-slate-200">{wartoscPola(wiersz.obiekt)}</p>
                      </div>
                      <div className="border-t border-white/10 pt-3">
                        <EtykietaPola>Data przyjęcia</EtykietaPola>
                        <p className="mt-2 text-sm text-slate-200">{formatujDate(wiersz.data)}</p>
                      </div>
                      <div className="border-t border-white/10 pt-3 md:col-span-2">
                        <EtykietaPola>Adres obiektu</EtykietaPola>
                        <p className="mt-2 text-sm text-slate-200">{wartoscPola(wiersz.adres_obiektu || wiersz.adres)}</p>
                      </div>
                      <div className="border-t border-white/10 pt-3 md:col-span-2">
                        <EtykietaPola>Kategoria usterki</EtykietaPola>
                        <p className="mt-2 text-sm text-slate-200">{wartoscPola(wiersz.kategoria_usterki_nazwa)}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                      <div className="border-t border-white/10 pt-3">
                        <EtykietaPola>Lokalizacja usterki</EtykietaPola>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{wartoscPola(wiersz.lokalizacja_usterki || wiersz.usterki)}</p>
                      </div>
                      <div className="border-t border-white/10 pt-3">
                        <EtykietaPola>Planowana data naprawy</EtykietaPola>
                        <p className="mt-2 text-sm text-slate-300">{formatujDate(wiersz.planowana_data_naprawy)}</p>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-white/10 pt-3">
                      <EtykietaPola>Opis usterki</EtykietaPola>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{wartoscPola(wiersz.opis_usterki || wiersz.opis_pracy)}</p>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="border-t border-white/10 pt-3">
                        <EtykietaPola>Czynności serwisowe</EtykietaPola>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                          {(() => {
                            const listaCzynnosci = parsujListeJson(wiersz.czynnosci_serwisowe || wiersz.czynnosci_serwisowe_json);
                            return listaCzynnosci.length ? listaCzynnosci.join(', ') : '-';
                          })()}
                        </p>
                      </div>
                      <div className="border-t border-white/10 pt-3">
                        <EtykietaPola>Użyte części</EtykietaPola>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                          {(() => {
                            const listaCzesci = parsujListeJson(wiersz.uzyte_czesci || wiersz.uzyte_czesci_json);
                            return listaCzesci.length
                              ? listaCzesci.map((czesc) => `${czesc.nazwa} - ${czesc.ilosc || '1'} ${czesc.jednostka || 'szt'}`).join('\n')
                              : '-';
                          })()}
                        </p>
                      </div>
                    </div>

                    {wiersz.uwagi_do_uslugi ? (
                      <div className="mt-4 border-t border-white/10 pt-3">
                        <EtykietaPola>Uwagi do usługi</EtykietaPola>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{wiersz.uwagi_do_uslugi}</p>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </article>
            );
          })}

          {!lista.length ? <p className="text-sm text-slate-400">Brak protokołów do wyświetlenia.</p> : null}
        </div>
      </section>
    </div>
  );
}
