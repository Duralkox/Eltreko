"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ClipboardDocumentListIcon,
  CalculatorIcon,
  DevicePhoneMobileIcon,
  ShieldCheckIcon,
  BoltIcon,
  ArrowRightIcon
} from "@heroicons/react/24/outline";

const SKROTY = [
  {
    href: "/protokoly",
    etykieta: "Protokoły",
    opis: "Szybkie tworzenie dokumentów, PDF i obsługa zleceń w terenie.",
    ikona: ClipboardDocumentListIcon
  },
  {
    href: "/odczyty-licznikow",
    etykieta: "Odczyty liczników",
    opis: "Wygodne wpisywanie miesięcy, eksport i zapis zmian z telefonu.",
    ikona: CalculatorIcon
  },
  {
    href: "/aplikacja",
    etykieta: "Aplikacja",
    opis: "Instalacja na telefonie i szybki dostęp do mobilnej wersji systemu.",
    ikona: DevicePhoneMobileIcon
  }
];

const ZALETY = [
  "Mobilne protokoły i dokumenty PDF w jednym miejscu.",
  "Odczyty liczników przygotowane pod wygodne wpisywanie na telefonie.",
  "Jedno konto, jedna aplikacja, szybki dostęp do wszystkich modułów."
];

export default function StartPage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,rgba(36,49,60,0.98),rgba(26,38,48,0.94))] p-5 shadow-[0_24px_70px_rgba(5,12,18,0.22)] sm:p-7">
        <div className="pointer-events-none absolute -left-10 top-10 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute right-[-30px] top-[-10px] h-52 w-52 rounded-full bg-cyan-300/7 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-40px] right-10 h-36 w-36 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_380px]">
          <div className="anim-panel">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-emerald-300/90">
              EltrekoAPP
            </p>
            <h1 className="mt-4 max-w-[10ch] text-4xl font-semibold leading-[1.02] tracking-tight text-slate-50 sm:text-5xl">
              Start pracy w terenie
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300/88 sm:text-lg">
              Mobilny panel dla dokumentów serwisowych, protokołów i odczytów liczników.
              Wszystko pod ręką, w jednym miejscu, gotowe do pracy z telefonu.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {SKROTY.map(({ href, etykieta, opis, ikona: Ikona }) => (
                <Link
                  key={href}
                  href={href}
                  className="group rounded-[1.4rem] border border-white/[0.07] bg-white/[0.04] p-4 transition hover:border-emerald-300/18 hover:bg-white/[0.06]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/18 bg-emerald-500/12 text-emerald-200">
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
          </div>

          <div className="anim-panel rounded-[1.8rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-5">
            <div className="relative mx-auto flex aspect-square max-w-[260px] items-center justify-center overflow-hidden rounded-[2rem] border border-white/[0.07] bg-[radial-gradient(circle_at_top,rgba(125,240,164,0.16),rgba(255,255,255,0.02)_52%,rgba(255,255,255,0.015))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_50px_rgba(0,0,0,0.18)]">
              <div className="absolute inset-5 rounded-[1.5rem] border border-emerald-300/10 bg-black/8" />
              <div className="absolute left-6 top-7 h-16 w-16 rounded-2xl border border-emerald-300/12 bg-emerald-500/10 blur-[1px]" />
              <div className="absolute bottom-7 right-7 h-20 w-20 rounded-[1.7rem] border border-cyan-200/10 bg-cyan-300/8 blur-[1px]" />
              <Image
                src="/logo.png"
                alt="Eltreko"
                width={713}
                height={189}
                className="relative z-10 h-auto w-[74%] object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.22)]"
              />
            </div>

            <div className="mt-5 space-y-3">
              {ZALETY.map((tekst, index) => (
                <div
                  key={tekst}
                  className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 anim-sekcja"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  {index === 0 ? (
                    <ClipboardDocumentListIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" />
                  ) : index === 1 ? (
                    <BoltIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" />
                  ) : (
                    <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" />
                  )}
                  <p className="text-sm leading-6 text-slate-300">{tekst}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
