"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  ShareIcon
} from "@heroicons/react/24/outline";
import SekcjaNaglowek from "../../../components/SekcjaNaglowek";

function czyStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export default function AplikacjaPage() {
  const [promptInstalacji, setPromptInstalacji] = useState(null);
  const [czyZainstalowana, setCzyZainstalowana] = useState(false);
  const [komunikat, setKomunikat] = useState("");

  useEffect(() => {
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

  async function zainstalujAplikacje() {
    setKomunikat("");

    if (czyZainstalowana) {
      setKomunikat("Aplikacja jest już uruchomiona w trybie zainstalowanym.");
      return;
    }

    if (!promptInstalacji) {
      setKomunikat("Użyj instrukcji instalacji dla swojego telefonu.");
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
    <div className="space-y-4 sm:space-y-6">
      <SekcjaNaglowek
        tytul="Aplikacja"
        opis="Dodaj aplikację do ekranu głównego telefonu."
      />

      {komunikat ? (
        <p className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {komunikat}
        </p>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1fr_0.92fr]">
        <article className="karta-szklana overflow-hidden rounded-3xl p-3 sm:p-5">
          <div className="relative overflow-hidden rounded-[1.6rem] border border-emerald-300/12 bg-[radial-gradient(circle_at_20%_0%,rgba(92,211,126,0.16),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
                  Panel serwisowy pod ręką
                </h2>
                <p className="mt-3 max-w-md text-sm leading-7 text-slate-300 sm:text-base">
                  Wersja zainstalowana działa wygodniej na telefonie i szybciej otwiera najważniejsze moduły.
                </p>
              </div>

              <div className="mx-auto flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.75rem] border border-white/10 bg-[#1d2c34] shadow-[0_18px_48px_rgba(0,0,0,0.22)] sm:mx-0 sm:h-28 sm:w-28">
                <Image
                  src="/ikona-192.png"
                  alt="Ikona EltrekoAPP"
                  width={76}
                  height={76}
                  className="h-[4.25rem] w-[4.25rem] object-contain sm:h-20 sm:w-20"
                />
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={zainstalujAplikacje}
                className="przycisk-glowny inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-base sm:w-auto"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Zainstaluj aplikację
              </button>
            </div>
          </div>
        </article>

        <article className="karta-szklana rounded-3xl p-3 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-500/10 text-emerald-200">
              <DevicePhoneMobileIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-slate-50">Jak instalować</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Dwie krótkie instrukcje dla Androida i iPhone.</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="h-5 w-5 text-emerald-300" />
                <h3 className="font-semibold text-slate-100">Android / Chrome</h3>
              </div>
              <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                <li>1. Otwórz stronę w Chrome albo Edge.</li>
                <li>2. Kliknij Zainstaluj aplikację na tej stronie.</li>
                <li>3. Potwierdź dodanie aplikacji do ekranu głównego.</li>
              </ol>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
              <div className="flex items-center gap-3">
                <ShareIcon className="h-5 w-5 text-sky-200" />
                <h3 className="font-semibold text-slate-100">iPhone / Safari</h3>
              </div>
              <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                <li>1. Otwórz zgloszeniaeltreko.pl w Safari.</li>
                <li>2. Kliknij ikonę udostępniania.</li>
                <li>3. Wybierz Dodaj do ekranu początkowego.</li>
              </ol>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
