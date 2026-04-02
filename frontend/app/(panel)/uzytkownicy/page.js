"use client";

import { useEffect, useState } from "react";
import SekcjaNaglowek from "../../../components/SekcjaNaglowek";
import { pobierzSesje } from "../../../lib/auth";
import { zapytanieApi } from "../../../lib/api";

const pusty = { email: "", imie_nazwisko: "", rola: "Technik", aktywny: true };

export default function Uzytkownicy() {
  const rola = pobierzSesje()?.uzytkownik?.rola;
  const admin = rola === "Administrator";
  const [lista, setLista] = useState([]);
  const [formularz, setFormularz] = useState(pusty);
  const [edytowany, setEdytowany] = useState(null);

  async function odswiez() {
    const dane = await zapytanieApi("/uzytkownicy");
    setLista(dane);
  }

  useEffect(() => {
    if (admin) odswiez().catch(() => null);
  }, [admin]);

  async function zapisz(e) {
    e.preventDefault();
    if (edytowany) {
      await zapytanieApi(`/uzytkownicy/${edytowany}`, { method: "PUT", body: JSON.stringify(formularz) });
    } else {
      await zapytanieApi("/uzytkownicy", { method: "POST", body: JSON.stringify(formularz) });
    }
    setFormularz(pusty);
    setEdytowany(null);
    await odswiez();
  }

  async function usun(id) {
    await zapytanieApi(`/uzytkownicy/${id}`, { method: "DELETE" });
    await odswiez();
  }

  if (!admin) {
    return (
      <div>
        <SekcjaNaglowek tytul="Użytkownicy" />
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          Brak uprawnień. Ta sekcja jest dostępna tylko dla roli Administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SekcjaNaglowek tytul="Użytkownicy" opis="Zarządzanie kontami i rolami powiązanymi z Supabase Auth." />
      <form onSubmit={zapisz} className="karta-szklana rounded-2xl p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input className="pole" placeholder="Imię i nazwisko" value={formularz.imie_nazwisko} onChange={(e) => setFormularz({ ...formularz, imie_nazwisko: e.target.value })} required />
          <input className="pole" placeholder="Email" value={formularz.email} onChange={(e) => setFormularz({ ...formularz, email: e.target.value })} required />
          <select className="pole" value={formularz.rola} onChange={(e) => setFormularz({ ...formularz, rola: e.target.value })}>
            <option value="Administrator">Administrator</option>
            <option value="Technik">Technik</option>
            <option value="Kierownik">Kierownik</option>
          </select>
        </div>
        <p className="mt-3 text-sm text-slate-400">Hasła są zarządzane wyłącznie przez Supabase Auth.</p>
        <button className="przycisk-glowny mt-3">{edytowany ? "Zapisz użytkownika" : "Utwórz użytkownika"}</button>
      </form>

      <section className="karta-szklana rounded-2xl p-4">
        <div className="space-y-2">
          {lista.map((u) => (
            <article key={u.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="font-medium">
                {u.imie_nazwisko} ({u.rola})
              </p>
              <p className="text-sm text-slate-400">{u.email}</p>
              <div className="mt-2 flex gap-2">
                <button className="przycisk-wtorny" onClick={() => { setEdytowany(u.id); setFormularz({ ...u }); }}>
                  Edytuj użytkownika
                </button>
                <button className="przycisk-wtorny" onClick={() => usun(u.id)}>
                  Usuń użytkownika
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
