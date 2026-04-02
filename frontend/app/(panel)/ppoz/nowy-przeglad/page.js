"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SekcjaNaglowek from "../../../../components/SekcjaNaglowek";
import { zapytanieApi } from "../../../../lib/api";

const pusty = {
  nazwa: "",
  data_przegladu: new Date().toISOString().slice(0, 10),
  kontrahent_id: "",
  kontrahent_nazwa: "",
  budynek_nazwa: "",
  status: "Planowany",
  opis: ""
};

function normalizujTekst(wartosc) {
  return String(wartosc || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function nazwaKontrahentaZImportu(importNazwa) {
  const nazwa = String(importNazwa || "").trim();
  if (!nazwa) return "";
  return nazwa.replace(/\s+\d{4}\b/g, "").trim() || nazwa;
}

export default function PpozNowyPrzegladPage() {
  const router = useRouter();
  const [listaOdczytow, setListaOdczytow] = useState([]);
  const [formularz, setFormularz] = useState(pusty);
  const [qKontrahent, setQKontrahent] = useState("");
  const [qBudynek, setQBudynek] = useState("");
  const [pokazListeKontrahentow, setPokazListeKontrahentow] = useState(false);
  const [pokazListeBudynkow, setPokazListeBudynkow] = useState(false);

  useEffect(() => {
    zapytanieApi("/odczyty-licznikow")
      .then((lista) => setListaOdczytow(Array.isArray(lista) ? lista : []))
      .catch(() => null);
  }, []);

  const kontrahenci = useMemo(() => {
    const mapa = new Map();

    for (const wiersz of listaOdczytow) {
      const nazwa = nazwaKontrahentaZImportu(wiersz.import_nazwa);
      const klucz = normalizujTekst(nazwa);
      if (!klucz || mapa.has(klucz)) continue;
      mapa.set(klucz, { id: klucz, nazwa });
    }

    return Array.from(mapa.values()).sort((a, b) => a.nazwa.localeCompare(b.nazwa, "pl"));
  }, [listaOdczytow]);

  const przefiltrowaniKontrahenci = useMemo(() => {
    const fraza = normalizujTekst(qKontrahent);
    if (!fraza) return kontrahenci;

    const czyDokladneDopasowanie = kontrahenci.some((kontrahent) => normalizujTekst(kontrahent.nazwa) === fraza);
    if (czyDokladneDopasowanie) return kontrahenci;

    return kontrahenci.filter((kontrahent) => normalizujTekst(kontrahent.nazwa).includes(fraza));
  }, [kontrahenci, qKontrahent]);

  const budynkiWybranegoKontrahenta = useMemo(() => {
    const wybranyKlucz = normalizujTekst(formularz.kontrahent_nazwa || qKontrahent);
    const mapa = new Map();

    for (const wiersz of listaOdczytow) {
      if (wybranyKlucz && normalizujTekst(nazwaKontrahentaZImportu(wiersz.import_nazwa)) !== wybranyKlucz) {
        continue;
      }

      const nazwa = String(wiersz.kontrahent_nazwa || "").trim();
      const klucz = normalizujTekst(nazwa);
      if (!klucz || mapa.has(klucz)) continue;
      mapa.set(klucz, { id: klucz, nazwa });
    }

    return Array.from(mapa.values()).sort((a, b) => a.nazwa.localeCompare(b.nazwa, "pl"));
  }, [formularz.kontrahent_nazwa, listaOdczytow, qKontrahent]);

  const przefiltrowaneBudynki = useMemo(() => {
    const fraza = normalizujTekst(qBudynek);
    if (!fraza) return budynkiWybranegoKontrahenta;

    const czyDokladneDopasowanie = budynkiWybranegoKontrahenta.some((budynek) => normalizujTekst(budynek.nazwa) === fraza);
    if (czyDokladneDopasowanie) return budynkiWybranegoKontrahenta;

    return budynkiWybranegoKontrahenta.filter((budynek) => normalizujTekst(budynek.nazwa).includes(fraza));
  }, [budynkiWybranegoKontrahenta, qBudynek]);

  async function zapisz(e) {
    e.preventDefault();

    await zapytanieApi("/ppoz", {
      method: "POST",
      body: JSON.stringify({
        ...formularz,
        kontrahent_id: null,
        kontrahent_nazwa: String(formularz.kontrahent_nazwa || qKontrahent).trim(),
        budynek_nazwa: String(formularz.budynek_nazwa || qBudynek).trim()
      })
    });

    router.push("/ppoz/przeglady");
  }

  return (
    <div className="space-y-6">
      <SekcjaNaglowek tytul="PPOŻ - nowy przegląd" opis="Dodanie nowego przeglądu PPOŻ." />

      <form onSubmit={zapisz} className="karta-szklana rounded-2xl p-4 grid gap-3 md:grid-cols-2">
        <input
          className="pole md:col-span-2"
          placeholder="Nazwa przeglądu"
          value={formularz.nazwa}
          onChange={(e) => setFormularz({ ...formularz, nazwa: e.target.value })}
          required
        />

        <div className="relative">
          <input
            className="pole"
            placeholder="Wybierz kontrahenta"
            value={qKontrahent}
            onChange={(e) => {
              const wartosc = e.target.value;
              setQKontrahent(wartosc);
              setQBudynek("");
              setFormularz((prev) => ({
                ...prev,
                kontrahent_id: "",
                kontrahent_nazwa: wartosc,
                budynek_nazwa: ""
              }));
              setPokazListeKontrahentow(true);
            }}
            onFocus={() => setPokazListeKontrahentow(true)}
            onBlur={() => window.setTimeout(() => setPokazListeKontrahentow(false), 150)}
          />

          {pokazListeKontrahentow && przefiltrowaniKontrahenci.length ? (
            <div className="anim-dropdown absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-emerald-500/20 bg-slate-900/95 p-1 shadow-2xl divide-y divide-emerald-500/25">
              {przefiltrowaniKontrahenci.map((kontrahent) => (
                <button
                  key={kontrahent.id}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-emerald-500/10"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setQKontrahent(kontrahent.nazwa);
                    setQBudynek("");
                    setFormularz((prev) => ({
                      ...prev,
                      kontrahent_id: "",
                      kontrahent_nazwa: kontrahent.nazwa,
                      budynek_nazwa: ""
                    }));
                    setPokazListeKontrahentow(false);
                  }}
                >
                  {kontrahent.nazwa}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative">
          <input
            className="pole"
            placeholder="Wybierz budynek"
            value={qBudynek}
            onChange={(e) => {
              const wartosc = e.target.value;
              setQBudynek(wartosc);
              setFormularz((prev) => ({
                ...prev,
                budynek_nazwa: wartosc
              }));
              setPokazListeBudynkow(true);
            }}
            onFocus={() => setPokazListeBudynkow(true)}
            onBlur={() => window.setTimeout(() => setPokazListeBudynkow(false), 150)}
            disabled={!budynkiWybranegoKontrahenta.length}
          />

          {pokazListeBudynkow && przefiltrowaneBudynki.length ? (
            <div className="anim-dropdown absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-emerald-500/20 bg-slate-900/95 p-1 shadow-2xl divide-y divide-emerald-500/25">
              {przefiltrowaneBudynki.map((budynek) => (
                <button
                  key={budynek.id}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-emerald-500/10"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setQBudynek(budynek.nazwa);
                    setFormularz((prev) => ({
                      ...prev,
                      budynek_nazwa: budynek.nazwa
                    }));
                    setPokazListeBudynkow(false);
                  }}
                >
                  {budynek.nazwa}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <input
          className="pole"
          type="date"
          value={formularz.data_przegladu}
          onChange={(e) => setFormularz({ ...formularz, data_przegladu: e.target.value })}
        />

        <select className="pole" value={formularz.status} onChange={(e) => setFormularz({ ...formularz, status: e.target.value })}>
          <option>Planowany</option>
          <option>W realizacji</option>
          <option>Zakończony</option>
        </select>

        <textarea
          className="pole md:col-span-2"
          rows={5}
          placeholder="Opis"
          value={formularz.opis}
          onChange={(e) => setFormularz({ ...formularz, opis: e.target.value })}
        />

        <button className="przycisk-glowny md:col-span-2 w-fit">Zapisz przegląd PPOŻ</button>
      </form>
    </div>
  );
}
