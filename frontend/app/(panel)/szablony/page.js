"use client";

import { useEffect, useState } from "react";
import SekcjaNaglowek from "../../../components/SekcjaNaglowek";
import { pobierzSesje } from "../../../lib/auth";
import { zapytanieApi } from "../../../lib/api";

export default function Szablony() {
  const [lista, setLista] = useState([]);
  const [nazwa, setNazwa] = useState("");
  const [plik, setPlik] = useState(null);
  const rola = pobierzSesje()?.uzytkownik?.rola;
  const admin = rola === "Administrator";

  async function odswiez() {
    const dane = await zapytanieApi("/szablony");
    setLista(dane);
  }

  useEffect(() => {
    odswiez().catch(() => null);
  }, []);

  async function przeslij(e) {
    e.preventDefault();
    if (!plik) return;
    const fd = new FormData();
    fd.append("nazwa", nazwa);
    fd.append("plik", plik);
    await zapytanieApi("/szablony", { method: "POST", body: fd });
    setNazwa("");
    setPlik(null);
    await odswiez();
  }

  async function usun(id) {
    await zapytanieApi(`/szablony/${id}`, { method: "DELETE" });
    await odswiez();
  }

  return (
    <div className="space-y-6">
      <SekcjaNaglowek tytul="Szablony dokumentĂłw" opis="Zmienna treĹ›Ä‡: {{numer}}, {{data}}, {{klient}}, {{adres}}, {{opis}}, {{technik}}" />

      {admin ? (
        <form onSubmit={przeslij} className="karta-szklana rounded-2xl p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input className="pole" placeholder="Nazwa szablonu" value={nazwa} onChange={(e) => setNazwa(e.target.value)} />
            <input className="pole" type="file" accept=".docx" onChange={(e) => setPlik(e.target.files?.[0] || null)} required />
          </div>
          <button className="przycisk-glowny mt-3">PrzeĹ›lij szablon .docx</button>
        </form>
      ) : (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          Tylko Administrator moĹĽe dodawaÄ‡ i usuwaÄ‡ szablony.
        </p>
      )}

      <section className="karta-szklana rounded-2xl p-4">
        <div className="space-y-2">
          {lista.map((s) => (
            <article key={s.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="font-medium">{s.nazwa}</p>
              <p className="text-sm text-slate-400">{new Date(s.created_at).toLocaleString("pl-PL")}</p>
              {admin ? (
                <button className="przycisk-wtorny mt-2" onClick={() => usun(s.id)}>
                  UsuĹ„ szablon
                </button>
              ) : null}
            </article>
          ))}
          {!lista.length ? <p className="text-sm text-slate-400">Brak szablonĂłw.</p> : null}
        </div>
      </section>
    </div>
  );
}

