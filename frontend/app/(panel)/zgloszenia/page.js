"use client";

import { useEffect, useMemo, useState } from "react";
import SekcjaNaglowek from "../../../components/SekcjaNaglowek";
import { zapytanieApi } from "../../../lib/api";

const pusty = {
  tytul: "",
  opis: "",
  kontrahent_id: "",
  kategoria_usterki_id: "",
  status: "Nowe",
  priorytet: "Normalny"
};

export default function ZgloszeniaPage() {
  const [lista, setLista] = useState([]);
  const [kontrahenci, setKontrahenci] = useState([]);
  const [kategorie, setKategorie] = useState([]);
  const [formularz, setFormularz] = useState(pusty);
  const [edytowany, setEdytowany] = useState(null);
  const [q, setQ] = useState("");
  const [qKontrahent, setQKontrahent] = useState("");
  const [blad, setBlad] = useState("");

  async function pobierzKontrahentow() {
    const listaKlientow = await zapytanieApi("/klienci");
    return Array.isArray(listaKlientow) ? listaKlientow : [];
  }

  async function odswiez() {
    setBlad("");
    const [z, k, kat] = await Promise.allSettled([
      zapytanieApi(`/zgloszenia?q=${encodeURIComponent(q)}`),
      pobierzKontrahentow(),
      zapytanieApi("/kategorie-usterek")
    ]);

    if (z.status === "fulfilled") {
      setLista(Array.isArray(z.value) ? z.value : []);
    } else {
      setLista([]);
    }

    if (k.status === "fulfilled") {
      const listaKontrahentow = Array.isArray(k.value) ? k.value : [];
      setKontrahenci(listaKontrahentow.filter((x) => x && x.id && x.nazwa));
    } else {
      setKontrahenci([]);
      setBlad("Nie udało się pobrać kontrahentów z tabeli klienci.");
    }

    if (kat.status === "fulfilled") {
      setKategorie(Array.isArray(kat.value) ? kat.value : []);
    } else {
      setKategorie([]);
    }
  }

  useEffect(() => {
    odswiez().catch((e) => setBlad(e.message));
  }, [q]);

  const przefiltrowaniKontrahenci = useMemo(() => {
    const fraza = qKontrahent.trim().toLowerCase();
    if (!fraza) return kontrahenci;
    return kontrahenci.filter((k) => String(k.nazwa || "").toLowerCase().includes(fraza));
  }, [kontrahenci, qKontrahent]);

  async function zapisz(e) {
    e.preventDefault();
    if (edytowany) {
      await zapytanieApi(`/zgloszenia/${edytowany}`, { method: "PUT", body: JSON.stringify(formularz) });
    } else {
      await zapytanieApi("/zgloszenia", { method: "POST", body: JSON.stringify(formularz) });
    }
    setFormularz(pusty);
    setEdytowany(null);
    setQKontrahent("");
    await odswiez();
  }

  function edytuj(w) {
    setEdytowany(w.id);
    setFormularz({
      tytul: w.tytul || "",
      opis: w.opis || "",
      kontrahent_id: w.kontrahent_id || "",
      kategoria_usterki_id: w.kategoria_usterki_id || "",
      status: w.status || "Nowe",
      priorytet: w.priorytet || "Normalny"
    });
    setQKontrahent("");
  }

  async function usun(id) {
    if (!window.confirm("Usunąć zgłoszenie?")) return;
    await zapytanieApi(`/zgloszenia/${id}`, { method: "DELETE" });
    await odswiez();
  }

  return (
    <div className="space-y-6">
      <SekcjaNaglowek tytul="Protokoły" opis="Rejestr i obsługa zgłoszeń serwisowych." />

      <form onSubmit={zapisz} className="karta-szklana rounded-2xl p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input className="pole md:col-span-2" placeholder="Tytuł zgłoszenia" value={formularz.tytul} onChange={(e) => setFormularz({ ...formularz, tytul: e.target.value })} required />

          <div className="space-y-2">
            <input className="pole" placeholder="Szukaj kontrahenta na liście" value={qKontrahent} onChange={(e) => setQKontrahent(e.target.value)} />
            <p className="text-xs text-slate-400">Dostępnych kontrahentów: {przefiltrowaniKontrahenci.length}</p>
            <select className="pole" value={formularz.kontrahent_id} onChange={(e) => setFormularz({ ...formularz, kontrahent_id: e.target.value })}>
              <option value="">Wybierz kontrahenta</option>
              {przefiltrowaniKontrahenci.map((k) => (
                <option key={k.id} value={k.id}>{k.nazwa}</option>
              ))}
            </select>
          </div>

          <select className="pole" value={formularz.kategoria_usterki_id} onChange={(e) => setFormularz({ ...formularz, kategoria_usterki_id: e.target.value })}>
            <option value="">Wybierz kategorię usterki</option>
            {kategorie.map((k) => (
              <option key={k.id} value={k.id}>{k.nazwa}</option>
            ))}
          </select>

          <select className="pole" value={formularz.status} onChange={(e) => setFormularz({ ...formularz, status: e.target.value })}>
            <option>Nowe</option>
            <option>W toku</option>
            <option>Zamknięte</option>
          </select>

          <select className="pole" value={formularz.priorytet} onChange={(e) => setFormularz({ ...formularz, priorytet: e.target.value })}>
            <option>Niski</option>
            <option>Normalny</option>
            <option>Wysoki</option>
          </select>

          <textarea className="pole md:col-span-2" rows={4} placeholder="Opis zgłoszenia" value={formularz.opis} onChange={(e) => setFormularz({ ...formularz, opis: e.target.value })} />
        </div>

        <div className="mt-3 flex gap-2">
          <button className="przycisk-glowny">{edytowany ? "Zapisz zmiany" : "Dodaj zgłoszenie"}</button>
          {edytowany ? <button type="button" className="przycisk-wtorny" onClick={() => { setEdytowany(null); setFormularz(pusty); setQKontrahent(""); }}>Anuluj</button> : null}
        </div>
        {blad ? <p className="mt-2 text-sm text-red-300">{blad}</p> : null}
      </form>

      <section className="karta-szklana rounded-2xl p-4">
        <input className="pole mb-3" placeholder="Szukaj zgłoszenia" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="space-y-2">
          {lista.map((w) => (
            <article key={w.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="font-medium">{w.tytul}</p>
              <p className="text-sm text-slate-400">{w.kontrahent_nazwa || "Bez kontrahenta"} | {w.kategoria_nazwa || "Bez kategorii"}</p>
              <p className="text-sm text-slate-300">Status: {w.status} | Priorytet: {w.priorytet}</p>
              <p className="mt-1 text-sm text-slate-300">{w.opis || "Brak opisu"}</p>
              <div className="mt-2 flex gap-2">
                <button className="przycisk-wtorny" onClick={() => edytuj(w)}>Edytuj</button>
                <button className="przycisk-wtorny" onClick={() => usun(w.id)}>Usuń</button>
              </div>
            </article>
          ))}
          {!lista.length ? <p className="text-sm text-slate-400">Brak zgłoszeń.</p> : null}
        </div>
      </section>
    </div>
  );
}
