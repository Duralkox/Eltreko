"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  ShareIcon
} from "@heroicons/react/24/outline";
import SekcjaNaglowek from "../../../components/SekcjaNaglowek";

function wykryjIos() {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator.userAgent || "";
  const platform = window.navigator.platform || "";
  const iPadNaMacu = platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(userAgent) || iPadNaMacu;
}

function czyStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export default function AplikacjaPage() {
  const [promptInstalacji, setPromptInstalacji] = useState(null);
  const [czyIos, setCzyIos] = useState(false);
  const [czyZainstalowana, setCzyZainstalowana] = useState(false);
  const [komunikat, setKomunikat] = useState("");

  useEffect(() => {
    setCzyIos(wykryjIos());
    setCzyZainstalowana(czyStandalone());

    function przechwycInstalacje(event) {
      event.preventDefault();
      setPromptInstalacji(event);
    }

    function oznaczJakoZainstalowana() {
      setCzyZainstalowana(true);
      setPromptInstalacji(null);
      setKomunikat("Aplikacja została dodana do urządzenia.");
    }

    window.addEventListener("beforeinstallprompt", przechwycInstalacje);
    window.addEventListener("appinstalled", oznaczJakoZainstalowana);

    return () => {
      window.removeEventListener("beforeinstallprompt", przechwycInstalacje);
      window.removeEventListener("appinstalled", oznaczJakoZainstalowana);
    };
  }, []);

  const statusInstalacji = useMemo(() => {
    if (czyZainstalowana) return "Aplikacja działa już w trybie zainstalowanym.";
    if (promptInstalacji) return "Możesz zainstalować aplikację jednym kliknięciem.";
    if (czyIos) return "Na iPhone instalacja odbywa się przez menu Udostępnij.";
    return "Na Androidzie instalacja pojawi się, gdy przeglądarka udostępni tę opcję.";
  }, [czyIos, czyZainstalowana, promptInstalacji]);

  async function zainstalujAplikacje() {
    setKomunikat("");

    if (czyZainstalowana) {
      setKomunikat("Aplikacja jest już uruchomiona w trybie zainstalowanym.");
      return;
    }

    if (!promptInstalacji) {
      setKomunikat("Jeśli instalacja nie pojawia się automatycznie, użyj instrukcji dla swojego telefonu.");
      return;
    }

    promptInstalacji.prompt();
    const wybor = await promptInstalacji.userChoice;
    setPromptInstalacji(null);

    if (wybor?.outcome === "accepted") {
      setKomunikat("Instalacja została rozpoczęta.");
    } else {
      setKomunikat("Instalacja została anulowana. Możesz wrócić do niej później.");
    }
  }

  return (
    <div className="space-y-6">
      <SekcjaNaglowek
        tytul="Aplikacja"
        opis="Dodaj EltrekoAPP do ekranu głównego telefonu i korzystaj z panelu jak z aplikacji."
      />

      {komunikat ? (
        <p className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {komunikat}
        </p>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="karta-szklana overflow-hidden rounded-3xl p-6">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-emerald-300/12 bg-[radial-gradient(circle_at_20%_0%,rgba(92,211,126,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/85">EltrekoAPP</p>
                <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
                  Panel serwisowy pod ręką
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
                  Zainstalowana wersja otwiera się wygodniej na telefonie i daje szybki dostęp do protokołów, odczytów oraz dokumentów serwisowych.
                </p>
              </div>

              <div className="mx-auto flex h-36 w-36 shrink-0 items-center justify-center rounded-[2rem] border border-white/10 bg-[#1d2c34] shadow-[0_22px_60px_rgba(0,0,0,0.24)] md:mx-0">
                <Image src="/ikona-192.png" alt="Ikona EltrekoAPP" width={96} height={96} className="h-24 w-24 object-contain" />
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={zainstalujAplikacje}
                className="przycisk-glowny inline-flex items-center justify-center gap-2 px-5 py-3 text-base"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Zainstaluj aplikację
              </button>
              <p className="text-sm text-slate-400">{statusInstalacji}</p>
            </div>
          </div>
        </article>

        <article className="karta-szklana rounded-3xl p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-500/10 text-emerald-200">
              <DevicePhoneMobileIcon className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-slate-50">Jak instalować</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Android i iPhone robią to trochę inaczej, więc poniżej masz dwie krótkie instrukcje.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="h-5 w-5 text-emerald-300" />
                <h3 className="font-semibold text-slate-100">Android / Chrome</h3>
              </div>
              <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                <li>1. Otwórz stronę w Chrome albo Edge.</li>
                <li>2. Kliknij `Zainstaluj aplikację` na tej stronie.</li>
                <li>3. Potwierdź dodanie aplikacji do ekranu głównego.</li>
              </ol>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
              <div className="flex items-center gap-3">
                <ShareIcon className="h-5 w-5 text-sky-200" />
                <h3 className="font-semibold text-slate-100">iPhone / Safari</h3>
              </div>
              <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                <li>1. Otwórz `zgloszeniaeltreko.pl` w Safari.</li>
                <li>2. Kliknij ikonę udostępniania.</li>
                <li>3. Wybierz `Dodaj do ekranu początkowego`.</li>
              </ol>
            </div>
          </div>

          <Link
            href="/m/protokoly"
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-emerald-300/18 bg-emerald-500/[0.08] px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/[0.13]"
          >
            Otwórz mobilny widok protokołów
          </Link>
        </article>
      </section>
    </div>
  );
}
