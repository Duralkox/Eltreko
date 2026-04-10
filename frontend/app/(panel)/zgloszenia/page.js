"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BuildingOffice2Icon,
  CameraIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  TrashIcon
} from "@heroicons/react/24/outline";
import SekcjaNaglowek from "../../../components/SekcjaNaglowek";
import { zapytanieApi } from "../../../lib/api";
import { pobierzSesje } from "../../../lib/auth";
import { czySupabaseSkonfigurowany, supabase } from "../../../lib/supabase";

const BUCKET_ZDJEC = "eltreko-files";

const pusty = {
  tytul: "",
  opis: "",
  kontrahent_id: "",
  osiedle_nazwa: "",
  kontrahent_nazwa: "",
  kategoria_usterki_id: "",
  status: "Nowe",
  priorytet: "Normalny",
  zdjecia: []
};

function slugifyWzglednie(tekst) {
  return String(tekst || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function dataFolderu() {
  const dzis = new Date();
  return `${dzis.getFullYear()}-${String(dzis.getMonth() + 1).padStart(2, "0")}-${String(dzis.getDate()).padStart(2, "0")}`;
}

function przygotujMail(formularz) {
  const temat = [
    "Zgłoszenie serwisowe",
    formularz.kontrahent_nazwa || null,
    formularz.osiedle_nazwa || null,
    formularz.tytul || null
  ]
    .filter(Boolean)
    .join(" - ");

  const tresc = [
    `Tytuł: ${formularz.tytul || "-"}`,
    `Kontrahent: ${formularz.kontrahent_nazwa || "-"}`,
    `Osiedle: ${formularz.osiedle_nazwa || "-"}`,
    `Priorytet: ${formularz.priorytet || "Normalny"}`,
    "",
    "Opis zgłoszenia:",
    formularz.opis || "-"
  ].join("\n");

  return { temat, tresc };
}

function formatujDateCzas(data) {
  if (!data) return "";
  return new Date(data).toLocaleString("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function rozwiazUrlZdjecia(zdjecie) {
  const bucket = String(zdjecie?.bucket || BUCKET_ZDJEC).trim();
  const path = String(zdjecie?.path || "").trim();
  const obecnyUrl = String(zdjecie?.url || "").trim();

  if (!czySupabaseSkonfigurowany || !supabase || !path) {
    return obecnyUrl || "";
  }

  const { data: signedData, error: signedError } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 6);
  if (!signedError && signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicData?.publicUrl || obecnyUrl || "";
}

async function uzupelnijPodgladyZdjec(wpisy) {
  const lista = Array.isArray(wpisy) ? wpisy : [];

  return Promise.all(
    lista.map(async (wpis) => {
      const zdjecia = Array.isArray(wpis?.zdjecia) ? wpis.zdjecia : [];
      if (!zdjecia.length) return wpis;

      const zdjeciaZUrl = await Promise.all(
        zdjecia.map(async (zdjecie) => ({
          ...zdjecie,
          url: await rozwiazUrlZdjecia(zdjecie)
        }))
      );

      return {
        ...wpis,
        zdjecia: zdjeciaZUrl
      };
    })
  );
}

async function wrzucZdjecie(plik, metadane = {}) {
  if (!czySupabaseSkonfigurowany || !supabase) {
    throw new Error("Supabase Storage nie jest skonfigurowany dla zdjęć zgłoszeń.");
  }

  const rozszerzenie = String(plik.name || "").split(".").pop() || "jpg";
  const bazowaNazwa = slugifyWzglednie(plik.name || `zdjecie.${rozszerzenie}`) || `zdjecie.${rozszerzenie}`;
  const sciezka = [
    "zgloszenia",
    slugifyWzglednie(metadane.kontrahentNazwa || "ogolne") || "ogolne",
    dataFolderu(),
    `${Date.now()}-${bazowaNazwa}`
  ].join("/");

  const { error } = await supabase.storage.from(BUCKET_ZDJEC).upload(sciezka, plik, {
    upsert: false,
    contentType: plik.type || "image/jpeg"
  });

  if (error) {
    throw new Error(`Nie udało się wrzucić zdjęcia: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET_ZDJEC).getPublicUrl(sciezka);

  return {
    name: plik.name || "zdjecie",
    path: sciezka,
    bucket: BUCKET_ZDJEC,
    url: data?.publicUrl || "",
    contentType: plik.type || "image/jpeg"
  };
}

function MiniaturaZdjecia({ zdjecie, onUsun, tryb = "zapisane" }) {
  const url = zdjecie.podglad || zdjecie.url || "";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-900/50">
        {url ? (
          // Zwykły img lepiej radzi sobie z blobami z telefonu i z linkami storage.
          <img src={url} alt={zdjecie.name || "Zdjęcie zgłoszenia"} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500">
            <PhotoIcon className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-100">{zdjecie.name || "Zdjęcie"}</p>
          <p className="text-[11px] text-slate-400">{tryb === "nowe" ? "Do wrzucenia przy zapisie" : "Zapisane"}</p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
          onClick={onUsun}
          aria-label="Usuń zdjęcie"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function ZgloszeniaPage() {
  const sesja = useMemo(() => pobierzSesje(), []);
  const emailUzytkownika = String(sesja?.uzytkownik?.email || "").trim().toLowerCase();

  const [lista, setLista] = useState([]);
  const [osiedla, setOsiedla] = useState([]);
  const [kategorie, setKategorie] = useState([]);
  const [formularz, setFormularz] = useState(() => ({
    ...pusty,
    zglaszajacy_email: emailUzytkownika
  }));
  const [edytowany, setEdytowany] = useState(null);
  const [q, setQ] = useState("");
  const [qOsiedle, setQOsiedle] = useState("");
  const [blad, setBlad] = useState("");
  const [komunikat, setKomunikat] = useState("");
  const [zapisywanie, setZapisywanie] = useState(false);
  const [noweZdjecia, setNoweZdjecia] = useState([]);

  async function odswiez() {
    setBlad("");
    const [zgloszeniaRes, opcjeRes, kategorieRes] = await Promise.allSettled([
      zapytanieApi(`/zgloszenia?q=${encodeURIComponent(q)}`),
      zapytanieApi("/zgloszenia/opcje"),
      zapytanieApi("/kategorie-usterek")
    ]);

    setLista(zgloszeniaRes.status === "fulfilled" && Array.isArray(zgloszeniaRes.value) ? zgloszeniaRes.value : []);
    setOsiedla(opcjeRes.status === "fulfilled" && Array.isArray(opcjeRes.value) ? opcjeRes.value : []);
    setKategorie(kategorieRes.status === "fulfilled" && Array.isArray(kategorieRes.value) ? kategorieRes.value : []);

    if (opcjeRes.status !== "fulfilled") {
      setBlad("Nie udało się pobrać listy osiedli.");
    }
  }

  useEffect(() => {
    odswiez().catch((error) => setBlad(error.message));
  }, [q]);

  useEffect(() => {
    let aktywny = true;

    async function uzupelnijPodgladyListy() {
      if (!lista.length) return;
      const zUrl = await uzupelnijPodgladyZdjec(lista);
      if (!aktywny) return;
      setLista((poprzednie) => {
        const poprzedniKlucz = JSON.stringify(poprzednie.map((wpis) => [wpis.id, (wpis.zdjecia || []).map((z) => z.url || z.path || z.name)]));
        const nowyKlucz = JSON.stringify(zUrl.map((wpis) => [wpis.id, (wpis.zdjecia || []).map((z) => z.url || z.path || z.name)]));
        return poprzedniKlucz === nowyKlucz ? poprzednie : zUrl;
      });
    }

    uzupelnijPodgladyListy().catch(() => null);
    return () => {
      aktywny = false;
    };
  }, [lista]);

  useEffect(() => {
    setFormularz((prev) => ({
      ...prev,
      zglaszajacy_email: prev.zglaszajacy_email || emailUzytkownika
    }));
  }, [emailUzytkownika]);

  useEffect(() => {
    let aktywny = true;

    async function uzupelnijPodgladyFormularza() {
      const zdjecia = Array.isArray(formularz.zdjecia) ? formularz.zdjecia : [];
      if (!zdjecia.length) return;

      const zUrl = await Promise.all(
        zdjecia.map(async (zdjecie) => ({
          ...zdjecie,
          url: await rozwiazUrlZdjecia(zdjecie)
        }))
      );

      if (!aktywny) return;

      setFormularz((prev) => {
        const poprzedniKlucz = JSON.stringify((prev.zdjecia || []).map((z) => z.url || z.path || z.name));
        const nowyKlucz = JSON.stringify(zUrl.map((z) => z.url || z.path || z.name));
        if (poprzedniKlucz === nowyKlucz) {
          return prev;
        }
        return {
          ...prev,
          zdjecia: zUrl
        };
      });
    }

    uzupelnijPodgladyFormularza().catch(() => null);
    return () => {
      aktywny = false;
    };
  }, [formularz.zdjecia]);

  const przefiltrowaneOsiedla = useMemo(() => {
    const fraza = qOsiedle.trim().toLowerCase();
    if (!fraza) return osiedla;
    return osiedla.filter((osiedle) => {
      const osiedleNazwa = String(osiedle.osiedle_nazwa || "").toLowerCase();
      const kontrahentNazwa = String(osiedle.kontrahent_nazwa || "").toLowerCase();
      return osiedleNazwa.includes(fraza) || kontrahentNazwa.includes(fraza);
    });
  }, [osiedla, qOsiedle]);

  const mailPodglad = useMemo(() => przygotujMail(formularz), [formularz]);

  function ustawOsiedle(osiedle) {
    setQOsiedle(osiedle.osiedle_nazwa || "");
    setFormularz((prev) => ({
      ...prev,
      kontrahent_id: osiedle.id,
      osiedle_nazwa: osiedle.osiedle_nazwa || "",
      kontrahent_nazwa: osiedle.kontrahent_nazwa || ""
    }));
  }

  function zresetujFormularz() {
    setFormularz({
      ...pusty,
      zglaszajacy_email: emailUzytkownika
    });
    setEdytowany(null);
    setQOsiedle("");
    setNoweZdjecia([]);
  }

  function dodajPliki(listaPlikow) {
    const pliki = Array.from(listaPlikow || []).filter((plik) => String(plik.type || "").startsWith("image/"));
    if (!pliki.length) return;

    setNoweZdjecia((prev) => [
      ...prev,
      ...pliki.map((plik) => ({
        id: `${plik.name}-${plik.size}-${plik.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file: plik,
        name: plik.name,
        podglad: URL.createObjectURL(plik)
      }))
    ]);
  }

  function usunNoweZdjecie(id) {
    setNoweZdjecia((prev) => {
      const znalezione = prev.find((zdjecie) => zdjecie.id === id);
      if (znalezione?.podglad) {
        URL.revokeObjectURL(znalezione.podglad);
      }
      return prev.filter((zdjecie) => zdjecie.id !== id);
    });
  }

  function usunZapisaneZdjecie(index) {
    setFormularz((prev) => ({
      ...prev,
      zdjecia: Array.isArray(prev.zdjecia) ? prev.zdjecia.filter((_, i) => i !== index) : []
    }));
  }

  async function skopiujMaila() {
    try {
      await navigator.clipboard.writeText(`Temat: ${mailPodglad.temat}\n\n${mailPodglad.tresc}`);
      setKomunikat("Treść zgłoszenia do maila została skopiowana.");
    } catch (_error) {
      setBlad("Nie udało się skopiować treści maila.");
    }
  }

  async function zapisz(e) {
    e.preventDefault();
    setBlad("");
    setKomunikat("");

    if (!formularz.tytul.trim()) {
      setBlad("Podaj tytuł zgłoszenia.");
      return;
    }

    if (!formularz.kontrahent_id || !formularz.osiedle_nazwa) {
      setBlad("Wybierz osiedle z listy.");
      return;
    }

    setZapisywanie(true);
    try {
      const wrzuconeZdjecia = await Promise.all(
        noweZdjecia.map((zdjecie) =>
          wrzucZdjecie(zdjecie.file, {
            kontrahentNazwa: formularz.kontrahent_nazwa || formularz.osiedle_nazwa
          })
        )
      );

      const payload = {
        ...formularz,
        zglaszajacy_email: formularz.zglaszajacy_email || emailUzytkownika,
        zdjecia: [...(Array.isArray(formularz.zdjecia) ? formularz.zdjecia : []), ...wrzuconeZdjecia]
      };

      if (edytowany) {
        await zapytanieApi(`/zgloszenia/${edytowany}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await zapytanieApi("/zgloszenia", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      zresetujFormularz();
      setKomunikat(edytowany ? "Zgłoszenie zostało zaktualizowane." : "Zgłoszenie zostało zapisane.");
      await odswiez();
    } catch (error) {
      setBlad(error.message);
    } finally {
      setZapisywanie(false);
    }
  }

  function edytuj(wpis) {
    setEdytowany(wpis.id);
    setQOsiedle(wpis.osiedle_nazwa || "");
    setNoweZdjecia([]);
    setFormularz({
      tytul: wpis.tytul || "",
      opis: wpis.opis || "",
      kontrahent_id: wpis.kontrahent_id || "",
      osiedle_nazwa: wpis.osiedle_nazwa || "",
      kontrahent_nazwa: wpis.kontrahent_nazwa || "",
      kategoria_usterki_id: wpis.kategoria_usterki_id || "",
      status: wpis.status || "Nowe",
      priorytet: wpis.priorytet || "Normalny",
      zglaszajacy_email: wpis.zglaszajacy_email || emailUzytkownika,
      zdjecia: Array.isArray(wpis.zdjecia) ? wpis.zdjecia : []
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function usun(id) {
    if (!window.confirm("Usunąć zgłoszenie?")) return;
    await zapytanieApi(`/zgloszenia/${id}`, { method: "DELETE" });
    await odswiez();
  }

  return (
    <div className="space-y-6">
      <SekcjaNaglowek
        tytul="Zgłoszenia"
        opis="Nowy moduł zgłoszeń pod administratorów i pracę z telefonu: osiedle, zdjęcia i gotowa treść pod maila."
      />

      <form onSubmit={zapisz} className="karta-szklana rounded-3xl p-4 sm:p-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="pole md:col-span-2"
                placeholder="Tytuł zgłoszenia"
                value={formularz.tytul}
                onChange={(e) => setFormularz((prev) => ({ ...prev, tytul: e.target.value }))}
                required
              />

              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">Osiedle</label>
                <input
                  className="pole"
                  placeholder="Wpisz albo wybierz osiedle"
                  value={qOsiedle}
                  onChange={(e) => {
                    const wartosc = e.target.value;
                    setQOsiedle(wartosc);
                    setFormularz((prev) => ({
                      ...prev,
                      kontrahent_id: "",
                      osiedle_nazwa: wartosc,
                      kontrahent_nazwa: ""
                    }));
                  }}
                />
                <div className="max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/20 p-2">
                  {!przefiltrowaneOsiedla.length ? (
                    <p className="px-2 py-3 text-sm text-slate-400">Brak osiedli do wybrania.</p>
                  ) : (
                    <div className="space-y-1">
                      {przefiltrowaneOsiedla.slice(0, 18).map((osiedle) => (
                        <button
                          key={`${osiedle.id}-${osiedle.osiedle_nazwa}`}
                          type="button"
                          className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2 text-left transition ${
                            String(formularz.kontrahent_id) === String(osiedle.id)
                              ? "bg-emerald-500/12 text-emerald-100"
                              : "bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]"
                          }`}
                          onClick={() => ustawOsiedle(osiedle)}
                        >
                          <span>
                            <span className="block font-medium">{osiedle.osiedle_nazwa}</span>
                            <span className="mt-0.5 block text-xs text-slate-400">{osiedle.kontrahent_nazwa || "Bez kontrahenta"}</span>
                          </span>
                          <BuildingOffice2Icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <input className="pole" value={formularz.kontrahent_nazwa} placeholder="Kontrahent przypisze się z osiedla" readOnly />

              <select
                className="pole"
                value={formularz.kategoria_usterki_id}
                onChange={(e) => setFormularz((prev) => ({ ...prev, kategoria_usterki_id: e.target.value }))}
              >
                <option value="">Wybierz kategorię usterki</option>
                {kategorie.map((kategoria) => (
                  <option key={kategoria.id} value={kategoria.id}>
                    {kategoria.nazwa}
                  </option>
                ))}
              </select>

              <select className="pole" value={formularz.priorytet} onChange={(e) => setFormularz((prev) => ({ ...prev, priorytet: e.target.value }))}>
                <option>Niski</option>
                <option>Normalny</option>
                <option>Wysoki</option>
              </select>

              <select className="pole" value={formularz.status} onChange={(e) => setFormularz((prev) => ({ ...prev, status: e.target.value }))}>
                <option>Nowe</option>
                <option>W toku</option>
                <option>Zamkniete</option>
              </select>
            </div>

            <textarea
              className="pole min-h-[170px] resize-y px-4 py-3"
              placeholder="Opis zgłoszenia"
              value={formularz.opis}
              onChange={(e) => setFormularz((prev) => ({ ...prev, opis: e.target.value }))}
            />

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Zdjęcia do zgłoszenia</p>
                  <p className="mt-1 text-sm text-slate-400">Możesz zrobić zdjęcie telefonem albo podpiąć plik z galerii.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="przycisk-wtorny cursor-pointer">
                    <span className="inline-flex items-center gap-2">
                      <CameraIcon className="h-4 w-4" />
                      Zrób zdjęcie
                    </span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => dodajPliki(e.target.files)} />
                  </label>
                  <label className="przycisk-wtorny cursor-pointer">
                    <span className="inline-flex items-center gap-2">
                      <PhotoIcon className="h-4 w-4" />
                      Dodaj z pliku
                    </span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => dodajPliki(e.target.files)} />
                  </label>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.isArray(formularz.zdjecia) &&
                  formularz.zdjecia.map((zdjecie, index) => (
                    <MiniaturaZdjecia key={`zapisane-${zdjecie.path || zdjecie.name || index}`} zdjecie={zdjecie} onUsun={() => usunZapisaneZdjecie(index)} />
                  ))}
                {noweZdjecia.map((zdjecie) => (
                  <MiniaturaZdjecia key={zdjecie.id} zdjecie={zdjecie} tryb="nowe" onUsun={() => usunNoweZdjecie(zdjecie.id)} />
                ))}
                {!formularz.zdjecia?.length && !noweZdjecia.length ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/20 px-4 py-6 text-sm text-slate-400">
                    Brak podpiętych zdjęć.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="przycisk-glowny" disabled={zapisywanie}>
                {zapisywanie ? "Zapisywanie..." : edytowany ? "Zapisz zmiany" : "Dodaj zgłoszenie"}
              </button>
              {edytowany ? (
                <button type="button" className="przycisk-wtorny" onClick={zresetujFormularz}>
                  Anuluj
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-3 text-emerald-200">
                  <EnvelopeIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-100">Mail zgłoszeniowy</p>
                  <p className="mt-1 text-sm text-slate-400">API wysyłki podepniemy później, ale treść i temat są już gotowe.</p>
                </div>
              </div>

              <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Temat</p>
                  <p className="mt-2 text-sm text-slate-100">{mailPodglad.temat || "Temat uzupełni się z formularza."}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Treść</p>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-6 text-slate-300">{mailPodglad.tresc}</pre>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="przycisk-wtorny" onClick={skopiujMaila}>
                  Skopiuj treść maila
                </button>
                <button type="button" className="przycisk-wtorny opacity-70" disabled>
                  <span className="inline-flex items-center gap-2">
                    <PaperAirplaneIcon className="h-4 w-4" />
                    Wyślij maila
                  </span>
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-base font-semibold text-slate-100">Podpowiedź workflow</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                <li>1. Wybierz osiedle, a kontrahent przypisze się automatycznie.</li>
                <li>2. Dodaj opis i zdjęcia z telefonu lub z pliku.</li>
                <li>3. Zapisz zgłoszenie, a na końcu podepniemy wysyłkę mailową przez API.</li>
              </ul>
            </section>
          </div>
        </div>

        {blad ? <p className="mt-4 rounded-2xl border border-red-400/15 bg-red-500/10 px-4 py-3 text-sm text-red-300">{blad}</p> : null}
        {komunikat ? (
          <p className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{komunikat}</p>
        ) : null}
      </form>

      <section className="karta-szklana rounded-3xl p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-slate-100">Lista zgłoszeń</p>
            <p className="mt-1 text-sm text-slate-400">Podgląd aktualnych wpisów, zdjęć i przygotowanej treści do maila.</p>
          </div>
          <input className="pole h-11 w-full max-w-sm" placeholder="Szukaj zgłoszenia" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="space-y-3">
          {lista.map((wpis) => (
            <article key={wpis.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-slate-100">{wpis.tytul}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-400">
                    <span>{wpis.kontrahent_nazwa || "Bez kontrahenta"}</span>
                    <span>{wpis.osiedle_nazwa || "Bez osiedla"}</span>
                    <span>{wpis.kategoria_nazwa || "Bez kategorii"}</span>
                    <span>{wpis.priorytet}</span>
                    <span>{formatujDateCzas(wpis.created_at)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button className="przycisk-wtorny" onClick={() => edytuj(wpis)}>
                    Edytuj
                  </button>
                  <button className="przycisk-wtorny" onClick={() => usun(wpis.id)}>
                    Usuń
                  </button>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{wpis.opis || "Brak opisu"}</p>

              {Array.isArray(wpis.zdjecia) && wpis.zdjecia.length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {wpis.zdjecia.map((zdjecie, index) => (
                    <MiniaturaZdjecia key={`${zdjecie.path || zdjecie.name || index}-${index}`} zdjecie={zdjecie} />
                  ))}
                </div>
              ) : null}
            </article>
          ))}

          {!lista.length ? <p className="text-sm text-slate-400">Brak zgłoszeń.</p> : null}
        </div>
      </section>
    </div>
  );
}
