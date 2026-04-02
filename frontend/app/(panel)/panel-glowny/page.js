"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SekcjaNaglowek from "../../../components/SekcjaNaglowek";
import { zapytanieApi } from "../../../lib/api";

function formatujDate(data) {
  if (!data) return "";
  return new Date(data).toLocaleDateString("pl-PL");
}

function formatujTermin(data) {
  if (!data) return "";
  return new Date(data).toLocaleString("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function PanelGlowny() {
  const [dane, setDane] = useState({ notatki: [] });
  const [formularzNotatki, setFormularzNotatki] = useState({
    tytul: "",
    tresc: "",
    termin_at: ""
  });
  const [zapisywanieNotatki, setZapisywanieNotatki] = useState(false);
  const [usuwanaNotatka, setUsuwanaNotatka] = useState("");
  const [blad, setBlad] = useState("");
  const [komunikat, setKomunikat] = useState("");

  async function pobierzDane() {
    const odpowiedz = await zapytanieApi("/dashboard");
    setDane({
      notatki: Array.isArray(odpowiedz?.notatki) ? odpowiedz.notatki : []
    });
  }

  useEffect(() => {
    pobierzDane().catch((error) => setBlad(error.message));
  }, []);

  const notatkiPosortowane = useMemo(() => dane.notatki || [], [dane.notatki]);

  async function dodajNotatke() {
    setBlad("");
    setKomunikat("");

    if (!formularzNotatki.tytul.trim()) {
      setBlad("Podaj tytuł notatki.");
      return;
    }

    setZapisywanieNotatki(true);
    try {
      const notatka = await zapytanieApi("/dashboard/notatki", {
        method: "POST",
        body: JSON.stringify({
          tytul: formularzNotatki.tytul.trim(),
          tresc: formularzNotatki.tresc.trim(),
          termin_at: formularzNotatki.termin_at || null
        })
      });

      setDane((prev) => ({
        ...prev,
        notatki: [notatka, ...(prev.notatki || [])]
      }));
      setFormularzNotatki({
        tytul: "",
        tresc: "",
        termin_at: ""
      });
      setKomunikat("Notatka została zapisana.");
    } catch (error) {
      setBlad(error.message);
    } finally {
      setZapisywanieNotatki(false);
    }
  }

  async function usunNotatke(id) {
    setBlad("");
    setKomunikat("");
    setUsuwanaNotatka(String(id));

    try {
      await zapytanieApi(`/dashboard/notatki/${id}`, {
        method: "DELETE"
      });

      setDane((prev) => ({
        ...prev,
        notatki: (prev.notatki || []).filter((notatka) => String(notatka.id) !== String(id))
      }));
      setKomunikat("Notatka została usunięta.");
    } catch (error) {
      setBlad(error.message);
    } finally {
      setUsuwanaNotatka("");
    }
  }

  return (
    <div>
      <SekcjaNaglowek
        tytul="Panel główny"
        opis="Notatki i bieżąca organizacja pracy działu serwisu."
        prawaStrona={
          <Link href="/protokoly" className="przycisk-glowny">
            Protokoły
          </Link>
        }
      />

      {blad ? (
        <p className="mb-4 rounded-2xl border border-red-400/15 bg-red-500/10 px-4 py-3 text-sm text-red-300">{blad}</p>
      ) : null}
      {komunikat ? (
        <p className="mb-4 rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {komunikat}
        </p>
      ) : null}

      <article className="karta-szklana rounded-2xl p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-slate-100">Notatki</p>
            <p className="mt-1 text-sm text-slate-400">Możesz dodać notatkę i ustawić dla niej termin.</p>
          </div>
          <div className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
            {notatkiPosortowane.length}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
          <input
            className="pole h-11"
            placeholder="Tytuł notatki"
            value={formularzNotatki.tytul}
            onChange={(e) => setFormularzNotatki((prev) => ({ ...prev, tytul: e.target.value }))}
          />
          <input
            type="datetime-local"
            className="pole h-11"
            value={formularzNotatki.termin_at}
            onChange={(e) => setFormularzNotatki((prev) => ({ ...prev, termin_at: e.target.value }))}
          />
        </div>

        <textarea
          className="pole mt-3 min-h-[130px] resize-y rounded-xl px-4 py-3 text-sm"
          placeholder="Treść notatki"
          value={formularzNotatki.tresc}
          onChange={(e) => setFormularzNotatki((prev) => ({ ...prev, tresc: e.target.value }))}
        />

        <div className="mt-3 flex justify-end">
          <button type="button" className="przycisk-glowny" onClick={dodajNotatke} disabled={zapisywanieNotatki}>
            {zapisywanieNotatki ? "Zapisywanie..." : "Dodaj notatkę"}
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {notatkiPosortowane.map((notatka) => (
            <div key={notatka.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-100">{notatka.tytul}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                    {notatka.imie_nazwisko ? <span>{notatka.imie_nazwisko}</span> : null}
                    {notatka.termin_at ? <span>Termin: {formatujTermin(notatka.termin_at)}</span> : null}
                    <span>Dodano: {formatujDate(notatka.created_at)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="przycisk-wtorny px-3 py-2 text-sm"
                    onClick={() => usunNotatke(notatka.id)}
                    disabled={String(usuwanaNotatka) === String(notatka.id)}
                  >
                    {String(usuwanaNotatka) === String(notatka.id) ? "Usuwanie..." : "Usuń"}
                  </button>
                </div>
              </div>

              {notatka.tresc ? <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">{notatka.tresc}</p> : null}
            </div>
          ))}

          {!notatkiPosortowane.length ? <p className="text-sm text-slate-400">Brak notatek do wyświetlenia.</p> : null}
        </div>
      </article>
    </div>
  );
}
