"use client";

import { useEffect, useState } from "react";
import SekcjaNaglowek from "../../../components/SekcjaNaglowek";
import { zapytanieApi } from "../../../lib/api";

const pusty = { nazwa: "", opis: "" };

export default function CzynnosciSerwisowePage() {
  const [lista, setLista] = useState([]);
  const [formularz, setFormularz] = useState(pusty);
  const [edytowany, setEdytowany] = useState(null);

  async function odswiez() {
    setLista(await zapytanieApi("/czynnosci-serwisowe"));
  }

  useEffect(() => { odswiez().catch(() => null); }, []);

  async function zapisz(e) {
    e.preventDefault();
    if (edytowany) {
      await zapytanieApi(`/czynnosci-serwisowe/${edytowany}`, { method: "PUT", body: JSON.stringify(formularz) });
    } else {
      await zapytanieApi("/czynnosci-serwisowe", { method: "POST", body: JSON.stringify(formularz) });
    }
    setFormularz(pusty);
    setEdytowany(null);
    await odswiez();
  }

  return (
    <div className="space-y-6">
      <SekcjaNaglowek tytul="Czynności serwisowe" opis="Lista standardowych czynności wykonywanych przez serwis." />
      <form onSubmit={zapisz} className="karta-szklana rounded-2xl p-4 space-y-3">
        <input className="pole" placeholder="Nazwa czynności" value={formularz.nazwa} onChange={(e) => setFormularz({ ...formularz, nazwa: e.target.value })} required />
        <textarea className="pole" placeholder="Opis" value={formularz.opis} onChange={(e) => setFormularz({ ...formularz, opis: e.target.value })} />
        <button className="przycisk-glowny">{edytowany ? "Zapisz zmiany" : "Dodaj czynność"}</button>
      </form>

      <section className="karta-szklana rounded-2xl p-4 space-y-2">
        {lista.map((w) => (
          <article key={w.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="font-medium">{w.nazwa}</p>
            <p className="text-sm text-slate-300">{w.opis || "Brak opisu"}</p>
            <div className="mt-2 flex gap-2">
              <button className="przycisk-wtorny" onClick={() => { setEdytowany(w.id); setFormularz({ nazwa: w.nazwa, opis: w.opis || "" }); }}>Edytuj</button>
              <button className="przycisk-wtorny" onClick={async () => { await zapytanieApi(`/czynnosci-serwisowe/${w.id}`, { method: "DELETE" }); await odswiez(); }}>Usuń</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

