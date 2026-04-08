"use client";

import Link from "next/link";
import {
  ClipboardDocumentListIcon,
  CalculatorIcon,
  DevicePhoneMobileIcon,
  SparklesIcon,
  ArrowRightIcon
} from "@heroicons/react/24/outline";

const KAFLE = [
  {
    href: "/protokoly",
    etykieta: "Protokoły",
    opis: "Dokumenty serwisowe, szybka edycja i eksport PDF.",
    ikona: ClipboardDocumentListIcon
  },
  {
    href: "/odczyty-licznikow",
    etykieta: "Odczyty liczników",
    opis: "Wygodne wpisywanie miesięcy i zapis zmian z telefonu.",
    ikona: CalculatorIcon
  },
  {
    href: "/aplikacja",
    etykieta: "Aplikacja",
    opis: "Instalacja na telefonie i szybki dostęp do mobilnej wersji.",
    ikona: DevicePhoneMobileIcon
  }
];

const SKROTY = [
  "Szybki dostęp do najważniejszych modułów.",
  "Układ przygotowany pod pracę z telefonu.",
  "Jedno miejsce dla dokumentów i odczytów."
];

function AbstrakcyjnaGrafika() {
  return (
    <div className="relative mx-auto aspect-[1.05/1] w-full max-w-[360px] overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] shadow-[0_24px_60px_rgba(5,12,18,0.18)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_22%,rgba(90,208,132,0.18),transparent_30%),radial-gradient(circle_at_78%_28%,rgba(127,240,164,0.12),transparent_26%),radial-gradient(circle_at_70%_80%,rgba(117,226,203,0.12),transparent_22%)]" />
      <div className="absolute left-[12%] top-[18%] h-[24%] w-[27%] rounded-[1.65rem] bg-[linear-gradient(180deg,rgba(88,205,129,0.28),rgba(61,140,93,0.16))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
      <div className="absolute right-[11%] top-[16%] h-[18%] w-[34%] rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
      <div className="absolute left-[18%] top-[49%] h-[14%] w-[56%] rounded-[1.3rem] bg-[linear-gradient(90deg,rgba(86,198,127,0.3),rgba(255,255,255,0.03))]" />
      <div className="absolute right-[14%] bottom-[14%] h-[22%] w-[26%] rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))]" />
      <div className="absolute left-[11%] bottom-[15%] h-[11%] w-[32%] rounded-full bg-[linear-gradient(90deg,rgba(120,240,170,0.22),transparent)] blur-[1px]" />
      <div className="absolute inset-x-[12%] top-[34%] h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      <div className="absolute inset-y-[12%] left-[44%] w-px bg-gradient-to-b from-transparent via-white/8 to-transparent" />
      <div className="absolute left-[16%] top-[60%] flex items-center gap-3 rounded-full bg-black/12 px-4 py-2 text-sm text-slate-200 backdrop-blur-sm">
        <SparklesIcon className="h-4 w-4 text-emerald-200" />
        Mobilny panel
      </div>
    </div>
  );
}

export default function StartPage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,rgba(34,47,59,0.98),rgba(27,39,49,0.95))] px-5 py-6 shadow-[0_26px_70px_rgba(6,13,19,0.18)] sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-emerald-400/7 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-80px] right-[-20px] h-56 w-56 rounded-full bg-cyan-300/6 blur-3xl" />

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.08fr)_360px] xl:items-center">
          <div className="space-y-6 anim-panel">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-emerald-300/85">
                EltrekoAPP
              </p>
              <h1 className="mt-4 max-w-[12ch] text-4xl font-semibold leading-[1.04] tracking-tight text-slate-50 sm:text-5xl">
                Mobilny panel serwisowy
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300/88 sm:text-lg">
                Szybki dostęp do protokołów, odczytów liczników i dokumentów technicznych.
                Bez zbędnych ekranów, od razu pod pracę w aplikacji.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {KAFLE.map(({ href, etykieta, opis, ikona: Ikona }) => (
                <Link
                  key={href}
                  href={href}
                  className="group rounded-[1.55rem] bg-white/[0.035] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:bg-white/[0.055]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-[1.1rem] bg-emerald-500/12 text-emerald-200">
                    <Ikona className="h-5 w-5" />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-base font-semibold text-slate-100">{etykieta}</p>
                    <ArrowRightIcon className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-emerald-200" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{opis}</p>
                </Link>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {SKROTY.map((tekst) => (
                <div
                  key={tekst}
                  className="rounded-[1.2rem] bg-white/[0.028] px-4 py-3 text-sm leading-6 text-slate-300/92"
                >
                  {tekst}
                </div>
              ))}
            </div>
          </div>

          <div className="anim-panel">
            <AbstrakcyjnaGrafika />
          </div>
        </div>
      </section>
    </div>
  );
}
