"use client";

import { useEffect, useState } from "react";
import SekcjaNaglowek from "../../../components/SekcjaNaglowek";
import { zapytanieApi } from "../../../lib/api";

const pusty = { nazwa: "", jednostka: "szt", kod: "", opis: "" };

export default function DefinicjaCzesciPage() {
  const [lista, setLista] = useState([]);
  const [formularz, setFormularz] = useState(pusty);
  const [edytowany, setEdytowany] = useState(null);

  async function odswiez() {
    setLista(await zapytanieApi("/definicje-czesci"));
  }

  useEffect(() => { odswiez().catch(() => null); }, []);

  async function zapisz(e) {
    e.preventDefault();
    if (edytowany) {
      await zapytanieApi(`/definicje-czesci/${edytowany}`, { method: "PUT", body: JSON.stringify(formularz) });
    } else {
      await zapytanieApi("/definicje-czesci", { method: "POST", body: JSON.stringify(formularz) });
    }
    setFormularz(pusty);
    setEdytowany(null);
    await odswiez();
  }

  return (
    <div className="space-y-6">
      <SekcjaNaglowek tytul="Definicja części" opis="Baza części i materiałów serwisowych." />
      <form onSubmit={zapisz} className="karta-szklana rounded-2xl p-4 grid gap-3 md:grid-cols-2">
        <input className="pole" placeholder="Nazwa części" value={formularz.nazwa} onChange={(e) => setFormularz({ ...formularz, nazwa: e.target.value })} required />
        <input className="pole" placeholder="Jednostka" value={formularz.jednostka} onChange={(e) => setFormularz({ ...formularz, jednostka: e.target.value })} />
        <input className="pole" placeholder="Kod części" value={formularz.kod} onChange={(e) => setFormularz({ ...formularz, kod: e.target.value })} />
        <textarea className="pole" placeholder="Opis" value={formularz.opis} onChange={(e) => setFormularz({ ...formularz, opis: e.target.value })} />
        <button className="przycisk-glowny md:col-span-2 w-fit">{edytowany ? "Zapisz zmiany" : "Dodaj część"}</button>
      </form>

      <section className="karta-szklana rounded-2xl p-4 space-y-2">
        {lista.map((w) => (
          <article key={w.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="font-medium">{w.nazwa} ({w.jednostka})</p>
            <p className="text-sm text-slate-400">Kod: {w.kod || "-"}</p>
            <p className="text-sm text-slate-300">{w.opis || "Brak opisu"}</p>
            <div className="mt-2 flex gap-2">
              <button className="przycisk-wtorny" onClick={() => { setEdytowany(w.id); setFormularz({ nazwa: w.nazwa, jednostka: w.jednostka, kod: w.kod || "", opis: w.opis || "" }); }}>Edytuj</button>
              <button className="przycisk-wtorny" onClick={async () => { await zapytanieApi(`/definicje-czesci/${w.id}`, { method: "DELETE" }); await odswiez(); }}>Usuń</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

