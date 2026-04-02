"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SekcjaNaglowek from "../../../../components/SekcjaNaglowek";
import { zapytanieApi } from "../../../../lib/api";
import { pobierzSesje } from "../../../../lib/auth";
import { supabase } from "../../../../lib/supabase";

const pustyEdytowany = {
  nazwa: "",
  kontrahent_nazwa: "",
  budynek_nazwa: "",
  data_przegladu: "",
  status: "Planowany",
  opis: ""
};

function klasyStatusu(status) {
  if (status === "W realizacji") {
    return "border border-amber-400/40 bg-amber-500/15 text-amber-200";
  }
  if (status === "Zakończony") {
    return "border border-rose-400/40 bg-rose-500/15 text-rose-200";
  }
  return "border border-slate-400/20 bg-slate-500/10 text-slate-300";
}

function KartaPpoz({
  wpis,
  czyEdytowany,
  formularz,
  setFormularz,
  zacznijEdycje,
  anulujEdycje,
  zapiszEdycje,
  rozpocznijPrzeglad,
  zakonczPrzeglad,
  odswiez,
  czyAdmin
}) {
  if (czyEdytowany) {
    return (
      <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="space-y-3">
          <input
            className="pole"
            value={formularz.nazwa}
            onChange={(e) => setFormularz((prev) => ({ ...prev, nazwa: e.target.value }))}
            placeholder="Nazwa przeglądu"
          />

          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="pole"
              value={formularz.kontrahent_nazwa}
              onChange={(e) => setFormularz((prev) => ({ ...prev, kontrahent_nazwa: e.target.value }))}
              placeholder="Kontrahent"
            />
            <input
              className="pole"
              value={formularz.budynek_nazwa}
              onChange={(e) => setFormularz((prev) => ({ ...prev, budynek_nazwa: e.target.value }))}
              placeholder="Budynek"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="pole"
              type="date"
              value={formularz.data_przegladu}
              onChange={(e) => setFormularz((prev) => ({ ...prev, data_przegladu: e.target.value }))}
            />
            <select
              className="pole"
              value={formularz.status}
              onChange={(e) => setFormularz((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option>Planowany</option>
              <option>W realizacji</option>
              <option>Zakończony</option>
            </select>
          </div>

          <textarea
            className="pole"
            rows={4}
            value={formularz.opis}
            onChange={(e) => setFormularz((prev) => ({ ...prev, opis: e.target.value }))}
            placeholder="Opis"
          />

          <div className="flex flex-wrap gap-2">
            <button className="przycisk-glowny" type="button" onClick={() => zapiszEdycje(wpis.id)}>
              Zapisz
            </button>
            <button className="przycisk-wtorny" type="button" onClick={anulujEdycje}>
              Anuluj
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <p className="truncate text-xl font-semibold text-slate-100">{wpis.nazwa}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
              <span className="font-medium text-slate-200">{wpis.kontrahent_nazwa || "Bez kontrahenta"}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${klasyStatusu(wpis.status)}`}>
                {wpis.status}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {czyAdmin ? (
              <button className="przycisk-wtorny" type="button" onClick={() => zacznijEdycje(wpis)}>
                Edytuj
              </button>
            ) : wpis.status === "Planowany" ? (
              <button className="przycisk-wtorny" type="button" onClick={() => rozpocznijPrzeglad(wpis)}>
                Rozpocznij
              </button>
            ) : wpis.status === "W realizacji" ? (
              <button className="przycisk-wtorny" type="button" onClick={() => zakonczPrzeglad(wpis)}>
                Zakończ
              </button>
            ) : null}

            <button
              className="przycisk-wtorny"
              type="button"
              onClick={async () => {
                await zapytanieApi(`/ppoz/${wpis.id}`, { method: "DELETE" });
                await odswiez();
              }}
            >
              Usuń
            </button>
          </div>
        </div>

        <div className="grid gap-4 border-t border-white/[0.08] pt-3 md:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Budynek</p>
            <p className="mt-1 text-sm font-medium text-slate-200">{wpis.budynek_nazwa || "-"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Data</p>
            <p className="mt-1 text-sm font-medium text-slate-200">
              {wpis.data_przegladu ? new Date(wpis.data_przegladu).toLocaleDateString("pl-PL") : "-"}
            </p>
          </div>
        </div>

        <div className="border-t border-white/[0.08] pt-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Opis</p>
          <p className="mt-2 break-words text-sm leading-6 text-slate-300">{wpis.opis || "Brak opisu"}</p>
        </div>
      </div>
    </article>
  );
}

export default function PpozPrzegladyPage() {
  const [czyAdmin, setCzyAdmin] = useState(false);
  const [lista, setLista] = useState([]);
  const [q, setQ] = useState("");
  const [edytowanyId, setEdytowanyId] = useState(null);
  const [formularz, setFormularz] = useState(pustyEdytowany);
  const [czyHistoriaOtwarta, setCzyHistoriaOtwarta] = useState(false);

  useEffect(() => {
    let aktywny = true;

    async function ustawRole() {
      if (supabase) {
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!aktywny) return;
        setCzyAdmin(user?.email === "dominik@eltreko.pl");
        return;
      }

      const lokalnaSesja = pobierzSesje();
      if (!aktywny) return;
      setCzyAdmin(lokalnaSesja?.uzytkownik?.email === "dominik@eltreko.pl");
    }

    ustawRole().catch(() => setCzyAdmin(false));
    return () => {
      aktywny = false;
    };
  }, []);

  async function odswiez() {
    setLista(await zapytanieApi(`/ppoz?q=${encodeURIComponent(q)}`));
  }

  useEffect(() => {
    odswiez().catch(() => null);
  }, [q]);

  const aktywne = useMemo(() => lista.filter((wpis) => wpis.status !== "Zakończony"), [lista]);
  const historia = useMemo(() => lista.filter((wpis) => wpis.status === "Zakończony"), [lista]);

  function zacznijEdycje(wpis) {
    setEdytowanyId(wpis.id);
    setFormularz({
      nazwa: wpis.nazwa || "",
      kontrahent_nazwa: wpis.kontrahent_nazwa || "",
      budynek_nazwa: wpis.budynek_nazwa || "",
      data_przegladu: wpis.data_przegladu ? String(wpis.data_przegladu).slice(0, 10) : "",
      status: wpis.status || "Planowany",
      opis: wpis.opis || ""
    });
  }

  function anulujEdycje() {
    setEdytowanyId(null);
    setFormularz(pustyEdytowany);
  }

  async function zapiszEdycje(id) {
    await zapytanieApi(`/ppoz/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...formularz,
        kontrahent_id: null
      })
    });
    anulujEdycje();
    await odswiez();
  }

  async function rozpocznijPrzeglad(wpis) {
    await zapytanieApi(`/ppoz/${wpis.id}`, {
      method: "PUT",
      body: JSON.stringify({
        nazwa: wpis.nazwa || "",
        kontrahent_id: null,
        kontrahent_nazwa: wpis.kontrahent_nazwa || "",
        budynek_nazwa: wpis.budynek_nazwa || "",
        data_przegladu: wpis.data_przegladu ? String(wpis.data_przegladu).slice(0, 10) : "",
        status: "W realizacji",
        opis: wpis.opis || ""
      })
    });
    await odswiez();
  }

  async function zakonczPrzeglad(wpis) {
    await zapytanieApi(`/ppoz/${wpis.id}`, {
      method: "PUT",
      body: JSON.stringify({
        nazwa: wpis.nazwa || "",
        kontrahent_id: null,
        kontrahent_nazwa: wpis.kontrahent_nazwa || "",
        budynek_nazwa: wpis.budynek_nazwa || "",
        data_przegladu: wpis.data_przegladu ? String(wpis.data_przegladu).slice(0, 10) : "",
        status: "Zakończony",
        opis: wpis.opis || ""
      })
    });
    await odswiez();
  }

  return (
    <div className="space-y-6">
      <SekcjaNaglowek
        tytul="PPOŻ - lista przeglądów"
        opis="Rejestr wykonanych i planowanych przeglądów PPOŻ."
        prawaStrona={
          <Link href="/ppoz/nowy-przeglad" className="przycisk-glowny">
            Nowy przegląd
          </Link>
        }
      />

      <section className="karta-szklana rounded-2xl p-4">
        <input
          className="pole mb-4"
          placeholder="Szukaj przeglądu PPOŻ"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-100">Aktywne przeglądy</h2>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                {aktywne.length}
              </span>
            </div>

            {aktywne.length ? (
              aktywne.map((wpis) => (
                <KartaPpoz
                  key={wpis.id}
                  wpis={wpis}
                  czyEdytowany={edytowanyId === wpis.id}
                  formularz={formularz}
                  setFormularz={setFormularz}
                  zacznijEdycje={zacznijEdycje}
                  anulujEdycje={anulujEdycje}
                  zapiszEdycje={zapiszEdycje}
                  rozpocznijPrzeglad={rozpocznijPrzeglad}
                  zakonczPrzeglad={zakonczPrzeglad}
                  odswiez={odswiez}
                  czyAdmin={czyAdmin}
                />
              ))
            ) : (
              <p className="text-sm text-slate-400">Brak aktywnych przeglądów PPOŻ.</p>
            )}
          </div>

          <div className="space-y-3 pt-1">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-400/35 to-transparent" />
            <button
              type="button"
              onClick={() => setCzyHistoriaOtwarta((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 px-1 py-2 text-left transition hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-slate-100">Historia przeglądów</h2>
                <span className="rounded-full border border-slate-400/15 bg-white/[0.03] px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                  {historia.length}
                </span>
              </div>
              <span className="text-sm font-medium text-slate-400">
                {czyHistoriaOtwarta ? "Ukryj" : "Rozwiń"}
              </span>
            </button>

            {czyHistoriaOtwarta ? (
              historia.length ? (
                historia.map((wpis) => (
                  <KartaPpoz
                    key={wpis.id}
                    wpis={wpis}
                    czyEdytowany={edytowanyId === wpis.id}
                    formularz={formularz}
                    setFormularz={setFormularz}
                    zacznijEdycje={zacznijEdycje}
                    anulujEdycje={anulujEdycje}
                    zapiszEdycje={zapiszEdycje}
                    rozpocznijPrzeglad={rozpocznijPrzeglad}
                    zakonczPrzeglad={zakonczPrzeglad}
                    odswiez={odswiez}
                    czyAdmin={czyAdmin}
                  />
                ))
              ) : (
                <p className="text-sm text-slate-400">Brak zakończonych przeglądów PPOŻ.</p>
              )
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
