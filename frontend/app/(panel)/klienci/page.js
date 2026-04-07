"use client";

import { useEffect, useState } from "react";
import SekcjaNaglowek from "../../../components/SekcjaNaglowek";
import { zapytanieApi } from "../../../lib/api";

const pusty = { nazwa: "", adres: "", telefon: "", email: "", notatki: "" };

export default function Klienci() {
  const [lista, setLista] = useState([]);
  const [formularz, setFormularz] = useState(pusty);
  const [edytowany, setEdytowany] = useState(null);
  const [q, setQ] = useState("");

  async function odswiez() {
    const dane = await zapytanieApi(`/klienci?q=${encodeURIComponent(q)}`);
    setLista(dane);
  }

  useEffect(() => {
    odswiez().catch(() => null);
  }, [q]);

  async function zapisz(e) {
    e.preventDefault();
    if (edytowany) {
      await zapytanieApi(`/klienci/${edytowany}`, { method: "PUT", body: JSON.stringify(formularz) });
    } else {
      await zapytanieApi("/klienci", { method: "POST", body: JSON.stringify(formularz) });
    }
    setFormularz(pusty);
    setEdytowany(null);
    await odswiez();
  }

  async function usun(id) {
    await zapytanieApi(`/klienci/${id}`, { method: "DELETE" });
    await odswiez();
  }

  function edytuj(w) {
    setEdytowany(w.id);
    setFormularz(w);
  }

  return (
    <div className="space-y-6">
      <SekcjaNaglowek tytul="Klienci" opis="Baza klientów firmy." />
      <form onSubmit={zapisz} className="karta-szklana rounded-2xl p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input className="pole" placeholder="Nazwa" value={formularz.nazwa} onChange={(e) => setFormularz({ ...formularz, nazwa: e.target.value })} required />
          <input className="pole" placeholder="Adres" value={formularz.adres} onChange={(e) => setFormularz({ ...formularz, adres: e.target.value })} required />
          <input className="pole" placeholder="Telefon" value={formularz.telefon} onChange={(e) => setFormularz({ ...formularz, telefon: e.target.value })} />
          <input className="pole" placeholder="Email" value={formularz.email} onChange={(e) => setFormularz({ ...formularz, email: e.target.value })} />
          <textarea className="pole md:col-span-2" placeholder="Notatki" value={formularz.notatki} onChange={(e) => setFormularz({ ...formularz, notatki: e.target.value })} />
        </div>
        <button className="przycisk-glowny mt-3">{edytowany ? "Zapisz zmiany" : "Dodaj klienta"}</button>
      </form>

      <section className="karta-szklana rounded-2xl p-4">
        <input className="pole mb-3" placeholder="Wyszukaj klienta" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="space-y-2">
          {lista.map((w) => (
            <article key={w.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="font-medium">{w.nazwa}</p>
              <p className="text-sm text-slate-400">
                {w.adres} • {w.telefon || "-"} • {w.email || "-"}
              </p>
              <p className="mt-1 text-sm text-slate-300">{w.notatki || "Brak notatek."}</p>
              <div className="mt-2 flex gap-2">
                <button className="przycisk-wtorny" onClick={() => edytuj(w)}>
                  Edytuj
                </button>
                <button className="przycisk-wtorny" onClick={() => usun(w.id)}>
                  Usuń
                </button>
              </div>
            </article>
          ))}
          {!lista.length ? <p className="text-sm text-slate-400">Brak klientów.</p> : null}
        </div>
      </section>
    </div>
  );
}

