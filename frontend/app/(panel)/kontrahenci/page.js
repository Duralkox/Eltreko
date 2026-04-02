"use client";

import { useEffect, useMemo, useState } from "react";
import SekcjaNaglowek from "../../../components/SekcjaNaglowek";
import { zapytanieApi } from "../../../lib/api";
import { pobierzSesje } from "../../../lib/auth";

const DOMYSLNY_KONTRAHENT = "PORT PRASKI";

function wartoscTekstowa(wartosc) {
  if (wartosc == null) return "";
  return String(wartosc).trim();
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

function podmienNazweKontrahenta(importNazwa, nowaNazwa) {
  const tekst = wartoscTekstowa(importNazwa);
  const nazwa = wartoscTekstowa(nowaNazwa);
  if (!tekst) return nazwa;
  const dopasowanieRoku = tekst.match(/\s+(\d{4})\b$/);
  if (!dopasowanieRoku) return nazwa;
  return `${nazwa} ${dopasowanieRoku[1]}`;
}

export default function KontrahenciPage() {
  const [lista, setLista] = useState([]);
  const [metaMapa, setMetaMapa] = useState({});
  const [q, setQ] = useState("");
  const [blad, setBlad] = useState("");
  const [komunikat, setKomunikat] = useState("");
  const [pokazListeKontrahentow, setPokazListeKontrahentow] = useState(false);
  const [trybEdycji, setTrybEdycji] = useState(false);
  const [edytowaneDane, setEdytowaneDane] = useState({});
  const [zapisywanyKlucz, setZapisywanyKlucz] = useState("");

  const sesja = pobierzSesje();
  const czyAdmin = normalizujTekst(sesja?.uzytkownik?.email) === "dominik@eltreko.pl";

  async function odswiezListe() {
    setBlad("");
    const [odczyty, meta] = await Promise.all([
      zapytanieApi("/odczyty-licznikow"),
      zapytanieApi("/kontrahenci/meta")
    ]);

    setLista(Array.isArray(odczyty) ? odczyty : []);

    const nastepnaMapa = {};
    for (const rekord of Array.isArray(meta) ? meta : []) {
      nastepnaMapa[normalizujTekst(rekord.kontrahent_nazwa)] = rekord;
    }
    setMetaMapa(nastepnaMapa);
  }

  useEffect(() => {
    odswiezListe().catch((error) => {
      setLista([]);
      setMetaMapa({});
      setBlad(error.message);
    });
  }, []);

  const kontrahenciWszyscy = useMemo(() => {
    const mapa = new Map();

    for (const wiersz of lista) {
      const nazwa = nazwaKontrahentaZImportu(wiersz.import_nazwa);
      const klucz = normalizujTekst(nazwa);
      const budynekId = String(wiersz.kontrahent_id || "");
      if (!klucz) continue;

      if (!mapa.has(klucz)) {
        mapa.set(klucz, {
          klucz,
          nazwa,
          budynki: new Set(),
          liczniki: 0
        });
      }

      const rekord = mapa.get(klucz);
      if (budynekId) rekord.budynki.add(budynekId);
      rekord.liczniki += 1;
    }

    const wynik = Array.from(mapa.values()).map((item) => {
      const meta = metaMapa[item.klucz];
      return {
        klucz: item.klucz,
        nazwa: item.nazwa,
        liczbaBudynkow: item.budynki.size,
        liczbaLicznikow: item.liczniki,
        zlecajacy: meta?.zlecajacy || "",
        adresProtokolu: meta?.adres_protokolu || ""
      };
    });

    if (!wynik.some((item) => normalizujTekst(item.nazwa) === normalizujTekst(DOMYSLNY_KONTRAHENT))) {
      const meta = metaMapa[normalizujTekst(DOMYSLNY_KONTRAHENT)];
      wynik.unshift({
        klucz: normalizujTekst(DOMYSLNY_KONTRAHENT),
        nazwa: DOMYSLNY_KONTRAHENT,
        liczbaBudynkow: 0,
        liczbaLicznikow: 0,
        zlecajacy: meta?.zlecajacy || "",
        adresProtokolu: meta?.adres_protokolu || ""
      });
    }

    return wynik.sort((a, b) => a.nazwa.localeCompare(b.nazwa, "pl"));
  }, [lista, metaMapa]);

  const przefiltrowaniKontrahenci = useMemo(() => {
    const fraza = normalizujTekst(q);
    if (!fraza) return kontrahenciWszyscy;
    return kontrahenciWszyscy.filter((item) => normalizujTekst(item.nazwa).includes(fraza));
  }, [kontrahenciWszyscy, q]);

  function wlaczTrybEdycji() {
    const nastepneDane = {};
    for (const kontrahent of kontrahenciWszyscy) {
      nastepneDane[kontrahent.klucz] = {
        nazwa: kontrahent.nazwa,
        zlecajacy: kontrahent.zlecajacy || "",
        adresProtokolu: kontrahent.adresProtokolu || ""
      };
    }
    setEdytowaneDane(nastepneDane);
    setKomunikat("");
    setTrybEdycji(true);
  }

  function ustawPole(klucz, pole, wartosc) {
    setEdytowaneDane((prev) => ({
      ...prev,
      [klucz]: {
        ...(prev[klucz] || {}),
        [pole]: wartosc
      }
    }));
  }

  async function zapiszKontrahenta(kontrahent) {
    const rekord = edytowaneDane[kontrahent.klucz] || {};
    const nowaNazwa = wartoscTekstowa(rekord.nazwa);
    const zlecajacy = wartoscTekstowa(rekord.zlecajacy);
    const adresProtokolu = wartoscTekstowa(rekord.adresProtokolu);

    if (!nowaNazwa || zapisywanyKlucz) return;

    setZapisywanyKlucz(kontrahent.klucz);
    setBlad("");
    setKomunikat("");

    try {
      const rekordyDoZmiany = lista.filter(
        (wiersz) => normalizujTekst(nazwaKontrahentaZImportu(wiersz.import_nazwa)) === kontrahent.klucz
      );

      if (nowaNazwa !== kontrahent.nazwa) {
        await Promise.all(
          rekordyDoZmiany.map((wiersz) =>
            zapytanieApi(`/odczyty-licznikow/${wiersz.id}`, {
              method: "PUT",
              body: JSON.stringify({
                ...wiersz,
                import_nazwa: podmienNazweKontrahenta(wiersz.import_nazwa, nowaNazwa)
              })
            })
          )
        );
      }

      await zapytanieApi("/kontrahenci/meta", {
        method: "PUT",
        body: JSON.stringify({
          stara_nazwa: kontrahent.nazwa,
          kontrahent_nazwa: nowaNazwa,
          zlecajacy,
          adres_protokolu: adresProtokolu
        })
      });

      await odswiezListe();
      setKomunikat("Zapisano dane kontrahenta do protokołów.");
      setEdytowaneDane((prev) => ({
        ...prev,
        [normalizujTekst(nowaNazwa)]: {
          nazwa: nowaNazwa,
          zlecajacy,
          adresProtokolu
        }
      }));
    } catch (error) {
      setBlad(error.message);
    } finally {
      setZapisywanyKlucz("");
    }
  }

  if (!czyAdmin) {
    return (
      <div className="space-y-6">
        <SekcjaNaglowek
          tytul="Kontrahenci"
          opis="Ta sekcja jest dostępna tylko dla głównego administratora."
        />
        <section className="karta-szklana rounded-[26px] p-6">
          <p className="text-sm text-slate-300">Nie masz uprawnień do przeglądania tej zakładki.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SekcjaNaglowek
        tytul="Kontrahenci"
        opis="Lista realnych kontrahentów przypisanych do importów odczytów i danych do protokołów."
        prawaStrona={
          trybEdycji ? (
            <button
              type="button"
              className="przycisk-wtorny"
              onClick={() => {
                setTrybEdycji(false);
                setEdytowaneDane({});
                setKomunikat("");
              }}
            >
              Zakończ edycję
            </button>
          ) : (
            <button type="button" className="przycisk-glowny" onClick={wlaczTrybEdycji}>
              Edytuj
            </button>
          )
        }
      />

      <section className="karta-szklana rounded-[26px] p-5">
        <div className="mb-5 rounded-2xl bg-white/[0.035] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-emerald-200/90">Lista kontrahentów</p>
              <p className="mt-1 text-sm text-slate-400">
                {trybEdycji
                  ? "Ustaw tu nazwę zlecającego i adres, które mają automatycznie wpadać do protokołów."
                  : "Wyszukaj kontrahenta i sprawdź dane używane później w protokołach."}
              </p>
            </div>
            <div className="flex items-center justify-center rounded-full border border-emerald-400/14 bg-emerald-500/[0.07] px-3 py-1 text-center text-xs font-medium text-emerald-200">
              Kontrahentów: {kontrahenciWszyscy.length}
            </div>
          </div>

          <div className="relative">
            <input
              className="pole h-11"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPokazListeKontrahentow(true);
              }}
              onFocus={() => setPokazListeKontrahentow(true)}
              onBlur={() => window.setTimeout(() => setPokazListeKontrahentow(false), 150)}
              placeholder="Szukaj kontrahenta"
            />

            {pokazListeKontrahentow && przefiltrowaniKontrahenci.length ? (
              <div className="anim-dropdown absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-emerald-500/20 bg-slate-900/95 p-1 shadow-2xl divide-y divide-emerald-500/25">
                {przefiltrowaniKontrahenci.map((kontrahent) => (
                  <button
                    key={kontrahent.klucz}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-emerald-500/10"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setQ(kontrahent.nazwa);
                      setPokazListeKontrahentow(false);
                    }}
                  >
                    {kontrahent.nazwa}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {blad ? <p className="mb-3 text-sm text-red-300">{blad}</p> : null}
        {komunikat ? <p className="mb-3 text-sm text-emerald-300">{komunikat}</p> : null}

        <div className="space-y-3">
          {przefiltrowaniKontrahenci.map((kontrahent) => {
            const edycja = edytowaneDane[kontrahent.klucz] || {
              nazwa: kontrahent.nazwa,
              zlecajacy: kontrahent.zlecajacy,
              adresProtokolu: kontrahent.adresProtokolu
            };

            return (
              <article key={kontrahent.klucz} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                {trybEdycji ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                      <div>
                        <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-slate-500">Nazwa kontrahenta</label>
                        <input
                          className="pole h-11"
                          value={edycja.nazwa || ""}
                          onChange={(e) => ustawPole(kontrahent.klucz, "nazwa", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-slate-500">Zlecający do protokołu</label>
                        <input
                          className="pole h-11"
                          value={edycja.zlecajacy || ""}
                          onChange={(e) => ustawPole(kontrahent.klucz, "zlecajacy", e.target.value)}
                          placeholder="Np. Zarząd wspólnoty / administrator"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-slate-500">Adres do protokołu</label>
                      <textarea
                        className="pole min-h-[92px]"
                        value={edycja.adresProtokolu || ""}
                        onChange={(e) => ustawPole(kontrahent.klucz, "adresProtokolu", e.target.value)}
                        placeholder="Adres, który ma podstawiać się w protokołach dla tego kontrahenta."
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm text-slate-400">
                        Budynków: {kontrahent.liczbaBudynkow} | Liczników: {kontrahent.liczbaLicznikow}
                      </div>
                      <button
                        type="button"
                        className="przycisk-glowny px-3 py-2 text-sm"
                        onClick={() => zapiszKontrahenta(kontrahent)}
                        disabled={!wartoscTekstowa(edycja.nazwa) || zapisywanyKlucz === kontrahent.klucz}
                      >
                        {zapisywanyKlucz === kontrahent.klucz ? "Zapisywanie..." : "Zapisz"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div>
                      <p className="text-lg font-semibold text-slate-100">{kontrahent.nazwa}</p>
                      <p className="mt-2 text-sm text-slate-300">Budynków: {kontrahent.liczbaBudynkow}</p>
                      <p className="text-sm text-slate-400">Liczników: {kontrahent.liczbaLicznikow}</p>
                    </div>

                    <div className="space-y-3 border-t border-white/8 pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Zlecający do protokołu</p>
                        <p className="mt-1 text-sm text-slate-200">{kontrahent.zlecajacy || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Adres do protokołu</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{kontrahent.adresProtokolu || "-"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}

          {!przefiltrowaniKontrahenci.length ? <p className="text-sm text-slate-400">Brak kontrahentów.</p> : null}
        </div>
      </section>
    </div>
  );
}
